import { useState } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface InputProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  control: Control<T>;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}

export function Input<T extends FieldValues>({
  name,
  label,
  control,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  multiline = false,
}: InputProps<T>) {
  const [showPassword, setShowPassword] = useState(false);
  const hidden = Boolean(secureTextEntry);

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
          <View
            className={`flex-row rounded-xl border border-border bg-surface ${
              multiline
                ? "min-h-28 items-start py-2"
                : "h-12 items-center"
            }`}
          >
            <TextInput
              value={value == null ? "" : String(value)}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              placeholderTextColor="#666666"
              secureTextEntry={hidden && !showPassword}
              autoCapitalize={autoCapitalize}
              multiline={multiline}
              textAlignVertical={multiline ? "top" : "center"}
              className="flex-1 px-3 text-white"
            />
            {hidden && (
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                className="px-3 py-3"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#666666"
                />
              </Pressable>
            )}
          </View>
          {!!error?.message && (
            <Text className="mt-1 text-xs text-rose-400">{error.message}</Text>
          )}
        </View>
      )}
    />
  );
}

