import { useState } from 'react';
import { Text, View } from 'react-native';

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
import { api, type FiltrosAuditoria } from '@/lib/api';

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

export default function AuditoriaScreen() {
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
      <Card>
        <Text style={{ color: colors.brown, fontWeight: '800' }}>FILTROS</Text>
        <Text style={{ color: colors.brown, fontSize: 14, fontWeight: '800' }}>PERIODO</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PERIODOS.map((p) => (
            <Chip key={p.id} label={p.label} selected={periodo === p.id} onPress={() => setPeriodo(p.id)} />
          ))}
        </View>
        <Field label="Usuario" value={usuario} onChangeText={setUsuario} placeholder="Nombre del usuario" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TABLAS.map((t) => (
            <Chip key={t} label={NOMBRE_TABLA[t]} selected={tabla === t} onPress={() => setTabla(t)} />
          ))}
        </View>
        <Button label="Buscar" onPress={buscar} />
      </Card>

      {loading ? <Loading /> : <Notice text={error} />}
      {data && !data.length && <Empty text="No hay registros para estos filtros." />}
      {data?.map((r) => (
        <Card key={r.id}>
          <Text style={{ color: colors.brown, fontWeight: '800' }}>
            {r.accion} · {r.tabla}
          </Text>
          <Text style={{ color: colors.ink, fontSize: 14 }}>Usuario: {r.usuario ?? 'Desconocido'}</Text>
          <Text style={{ color: colors.ink, fontSize: 14 }}>Registro: #{r.registro_id ?? '—'}</Text>
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
