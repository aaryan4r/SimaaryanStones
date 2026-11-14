import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const files = ['index.html', 'config.js', 'app.js', 'styles.css', 'vibrant.css', 'sections.css', 'admin.html', 'admin.js', 'admin.css', 'sitemap.xml', 'googlebbbd8cc47ab49cc3.html', 'assets'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) await cp(join(root, file), join(output, file), { recursive: true });
if (process.env.PUBLIC_API_BASE_URL) {
  const input = process.env.PUBLIC_API_BASE_URL.trim();
  let api;
  try { api = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`); }
  catch { throw new Error('PUBLIC_API_BASE_URL must be a valid HTTPS origin.'); }
  if (api.protocol !== 'https:' || api.username || api.password || api.pathname !== '/' || api.search || api.hash) {
    throw new Error('PUBLIC_API_BASE_URL must be an HTTPS origin without credentials or a path.');
  }
  await writeFile(join(output, 'config.js'), `window.SIMAARYAN_API_BASE = ${JSON.stringify(api.origin)};\n`);
}
console.log(`Built ${files.length} public entries into dist/`);
