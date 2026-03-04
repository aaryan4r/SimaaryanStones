<<<<<<< HEAD
# SimaaryanStones
=======
# 🪨 SimAaryan Stones — Website Project

**Granite Suppliers in Ongole, Andhra Pradesh**  
Website + Backend Server

---

## 📁 Project Structure

```
simaaryan-project/
├── frontend/
│   └── index.html          ← Full website (single-page, SEO-optimised)
│
└── backend/
    ├── src/
    │   └── server.js       ← Express server (serves site + handles enquiries)
    ├── package.json
    ├── .env.example        ← Copy to .env and configure
    └── README.md           ← This file
```

---

## 🚀 Quick Start

### Option A — Open website directly (no backend needed)
Just open `frontend/index.html` in any browser.  
The "Send Enquiry" button will open WhatsApp directly with the filled message.

---

### Option B — Run with the backend server (recommended for production)

#### 1. Install Node.js
Download from: https://nodejs.org (version 16 or higher)

#### 2. Install dependencies
```bash
cd backend
npm install
```

#### 3. Configure environment
```bash
cp .env.example .env
# Open .env and verify/edit values (port, WhatsApp number etc.)
```

#### 4. Start the server
```bash
# Production
npm start

# Development (auto-restart on file changes)
npm run dev
```

#### 5. Open in browser
```
http://localhost:3000
```

---

## 📱 How WhatsApp Enquiry Works

When a visitor fills the contact form and clicks **"Send Enquiry"**:

1. The form collects: Name, Phone, Email, Granite type, Project details
2. The backend (`/api/enquiry`) receives the data, formats a WhatsApp message, and returns the `wa.me` URL
3. The browser opens **WhatsApp** (web or app) with a pre-filled message directed to:  
   **+91 8106177797**
4. The visitor just hits **Send** in WhatsApp — and you receive it instantly

**Fallback:** If the backend is not running (e.g. pure static hosting), the form still works — it directly opens WhatsApp from the browser without needing the server.

---

## 🛠 API Endpoints

| Method | Endpoint       | Description                        |
|--------|----------------|------------------------------------|
| GET    | `/`            | Serves the website (index.html)    |
| POST   | `/api/enquiry` | Handles form → returns WhatsApp URL|
| GET    | `/api/health`  | Health check (returns server status)|

### POST `/api/enquiry` — Request Body (JSON)
```json
{
  "firstName": "Rahul",
  "lastName":  "Sharma",
  "phone":     "+91 9876543210",
  "email":     "rahul@example.com",
  "granite":   "Black Galaxy Granite",
  "details":   "Need 500 sqft for flooring"
}
```

### Response
```json
{
  "success": true,
  "whatsappURL": "https://wa.me/918106177797?text=...",
  "message": "Enquiry received. Redirecting to WhatsApp."
}
```

---

## 🌐 Deploying to a Live Server

### Option 1 — Any VPS (DigitalOcean, Hostinger, AWS EC2)
```bash
git clone <your-repo>
cd simaaryan-project/backend
npm install
# Set NODE_ENV=production in .env
npm start
```
Use **PM2** to keep it running:
```bash
npm install -g pm2
pm2 start src/server.js --name simaaryan
pm2 save
pm2 startup
```

### Option 2 — Static hosting only (Netlify, Vercel, GitHub Pages)
Just upload the `frontend/index.html` file.  
WhatsApp integration works fully without the backend.

---

## 📞 Contact Details Configured
- **Phone / WhatsApp:** +91 8106177797  
- **WhatsApp Chat URL:** https://wa.me/918106177797  
- **Location:** Near South Bypass Road, Ongole, AP  
- **Factory:** Chimakurthi, Andhra Pradesh

---

## 🔍 SEO Features Included
- Full `<title>` and `<meta description>` with primary keywords
- JSON-LD structured data (LocalBusiness + FAQPage + WebSite schemas)
- Geo meta tags for Ongole, AP
- 50+ keywords naturally embedded in headings, paragraphs, alt tags
- FAQ section targeting top search queries
- Canonical URL tag
- Open Graph + Twitter Card meta tags
- Semantic HTML5 (`<article>`, `<section>`, `<blockquote>`, `<nav>`)

---

*© 2026 SimAaryan Stones — Granite Suppliers, Ongole, Andhra Pradesh*
>>>>>>> d057676 (First Commit)
