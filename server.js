const express = require('express');
const session = require('express-session');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

const app  = express();
const PORT = 3000;

const USUARIOS_FILE  = path.join(__dirname, 'usuarios.json');
const BADGES_FILE    = path.join(__dirname, 'badges.json');
const PRECIOS_FILE   = path.join(__dirname, 'precios.json');
const PRODUCTOS_FILE = path.join(__dirname, 'productos.json');
const OUTLET_FILE    = path.join(__dirname, 'outlet.json');
const VENTAS_FILE      = path.join(__dirname, 'ventas.json');
const DESCUENTOS_FILE  = path.join(__dirname, 'descuentos.json');
const ENCUESTAS_FILE   = path.join(__dirname, 'encuestas_log.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
app.use(session({
  secret: 'amin-intranet-2026-secret',
  resave: true,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
}));

/* ── Helpers ─────────────────────────────────────────────── */
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

/* ── Middlewares ─────────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ ok: false, mensaje: 'No autenticado' });
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.rol === 'admin') return next();
  res.status(403).json({ ok: false, mensaje: 'Acceso restringido a administradores' });
}

/* ── Estáticos públicos ──────────────────────────────────── */
app.use('/img',        express.static(path.join(__dirname, 'public', 'img')));
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));

/* ── Rutas HTML protegidas ───────────────────────────────── */
function authRedirect(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login.html');
}
app.get('/', authRedirect, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'catalogo.html')));
app.get('/catalogo.html', authRedirect, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'catalogo.html')));
app.get('/admin.html', authRedirect, (req, res) => {
  if (req.session.user.rol !== 'admin') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/encuesta.html', authRedirect, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'encuesta.html')));

/* ── API: Auth ───────────────────────────────────────────── */
app.post('/api/login', (req, res) => {
  try {
    const { usuario, clave } = req.body;
    const lista = readJson(USUARIOS_FILE, []);
    const user  = lista.find(u => u.usuario === usuario && u.clave === clave);
    if (user) {
      req.session.user = { usuario: user.usuario, nombre: user.nombre, rol: user.rol || 'asesor' };
      req.session.save(err => {
        if (err) return res.status(500).json({ ok: false, mensaje: 'Error guardando sesión' });
        res.json({ ok: true, nombre: user.nombre, rol: user.rol || 'asesor' });
      });
    } else {
      res.status(401).json({ ok: false, mensaje: 'Usuario o contraseña incorrectos' });
    }
  } catch { res.status(500).json({ ok: false, mensaje: 'Error interno' }); }
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });
app.get('/api/sesion', (req, res) => {
  if (req.session && req.session.user) res.json({ ok: true, ...req.session.user });
  else res.json({ ok: false });
});

/* ── API: Config unificada para el catálogo ─────────────── */
app.get('/api/config', requireAuth, (req, res) => {
  res.json({
    ok: true,
    badges:      readJson(BADGES_FILE,    {}),
    precios:     readJson(PRECIOS_FILE,   {}),
    productos:   readJson(PRODUCTOS_FILE, {}),
    descuentos:  readJson(DESCUENTOS_FILE, []),
  });
});

/* ── API: Badges ─────────────────────────────────────────── */
app.get('/api/badges', requireAuth, (req, res) =>
  res.json({ ok: true, badges: readJson(BADGES_FILE, {}) }));

app.post('/api/badges', requireAuth, requireAdmin, (req, res) => {
  const IDS   = ['active','confort','balance','harmony','calm','vitality','energy','prana'];
  const VALID = ['mas-vendido','recomendado','nuevo','exclusivo',null,''];
  const out   = {};
  for (const id of IDS) {
    const v = req.body[id] === '' ? null : (req.body[id] || null);
    if (v !== null && !VALID.includes(v))
      return res.status(400).json({ ok: false, mensaje: `Valor inválido: ${v}` });
    out[id] = v;
  }
  writeJson(BADGES_FILE, out);
  res.json({ ok: true, badges: out });
});

/* ── API: Precios ────────────────────────────────────────── */
app.get('/api/precios', requireAuth, (req, res) =>
  res.json({ ok: true, precios: readJson(PRECIOS_FILE, {}) }));

app.post('/api/precios', requireAuth, requireAdmin, (req, res) => {
  const IDS   = ['active','confort','balance','harmony','calm','vitality','energy','prana'];
  const TALLS = ['s100','s120','s140','s160','s200'];
  const current = readJson(PRECIOS_FILE, {});
  for (const id of IDS) {
    if (!current[id]) current[id] = {};
    for (const t of TALLS) {
      const key = `${id}_${t}`;
      if (req.body[key] !== undefined) {
        const val = parseInt(req.body[key], 10);
        current[id][t] = isNaN(val) ? 0 : val;
      }
    }
  }
  writeJson(PRECIOS_FILE, current);
  res.json({ ok: true, precios: current });
});

/* ── API: Productos (activo/inactivo) ────────────────────── */
app.get('/api/productos', requireAuth, (req, res) =>
  res.json({ ok: true, productos: readJson(PRODUCTOS_FILE, {}) }));

app.post('/api/productos', requireAuth, requireAdmin, (req, res) => {
  const IDS = ['active','confort','balance','harmony','calm','vitality','energy','prana'];
  const out = {};
  for (const id of IDS) out[id] = req.body[id] === true || req.body[id] === 'true';
  writeJson(PRODUCTOS_FILE, out);
  res.json({ ok: true, productos: out });
});

/* ── API: Usuarios ───────────────────────────────────────── */
app.get('/api/usuarios', requireAuth, requireAdmin, (req, res) => {
  const lista = readJson(USUARIOS_FILE, []);
  res.json({ ok: true, usuarios: lista.map(u => ({ usuario:u.usuario, nombre:u.nombre, rol:u.rol||'asesor' })) });
});

app.post('/api/usuarios', requireAuth, requireAdmin, (req, res) => {
  const { usuario, nombre, clave, rol } = req.body;
  if (!usuario || !nombre || !clave) return res.status(400).json({ ok:false, mensaje:'Faltan campos obligatorios' });
  const lista = readJson(USUARIOS_FILE, []);
  if (lista.find(u => u.usuario === usuario))
    return res.status(400).json({ ok:false, mensaje:'El usuario ya existe' });
  lista.push({ usuario, nombre, clave, rol: rol||'asesor' });
  writeJson(USUARIOS_FILE, lista);
  res.json({ ok:true });
});

app.put('/api/usuarios/:id', requireAuth, requireAdmin, (req, res) => {
  const lista = readJson(USUARIOS_FILE, []);
  const idx   = lista.findIndex(u => u.usuario === req.params.id);
  if (idx === -1) return res.status(404).json({ ok:false, mensaje:'Usuario no encontrado' });
  const { nombre, clave, rol } = req.body;
  if (nombre) lista[idx].nombre = nombre;
  if (clave)  lista[idx].clave  = clave;
  if (rol)    lista[idx].rol    = rol;
  writeJson(USUARIOS_FILE, lista);
  res.json({ ok:true });
});

app.delete('/api/usuarios/:id', requireAuth, requireAdmin, (req, res) => {
  if (req.params.id === req.session.user.usuario)
    return res.status(400).json({ ok:false, mensaje:'No puedes eliminar tu propio usuario' });
  let lista = readJson(USUARIOS_FILE, []);
  const antes = lista.length;
  lista = lista.filter(u => u.usuario !== req.params.id);
  if (lista.length === antes) return res.status(404).json({ ok:false, mensaje:'Usuario no encontrado' });
  writeJson(USUARIOS_FILE, lista);
  res.json({ ok:true });
});

/* ── API: Outlet ─────────────────────────────────────────── */
app.get('/api/outlet', requireAuth, (req, res) =>
  res.json({ ok: true, outlet: readJson(OUTLET_FILE, []) }));

app.post('/api/outlet', requireAuth, requireAdmin, (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ ok: false, mensaje: 'Se espera un array' });
  writeJson(OUTLET_FILE, items);
  res.json({ ok: true, outlet: items });
});

