import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { ClassType } from "@/features/class-types/services/classTypesService";

type ClassTypePickerModalProps = {
  visible: boolean;
  options: ClassType[];
  selectedId?: string;
  onCancel: () => void;
  onSelect: (option: ClassType) => void;
};

export function ClassTypePickerModal({
  visible,
  options,
  selectedId,
  onCancel,
  onSelect,
}: ClassTypePickerModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <Pressable className="absolute inset-0" onPress={onCancel} />

        <View className="w-full max-w-md rounded-2xl border border-border bg-background p-4">
          <Text className="text-lg font-bold text-white">Selecciona tipo</Text>
          <Text className="mt-1 text-xs text-gray-400">
            Elige el tipo de clase para la plantilla
          </Text>

          <ScrollView className="mt-4 max-h-80" showsVerticalScrollIndicator={false}>
            <View className="gap-2">
              {options.map((option) => {
                const selected = selectedId === option.id;
                return (
                  <Pressable
                    key={option.id}
                    className={`rounded-xl border px-3 py-3 ${selected ? "border-accent-cyan bg-cyan-950/30" : "border-border bg-surface"}`}
                    onPress={() => onSelect(option)}
                  >
                    <Text className="font-semibold text-white">{option.nombre}</Text>
                    {!!option.descripcion && (
                      <Text className="mt-1 text-xs text-gray-400">
                        {option.descripcion}
                      </Text>
                    )}
                    <Text className="mt-1 text-[11px] text-gray-500">{option.slug}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View className="mt-4 flex-row gap-2">
            <Pressable
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-3"
              onPress={onCancel}
            >
              <Text className="text-center font-semibold text-gray-300">Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
