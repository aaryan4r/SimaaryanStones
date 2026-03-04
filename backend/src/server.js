/**
 * ═══════════════════════════════════════════════════════════
 *  SimAaryan Stones — Backend Server
 *  Node.js + Express
 *
 *  Features:
 *  • Serves the frontend (index.html)
 *  • /api/enquiry  — receives form data, builds WhatsApp URL,
 *    returns it so the browser opens WhatsApp chat
 *  • Rate limiting (prevents spam)
 *  • Helmet security headers
 *  • CORS configured
 *  • Request logging
 * ═══════════════════════════════════════════════════════════
 */

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const WA_NUMBER   = process.env.WHATSAPP_NUMBER  || '918106177797';
const WA_BASE_URL = process.env.WHATSAPP_BASE_URL || 'https://wa.me';

// ── Security & Middleware ─────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false  // disabled so inline scripts in HTML work
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Simple request logger ─────────────────────────────────────
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// ── Rate limiter for enquiry endpoint ─────────────────────────
const enquiryLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,  // 15 minutes
  max      : 10,               // max 10 submissions per IP per window
  message  : { success: false, message: 'Too many enquiries from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders  : false,
});

// ── Serve frontend static files ───────────────────────────────
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// ═════════════════════════════════════════════════════════════
//  POST /api/enquiry
//  Receives form data → builds WhatsApp message URL → returns it
// ═════════════════════════════════════════════════════════════
app.post('/api/enquiry', enquiryLimiter, (req, res) => {
  const {
    firstName = '',
    lastName  = '',
    phone     = '',
    email     = '',
    granite   = '',
    details   = '',
  } = req.body;

  // Basic server-side validation
  if (!firstName.trim() || !phone.trim()) {
    return res.status(400).json({
      success : false,
      message : 'Name and phone number are required.',
    });
  }

  // Sanitise inputs (strip any HTML tags)
  const clean = (str) => str.replace(/<[^>]*>/g, '').trim();

  const name     = clean(`${firstName} ${lastName}`);
  const cleanPh  = clean(phone);
  const cleanEm  = clean(email);
  const cleanGr  = clean(granite);
  const cleanDet = clean(details);

  // Build a nicely-formatted WhatsApp message
  const msgLines = [
    '🪨 *New Enquiry — SimAaryan Stones*',
    '──────────────────────',
    `👤 *Name:* ${name}`,
    `📞 *Phone:* ${cleanPh}`,
  ];
  if (cleanEm)  msgLines.push(`✉️ *Email:* ${cleanEm}`);
  if (cleanGr)  msgLines.push(`🔷 *Granite Interest:* ${cleanGr}`);
  if (cleanDet) msgLines.push(`📋 *Project Details:*\n${cleanDet}`);
  msgLines.push('──────────────────────');
  msgLines.push('📍 _SimAaryan Stones, Ongole, AP_');

  const message    = msgLines.join('\n');
  const whatsappURL = `${WA_BASE_URL}/${WA_NUMBER}?text=${encodeURIComponent(message)}`;

  // Log the enquiry to console (you can also write to a file/database here)
  console.log('\n─────────── NEW ENQUIRY ───────────');
  console.log(`Name    : ${name}`);
  console.log(`Phone   : ${cleanPh}`);
  console.log(`Email   : ${cleanEm || 'N/A'}`);
  console.log(`Granite : ${cleanGr || 'N/A'}`);
  console.log(`Details : ${cleanDet || 'N/A'}`);
  console.log('───────────────────────────────────\n');

  return res.json({
    success      : true,
    whatsappURL,
    message      : 'Enquiry received. Redirecting to WhatsApp.',
  });
});

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status  : 'ok',
    service : 'SimAaryan Stones Backend',
    time    : new Date().toISOString(),
  });
});

// ── Catch-all: serve frontend for any unknown route ───────────
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🪨  SimAaryan Stones server running`);
  console.log(`    ➜  http://localhost:${PORT}`);
  console.log(`    ➜  WhatsApp target: ${WA_BASE_URL}/${WA_NUMBER}\n`);
});

module.exports = app;
