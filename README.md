# SimAaryan Stones website

The frontend is static and can be built with `node scripts/build-static.mjs`. The Express API in `backend/` supports authenticated gallery uploads and stores images in PostgreSQL. The API requires the environment settings described in `backend/.env.example`. The public `config.js` needs the API origin after deployment; it must not contain secrets.

## Gallery administration

Set `ADMIN_USERNAME` to the chosen username and configure a strong, unique password through a server-side `ADMIN_PASSWORD_HASH`. `backend/scripts/hash-password.js` reads the password from standard input and produces a salted scrypt hash. Never commit the actual password, hash, or Railway secrets. `SESSION_SECRET` must be random and at least 32 characters; keep it private. `CORS_ORIGIN` contains the exact allowed frontend origin, not `*`.

Upload JPEG, PNG or WebP images up to 5 MB. Uploaded images and captions are public. The API stores the images in PostgreSQL, so configure backups and monitor database size. A successful HTTP health response confirms database connectivity, not a complete backup or security audit. The authenticated upload and login were tested using an in-memory PostgreSQL-compatible test; test against the actual Railway PostgreSQL service before launch.

## Enquiries

The website opens WhatsApp or the visitor's email app with a draft; it does not send or save an enquiry automatically. Email delivery and enquiry persistence require additional integration. Replace the example reviews with genuine, permitted reviews before launch and review the privacy notice.

See `DEPLOYMENT.md` for deployment status and remaining setup.

After signing in, use **Change admin username and password** in the admin page. The current password is required, and the new password must have at least 14 characters. Changing credentials signs out all existing sessions. Bootstrap environment credentials are used only when the database account is first created; subsequent changes are stored in the database.
