import { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  colors,
  Empty,
  Field,
  formatFecha,
  hoyISO,
  Loading,
  Notice,
  Screen,
  sumarDias,
  useAsync,
} from '@/components/ui';
import { api, type FiltrosAuditoria, type RegistroAuditoria } from '@/lib/api';
import { Text } from '@/components/texto';

const TABLAS = ['todas', 'asistencia', 'calificaciones', 'anotaciones', 'anuncios', 'umbrales_alerta'] as const;
const NOMBRE_TABLA: Record<(typeof TABLAS)[number], string> = {
  todas: 'Todas',
  asistencia: 'Asistencia',
  calificaciones: 'Notas',
  anotaciones: 'Anotaciones',
  anuncios: 'Anuncios',
  umbrales_alerta: 'Umbrales',
};

// T9: periodos predefinidos en vez de escribir fechas a mano
const PERIODOS = [
  { id: 'hoy', label: 'Hoy', dias: 0 },
  { id: '7', label: 'Últimos 7 días', dias: 6 },
  { id: '30', label: 'Últimos 30 días', dias: 29 },
  { id: 'todo', label: 'Todo', dias: null },
] as const;

const formatFechaHora = (iso: string) => {
  const [dia, hora] = iso.split('T');
  return `${formatFecha(dia)} ${hora.slice(0, 5)}`;
};

const formatDatos = (datos: Record<string, unknown> | null) => (datos ? JSON.stringify(datos, null, 2) : '—');

// --- Vista simple: cada cambio explicado en una frase, sin identificadores ni JSON ---

const ESTADO: Record<string, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  atrasado: 'Atrasado',
  justificado: 'Justificado',
};
const TIPO_ANOTACION: Record<string, string> = { positiva: 'positiva', negativa: 'negativa', observacion: 'de observación' };
const UMBRAL: Record<string, (v: number) => string> = {
  promedio_minimo: (v) => `Promedio mínimo ${decimal(v)}`,
  asistencia_minima: (v) => `Asistencia mínima ${v}%`,
  notas_minimas: (v) => `Notas mínimas ${v}`,
  dias_minimos: (v) => `Días mínimos ${v}`,
};
const CATEGORIA: Record<string, string> = {
  asistencia: 'Asistencia',
  calificaciones: 'Notas',
  anotaciones: 'Anotaciones',
  anuncios: 'Muro',
  umbrales_alerta: 'Alertas',
};

function decimal(v: unknown) {
  return typeof v === 'number' ? v.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';
}
const texto = (v: unknown) => (typeof v === 'string' ? v : '');
const fechaDe = (v: unknown) => (typeof v === 'string' ? formatFecha(v) : '');

function describir(r: RegistroAuditoria): { titulo: string; lineas: string[] } {
  const antes = r.datos_antes ?? {};
  const despues = r.datos_despues ?? {};
  const alumno = r.alumno ?? 'un alumno';
  const esCambio = r.accion === 'UPDATE';

  switch (r.tabla) {
    case 'asistencia':
      return esCambio
        ? {
            titulo: `Cambió la asistencia de ${alumno}`,
            lineas: [`Día ${fechaDe(despues.fecha)}: ${ESTADO[texto(antes.estado)] ?? '—'} → ${ESTADO[texto(despues.estado)] ?? '—'}`],
          }
        : { titulo: `Registró la asistencia de ${alumno}`, lineas: [`Día ${fechaDe(despues.fecha)}: ${ESTADO[texto(despues.estado)] ?? '—'}`] };
    case 'calificaciones': {
      const materia = `${texto(despues.asignatura) || texto(antes.asignatura)} · ${texto(despues.descripcion) || texto(antes.descripcion)}`;
      return esCambio
        ? { titulo: `Cambió una nota de ${alumno}`, lineas: [materia, `Nota: ${decimal(antes.nota)} → ${decimal(despues.nota)}`] }
        : { titulo: `Registró una nota de ${alumno}`, lineas: [materia, `Nota: ${decimal(despues.nota)}`] };
    }
    case 'anotaciones':
      return {
        titulo: `Registró una anotación ${TIPO_ANOTACION[texto(despues.tipo)] ?? ''} a ${alumno}`.replace('  ', ' '),
        lineas: [`"${texto(despues.descripcion)}"`],
      };
    case 'anuncios':
      return {
        titulo: `Publicó un anuncio${r.curso ? ` en ${r.curso}` : ''}`,
        lineas: [`"${texto(despues.titulo)}"`],
      };
    case 'umbrales_alerta': {
      const cambios = Object.keys(UMBRAL)
        .filter((k) => antes[k] !== despues[k])
        .map((k) => `${UMBRAL[k](Number(antes[k]))} → ${UMBRAL[k](Number(despues[k])).replace(/^[^0-9]*/, '')}`);
      return { titulo: 'Cambió los umbrales de las alertas tempranas', lineas: cambios.length ? cambios : ['Sin cambios en los valores.'] };
    }
    default:
      return { titulo: `${esCambio ? 'Modificó' : 'Registró'} un dato en ${r.tabla}`, lineas: [] };
  }
}

