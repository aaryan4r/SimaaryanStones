# Deployment preparation

## Current status

The static frontend builds into `dist/` using `node scripts/build-static.mjs`. It can be hosted on Cloudflare Pages with `dist` as its output directory. The pages URL is not configured yet; canonical URL and sitemap still point to GitHub Pages and must be updated for the chosen domain.

The Node API in `backend/` implements server-side admin login and photo uploads. Photos are stored in PostgreSQL, which must be backed up and monitored for size. Its API origin is configured in the public `config.js`; no secret belongs there. The `backend/.env.example` file lists the server settings. Tests use an in-memory PostgreSQL-compatible adapter and do not replace testing with a real database.

A Railway project named Simaaryan Stones has been created. A PostgreSQL service, persistent volume and an empty API service with `/backend` as its root have been staged, not deployed. `DATABASE_URL` is staged as a reference to PostgreSQL and `ADMIN_USERNAME` as `simaaryan`. A generated session secret is staged privately. The requested initial username and password hash are staged. The API service still has no connected source or frontend origin. No production deployment or service logs exist yet.

The requested initial password is weak and should be changed using the admin settings before the service is made public. Updated credentials are stored in the database, and existing sessions are invalidated. Bootstrap environment credentials apply only when the account is first created. Add a separate random value of at least 32 characters for `SESSION_SECRET` and set `CORS_ORIGIN` to the exact frontend URL. Never paste these values into chat or commit them to Git.

The existing website prepares WhatsApp or email drafts; it does not automatically send or store enquiries. An email provider and additional backend work are required for automatic email delivery. Replace sample reviews with real, permitted reviews before launch.

## Steps remaining

1. Finish production review, test the API with real PostgreSQL and actual image files, and confirm database backups. PostgreSQL image storage is appropriate only for modest galleries; review capacity and move to object storage if needed.
2. Review and push the local changes to the intended GitHub branch, or separately choose a supported local deployment method. Attach the reviewed source to the Railway API. The connected GitHub repository cannot deploy unpushed local changes.
3. Configure `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, and `CORS_ORIGIN` on the Railway service without exposing values. Railway supplies `PORT`.
4. Deploy the staged Railway services when explicitly approved. Confirm the database and API are healthy, inspect logs and test login, invalid credentials, authorized upload, public image access, and restart persistence.
5. In Cloudflare Pages, connect the repository. Build command: `node scripts/build-static.mjs`; output directory: `dist`. Set the Railway API origin in `config.js` and the Pages domain in `CORS_ORIGIN`; test the deployed website and API together. Create or sign into Cloudflare first.
6. A domain is optional; start with the provided `pages.dev` hostname. If buying a domain later, add it to Cloudflare, preserve existing DNS/email records before any nameserver change, configure the Pages custom domain, wait for certificate issuance and enforce HTTPS.
7. Verify phone, WhatsApp and email handoffs, actual email delivery if added, gallery persistence, admin access, privacy and error handling. Monitor logs and test database backup restoration.


## Latest setup

The Cloudflare Pages project `simaaryan-stones` was created. No preview deployment was confirmed; the attempted upload failed while reading project configuration due to a Cloudflare HTTP 503. The Railway production environment has staged Postgres, volume, API and frontend-origin settings; the deployment approval check did not approve applying them, so nothing was provisioned. The API still has no source connected. The C: drive reported no free space during setup.
