// Base de conocimiento del asistente (RAG): documentos del colegio y guía de uso de la app.
// Son datos sintéticos de demostración. Cada fragmento indica a qué sección de la app derivar.
module.exports = [
    {
        id: 'uso-notas',
        titulo: 'Cómo ver las notas',
        seccion: '/apoderado/notas',
        texto: 'Para ver las notas de su pupilo, entre a la sección Notas desde el menú principal. Ahí aparecen todas las calificaciones con su asignatura, fecha y el promedio general.',
    },
    {
        id: 'uso-asistencia',
        titulo: 'Cómo ver la asistencia',
        seccion: '/apoderado/asistencia',
        texto: 'La asistencia de su pupilo está en la sección Asistencia del menú principal. Muestra el porcentaje de asistencia y el estado de cada día: presente, ausente, atrasado o justificado.',
    },
    {
        id: 'uso-anotaciones',
        titulo: 'Cómo ver las anotaciones',
        seccion: '/apoderado/anotaciones',
        texto: 'Las anotaciones positivas, negativas y observaciones que registra el profesor están en la sección Anotaciones del menú principal.',
    },
    {
        id: 'uso-confirmar',
        titulo: 'Cómo confirmar un anuncio',
        seccion: '/muro',
        texto: 'Para confirmar que leyó un anuncio, entre a Muro del curso y presione el botón Confirmar recepción bajo el anuncio. El profesor puede ver quiénes confirmaron. También puede escribir un comentario y presionar Enviar comentario.',
    },
    {
        id: 'uso-pupilos',
        titulo: 'Varios pupilos',
        seccion: null,
        texto: 'Si tiene más de un pupilo, en cada sección aparecen sus nombres en la parte superior. Toque el nombre del pupilo que quiere revisar.',
    },
    {
        id: 'uso-sesion',
        titulo: 'Sesión y contraseña',
        seccion: null,
        texto: 'La sesión dura 12 horas; después debe volver a iniciar sesión. Si olvidó su contraseña, debe solicitar una nueva en la secretaría del colegio.',
    },
    {
        id: 'reglamento-escala',
        titulo: 'Reglamento de evaluación: escala de notas',
        seccion: '/apoderado/notas',
        texto: 'Las notas se expresan en una escala de 1,0 a 7,0. La nota mínima de aprobación es 4,0. El promedio de una asignatura se calcula con todas sus calificaciones del semestre.',
    },
    {
        id: 'reglamento-asistencia',
        titulo: 'Reglamento: asistencia mínima',
        seccion: '/apoderado/asistencia',
        texto: 'Para ser promovido, el estudiante debe tener al menos 85% de asistencia anual. Las inasistencias se justifican con certificado médico o comunicación del apoderado en un plazo de 48 horas.',
    },
    {
        id: 'reglamento-atrasos',
        titulo: 'Reglamento: atrasos',
        seccion: '/apoderado/asistencia',
        texto: 'Las clases comienzan a las 8:00. El ingreso después de las 8:15 se registra como atraso. Tres atrasos en un mes generan una citación al apoderado.',
    },
    {
        id: 'colegio-atencion',
        titulo: 'Atención de apoderados',
        seccion: null,
        texto: 'El horario de atención de apoderados es de lunes a viernes de 8:00 a 16:00 en secretaría. Para hablar con el profesor jefe, puede pedir una entrevista en secretaría.',
    },
    {
        id: 'colegio-calendario',
        titulo: 'Calendario escolar',
        seccion: '/muro',
        texto: 'El segundo semestre termina el viernes 11 de diciembre de 2026. Las fechas de reuniones de apoderados y actividades se publican en el Muro del curso.',
    },
    {
        id: 'colegio-uniforme',
        titulo: 'Uniforme y materiales',
        seccion: '/muro',
        texto: 'Los estudiantes deben asistir con el uniforme oficial o buzo del colegio los días de Educación Física. Las listas de materiales se publican en el Muro del curso.',
    },
];
