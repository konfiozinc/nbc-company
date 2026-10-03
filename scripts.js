/* ============================================================
   NBC Company · Catálogo Royal Prestige
   Los productos se cargan de content/productos.json (editable
   desde Pages CMS en app.pagescms.org, sin tocar código).
   ============================================================ */
const WHATSAPP = '573041111391';
const waLink = (msg) => 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg);
const $  = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let PRODUCTOS = [];

/* ── Firebase (compat) — fuente de datos en vivo ── */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDHWE3OJMspi_z0CKPv8mjvjI7igum98rs",
  authDomain: "el-titi-menu.firebaseapp.com",
  databaseURL: "https://el-titi-menu-default-rtdb.firebaseio.com",
  projectId: "el-titi-menu",
  storageBucket: "el-titi-menu.firebasestorage.app",
  messagingSenderId: "903648110789",
  appId: "1:903648110789:web:6ac58748862dfeb5a568ac"
};
let fbDB = null;
function initFirebase(){
  try {
    if (typeof firebase === 'undefined') return;
    if (firebase.apps.length === 0) firebase.initializeApp(FIREBASE_CONFIG);
    fbDB = firebase.database();
  } catch (e) { fbDB = null; }
}
function fbToProductos(obj){
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).filter(k => obj[k]).map(k => ({ id: k, ...obj[k] }));
}
function ordenarProductos(lista){
  return lista.slice().sort((a, b) => {
    if (!!a.destacado !== !!b.destacado) return a.destacado ? -1 : 1;
    return (Number(a.orden) || 0) - (Number(b.orden) || 0);
  });
}

/* ── Carga y render del catálogo ── */
async function cargarProductos() {
  const renderCatalogo = () => {
    const grid = $('#grid-productos');
    const filtros = $('#filtros');
    if (!grid) return;

    if (!PRODUCTOS.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);font-size:.8rem;grid-column:1/-1;text-align:center;">Aún no hay productos. Agrégalos desde el panel de administración.</p>';
      return;
    }

    // categorías únicas
    const cats = [...new Set(PRODUCTOS.map(p => p.categoria).filter(Boolean))];
    filtros.innerHTML = '<button class="filtro active" data-cat="todos">Todos</button>' +
      cats.map(c => `<button class="filtro" data-cat="${esc(c)}">${esc(c)}</button>`).join('');

    renderGrid(PRODUCTOS);

    // filtros
    filtros.addEventListener('click', (e) => {
      const b = e.target.closest('.filtro');
      if (!b) return;
      $$('.filtro', filtros).forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const cat = b.dataset.cat;
      renderGrid(cat === 'todos' ? PRODUCTOS : PRODUCTOS.filter(p => p.categoria === cat));
    });

    // buscador
    $('#buscador').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      renderGrid(PRODUCTOS.filter(p => (p.nombre || '').toLowerCase().includes(q)));
    });

    inyectarJSONLD();
  };

  return new Promise(resolve => {
    let settled = false;
    const finish = (fn) => { if (!settled) { settled = true; fn(); resolve(); } };
    const local = async () => {
      try {
        const r = await fetch('content/productos.json', { cache: 'no-store' });
        const txt = await r.text();
        const data = JSON.parse(txt.replace(/^\uFEFF/, ''));
        PRODUCTOS = Array.isArray(data) ? data : (data.productos || []);
      } catch (e) {
        PRODUCTOS = [];
      }
      PRODUCTOS = ordenarProductos(PRODUCTOS);
      finish(renderCatalogo);
    };
    if (fbDB) {
      fbDB.ref('nbc-company/productos').on('value', snap => {
        const lista = fbToProductos(snap.val());
        if (lista.length) {
          PRODUCTOS = JSON.parse(JSON.stringify(ordenarProductos(lista)));
          finish(renderCatalogo);
        }
      }, () => finish(local));
      setTimeout(() => { if (!settled) finish(local); }, 5000);
    } else {
      finish(local);
    }
  });
}

function renderGrid(lista) {
  const grid = $('#grid-productos');
  if (!grid) return;
  if (!lista.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:.8rem;grid-column:1/-1;text-align:center;">Sin resultados.</p>';
    return;
  }
  grid.innerHTML = lista.map((p, i) => `
    <article class="producto ${p.agotado ? 'agotado' : ''}" data-i="${i}" tabindex="0" role="button" aria-label="Ver ${esc(p.nombre)}">
      <img src="${esc(p.imagen || 'assets/img/productos/placeholder.jpg')}" alt="${esc(p.nombre)}" loading="lazy">
      ${p.agotado ? '<span class="producto-agotado">No disponible</span>' : ''}
      <div class="producto-cuerpo">
        <div class="producto-cat">${esc(p.categoria || '')}</div>
        <div class="producto-nombre">${esc(p.nombre)}</div>
        <div class="producto-cta">Solicitar información →</div>
      </div>
    </article>`).join('');

  grid.querySelectorAll('.producto').forEach(card => {
    const abrir = () => abrirProducto(Number(card.dataset.i));
    card.addEventListener('click', abrir);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrir(); });
  });
}

