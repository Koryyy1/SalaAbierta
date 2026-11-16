import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { Icono } from '@/components/icono';
import { Text } from '@/components/texto';
import { Button, Card, colors, formatFecha, Loading, messageOf, Notice, PupilScreen, useAsync, useToast } from '@/components/ui';
import { api, type Certificado, type TipoCertificado } from '@/lib/api';
import { certificadoComoHtml, certificadoComoTexto, DESCRIPCION_CERTIFICADO, NOMBRE_CERTIFICADO, textoCertificado } from '@/lib/certificado';

const TIPOS: TipoCertificado[] = ['alumno_regular', 'notas', 'asistencia'];

// En la web se abre una página lista para imprimir o guardar como PDF; en el teléfono se comparte como texto
async function entregar(c: Certificado): Promise<string | null> {
  if (Platform.OS === 'web') {
    const ventana = window.open('', '_blank');
    if (!ventana) return 'El navegador bloqueó la ventana del certificado. Permita las ventanas emergentes e intente de nuevo.';
    ventana.document.write(certificadoComoHtml(c));
    ventana.document.close();
    ventana.focus();
    ventana.print();
    return null;
  }
  await Share.share({ title: NOMBRE_CERTIFICADO[c.tipo], message: certificadoComoTexto(c) });
  return null;
}

// El certificado como hoja de papel: es lo mismo que se imprime o comparte
function Documento({ certificado }: { certificado: Certificado }) {
  const t = textoCertificado(certificado);
  const [intro, ...resto] = t.parrafos;
  return (
    <View style={styles.hoja}>
      <Text style={styles.colegio}>{t.colegio}</Text>
      <Text style={styles.titulo} accessibilityRole="header">
        {t.titulo}
      </Text>
      <Text style={styles.parrafo}>{intro}</Text>
      {t.tabla.length > 0 && (
        <View>
          {t.tabla.map((f) => (
            <View key={f.asignatura} style={styles.fila}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.filaTexto}>{f.asignatura}</Text>
                <Text style={styles.filaDetalle}>{f.notas}</Text>
              </View>
              <Text style={styles.filaPromedio}>{f.promedio}</Text>
            </View>
          ))}
        </View>
      )}
      {resto.map((p) => (
        <Text key={p} style={styles.parrafo}>
          {p}
        </Text>
      ))}
      <View style={styles.pie}>
        <Text style={styles.pieTexto}>{t.pie[0]}</Text>
        <Text style={styles.codigo} selectable>
          {t.pie[1]}
        </Text>
        <Text style={styles.pieTexto}>{t.pie[2]}</Text>
      </View>
    </View>
  );
}

function Certificados({ alumnoId }: { alumnoId: number }) {
  const { data: emitidos, error, loading, reload } = useAsync(() => api.certificados(alumnoId), [alumnoId]);
  const [abierto, setAbierto] = useState<Certificado | null>(null);
  const [generando, setGenerando] = useState<TipoCertificado | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const toast = useToast();

  const generar = async (tipo: TipoCertificado) => {
    setGenerando(tipo);
    setAviso(null);
    try {
      setAbierto(await api.emitirCertificado(alumnoId, tipo));
      toast('Certificado listo.');
      void reload();
    } catch (e) {
      setAviso(messageOf(e));
    } finally {
      setGenerando(null);
    }
  };

  const entregarAbierto = async () => {
    if (!abierto) return;
    try {
      setAviso(await entregar(abierto));
    } catch (e) {
      setAviso(messageOf(e));
    }
  };

  if (abierto) {
    return (
      <>
        <Documento certificado={abierto} />
        <Notice text={aviso} />
        <Button
          label={Platform.OS === 'web' ? 'Imprimir o guardar como PDF' : 'Compartir certificado'}
          icono={Platform.OS === 'web' ? 'imprimir' : 'compartir'}
          onPress={() => void entregarAbierto()}
        />
        <View style={styles.volver}>
          <Button
            label="Volver a los certificados"
            tone="secondary"
            onPress={() => {
              setAviso(null);
              setAbierto(null);
            }}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Text style={styles.ayuda}>Elija el certificado que necesita. Queda listo al instante y lo puede imprimir, guardar o compartir.</Text>
      <Notice text={aviso ?? error} />
      {TIPOS.map((tipo) => (
        <Card key={tipo}>
          <View style={styles.encabezado}>
            <Icono nombre="certificado" size={24} color={colors.brown} />
            <Text style={styles.nombre}>{NOMBRE_CERTIFICADO[tipo]}</Text>
          </View>
          <Text style={styles.descripcion}>{DESCRIPCION_CERTIFICADO[tipo]}</Text>
          <Button label={generando === tipo ? 'Generando…' : 'Generar certificado'} onPress={() => void generar(tipo)} disabled={generando !== null} />
        </Card>
      ))}

      <Text style={styles.seccion} accessibilityRole="header">
        Emitidos anteriormente
      </Text>
      {loading && <Loading filas={1} />}
      {emitidos && !emitidos.length && <Text style={styles.ayuda}>Todavía no ha emitido certificados para este estudiante.</Text>}
      {emitidos?.map((c) => (
        <Card key={c.id}>
          <Text style={styles.nombre}>{NOMBRE_CERTIFICADO[c.tipo]}</Text>
          <Text style={styles.descripcion}>
            {formatFecha(c.contenido.fecha)} · {c.codigo}
          </Text>
          <Button label="Ver certificado" tone="secondary" icono="siguiente" onPress={() => setAbierto(c)} />
        </Card>
      ))}
    </>
  );
}

export default function CertificadosApoderado() {
  return <PupilScreen title="Certificados">{(alumno) => <Certificados key={alumno.id} alumnoId={alumno.id} />}</PupilScreen>;
}

const styles = StyleSheet.create({
  ayuda: { color: colors.sand, fontSize: 16, lineHeight: 22 },
  seccion: { color: colors.white, fontSize: 18, fontWeight: '800', marginTop: 8 },
  encabezado: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  nombre: { color: colors.ink, flexShrink: 1, fontSize: 17, fontWeight: '800' },
  descripcion: { color: colors.textoSecundario, fontSize: 15, lineHeight: 21 },
  volver: { backgroundColor: colors.sand, borderRadius: 14 },
  hoja: { backgroundColor: colors.white, borderRadius: 6, gap: 14, paddingHorizontal: 20, paddingVertical: 26 },
  colegio: { color: colors.brown, fontSize: 13, fontWeight: '800', letterSpacing: 2, textAlign: 'center', textTransform: 'uppercase' },
  titulo: {
    borderBottomColor: colors.brown,
    borderBottomWidth: 2,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
    paddingBottom: 12,
    textAlign: 'center',
  },
  parrafo: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  fila: {
    alignItems: 'center',
    borderBottomColor: colors.sandDark,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  filaTexto: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  filaDetalle: { color: colors.textoSecundario, fontSize: 14 },
  filaPromedio: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  pie: { borderTopColor: colors.sandDark, borderTopWidth: 1, gap: 4, marginTop: 6, paddingTop: 12 },
  pieTexto: { color: colors.textoSecundario, fontSize: 14, lineHeight: 19 },
  codigo: { color: colors.ink, fontSize: 15, fontWeight: '800' },
});
