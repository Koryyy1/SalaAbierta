import { StyleSheet, Text as RNText, type TextProps } from 'react-native';

// Tipografía de la app: Atkinson Hyperlegible, diseñada para personas con baja visión (Braille Institute).
export const FUENTE = { normal: 'Atkinson', negrita: 'Atkinson-Bold' } as const;

// Reemplaza a Text de react-native: aplica la familia según el grosor pedido en el estilo,
// para que fontWeight: '700' use la variante Bold real y no una negrita simulada.
export function Text({ style, ...props }: TextProps) {
  const plano = StyleSheet.flatten(style) ?? {};
  if (plano.fontFamily) return <RNText {...props} style={style} />;
  const peso = plano.fontWeight === 'bold' ? 700 : Number(plano.fontWeight ?? 400);
  const familia = peso >= 600 ? FUENTE.negrita : FUENTE.normal;
  return <RNText {...props} style={[style, { fontFamily: familia, fontWeight: 'normal' }]} />;
}
