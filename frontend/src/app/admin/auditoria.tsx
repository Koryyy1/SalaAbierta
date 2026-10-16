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
  Loading,
  Notice,
  Screen,
  useAsync,
} from '@/components/ui';
import { api, type FiltrosAuditoria } from '@/lib/api';

const TABLAS = ['todas', 'asistencia', 'calificaciones', 'anotaciones', 'anuncios'] as const;

const formatFechaHora = (iso: string) => {
  const [dia, hora] = iso.split('T');
  return `${formatFecha(dia)} ${hora.slice(0, 5)}`;
};

const formatDatos = (datos: Record<string, unknown> | null) => (datos ? JSON.stringify(datos, null, 2) : '—');

export default function AuditoriaScreen() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [usuario, setUsuario] = useState('');
  const [tabla, setTabla] = useState<(typeof TABLAS)[number]>('todas');
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({});
  const { data, error, loading } = useAsync(() => api.auditoria(filtros), [filtros]);

  const buscar = () =>
    setFiltros({
      desde: desde.trim(),
      hasta: hasta.trim(),
      usuario: usuario.trim(),
      tabla: tabla === 'todas' ? '' : tabla,
    });

  return (
    <Screen title="Auditoría">
      <Card>
        <Text style={{ color: colors.brown, fontWeight: '800' }}>FILTROS</Text>
        <Field
          label="Desde (AAAA-MM-DD)"
          value={desde}
          onChangeText={setDesde}
          autoCapitalize="none"
          placeholder="2026-01-01"
        />
        <Field
          label="Hasta (AAAA-MM-DD)"
          value={hasta}
          onChangeText={setHasta}
          autoCapitalize="none"
          placeholder="2026-12-31"
        />
        <Field label="Usuario" value={usuario} onChangeText={setUsuario} placeholder="Nombre del usuario" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TABLAS.map((t) => (
            <Chip key={t} label={t === 'todas' ? 'Todas' : t} selected={tabla === t} onPress={() => setTabla(t)} />
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
          <Text style={{ color: '#7a5640', fontSize: 12 }}>{formatFechaHora(r.fecha)}</Text>
          <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 6 }}>Datos anteriores</Text>
          <Text style={{ color: colors.ink, fontFamily: 'monospace', fontSize: 12 }}>{formatDatos(r.datos_antes)}</Text>
          <Text style={{ color: colors.ink, fontWeight: '700', marginTop: 6 }}>Datos posteriores</Text>
          <Text style={{ color: colors.ink, fontFamily: 'monospace', fontSize: 12 }}>{formatDatos(r.datos_despues)}</Text>
        </Card>
      ))}
    </Screen>
  );
}
