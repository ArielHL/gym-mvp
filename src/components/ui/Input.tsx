import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Text, TextInput, View } from 'react-native';

interface InputProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  control: Control<T>;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function Input<T extends FieldValues>({
  name,
  label,
  control,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none'
}: InputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View className="mb-3">
          <Text className="mb-1 text-sm font-medium text-slate-200">{label}</Text>
          <TextInput
            value={(value as string) ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            className="h-12 rounded-xl border border-slate-700 bg-slate-900 px-3 text-white"
          />
          {!!error?.message && <Text className="mt-1 text-xs text-rose-400">{error.message}</Text>}
        </View>
      )}
    />
  );
}
