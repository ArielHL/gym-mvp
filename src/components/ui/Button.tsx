import { ActivityIndicator, Pressable, Text } from 'react-native';
import type { ReactNode } from 'react';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-700',
  secondary: 'bg-slate-700',
  danger: 'bg-rose-600'
};

export function Button({ label, onPress, disabled, loading, variant = 'primary', icon }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`mt-3 h-12 flex-row items-center justify-center rounded-xl ${variantClasses[variant]} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? <ActivityIndicator color="#fff" /> : icon}
      <Text className="ml-2 text-base font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
