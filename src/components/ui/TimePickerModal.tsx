import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { TimeWheelPicker } from "@/components/ui/TimeWheelPicker";

import { Text } from "@/components/ui/Text";
type TimePickerModalProps = {
  visible: boolean;
  initialValue: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

function normalizeTime(value: string): string {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = minuteRaw === "30" ? "30" : "00";
  const normalizedHour = Number.isFinite(hour)
    ? Math.min(23, Math.max(0, hour)).toString().padStart(2, "0")
    : "00";
  return `${normalizedHour}:${minute}`;
}

export function TimePickerModal({
  visible,
  initialValue,
  onCancel,
  onConfirm,
}: TimePickerModalProps) {
  const [draftValue, setDraftValue] = useState(normalizeTime(initialValue));
  const contentContainerClassName =
    Platform.OS === "android"
      ? "w-full max-w-md rounded-2xl border border-border bg-background p-4"
      : "w-full max-w-md rounded-2xl border border-border bg-background p-4";
  const pickerWrapClassName = Platform.OS === "android" ? "mt-3" : "mt-4";
  const actionRowClassName = Platform.OS === "android" ? "mt-3 flex-row gap-2" : "mt-4 flex-row gap-2";

  useEffect(() => {
    if (visible) {
      setDraftValue(normalizeTime(initialValue));
    }
  }, [initialValue, visible]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <Pressable className="absolute inset-0" onPress={onCancel} />

        <View className={contentContainerClassName}>
          <Text className="text-lg font-bold text-white">Select start time</Text>
          <Text className="mt-1 text-xs text-muted">24h format, 30-minute steps</Text>

          <View className={pickerWrapClassName}>
            <TimeWheelPicker value={draftValue} onChange={setDraftValue} />
          </View>

          <View className={actionRowClassName}>
            <Pressable
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-3"
              onPress={onCancel}
            >
              <Text className="text-center font-semibold text-muted">Cancel</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-xl border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-3"
              onPress={() => onConfirm(draftValue)}
            >
              <Text className="text-center font-semibold text-accent-cyan">Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
