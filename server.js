const express = require('express');
const session = require('express-session');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Archivos ───────────────────────────────────────────── */
const USUARIOS_FILE  = path.join(__dirname, 'usuarios.json');
const BADGES_FILE    = path.join(__dirname, 'badges.json');
const PRECIOS_FILE   = path.join(__dirname, 'precios.json');
const PRODUCTOS_FILE = path.join(__dirname, 'productos.json');
const OUTLET_FILE    = path.join(__dirname, 'outlet.json');
const VENTAS_FILE    = path.join(__dirname, 'ventas.json');
const DESCUENTOS_FILE  = path.join(__dirname, 'descuentos.json');
const ENCUESTAS_FILE   = path.join(__dirname, 'encuestas_log.json');

/* ── Middlewares base ───────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* 🔥 CLAVE PARA RENDER */
app.set('trust proxy', 1);

/* 🔥 SESIONES CORREGIDAS */
app.use(session({
  name: 'amin_session',
  secret: process.env.SESSION_SECRET || 'amin-secret',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: true,      // 🔥 obligatorio en Render
    sameSite: 'none',  // 🔥 obligatorio
    maxAge: 8 * 60 * 60 * 1000
  }
}));

/* ── SERVIR ARCHIVOS ESTÁTICOS ─────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── Helpers ───────────────────────────────────────────── */
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

/* ── Middlewares ───────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login.html');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.rol === 'admin') return next();
  res.redirect('/');
}

/* ── RUTAS HTML ────────────────────────────────────────── */

// 🔥 Ruta principal (login)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/catalogo.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'catalogo.html'));
});

app.get('/admin.html', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/encuesta.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'encuesta.html'));
});

/* ── AUTH ─────────────────────────────────────────────── */
app.post('/api/login', (req, res) => {
  try {
    const { usuario, clave } = req.body;
    const lista = readJson(USUARIOS_FILE, []);

    const user = lista.find(u =>
      u.usuario === usuario && u.clave === clave
    );

    if (!user) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Usuario o contraseña incorrectos'
      });
    }

    req.session.regenerate(err => {
      if (err) return res.status(500).json({ ok: false });

      req.session.user = {
        usuario: user.usuario,
        nombre: user.nombre,
        rol: user.rol || 'asesor'
      };

      req.session.save(err => {
        if (err) return res.status(500).json({ ok: false });

        console.log('✅ Sesión creada');

        res.json({
          ok: true,
          nombre: user.nombre,
          rol: user.rol || 'asesor'
        });
      });
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('amin_session');
    res.json({ ok: true });
  });
});

app.get('/api/sesion', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ ok: true, ...req.session.user });
  } else {
    res.json({ ok: false });
  }
});

/* ── API protegida ─────────────────────────────────────── */
app.get('/api/config', requireAuth, (req, res) => {
  res.json({
    ok: true,
    badges:      readJson(BADGES_FILE, {}),
    precios:     readJson(PRECIOS_FILE, {}),
    productos:   readJson(PRODUCTOS_FILE, {}),
    descuentos:  readJson(DESCUENTOS_FILE, []),
  });
});

/* ── DEBUG ─────────────────────────────────────────────── */
app.get('/test-session', (req, res) => {
  res.json({
    session: req.session,
    user: req.session?.user || null
  });
});

/* ── INICIO ───────────────────────────────────────────── */
app.listen(PORT, '0.0.0.0', () => {
  let lanIP = 'localhost';
  Object.values(os.networkInterfaces()).forEach(iface =>
    iface.forEach(addr => {
      if (addr.family === 'IPv4' && !addr.internal) lanIP = addr.address;
    })
  );

  console.log(`Servidor activo en ${PORT}`);
});