const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Archivos JSON
const USUARIOS_FILE  = path.join(__dirname, 'usuarios.json');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1); // Para Render con HTTPS

app.use(session({
  secret: 'amin-intranet-2026-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000, // 8 horas
    httpOnly: true,
    sameSite: 'lax', // con HTTPS en producción puedes poner 'none'
    secure: false // cambia a true si usas HTTPS real
  }
}));

// Helpers
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

// Middleware para proteger rutas
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login.html');
}

// Archivos estáticos
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));
app.use('/login.html', express.static(path.join(__dirname, 'public', 'login.html')));

// Rutas HTML protegidas
app.get('/', requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'catalogo.html'))
);

// API: Login
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

// API: Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  let lanIP = 'localhost';
  Object.values(os.networkInterfaces()).forEach(iface =>
    iface.forEach(addr => { if (addr.family === 'IPv4' && !addr.internal) lanIP = addr.address; }));
  console.log('\n══════════════════════════════════════════');
  console.log('   ✅  INTRANET AMIN — Servidor activo');
  console.log('══════════════════════════════════════════');
  console.log(`   📺  Esta PC :  http://localhost:${PORT}`);
  console.log(`   🌐  Red LAN :  http://${lanIP}:${PORT}`);
  console.log('──────────────────────────────────────────');
  console.log('   Presiona Ctrl+C para detener.');
  console.log('══════════════════════════════════════════\n');
});