/* ── API: Ventas ─────────────────────────────────────────── */
app.get('/api/ventas', requireAuth, (req, res) =>
  res.json({ ok: true, ventas: readJson(VENTAS_FILE, {}) }));

app.post('/api/ventas', requireAuth, (req, res) => {
  // req.body = { pid: cantidad, pid2: cantidad2, ... }
  const nuevo = req.body;
  if (typeof nuevo !== 'object' || Array.isArray(nuevo))
    return res.status(400).json({ ok: false, mensaje: 'Se espera un objeto' });
  const ventas = readJson(VENTAS_FILE, {});
  Object.entries(nuevo).forEach(([pid, qty]) => {
    ventas[pid] = (ventas[pid] || 0) + (parseInt(qty) || 0);
  });
  writeJson(VENTAS_FILE, ventas);
  res.json({ ok: true, ventas });
});

/* ── API: Descuentos ────────────────────────────────────── */
app.get('/api/descuentos', requireAuth, (req, res) =>
  res.json({ ok: true, descuentos: readJson(DESCUENTOS_FILE, []) }));

app.post('/api/descuentos', requireAuth, requireAdmin, (req, res) => {
  const lista = req.body;
  if (!Array.isArray(lista)) return res.status(400).json({ ok: false, mensaje: 'Se espera un array' });
  for (const d of lista) {
    if (!d.codigo || typeof d.pct !== 'number' || !d.label)
      return res.status(400).json({ ok: false, mensaje: 'Cada descuento debe tener codigo, pct y label' });
  }
  writeJson(DESCUENTOS_FILE, lista);
  res.json({ ok: true, descuentos: lista });
});

/* ── API: Encuestas Log ───────────────────────────────────── */
app.post('/api/encuesta-log', requireAuth, (req, res) => {
  const entrada = req.body;
  if (!entrada || typeof entrada !== 'object')
    return res.status(400).json({ ok: false, mensaje: 'Datos inválidos' });
  const log = readJson(ENCUESTAS_FILE, []);
  log.push({
    ...entrada,
    asesor:  req.session.user.nombre,
    usuario: req.session.user.usuario,
    fecha:   new Date().toISOString(),
  });
  writeJson(ENCUESTAS_FILE, log);
  res.json({ ok: true });
});

app.get('/api/encuesta-log', requireAuth, requireAdmin, (req, res) =>
  res.json({ ok: true, encuestas: readJson(ENCUESTAS_FILE, []) }));

app.delete('/api/encuesta-log', requireAuth, requireAdmin, (req, res) => {
  writeJson(ENCUESTAS_FILE, []);
  res.json({ ok: true });
});

/* ── Iniciar servidor ────────────────────────────────────── */
app.listen(PORT, '0.0.0.0', () => {
  let lanIP = 'localhost';
  Object.values(os.networkInterfaces()).forEach(iface =>
    iface.forEach(addr => { if (addr.family==='IPv4' && !addr.internal) lanIP = addr.address; }));
  console.log('\n══════════════════════════════════════════');
  console.log('   ✅  INTRANET AMIN — Servidor activo');
  console.log('══════════════════════════════════════════');
  console.log(`   📺  Esta PC :  http://localhost:${PORT}`);
  console.log(`   🌐  Red LAN :  http://${lanIP}:${PORT}`);
  console.log('──────────────────────────────────────────');
  console.log('   Presiona Ctrl+C para detener.');
  console.log('══════════════════════════════════════════\n');
});