export default function AuditoriaScreen() {
  const [vista, setVista] = useState<'simple' | 'tecnica'>('simple');
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]['id']>('todo');
  const [usuario, setUsuario] = useState('');
  const [tabla, setTabla] = useState<(typeof TABLAS)[number]>('todas');
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({});
  const { data, error, loading } = useAsync(() => api.auditoria(filtros), [filtros]);

  const buscar = () => {
    const dias = PERIODOS.find((p) => p.id === periodo)?.dias ?? null;
    setFiltros({
      desde: dias === null ? '' : sumarDias(hoyISO(), -dias),
      hasta: dias === null ? '' : hoyISO(),
      usuario: usuario.trim(),
      tabla: tabla === 'todas' ? '' : tabla,
    });
  };

  return (
    <Screen title="Auditoría">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Vista simple" selected={vista === 'simple'} onPress={() => setVista('simple')} />
        <Chip label="Vista técnica" selected={vista === 'tecnica'} onPress={() => setVista('tecnica')} />
      </View>
      <Card>
        <Text style={{ color: colors.brown, fontWeight: '800' }}>FILTROS</Text>
        <Text style={{ color: colors.brown, fontSize: 14, fontWeight: '800' }}>PERIODO</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PERIODOS.map((p) => (
            <Chip key={p.id} label={p.label} selected={periodo === p.id} onPress={() => setPeriodo(p.id)} />
          ))}
        </View>
        <Field label="Quién hizo el cambio" value={usuario} onChangeText={setUsuario} placeholder="Por ejemplo: Marcela" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TABLAS.map((t) => (
            <Chip key={t} label={NOMBRE_TABLA[t]} selected={tabla === t} onPress={() => setTabla(t)} />
          ))}
        </View>
        <Button label="Buscar" onPress={buscar} />
      </Card>

      {loading ? <Loading /> : <Notice text={error} />}
      {data && !data.length && <Empty text="No hay registros para estos filtros." />}
      {vista === 'simple' &&
        data?.map((r) => {
          const d = describir(r);
          return (
            <Card key={r.id}>
              <Text style={{ color: colors.textoSecundario, fontSize: 14, fontWeight: '800', textTransform: 'uppercase' }}>
                {CATEGORIA[r.tabla] ?? r.tabla}
              </Text>
              <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>{d.titulo}</Text>
              {d.lineas.map((l, i) => (
                <Text key={i} style={{ color: colors.ink, fontSize: 16 }}>
                  {l}
                </Text>
              ))}
              <Text style={{ color: colors.textoSecundario, fontSize: 14 }}>
                {r.usuario ?? 'Usuario desconocido'} · {formatFechaHora(r.fecha)}
              </Text>
            </Card>
          );
        })}
      {vista === 'tecnica' &&
        data?.map((r) => (
        <Card key={r.id}>
          <Text style={{ color: colors.brown, fontWeight: '800' }}>
            {r.accion} · {r.tabla}
          </Text>
          <Text style={{ color: colors.ink, fontSize: 14 }}>Usuario: {r.usuario ?? 'Desconocido'}</Text>
          <Text style={{ color: colors.ink, fontSize: 14 }}>Registro: #{r.registro_id ?? '—'}</Text>
          {r.alumno && <Text style={{ color: colors.ink, fontSize: 14 }}>Alumno: {r.alumno}</Text>}
          <Text style={{ color: colors.textoSecundario, fontSize: 14 }}>{formatFechaHora(r.fecha)}</Text>
          <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 6 }}>Datos anteriores</Text>
          <Text style={{ color: colors.ink, fontFamily: 'monospace', fontSize: 14 }}>{formatDatos(r.datos_antes)}</Text>
          <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 6 }}>Datos posteriores</Text>
          <Text style={{ color: colors.ink, fontFamily: 'monospace', fontSize: 14 }}>{formatDatos(r.datos_despues)}</Text>
        </Card>
      ))}
    </Screen>
  );
}
