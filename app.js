const menu = document.getElementById('menu');
const nav = document.getElementById('navlinks');
menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
nav.addEventListener('click', event => { if (event.target.closest('a')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); } });
document.querySelectorAll('[data-stone]').forEach(link => link.addEventListener('click', () => { document.getElementById('stone').value = link.dataset.stone; }));
document.getElementById('enquiry').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const fields = [['Name','name'],['Phone / WhatsApp','phone'],['Email','email'],['Granite','stone'],['Format & quantity','format'],['Destination','destination'],['Project details','details']];
  const message = ['Granite enquiry — SimAaryan Stones', '', ...fields.filter(([, key]) => String(data.get(key) || '').trim()).map(([label, key]) => `${label}: ${String(data.get(key)).trim()}`)].join('\n');
  const channel = event.submitter?.value || 'whatsapp';
  if (channel === 'email') location.href = 'mailto:simaaryanstones@gmail.com?subject=' + encodeURIComponent('Granite enquiry — SimAaryan Stones') + '&body=' + encodeURIComponent(message);
  else window.open('https://wa.me/918106177797?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
});
async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  const api = window.SIMAARYAN_API_BASE.replace(/\/$/, '');
  if (!api) { grid.innerHTML = '<p class="gallery-empty">Photographs will be added here soon. Contact us to ask about current stone options.</p>'; return; }
  try {
    const response = await fetch(api + '/api/photos');
    if (!response.ok) throw new Error('Gallery unavailable');
    const files = await response.json();
    if (!Array.isArray(files)) throw new Error('Unexpected gallery response');
    const images = files.filter(file => /^[0-9a-f-]{36}$/i.test(file.id) && typeof file.caption === 'string');
    grid.replaceChildren();
    if (!images.length) { grid.innerHTML = '<p class="gallery-empty">Photographs will be added here soon. Contact us to ask about current stone options.</p>'; return; }
    for (const file of images) {
      const figure = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption');
      const title = file.caption;
      image.src = api + '/api/photos/' + encodeURIComponent(file.id); image.alt = title || 'Granite photograph'; image.loading = 'lazy'; caption.textContent = title || 'Granite photograph'; figure.append(image, caption); grid.append(figure);
    }
  } catch { grid.innerHTML = '<p class="gallery-empty">The gallery is temporarily unavailable. Please contact us for stone photographs.</p>'; }
}
loadGallery();
