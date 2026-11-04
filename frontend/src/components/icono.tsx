import { SymbolView } from 'expo-symbols';
import { Text } from 'react-native';

// Íconos del sistema: SF Symbols en iOS y Material Symbols en Android y web (incluidos en expo-symbols).
const ICONOS = {
  asistencia: { ios: 'checklist', android: 'fact_check', web: 'fact_check' },
  notas: { ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' },
  libro: { ios: 'book', android: 'menu_book', web: 'menu_book' },
  anotaciones: { ios: 'text.bubble', android: 'sticky_note_2', web: 'sticky_note_2' },
  muro: { ios: 'megaphone', android: 'campaign', web: 'campaign' },
  alertas: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
  calendario: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  resumen: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
  auditoria: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  umbrales: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  chat: { ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' },
  volver: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  siguiente: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  vacio: { ios: 'tray', android: 'inbox', web: 'inbox' },
  logrado: { ios: 'checkmark.seal', android: 'verified', web: 'verified' },
  ok: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  error: { ios: 'xmark.octagon', android: 'error', web: 'error' },
  parlante: { ios: 'speaker.wave.2', android: 'volume_up', web: 'volume_up' },
  detener: { ios: 'stop.circle', android: 'stop_circle', web: 'stop_circle' },
  enviar: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  escuela: { ios: 'building.columns', android: 'school', web: 'school' },
} as const;

export type NombreIcono = keyof typeof ICONOS;

// Decorativo por defecto: el texto que lo acompaña ya describe la acción para los lectores de pantalla
export function Icono({ nombre, size = 24, color }: { nombre: NombreIcono; size?: number; color: string }) {
  return (
    <SymbolView
      name={ICONOS[nombre]}
      size={size}
      tintColor={color}
      accessible={false}
      importantForAccessibility="no"
      fallback={<Text style={{ color, fontSize: size * 0.8 }}>•</Text>}
    />
  );
}
