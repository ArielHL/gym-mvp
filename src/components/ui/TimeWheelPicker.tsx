import { useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { colors } from "@/theme";

import { Text } from "@/components/ui/Text";
const HOURS = Array.from({ length: 24 }, (_, hour) =>
  hour.toString().padStart(2, "0"),
);
const MINUTES = ["00", "30"] as const;

type TimeWheelPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

function parseTime(value: string): { hour: string; minute: string } {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = HOURS.includes(hourRaw) ? hourRaw : "00";
  const minute = minuteRaw === "30" ? "30" : "00";
  return { hour, minute };
}

export function TimeWheelPicker({ value, onChange }: TimeWheelPickerProps) {
  const { hour, minute } = parseTime(value);
  const pickerMode = Platform.OS === "android" ? "dropdown" : undefined;
  const pickerItemColor = Platform.OS === "android" ? colors.inverse : colors.foreground;
  const pickerTextStyle =
    Platform.OS === "android"
      ? { color: colors.foreground, height: 55 }
      : { color: colors.foreground };
  const [activeField, setActiveField] = useState<"hour" | "minute" | null>(
    null,
  );
  const displayValue = useMemo(() => `${hour}:${minute}`, [hour, minute]);

  const hourContainerClassName =
    activeField === "hour"
      ? "flex-1 overflow-hidden rounded-lg border border-accent-cyan/70 bg-accent-cyan/10"
      : "flex-1 overflow-hidden rounded-lg border border-border bg-background";

  const minuteContainerClassName =
    activeField === "minute"
      ? "w-28 overflow-hidden rounded-lg border border-accent-cyan/70 bg-accent-cyan/10"
      : "w-28 overflow-hidden rounded-lg border border-border bg-background";

  return (
    <View className="rounded-xl border border-border bg-surface p-3">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
          Hour
        </Text>
        <Text className="text-lg font-bold text-accent-cyan">{displayValue}</Text>
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
          Minute
        </Text>
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <View className={hourContainerClassName}>
          <Picker
            mode={pickerMode}
            selectedValue={hour}
            onValueChange={(nextHour) => onChange(`${nextHour}:${minute}`)}
            onFocus={() => setActiveField("hour")}
            onBlur={() => setActiveField((current) => (current === "hour" ? null : current))}
            onTouchStart={() => setActiveField("hour")}
            style={pickerTextStyle}
            itemStyle={{ color: colors.foreground, fontSize: 18 }}
            dropdownIconColor={colors.accent.cyan}
          >
            {HOURS.map((hourOption) => (
              <Picker.Item
                key={hourOption}
                label={hourOption}
                value={hourOption}
                color={pickerItemColor}
              />
            ))}
          </Picker>
        </View>

        <Text className="text-lg font-bold text-muted">:</Text>

        <View className={minuteContainerClassName}>
          <Picker
            mode={pickerMode}
            selectedValue={minute}
            onValueChange={(nextMinute) => onChange(`${hour}:${nextMinute}`)}
            onFocus={() => setActiveField("minute")}
            onBlur={() =>
              setActiveField((current) => (current === "minute" ? null : current))
            }
            onTouchStart={() => setActiveField("minute")}
            style={pickerTextStyle}
            itemStyle={{ color: colors.foreground, fontSize: 18 }}
            dropdownIconColor={colors.accent.cyan}
          >
            {MINUTES.map((minuteOption) => (
              <Picker.Item
                key={minuteOption}
                label={minuteOption}
                value={minuteOption}
                color={pickerItemColor}
              />
            ))}
          </Picker>
        </View>
      </View>

      {Platform.OS === "android" ? (
        <View className="mt-2 flex-row justify-between px-2">
          <Text className="text-xs text-muted">Tap to open list</Text>
          <Text className="text-xs text-muted">{displayValue}</Text>
        </View>
      ) : null}
    </View>
  );
}
