const express = require('express');
const session = require('express-session');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Archivos ───────────────────────────────────────────── */
const USUARIOS_FILE  = path.join(__dirname, 'usuarios.json');

/* ── Middlewares base ───────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* 🔥 CLAVE PARA RENDER */
app.set('trust proxy', 1);

/* 🔥 SESIÓN CORREGIDA */
app.use(session({
  name: 'amin_session',
  secret: process.env.SESSION_SECRET || 'amin-secret',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: true,      // 🔥 OBLIGATORIO
    sameSite: 'none',  // 🔥 OBLIGATORIO
    maxAge: 8 * 60 * 60 * 1000
  }
}));

/* 🔥 TEST PARA DEBUG */
app.get('/test-session', (req, res) => {
  res.json({
    session: req.session,
    user: req.session?.user || null
  });
});

/* ── Helpers ───────────────────────────────────────────── */
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

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

    // 🔥 CREAR SESIÓN NUEVA
    req.session.regenerate(err => {
      if (err) {
        console.error('Error regenerate:', err);
        return res.status(500).json({ ok: false });
      }

      req.session.user = {
        usuario: user.usuario,
        nombre: user.nombre,
        rol: user.rol || 'asesor'
      };

      // 🔥 FORZAR GUARDADO
      req.session.save(err => {
        if (err) {
          console.error('Error save:', err);
          return res.status(500).json({ ok: false });
        }

        console.log('✅ Sesión creada:', req.session.user);

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

/* ── PROTECCIÓN ───────────────────────────────────────── */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ ok: false });
}

/* ── RUTA PROTEGIDA DE PRUEBA ─────────────────────────── */
app.get('/privado', requireAuth, (req, res) => {
  res.send('Estás autenticado');
});

/* ── INICIO ───────────────────────────────────────────── */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});