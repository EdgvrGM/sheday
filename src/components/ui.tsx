import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';

import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------- Texto ----------
type Variant = 'title' | 'heading' | 'body' | 'muted' | 'small' | 'label' | 'price';

export function T({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[styles[variant], style]} />;
}

// ---------- Contenedores ----------
/** Contenido desplazable, centrado y con ancho máximo (útil en web). */
export function Screen({
  children,
  contentStyle,
  ...props
}: ScrollViewProps & { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.screenContent, contentStyle]}
      {...props}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

// ---------- Botones ----------
type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp';

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = BUTTON_COLORS[kind];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { opacity: 0.8 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={palette.fg} />}
          <Text style={[styles.buttonText, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const BUTTON_COLORS: Record<ButtonKind, { bg: string; fg: string; border: string }> = {
  primary: { bg: Colors.primary, fg: Colors.white, border: Colors.primary },
  secondary: { bg: Colors.white, fg: Colors.primary, border: Colors.primary },
  ghost: { bg: 'transparent', fg: Colors.text, border: Colors.border },
  danger: { bg: Colors.white, fg: Colors.danger, border: Colors.danger },
  whatsapp: { bg: '#25D366', fg: Colors.white, border: '#25D366' },
};

export function IconButton({
  icon,
  onPress,
  color = Colors.text,
  size = 22,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

// ---------- Formularios ----------
export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <T variant="label">{label}</T>
      <TextInput
        placeholderTextColor={Colors.textSecondary}
        {...props}
        style={[styles.input, props.multiline && styles.inputMultiline, props.style]}
      />
      {hint && <T variant="small">{hint}</T>}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
      ]}>
      <Text
        style={[
          styles.chipText,
          selected && styles.chipTextSelected,
          disabled && styles.chipTextDisabled,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.stepper}>
      <IconButton icon="remove" label="Menos" size={18} onPress={() => onChange(Math.max(min, value - 1))} />
      <Text style={styles.stepperValue}>{value}</Text>
      <IconButton icon="add" label="Más" size={18} onPress={() => onChange(Math.min(max, value + 1))} />
    </View>
  );
}

// ---------- Estados ----------
export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={56} color={Colors.border} />
      <T variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </T>
      {message && (
        <T variant="muted" style={{ textAlign: 'center' }}>
          {message}
        </T>
      )}
      {action}
    </View>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={18} color={Colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  heading: { fontSize: 18, fontWeight: '700', color: Colors.text },
  body: { fontSize: 15, color: Colors.text, lineHeight: 21 },
  muted: { fontSize: 15, color: Colors.textSecondary, lineHeight: 21 },
  small: { fontSize: 12, color: Colors.textSecondary },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text },
  price: { fontSize: 16, fontWeight: '700', color: Colors.primary },

  screen: { flex: 1, backgroundColor: Colors.background },
  screenContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  button: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  iconButton: { padding: Spacing.xs },

  field: { gap: Spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },

  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipDisabled: { backgroundColor: Colors.surface },
  chipText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  chipTextSelected: { color: Colors.white },
  chipTextDisabled: { color: Colors.textSecondary, textDecorationLine: 'line-through' },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
  },
  stepperValue: { minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: '600', color: Colors.text },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  errorBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.dangerSoft,
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  errorText: { color: Colors.danger, flex: 1, fontSize: 14 },
});