function abrirProducto(i) {
  const p = PRODUCTOS[i];
  if (!p) return;
  const detalle = $('#producto-detalle');
  const precio = (p.precioVisible && p.precio > 0) ? `<p style="color:var(--gold-primary);font-weight:700;">$${Number(p.precio).toLocaleString('es-CO')} COP</p>` : `<p style="color:var(--text-muted);">Precio en asesoría personalizada</p>`;
  const caracts = (p.caracteristicas && p.caracteristicas.length) ? `<ul>${p.caracteristicas.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : '';
  detalle.innerHTML = `
    <img src="${esc(p.imagen || 'assets/img/productos/placeholder.jpg')}" alt="${esc(p.nombre)}">
    <h4>${esc(p.nombre)}</h4>
    ${precio}
    <p>${esc(p.descripcionLarga || p.descripcionCorta || '')}</p>
    ${caracts}
    <a class="btn-gold" href="${waLink('Hola NBC Company, me interesa el producto: ' + p.nombre + '.')}" target="_blank" rel="noopener">
      <i class="fab fa-whatsapp"></i> Consultar por WhatsApp
    </a>`;
  $('#producto-modal').classList.add('active');
}

function inyectarJSONLD() {
  const el = document.getElementById('productos-jsonld');
  if (el) el.remove();
  if (!PRODUCTOS.length) return;
  const items = PRODUCTOS.map(p => ({
    "@type": "Product",
    "name": p.nombre,
    "description": p.descripcionCorta || '',
    "image": p.imagen ? new URL(p.imagen, location.href).href : '',
    "brand": { "@type": "Brand", "name": "Royal Prestige" },
    "offers": p.precioVisible && p.precio > 0
      ? { "@type": "Offer", "priceCurrency": "COP", "price": p.precio, "availability": "https://schema.org/InStock" }
      : undefined
  })).filter(x => x.offers !== undefined || x.name);
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'productos-jsonld';
  s.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", "itemListElement": items.map((p, i) => ({ "@type": "ListItem", "position": i + 1, "item": p })) });
  document.head.appendChild(s);
}

/* ── Modales ── */
function bindModal(triggerId, modalId) {
  const trigger = document.getElementById(triggerId);
  const modal = document.getElementById(modalId);
  if (!trigger || !modal) return;
  trigger.addEventListener('click', () => modal.classList.add('active'));
}
function cerrarModal(modal) { modal.classList.remove('active'); }

document.addEventListener('DOMContentLoaded', () => {
  // Modales base
  bindModal('show-qr-btn', 'qr-modal');
  bindModal('show-instructions-btn', 'install-modal');
  $$('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.close;
      const modal = id ? document.getElementById(id) : btn.closest('.modal-overlay');
      if (modal) cerrarModal(modal);
    });
  });
  $$('.modal-overlay').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) cerrarModal(m); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.modal-overlay.active').forEach(cerrarModal); });

  // QR
  const qrBox = document.getElementById('qrcode');
  if (qrBox) new QRCode(qrBox, { text: location.href, width: 160, height: 160, colorDark: "#0B0B0B", colorLight: "#FFFFFF", correctLevel: QRCode.CorrectLevel.H });

  // Guardar contacto (vCard)
  const saveBtn = document.getElementById('save-contact-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const v = ["BEGIN:VCARD","VERSION:3.0","N:Company;NBC;;;","FN:NBC COMPANY - Royal Prestige","ORG:NBC Company","TITLE:Distribuidor Autorizado Royal Prestige","TEL;TYPE=WORK,VOICE:+573041111391","TEL;TYPE=CELL,VOICE;PREF=1:+573041111391","EMAIL:nutricionybienestarconsultores@gmail.com","ADR;TYPE=WORK:;;Palmira;Valle del Cauca;;;Colombia","NOTE:Utensilios de cocina en acero quirurgico 316L con 50 años de garantia.","URL:" + location.href,"END:VCARD"].join("\r\n");
      const blob = new Blob([v], { type: 'text/vcard;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'NBC_Company_Royal_Prestige.vcf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    });
  }

  // Formulario de agendamiento → WhatsApp
  const form = document.getElementById('form-agenda');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = $('#f-nombre').value.trim();
      const telefono = $('#f-telefono').value.trim();
      const ciudad = $('#f-ciudad').value.trim();
      const fecha = $('#f-fecha').value;
      const msg = `Hola NBC Company, quiero agendar una asesoría gratuita.%0ANombre: ${nombre}%0ATeléfono: ${telefono}${ciudad ? `%0ACiudad: ${ciudad}` : ''}${fecha ? `%0AFecha preferida: ${fecha}` : ''}`;
      window.open('https://wa.me/' + WHATSAPP + '?text=' + msg, '_blank');
    });
  }

  // Catálogo + año + SW
  initFirebase();
  cargarProductos();
  const anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
});
