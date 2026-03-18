══════════════════════════════════════════════════════════════
  INTRANET AMIN v1.0
  Catálogo Hotel Dreams & Coco Home
  Andina de Materiales Industriales S.A.S
══════════════════════════════════════════════════════════════

REQUISITOS
──────────
  • Node.js instalado en el equipo que hará de servidor
    Descarga gratuita: https://nodejs.org  (versión LTS)
  • Conexión de red WiFi/LAN en la oficina


INSTALACIÓN (solo la primera vez)
───────────────────────────────────
  1. Doble clic en  INSTALAR.bat
  2. Espera que termine la instalación
  3. Listo — no se repite


INICIAR EL SERVIDOR
────────────────────
  1. Doble clic en  INICIAR.bat
  2. Aparecerá una ventana con dos direcciones:
       📺 Esta PC:   http://localhost:3000
       🌐 Red LAN:   http://192.168.X.X:3000  ← la que compartes
  3. NO cierres esa ventana mientras el servidor esté en uso
  4. Para detener: Ctrl+C en la ventana del servidor


ACCESO DESDE OTROS EQUIPOS (Red LAN)
──────────────────────────────────────
  1. El equipo servidor debe estar encendido con INICIAR.bat activo
  2. En cualquier otro PC de la misma red:
     → Abrir navegador (Chrome, Edge, etc.)
     → Escribir la dirección "Red LAN" que muestra el servidor
       Ejemplo:  http://192.168.1.15:3000
  3. Ingresar con usuario y contraseña


GESTIÓN DE USUARIOS
────────────────────
  Archivo:  usuarios.json
  Editar con Bloc de Notas.

  Formato:
  [
    { "usuario": "nombre_login", "clave": "contraseña", "nombre": "Nombre Completo" },
    { "usuario": "otro_login",   "clave": "otra_clave",  "nombre": "Otro Empleado"   }
  ]

  Reiniciar INICIAR.bat después de cualquier cambio.

  Usuarios por defecto:
    admin    / Admin2026!
    asesor1  / asesor1
    asesor2  / asesor2
    asesor3  / asesor3

  ⚠ Cambia las contraseñas antes de usar en producción.


ACTUALIZAR NOMBRES Y PRECIOS DE PRODUCTOS
───────────────────────────────────────────
  Archivo:  public/catalogo.html
  Abrir con Bloc de Notas o VSCode.
  Buscar el texto:  ⚠️  ACTUALIZAR

  Para cada producto cambiar:
    nombre:      "Hotel Dreams — Nombre Real del Producto"
    descripcion: "Descripción del producto"
    precio:       0  →  precio real en pesos (ej: 899000)

  Ejemplo:
    { cod: 's160', nombre: 'Queen', medidas: '160×190 cm', precio: 1099000, ... }

  No es necesario reiniciar el servidor — recarga el navegador.


AGREGAR O CAMBIAR IMÁGENES
────────────────────────────
  Copiar imágenes JPG/PNG a:  public/img/
  Actualizar el campo  imgMain  en el array CATALOGO del catalogo.html.
  Ejemplo:  imgMain: 'img/mi_producto.jpg'


CORREO DE PEDIDOS
──────────────────
  Actualmente configurado para enviar a:
    aux.lineacomercial@amin.com.co

  Para cambiarlo: buscar EMAIL_PEDIDOS en public/catalogo.html


══════════════════════════════════════════════════════════════
  Intranet AMIN v1.0 · 2026 · Uso interno exclusivo
══════════════════════════════════════════════════════════════
