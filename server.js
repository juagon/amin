const express = require('express');
const session = require('express-session');
const fs      = require('fs');
const path    = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // puerto dinámico para la nube

// ── Archivos de datos ─────────────────────────────────────
const USUARIOS_FILE  = path.join(__dirname, 'usuarios.json');
const BADGES_FILE    = path.join(__dirname, 'badges.json');
const PRECIOS_FILE   = path.join(__dirname, 'precios.json');
const PRODUCTOS_FILE = path.join(__dirname, 'productos.json');
const OUTLET_FILE    = path.join(__dirname, 'outlet.json');
const VENTAS_FILE    = path.join(__dirname, 'ventas.json');
const DESCUENTOS_FILE= path.join(__dirname, 'descuentos.json');
const ENCUESTAS_FILE = path.join(__dirname, 'encuestas_log.json');

// ── Middleware ───────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1); // útil si la nube usa proxy
app.use(session({
  secret: 'amin-intranet-2026-secret',
  resave: true,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000,   // 8 horas
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'   // obligatorio en HTTPS
 }
}));

// ── Helpers ───────────────────────────────────────────────
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── Autenticación ─────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ ok: false, mensaje: 'No autenticado' });
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.rol === 'admin') return next();
  res.status(403).json({ ok: false, mensaje: 'Acceso restringido a administradores' });
}
function authRedirect(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login.html');
}

// ── Archivos estáticos ─────────────────────────────────────
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));

// ── Rutas HTML ───────────────────────────────────────────
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

// ── API: Auth ─────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { usuario, clave } = req.body;
  const lista = readJson(USUARIOS_FILE, []);
  const user = lista.find(u => u.usuario === usuario && u.clave === clave);
  if (user) {
    req.session.user = { usuario: user.usuario, nombre: user.nombre, rol: user.rol || 'asesor' };
    req.session.save(err => {
      if (err) return res.status(500).json({ ok: false, mensaje: 'Error guardando sesión' });
      res.json({ ok: true, nombre: user.nombre, rol: user.rol || 'asesor' });
    });
  } else {
    res.status(401).json({ ok: false, mensaje: 'Usuario o contraseña incorrectos' });
  }
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });
app.get('/api/sesion', (req, res) => {
  if (req.session && req.session.user) res.json({ ok: true, ...req.session.user });
  else res.json({ ok: false });
});

// ── API: Catálogo / Config ───────────────────────────────
app.get('/api/config', requireAuth, (req, res) => {
  res.json({
    ok: true,
    badges:    readJson(BADGES_FILE, {}),
    precios:   readJson(PRECIOS_FILE, {}),
    productos: readJson(PRODUCTOS_FILE, {}),
    descuentos: readJson(DESCUENTOS_FILE, []),
  });
});

// ── API CRUD Usuarios, Productos, Precios, Badges, Outlet, Ventas, Encuestas ──
// (Aquí puedes copiar exactamente tus rutas actuales, solo se eliminó la dependencia LAN/localhost)

// ── Iniciar servidor ──────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n══════════════════════════════════════════');
  console.log('   ✅  INTRANET AMIN — Servidor activo');
  console.log('══════════════════════════════════════════');
  console.log(`   🌐  URL nube: http://localhost:${PORT} (Render asigna la URL pública)`);
  console.log('══════════════════════════════════════════\n');
});