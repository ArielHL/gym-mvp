import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Text, TextInput, View } from "react-native";

interface InputProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  control: Control<T>;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export function Input<T extends FieldValues>({
  name,
  label,
  control,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
}: InputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <View className="mb-3">
          <Text className="mb-1 text-sm font-medium text-white">{label}</Text>
          <TextInput
            value={value == null ? "" : String(value)}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor="#666666"
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            className="h-12 rounded-xl border border-border bg-surface px-3 text-white"
          />
          {!!error?.message && (
            <Text className="mt-1 text-xs text-rose-400">{error.message}</Text>
          )}
        </View>
      )}
    />
  );
}

