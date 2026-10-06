import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoutLink } from '@/components/ui';
import { useAuth } from '@/lib/auth';

type MenuItem = {
  label: string;
  initial: string;
  href?: Href;
};

const menuApoderado: MenuItem[] = [
  { label: 'Notas', initial: 'N', href: '/apoderado/notas' },
  { label: 'Anotaciones', initial: 'A', href: '/apoderado/anotaciones' },
  { label: 'Muro del curso', initial: 'M', href: '/muro' },
  { label: 'Asistencia', initial: 'A', href: '/apoderado/asistencia' },
  { label: 'Horario', initial: 'H' },
  { label: 'Certificados', initial: 'C' },
];

const menuProfesor: MenuItem[] = [
  { label: 'Pasar asistencia', initial: 'A', href: '/profesor/asistencia' },
  { label: 'Registrar notas', initial: 'N', href: '/profesor/notas' },
  { label: 'Anotaciones', initial: 'A', href: '/profesor/anotaciones' },
  { label: 'Muro del curso', initial: 'M', href: '/muro' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const esProfesor = usuario?.rol === 'Profesor';
  const menuItems = esProfesor ? menuProfesor : usuario?.rol === 'Apoderado' ? menuApoderado : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.eyebrow}>{esProfesor ? 'Portal de profesores' : 'Portal de apoderados'}</Text>
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
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              disabled={!item.href}
              onPress={() => item.href && router.push(item.href)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed, !item.href && styles.cardDisabled]}
            >
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>{item.initial}</Text>
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
          <Pressable style={({ pressed }) => [styles.chatbotButton, pressed && styles.chatbotButtonPressed]}>
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
    color: '#a2795c',
    fontSize: 11,
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
    fontSize: 13,
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
  soon: {
    color: '#7a5640',
    fontSize: 11,
    fontWeight: '600',
  },
});
