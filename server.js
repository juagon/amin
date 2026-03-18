const express = require('express');
const session = require('express-session');
const Redis = require('redis');
const RedisStore = require('connect-redis').default; // ✅ Import correcto para v7+
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Archivos JSON
const USUARIOS_FILE  = path.join(__dirname, 'usuarios.json');
const BADGES_FILE    = path.join(__dirname, 'badges.json');
const PRECIOS_FILE   = path.join(__dirname, 'precios.json');
const PRODUCTOS_FILE = path.join(__dirname, 'productos.json');
const OUTLET_FILE    = path.join(__dirname, 'outlet.json');
const VENTAS_FILE    = path.join(__dirname, 'ventas.json');
const DESCUENTOS_FILE = path.join(__dirname, 'descuentos.json');
const ENCUESTAS_FILE = path.join(__dirname, 'encuestas_log.json');

// Determinar entorno
const isProd = process.env.NODE_ENV === 'production';

// Crear cliente Redis
const redisClient = Redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1); // necesario en Render para HTTPS

// Configuración de sesión con Redis
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'amin-intranet-2026-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000,       // 8 horas
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  }
}));

// Helpers
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Middleware de autenticación
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ ok: false, mensaje: 'No autenticado' });
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.rol === 'admin') return next();
  res.status(403).json({ ok: false, mensaje: 'Acceso restringido a administradores' });
}

// Archivos estáticos
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));

// Rutas HTML protegidas
function authRedirect(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login.html');
}
app.get('/', authRedirect, (req, res) => res.sendFile(path.join(__dirname, 'public', 'catalogo.html')));
app.get('/catalogo.html', authRedirect, (req, res) => res.sendFile(path.join(__dirname, 'public', 'catalogo.html')));
app.get('/admin.html', authRedirect, (req, res) => {
  if (req.session.user.rol !== 'admin') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/encuesta.html', authRedirect, (req, res) => res.sendFile(path.join(__dirname, 'public', 'encuesta.html')));

// API: Auth
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

// Aquí agregas tus demás APIs (productos, precios, badges, ventas, etc.) sin cambios

// Iniciar servidor
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