require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const WA_NUMBER = process.env.WHATSAPP_NUMBER || '918106177797';
const WA_BASE_URL = process.env.WHATSAPP_BASE_URL || 'https://wa.me';

const rootDir = path.join(__dirname, '..', '..');
const FRONTEND_DIR = fs.existsSync(path.join(rootDir, 'frontend', 'index.html'))
  ? path.join(rootDir, 'frontend')
  : rootDir;

const GALLERY_DIR = path.join(__dirname, '..', 'data', 'gallery');
const GALLERY_META_FILE = path.join(__dirname, '..', 'data', 'gallery.json');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many enquiries from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const galleryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many gallery requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.static(FRONTEND_DIR));
app.use('/uploads/gallery', express.static(GALLERY_DIR));

async function ensureGalleryStorage() {
  await fsp.mkdir(GALLERY_DIR, { recursive: true });
  if (!fs.existsSync(GALLERY_META_FILE)) {
    await fsp.mkdir(path.dirname(GALLERY_META_FILE), { recursive: true });
    await fsp.writeFile(GALLERY_META_FILE, '[]', 'utf8');
  }
}

async function readGalleryMeta() {
  await ensureGalleryStorage();
  const raw = await fsp.readFile(GALLERY_META_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeGalleryMeta(items) {
  await ensureGalleryStorage();
  await fsp.writeFile(GALLERY_META_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\n\r]+)$/.exec(dataUrl || '');
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
  const ext = extMap[mime];
  if (!ext) return null;
  return { mime, ext, buffer: Buffer.from(match[2], 'base64') };
}

async function saveGalleryPhoto(dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error('Invalid image data.');
  if (parsed.buffer.length > 8 * 1024 * 1024) throw new Error('Image is too large. Max 8MB.');

  const id = crypto.randomUUID();
  const filename = `${id}.${parsed.ext}`;
  const filepath = path.join(GALLERY_DIR, filename);

  await ensureGalleryStorage();
  await fsp.writeFile(filepath, parsed.buffer);

  return {
    id,
    filename,
    url: `/uploads/gallery/${filename}`,
    createdAt: new Date().toISOString(),
  };
}

app.get('/api/gallery/photos', galleryLimiter, async (req, res) => {
  const items = await readGalleryMeta();
  return res.json({ success: true, photos: items });
});

app.post('/api/gallery/photos', galleryLimiter, async (req, res) => {
  try {
    const incoming = Array.isArray(req.body.photos) ? req.body.photos : [];
    if (!incoming.length) {
      return res.status(400).json({ success: false, message: 'No photos received.' });
    }

    const current = await readGalleryMeta();
    const created = [];
    for (const dataUrl of incoming) {
      const photo = await saveGalleryPhoto(dataUrl);
      created.push(photo);
    }

    const updated = [...current, ...created];
    await writeGalleryMeta(updated);
    return res.status(201).json({ success: true, photos: created, allPhotos: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || 'Unable to upload photos.' });
  }
});

app.delete('/api/gallery/photos/:id', galleryLimiter, async (req, res) => {
  const { id } = req.params;
  const items = await readGalleryMeta();
  const target = items.find((item) => item.id === id);

  if (!target) {
    return res.status(404).json({ success: false, message: 'Photo not found.' });
  }

  const updated = items.filter((item) => item.id !== id);
  await writeGalleryMeta(updated);

  try {
    await fsp.unlink(path.join(GALLERY_DIR, target.filename));
  } catch {
    // ignore missing file
  }

  return res.json({ success: true, photos: updated });
});

app.put('/api/gallery/photos/:id', galleryLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { photo } = req.body;
    const items = await readGalleryMeta();
    const idx = items.findIndex((item) => item.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Photo not found.' });
    }

    const oldPhoto = items[idx];
    const newPhoto = await saveGalleryPhoto(photo);
    const replacement = { ...newPhoto, id: oldPhoto.id };

    const oldExt = path.extname(oldPhoto.filename);
    const replacementFilename = `${oldPhoto.id}${path.extname(newPhoto.filename)}`;
    await fsp.rename(path.join(GALLERY_DIR, newPhoto.filename), path.join(GALLERY_DIR, replacementFilename));

    replacement.filename = replacementFilename;
    replacement.url = `/uploads/gallery/${replacementFilename}`;

    items[idx] = replacement;
    await writeGalleryMeta(items);

    if (oldExt !== path.extname(replacementFilename)) {
      try {
        await fsp.unlink(path.join(GALLERY_DIR, oldPhoto.filename));
      } catch {
        // ignore
      }
    }

    return res.json({ success: true, photo: replacement, photos: items });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || 'Unable to replace photo.' });
  }
});

app.post('/api/enquiry', enquiryLimiter, (req, res) => {
  const {
    firstName = '',
    lastName = '',
    phone = '',
    email = '',
    granite = '',
    details = '',
  } = req.body;

  if (!firstName.trim() || !phone.trim()) {
    return res.status(400).json({ success: false, message: 'Name and phone number are required.' });
  }

  const clean = (str) => str.replace(/<[^>]*>/g, '').trim();
  const name = clean(`${firstName} ${lastName}`);
  const cleanPh = clean(phone);
  const cleanEm = clean(email);
  const cleanGr = clean(granite);
  const cleanDet = clean(details);

  const msgLines = [
    '🪨 *New Enquiry — SimAaryan Stones*',
    '──────────────────────',
    `👤 *Name:* ${name}`,
    `📞 *Phone:* ${cleanPh}`,
  ];
  if (cleanEm) msgLines.push(`✉️ *Email:* ${cleanEm}`);
  if (cleanGr) msgLines.push(`🔷 *Granite Interest:* ${cleanGr}`);
  if (cleanDet) msgLines.push(`📋 *Project Details:*\n${cleanDet}`);
  msgLines.push('──────────────────────');
  msgLines.push('📍 _SimAaryan Stones, Ongole, AP_');

  const message = msgLines.join('\n');
  const whatsappURL = `${WA_BASE_URL}/${WA_NUMBER}?text=${encodeURIComponent(message)}`;

  return res.json({ success: true, whatsappURL, message: 'Enquiry received. Redirecting to WhatsApp.' });
});

app.get('/api/health', async (req, res) => {
  const photos = await readGalleryMeta();
  res.json({
    status: 'ok',
    service: 'SimAaryan Stones Backend',
    galleryPhotoCount: photos.length,
    time: new Date().toISOString(),
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, async () => {
  await ensureGalleryStorage();
  console.log(`\n🪨  SimAaryan Stones server running`);
  console.log(`    ➜  http://localhost:${PORT}`);
  console.log(`    ➜  WhatsApp target: ${WA_BASE_URL}/${WA_NUMBER}\n`);
});

module.exports = app;
