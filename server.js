const express = require('express');
const session = require('express-session');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3000;

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

const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'amin-intranet-2026-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  }
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
  if (!req.session || !req.session.user) return res.redirect('/login.html');
  if (req.session.user.rol === 'cliente') return res.redirect('/mi-cuenta.html');
  return next();
}
app.get('/', authRedirect, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'catalogo.html')));
app.get('/catalogo.html', authRedirect, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'catalogo.html')));
function requireCliente(req, res, next) {
  if (req.session && req.session.user && req.session.user.rol === 'cliente') return next();
  res.status(403).json({ ok: false, mensaje: 'Acceso solo para clientes' });
}

app.get('/admin.html', authRedirect, (req, res) => {
  if (req.session.user.rol !== 'admin') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/mi-cuenta.html', (req, res) => {
  if (!req.session || !req.session.user) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'mi-cuenta.html'));
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
      req.session.user = { usuario: user.usuario, nombre: user.nombre, rol: user.rol || 'asesor', clienteId: user.clienteId || null };
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
  // clienteId incluido automáticamente via spread
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
  res.json({ ok: true, usuarios: lista.map(u => ({ usuario:u.usuario, nombre:u.nombre, rol:u.rol||'asesor', clienteId:u.clienteId||null })) });
});

app.post('/api/usuarios', requireAuth, requireAdmin, (req, res) => {
  const { usuario, nombre, clave, rol, clienteId } = req.body;
  if (!usuario || !nombre || !clave) return res.status(400).json({ ok:false, mensaje:'Faltan campos obligatorios' });
  const lista = readJson(USUARIOS_FILE, []);
  if (lista.find(u => u.usuario === usuario))
    return res.status(400).json({ ok:false, mensaje:'El usuario ya existe' });
  const entry = { usuario, nombre, clave, rol: rol||'asesor' };
  if (clienteId) entry.clienteId = clienteId;
  lista.push(entry);
  writeJson(USUARIOS_FILE, lista);
  res.json({ ok:true });
});

// Eliminar usuario vinculado a un cliente (por clienteId)
app.delete('/api/usuarios/by-cliente/:cid', requireAuth, requireAdmin, (req, res) => {
  let lista = readJson(USUARIOS_FILE, []);
  const antes = lista.length;
  lista = lista.filter(u => u.clienteId !== req.params.cid);
  if (lista.length === antes) return res.status(404).json({ ok:false, mensaje:'No hay usuario vinculado a este cliente' });
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

/* ── API: Outlet — descontar stock por venta ─────────────── */
app.post('/api/outlet/venta', requireAuth, (req, res) => {
  // req.body = { 'out-xxx': cantidad, 'out-yyy': cantidad }
  const pedido = req.body;
  if (typeof pedido !== 'object' || Array.isArray(pedido))
    return res.status(400).json({ ok: false, mensaje: 'Se espera un objeto { id: cantidad }' });

  const outlet = readJson(OUTLET_FILE, []);
  const vendidos = [];

  Object.entries(pedido).forEach(([id, qty]) => {
    const idx = outlet.findIndex(p => p.id === id);
    if (idx === -1) return;
    const cantVendida = parseInt(qty) || 0;
    outlet[idx].cantidad = (outlet[idx].cantidad || 0) - cantVendida;
    if (outlet[idx].cantidad < 0) outlet[idx].cantidad = 0;
    vendidos.push({ id, nombre: outlet[idx].nombre, restante: outlet[idx].cantidad });
  });

  // Eliminar items con stock en cero
  const outletFiltrado = outlet.filter(p => (p.cantidad ?? 1) > 0);

  writeJson(OUTLET_FILE, outletFiltrado);
  res.json({ ok: true, outlet: outletFiltrado, vendidos });
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

/* ── API: Mi cuenta (rol cliente) ───────────────────────── */
app.get('/api/mi-data', (req, res) => {
  if (!req.session || !req.session.user) return res.status(401).json({ ok: false });
  const { clienteId, nombre, usuario } = req.session.user;
  if (!clienteId) return res.status(403).json({ ok: false, mensaje: 'Sin cliente asignado' });
  const clientes = readJson(CLIENTES_FILE, []);
  const cliente  = clientes.find(c => c.id === clienteId);
  const data     = readJson(CLIENTES_DATA_FILE, {});
  res.json({ ok: true, cliente, data: data[clienteId] || {}, nombre, usuario });
});

/* ── API: Clientes ───────────────────────────────────────── */
const CLIENTES_FILE      = path.join(__dirname, 'clientes.json');
const CLIENTES_DATA_FILE = path.join(__dirname, 'clientes_data.json');

app.get('/api/clientes', requireAuth, (req, res) =>
  res.json({ ok: true, clientes: readJson(CLIENTES_FILE, []) }));

app.post('/api/clientes', requireAuth, requireAdmin, (req, res) => {
  const lista = req.body;
  if (!Array.isArray(lista)) return res.status(400).json({ ok: false, mensaje: 'Se espera un array' });
  writeJson(CLIENTES_FILE, lista);
  res.json({ ok: true, clientes: lista });
});

app.get('/api/clientes-data', requireAuth, (req, res) =>
  res.json({ ok: true, data: readJson(CLIENTES_DATA_FILE, {}) }));

app.post('/api/clientes-data', requireAuth, requireAdmin, (req, res) => {
  // body: { clienteId, periodo, pedidos, ventas, unidades, devoluciones }
  const { clienteId, periodo, pedidos, ventas, unidades, devoluciones } = req.body;
  if (!clienteId || !periodo) return res.status(400).json({ ok: false, mensaje: 'clienteId y periodo requeridos' });
  const data = readJson(CLIENTES_DATA_FILE, {});
  if (!data[clienteId]) data[clienteId] = {};
  data[clienteId][periodo] = {
    pedidos:     parseInt(pedidos)     || 0,
    ventas:      parseFloat(ventas)    || 0,
    unidades:    parseInt(unidades)    || 0,
    devoluciones:parseInt(devoluciones)|| 0,
  };
  writeJson(CLIENTES_DATA_FILE, data);
  res.json({ ok: true, data });
});

app.delete('/api/clientes-data', requireAuth, requireAdmin, (req, res) => {
  const { clienteId, periodo } = req.body;
  const data = readJson(CLIENTES_DATA_FILE, {});
  if (clienteId && periodo && data[clienteId]) {
    delete data[clienteId][periodo];
  } else if (clienteId) {
    delete data[clienteId];
  }
  writeJson(CLIENTES_DATA_FILE, data);
  res.json({ ok: true });
});

app.post('/api/clientes-importar', requireAuth, requireAdmin, (req, res) => {
  // body: array de { clienteId, periodo, pedidos, ventas, unidades, devoluciones }
  const rows = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ ok: false, mensaje: 'Se espera un array' });
  const data = readJson(CLIENTES_DATA_FILE, {});
  let count = 0;
  rows.forEach(r => {
    if (!r.clienteId || !r.periodo) return;
    if (!data[r.clienteId]) data[r.clienteId] = {};
    data[r.clienteId][r.periodo] = {
      pedidos:     parseInt(r.pedidos)     || 0,
      ventas:      parseFloat(r.ventas)    || 0,
      unidades:    parseInt(r.unidades)    || 0,
      devoluciones:parseInt(r.devoluciones)|| 0,
    };
    count++;
  });
  writeJson(CLIENTES_DATA_FILE, data);
  res.json({ ok: true, importados: count, data });
});

/* ── Ruta: Dashboard Clientes ───────────────────────────── */
app.get('/clientes.html', authRedirect, (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'clientes.html')));

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
