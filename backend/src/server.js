'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { randomUUID, randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
const { Pool } = require('pg');

const { DATABASE_URL, ADMIN_PASSWORD_HASH, ADMIN_USERNAME, SESSION_SECRET, CORS_ORIGIN } = process.env;
if (!DATABASE_URL || !ADMIN_PASSWORD_HASH || !ADMIN_USERNAME || !SESSION_SECRET || !CORS_ORIGIN) throw new Error('Missing required server configuration');
if (SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
const match = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/i.exec(ADMIN_PASSWORD_HASH);
if (!match) throw new Error('Invalid ADMIN_PASSWORD_HASH format');
const allowedOrigins = CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
if (!allowedOrigins.length || allowedOrigins.includes('*')) throw new Error('CORS_ORIGIN must contain explicit frontend origins');
const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin(origin, done) { done(null, !origin || allowedOrigins.includes(origin)); }, methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '32kb' }));
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts; try again later.' } });
const uploadLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const multipart = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 } });

function verifyPassword(password, passwordHash) {
  const parts = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/i.exec(passwordHash);
  if (!parts) return false;
  const expected = Buffer.from(parts[2], 'hex');
  const actual = scryptSync(password, Buffer.from(parts[1], 'hex'), 64);
  return timingSafeEqual(actual, expected);
}
async function authorize(req, res, next) {
  let data;
  try { const token = /^Bearer (.+)$/.exec(req.get('authorization') || '')?.[1]; data = jwt.verify(token, SESSION_SECRET, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({ error: 'Please sign in again.' }); }
  try {
    const result = await pool.query('SELECT username, password_hash, auth_version FROM admin_account WHERE id = 1');
    const admin = result.rows[0];
    if (!admin || data.sub !== admin.username || data.version !== admin.auth_version) return res.status(401).json({ error: 'Please sign in again.' });
    req.admin = admin; next();
  } catch (error) { next(error); }
}
function imageType(data) {
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.length > 8 && data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (data.length > 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
app.get('/api/health', async (_req, res) => { try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); } catch { res.status(503).json({ status: 'unavailable' }); } });
app.post('/api/admin/login', loginLimit, async (req, res, next) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || password.length > 256 || username.length > 100) return res.status(400).json({ error: 'Invalid credentials.' });
  try {
    const result = await pool.query('SELECT username, password_hash, auth_version FROM admin_account WHERE id = 1');
    const admin = result.rows[0];
    const valid = verifyPassword(password, admin?.password_hash || ADMIN_PASSWORD_HASH);
    if (!admin || username !== admin.username || !valid) return res.status(401).json({ error: 'Invalid credentials.' });
    res.set('Cache-Control', 'no-store').json({ token: jwt.sign({ version: admin.auth_version }, SESSION_SECRET, { subject: admin.username, expiresIn: '30m', algorithm: 'HS256' }) });
  } catch (error) { next(error); }
});
app.post('/api/admin/credentials', loginLimit, authorize, async (req, res, next) => {
  const { currentPassword, newUsername, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || currentPassword.length > 256 || typeof newUsername !== 'string' || !/^[a-zA-Z0-9_.-]{3,50}$/.test(newUsername) || typeof newPassword !== 'string' || newPassword.length < 14 || newPassword.length > 256) return res.status(400).json({ error: 'Choose a username of 3–50 letters, numbers, dots, underscores or hyphens and a password of at least 14 characters.' });
  if (!verifyPassword(currentPassword, req.admin.password_hash)) return res.status(401).json({ error: 'Current password is incorrect.' });
  const salt = randomBytes(16);
  const newHash = `scrypt$${salt.toString('hex')}$${scryptSync(newPassword, salt, 64).toString('hex')}`;
  try {
    const result = await pool.query('UPDATE admin_account SET username = $1, password_hash = $2, auth_version = auth_version + 1 WHERE id = 1 AND auth_version = $3', [newUsername, newHash, req.admin.auth_version]);
    if (!result.rowCount) return res.status(409).json({ error: 'Credentials changed in another session. Sign in again.' });
    res.set('Cache-Control', 'no-store').json({ success: true });
  } catch (error) { next(error); }
});
app.get('/api/photos', async (_req, res, next) => { try { const result = await pool.query('SELECT id, caption FROM gallery_photos ORDER BY created_at DESC LIMIT 100'); res.json(result.rows); } catch (error) { next(error); } });
app.get('/api/photos/:id', async (req, res, next) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.sendStatus(404);
  try { const result = await pool.query('SELECT content_type, content FROM gallery_photos WHERE id = $1', [req.params.id]); if (!result.rowCount) return res.sendStatus(404); res.set('Content-Type', result.rows[0].content_type).set('X-Content-Type-Options', 'nosniff').set('Cross-Origin-Resource-Policy', 'cross-origin').set('Cache-Control', 'public, max-age=3600').send(result.rows[0].content); } catch (error) { next(error); }
});
app.post('/api/admin/photos', uploadLimit, authorize, multipart.single('photo'), async (req, res, next) => {
  const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
  const contentType = req.file && imageType(req.file.buffer);
  if (!caption || caption.length > 100 || !contentType) return res.status(400).json({ error: 'Provide a description and a JPEG, PNG, or WebP image under 5 MB.' });
  try { const id = randomUUID(); await pool.query('INSERT INTO gallery_photos (id, caption, content_type, content) VALUES ($1, $2, $3, $4)', [id, caption, contentType, req.file.buffer]); res.status(201).json({ id, caption }); } catch (error) { next(error); }
});
app.use((error, _req, res, _next) => { console.error('Request failed:', error.code || error.name || 'unknown'); if (error instanceof multer.MulterError) return res.status(400).json({ error: 'Invalid image or file too large.' }); res.status(500).json({ error: 'Request could not be completed.' }); });

async function start() {
  await pool.query(`CREATE TABLE IF NOT EXISTS gallery_photos (id uuid PRIMARY KEY, caption varchar(100) NOT NULL, content_type varchar(20) NOT NULL, content bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_account (id integer PRIMARY KEY, username varchar(50) NOT NULL, password_hash text NOT NULL, auth_version integer NOT NULL DEFAULT 1)`);
  await pool.query('INSERT INTO admin_account (id, username, password_hash) VALUES (1, $1, $2) ON CONFLICT (id) DO NOTHING', [ADMIN_USERNAME, ADMIN_PASSWORD_HASH]);
  const port = Number(process.env.PORT || 3000);
  return app.listen(port, '0.0.0.0', () => console.log(`Granite API listening on port ${port}`));
}
if (require.main === module) start().catch(error => { console.error('API startup failed:', error.code || error.name); process.exitCode = 1; });
module.exports = { app, start, pool };
