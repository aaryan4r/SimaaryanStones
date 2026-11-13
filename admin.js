'use strict';
const api = window.SIMAARYAN_API_BASE.replace(/\/$/, '');
const loginForm = document.getElementById('login-form');
const uploadForm = document.getElementById('upload-form');
const loginStatus = document.getElementById('login-status');
const status = document.getElementById('status');
let sessionToken = '';
if (!api) document.getElementById('config-status').hidden = false;
loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const password = document.getElementById('password');
  if (!api) { password.value = ''; loginStatus.textContent = 'Sign-in is not available until the photo service is connected.'; return; }
  loginStatus.textContent = 'Signing in…';
  try {
    const response = await fetch(api + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('username').value.trim(), password: password.value }) });
    if (!response.ok) throw new Error(response.status === 429 ? 'Too many attempts. Please try again later.' : 'Sign-in failed. Check your details and try again.');
    const result = await response.json(); sessionToken = result.token; loginForm.hidden = true; document.getElementById('upload-panel').hidden = false; loginStatus.textContent = '';
  } catch (error) { loginStatus.textContent = error.message || 'The photo service is unavailable.'; }
  finally { password.value = ''; }
});
uploadForm.addEventListener('submit', async event => {
  event.preventDefault();
  const files = Array.from(document.getElementById('photos').files);
  if (files.some(file => !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) { status.textContent = 'Use JPEG, PNG or WebP files no larger than 5 MB each.'; return; }
  const button = uploadForm.querySelector('button'); button.disabled = true; let uploaded = 0;
  try {
    for (const file of files) {
      status.textContent = `Uploading ${uploaded + 1} of ${files.length}…`;
      const body = new FormData(); body.append('photo', file); body.append('caption', document.getElementById('caption').value.trim());
      const response = await fetch(api + '/api/admin/photos', { method: 'POST', headers: { Authorization: 'Bearer ' + sessionToken }, body });
      if (!response.ok) throw new Error(response.status === 401 ? 'Your session expired. Sign in again.' : 'Upload failed. Please try again.');
      uploaded++;
    }
    status.textContent = `${uploaded} photo(s) uploaded.`; uploadForm.reset();
  } catch (error) { status.textContent = `${uploaded} photo(s) uploaded. ${error.message}`; }
  finally { button.disabled = false; }
});
document.getElementById('logout').addEventListener('click', () => { sessionToken = ''; uploadForm.reset(); document.getElementById('upload-panel').hidden = true; loginForm.hidden = false; });
document.getElementById('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const current = document.getElementById('current-password');
  const username = document.getElementById('new-username');
  const password = document.getElementById('new-password');
  const confirm = document.getElementById('confirm-password');
  const message = document.getElementById('settings-status');
  if (password.value !== confirm.value) { message.textContent = 'The new passwords do not match.'; return; }
  const button = form.querySelector('button'); button.disabled = true; message.textContent = 'Saving…';
  try {
    const response = await fetch(api + '/api/admin/credentials', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sessionToken }, body: JSON.stringify({ currentPassword: current.value, newUsername: username.value.trim(), newPassword: password.value }) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Could not update sign-in details.'); }
    sessionToken = ''; form.reset(); uploadForm.reset(); document.getElementById('upload-panel').hidden = true; loginForm.hidden = false;
    loginStatus.textContent = 'Sign-in details updated. Please sign in again.';
  } catch (error) { message.textContent = error.message || 'Could not update sign-in details.'; }
  finally { current.value = ''; password.value = ''; confirm.value = ''; button.disabled = false; }
});
