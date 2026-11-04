// T6: limita los intentos fallidos de inicio de sesión para frenar ataques de fuerza bruta.
// Por defecto, 5 intentos fallidos cada 15 minutos por combinación de IP y correo.
const MAX_INTENTOS = Number(process.env.LOGIN_MAX_INTENTOS) || 5;
const VENTANA_MS = (Number(process.env.LOGIN_VENTANA_MINUTOS) || 15) * 60 * 1000;

const fallidos = new Map(); // clave -> { cantidad, desde }

const clave = (req, email) => `${req.ip}|${email}`;

function limpiarVencidos(ahora) {
    for (const [k, v] of fallidos) if (ahora - v.desde > VENTANA_MS) fallidos.delete(k);
}

// Minutos que faltan para volver a intentar, o 0 si no está bloqueado
function minutosBloqueado(req, email) {
    const ahora = Date.now();
    const registro = fallidos.get(clave(req, email));
    if (!registro || ahora - registro.desde > VENTANA_MS) return 0;
    return registro.cantidad >= MAX_INTENTOS ? Math.ceil((registro.desde + VENTANA_MS - ahora) / 60000) : 0;
}

function registrarFallo(req, email) {
    const ahora = Date.now();
    if (fallidos.size > 10000) limpiarVencidos(ahora);
    const k = clave(req, email);
    const registro = fallidos.get(k);
    if (!registro || ahora - registro.desde > VENTANA_MS) fallidos.set(k, { cantidad: 1, desde: ahora });
    else registro.cantidad += 1;
}

const registrarExito = (req, email) => fallidos.delete(clave(req, email));

module.exports = { minutosBloqueado, registrarFallo, registrarExito, MAX_INTENTOS };
