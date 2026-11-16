import type { Certificado, TipoCertificado } from '@/lib/api';

export const NOMBRE_CERTIFICADO: Record<TipoCertificado, string> = {
  alumno_regular: 'Certificado de alumno regular',
  notas: 'Certificado de notas',
  asistencia: 'Certificado de asistencia',
};

export const DESCRIPCION_CERTIFICADO: Record<TipoCertificado, string> = {
  alumno_regular: 'Acredita que el estudiante está matriculado y asiste al colegio este año.',
  notas: 'Promedio por asignatura y promedio general a la fecha.',
  asistencia: 'Días asistidos, ausencias y porcentaje de asistencia a la fecha.',
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const decimal = (n: number) => n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// "2026-11-15" → "15 de noviembre de 2026"
export const fechaLarga = (iso: string) => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${anio}`;
};

export type TextoCertificado = {
  titulo: string;
  colegio: string;
  parrafos: string[];
  tabla: { asignatura: string; notas: string; promedio: string }[];
  pie: string[];
};

// Texto del certificado. Lo usan la vista en pantalla, la impresión (web) y el botón Compartir (teléfono).
export function textoCertificado(c: Certificado): TextoCertificado {
  const d = c.contenido;
  const parrafos: string[] = [];
  const tabla: TextoCertificado['tabla'] = [];

  if (c.tipo === 'alumno_regular') {
    parrafos.push(
      `${d.colegio} certifica que ${d.alumno} es estudiante regular del curso ${d.curso} durante el año escolar ${d.anio}.`,
    );
  }
  if (c.tipo === 'notas') {
    parrafos.push(`${d.colegio} certifica que ${d.alumno}, estudiante del curso ${d.curso}, registra las siguientes calificaciones en el año escolar ${d.anio}:`);
    for (const a of d.asignaturas ?? []) {
      tabla.push({ asignatura: a.asignatura, notas: plural(a.cantidad, 'nota', 'notas'), promedio: decimal(a.promedio) });
    }
    parrafos.push(
      d.promedio === null || d.promedio === undefined
        ? 'A la fecha no registra calificaciones.'
        : `Promedio general a la fecha: ${decimal(d.promedio)} (escala de 1,0 a 7,0; nota mínima de aprobación 4,0).`,
    );
  }
  if (c.tipo === 'asistencia') {
    parrafos.push(
      d.dias
        ? `${d.colegio} certifica que ${d.alumno}, estudiante del curso ${d.curso}, registra ${plural(d.dias, 'día de clases', 'días de clases')} en el año escolar ${d.anio}: asistió ${plural(d.presentes ?? 0, 'día', 'días')} (${plural(d.atrasos ?? 0, 'con atraso', 'con atraso')}), tiene ${plural(d.ausentes ?? 0, 'ausencia', 'ausencias')} y ${plural(d.justificados ?? 0, 'inasistencia justificada', 'inasistencias justificadas')}.`
        : `${d.colegio} certifica que ${d.alumno}, estudiante del curso ${d.curso}, aún no registra asistencia en el año escolar ${d.anio}.`,
    );
    if (d.porcentaje !== null && d.porcentaje !== undefined) parrafos.push(`Porcentaje de asistencia a la fecha: ${d.porcentaje} %.`);
  }

  parrafos.push('Se extiende el presente certificado a petición del apoderado, para los fines que estime convenientes.');
  return {
    titulo: NOMBRE_CERTIFICADO[c.tipo],
    colegio: d.colegio,
    parrafos,
    tabla,
    pie: [
      `Emitido el ${fechaLarga(d.fecha)} desde SalaAbierta.`,
      `Código de verificación: ${c.codigo}`,
      'La dirección del colegio puede comprobar la autenticidad de este documento con el código de verificación.',
    ],
  };
}

// Versión en texto simple, para compartir por mensajería o correo
export function certificadoComoTexto(c: Certificado) {
  const t = textoCertificado(c);
  const [intro, ...resto] = t.parrafos;
  const filas = t.tabla.map((f) => `• ${f.asignatura}: promedio ${f.promedio} (${f.notas})`);
  return [t.colegio.toUpperCase(), t.titulo, '', intro, ...filas, ...resto, '', ...t.pie].join('\n');
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Página lista para imprimir o guardar como PDF desde el navegador
export function certificadoComoHtml(c: Certificado) {
  const t = textoCertificado(c);
  const [intro, ...resto] = t.parrafos;
  const tabla = t.tabla.length
    ? `<table><thead><tr><th>Asignatura</th><th>Notas registradas</th><th>Promedio</th></tr></thead><tbody>${t.tabla
        .map((f) => `<tr><td>${escapar(f.asignatura)}</td><td>${escapar(f.notas)}</td><td>${escapar(f.promedio)}</td></tr>`)
        .join('')}</tbody></table>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(t.titulo)} · ${escapar(c.contenido.alumno)}</title>
<style>
  body { color: #241610; font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; margin: 0 auto; max-width: 680px; padding: 48px 32px; }
  .colegio { color: #5d3b2b; font-size: 14px; font-weight: bold; letter-spacing: 3px; text-align: center; text-transform: uppercase; }
  h1 { border-bottom: 2px solid #5d3b2b; font-size: 26px; margin: 8px 0 32px; padding-bottom: 16px; text-align: center; }
  p { font-size: 17px; margin: 0 0 16px; text-align: justify; }
  table { border-collapse: collapse; margin: 0 0 20px; width: 100%; }
  th, td { border-bottom: 1px solid #dcb894; font-size: 16px; padding: 8px 6px; text-align: left; }
  th:last-child, td:last-child { text-align: right; }
  footer { border-top: 1px solid #dcb894; color: #5d3b2b; font-family: Arial, sans-serif; font-size: 13px; margin-top: 48px; padding-top: 16px; }
  footer p { font-size: 13px; margin: 0 0 4px; text-align: left; }
  .codigo { color: #241610; font-family: 'Courier New', monospace; font-size: 15px; font-weight: bold; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="colegio">${escapar(t.colegio)}</div>
<h1>${escapar(t.titulo)}</h1>
<p>${escapar(intro)}</p>
${tabla}
${resto.map((p) => `<p>${escapar(p)}</p>`).join('\n')}
<footer>${t.pie.map((p, i) => `<p${i === 1 ? ' class="codigo"' : ''}>${escapar(p)}</p>`).join('')}</footer>
</body></html>`;
}
