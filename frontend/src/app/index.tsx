import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatFecha, LogoutLink } from '@/components/ui';
import { api, type ResumenPupilo } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type MenuItem = {
  label: string;
  initial: string;
  href?: Href;
  aviso?: string | null;
};

const decimal = (n: number) => n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TIPO: Record<string, string> = { positiva: 'Positiva', negativa: 'Negativa', observacion: 'Observación' };

// Inicio del apoderado: lo más importante de cada pupilo sin tener que entrar a otra pantalla
function ResumenPupilos({ datos, onIr }: { datos: ResumenPupilo[]; onIr: (href: Href) => void }) {
  return (
    <View style={{ gap: 12, marginBottom: 18 }}>
      {datos.map((p) => {
        const promedioBajo = p.promedio !== null && p.promedio < 4;
        const asistenciaBaja = p.asistencia !== null && p.asistencia < 85;
        return (
          <View key={p.id} style={styles.resumen}>
            <Text style={styles.resumenNombre}>
              {p.nombre} · {p.curso}
            </Text>
            <View style={styles.indicadores}>
              <Pressable style={styles.indicador} onPress={() => onIr('/apoderado/notas')} accessibilityRole="button">
                <Text style={styles.indicadorEtiqueta}>Promedio</Text>
                <Text style={[styles.indicadorValor, promedioBajo && { color: '#b3261e' }]}>
                  {p.promedio === null ? '—' : decimal(p.promedio)}
                </Text>
              </Pressable>
              <Pressable style={styles.indicador} onPress={() => onIr('/apoderado/asistencia')} accessibilityRole="button">
                <Text style={styles.indicadorEtiqueta}>Asistencia</Text>
                <Text style={[styles.indicadorValor, asistenciaBaja && { color: '#8a5200' }]}>
                  {p.asistencia === null ? '—' : `${p.asistencia}%`}
                </Text>
              </Pressable>
            </View>
            <Pressable onPress={() => onIr('/apoderado/anotaciones')} accessibilityRole="button">
              <Text style={styles.resumenTexto}>
                {p.ultimaAnotacion
                  ? `Última anotación (${formatFecha(p.ultimaAnotacion.fecha)}): ${TIPO[p.ultimaAnotacion.tipo] ?? p.ultimaAnotacion.tipo}`
                  : 'Sin anotaciones.'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const menuApoderado: MenuItem[] = [
  { label: 'Notas', initial: 'N', href: '/apoderado/notas' },
  { label: 'Anotaciones', initial: 'A', href: '/apoderado/anotaciones' },
  { label: 'Muro del curso', initial: 'M', href: '/muro' },
  { label: 'Asistencia', initial: 'A', href: '/apoderado/asistencia' },
];

const menuProfesor: MenuItem[] = [
  { label: 'Pasar asistencia', initial: 'A', href: '/profesor/asistencia' },
  { label: 'Registrar notas', initial: 'N', href: '/profesor/notas' },
  { label: 'Anotaciones', initial: 'A', href: '/profesor/anotaciones' },
  { label: 'Muro del curso', initial: 'M', href: '/muro' },
  { label: 'Alertas tempranas', initial: '!', href: '/profesor/alertas' },
];

const menuAdmin: MenuItem[] = [
  { label: 'Resumen del colegio', initial: 'R', href: '/admin/resumen' },
  { label: 'Auditoría', initial: 'A', href: '/admin/auditoria' },
  { label: 'Umbrales de alerta', initial: 'U', href: '/admin/umbrales' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const esProfesor = usuario?.rol === 'Profesor';
  const esAdmin = usuario?.rol === 'Administrador';
  const esApoderado = usuario?.rol === 'Apoderado';
  const [resumen, setResumen] = useState<ResumenPupilo[] | null>(null);
  const [alertas, setAlertas] = useState<number | null>(null);

  // Se actualiza cada vez que se vuelve al inicio (por ejemplo, después de registrar notas)
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      if (esApoderado) api.resumenApoderado().then((d) => activo && setResumen(d)).catch(() => {});
      if (esProfesor) api.alertasProfesor().then((d) => activo && setAlertas(d.length)).catch(() => {});
      return () => {
        activo = false;
      };
    }, [esApoderado, esProfesor]),
  );

  const menuProfesorConAlertas = menuProfesor.map((item) =>
    item.href === '/profesor/alertas' && alertas
      ? { ...item, aviso: `${alertas} ${alertas === 1 ? 'alerta activa' : 'alertas activas'}` }
      : item,
  );
  const menuItems = esProfesor
    ? menuProfesorConAlertas
    : esAdmin
      ? menuAdmin
      : usuario?.rol === 'Apoderado'
        ? menuApoderado
        : [];
  const eyebrow = esProfesor ? 'Portal de profesores' : esAdmin ? 'Portal de dirección' : 'Portal de apoderados';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>

          <Text style={styles.welcomeText}>Bienvenido, {usuario?.nombre}</Text>
          <LogoutLink />
        </View>
        <View style={styles.brandBlock}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>SA</Text>
          </View>
          <Text style={styles.brandText}>SALA{'\n'}ABIERTA</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
        {!menuItems.length && <Text style={{ color: '#e6c7a8' }}>Tu perfil no tiene módulos móviles disponibles.</Text>}
        {esApoderado && resumen && resumen.length > 0 && <ResumenPupilos datos={resumen} onIr={(href) => router.push(href)} />}
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              disabled={!item.href}
              onPress={() => item.href && router.push(item.href)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed, !item.href && styles.cardDisabled]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{item.initial}</Text>
                </View>
                {item.aviso && (
                  <View style={styles.aviso} accessibilityLabel={item.aviso}>
                    <Text style={styles.avisoTexto}>{item.aviso}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardFooter}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                  {!item.href && <Text style={styles.soon}>Próximamente</Text>}
                </View>
                {item.href && <Text style={styles.cardChevron}>›</Text>}
              </View>
            </Pressable>
          ))}
        </View>

        {!esProfesor && usuario?.rol === 'Apoderado' && (
          <Pressable
            onPress={() => router.push('/apoderado/asistente')}
            style={({ pressed }) => [styles.chatbotButton, pressed && styles.chatbotButtonPressed]}>
            <View>
              <Text style={styles.chatbotText}>¿Necesitas ayuda?</Text>
              <Text style={styles.chatbotTextBold}>Iniciar Chatbot</Text>
            </View>
            <Text style={styles.chatbotChevron}>›</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  eyebrow: {
    color: '#7a5640',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  welcomeText: {
    color: '#241610',
    flexShrink: 1,
    fontSize: 22,
    fontWeight: '800',
  },
  brandBlock: {
    alignItems: 'center',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#5d3b2b',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  brandMarkText: {
    color: '#e6c7a8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandText: {
    color: '#5d3b2b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
  panel: {
    backgroundColor: '#5d3b2b',
    borderRadius: 32,
    flexGrow: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#e6c7a8',
    borderRadius: 20,
    height: 150,
    justifyContent: 'space-between',
    padding: 16,
    width: '47%',
  },
  cardPressed: {
    backgroundColor: '#dcb894',
  },
  cardBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(93, 59, 43, 0.14)',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  cardBadgeText: {
    color: '#5d3b2b',
    fontSize: 15,
    fontWeight: '800',
  },
  cardFooter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: '#1f140d',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  cardChevron: {
    color: '#5d3b2b',
    fontSize: 20,
    fontWeight: '700',
  },
  chatbotButton: {
    alignItems: 'center',
    backgroundColor: '#c9793f',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  chatbotButtonPressed: {
    backgroundColor: '#b16a34',
  },
  chatbotText: {
    color: '#2c1a10',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  chatbotTextBold: {
    color: '#1a1006',
    fontSize: 18,
    fontWeight: '800',
  },
  chatbotChevron: {
    color: '#1a1006',
    fontSize: 22,
    fontWeight: '800',
  },
  cardDisabled: {
    opacity: 0.55,
  },
  resumen: { backgroundColor: '#e6c7a8', borderRadius: 20, gap: 10, padding: 16 },
  resumenNombre: { color: '#1f140d', fontSize: 16, fontWeight: '800' },
  indicadores: { flexDirection: 'row', gap: 10 },
  indicador: { backgroundColor: '#ffffff', borderRadius: 14, flex: 1, minHeight: 48, padding: 12 },
  indicadorEtiqueta: { color: '#5d3b2b', fontSize: 14, fontWeight: '700' },
  indicadorValor: { color: '#1f140d', fontSize: 26, fontWeight: '800' },
  resumenTexto: { color: '#1f140d', fontSize: 15 },
  aviso: { backgroundColor: '#b3261e', borderRadius: 999, flexShrink: 1, marginLeft: 6, paddingHorizontal: 10, paddingVertical: 4 },
  avisoTexto: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  soon: {
    color: '#5d3b2b',
    fontSize: 14,
    fontWeight: '600',
  },
});
