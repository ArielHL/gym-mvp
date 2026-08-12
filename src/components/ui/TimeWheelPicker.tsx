import { useMemo, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";

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
  const pickerItemColor = Platform.OS === "android" ? "#111827" : "#E5E7EB";
  const pickerTextStyle =
    Platform.OS === "android"
      ? { color: "#E5E7EB", height: 55 }
      : { color: "#E5E7EB" };
  const [activeField, setActiveField] = useState<"hour" | "minute" | null>(
    null,
  );
  const displayValue = useMemo(() => `${hour}:${minute}`, [hour, minute]);

  const hourContainerClassName =
    activeField === "hour"
      ? "flex-1 overflow-hidden rounded-lg border border-cyan-400/70 bg-cyan-950/25"
      : "flex-1 overflow-hidden rounded-lg border border-border bg-background";

  const minuteContainerClassName =
    activeField === "minute"
      ? "w-28 overflow-hidden rounded-lg border border-cyan-400/70 bg-cyan-950/25"
      : "w-28 overflow-hidden rounded-lg border border-border bg-background";

  return (
    <View className="rounded-xl border border-border bg-surface p-3">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Hour
        </Text>
        <Text className="text-lg font-bold text-cyan-300">{displayValue}</Text>
        <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
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
            itemStyle={{ color: "#E5E7EB", fontSize: 18 }}
            dropdownIconColor="#22D3EE"
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

        <Text className="text-lg font-bold text-gray-400">:</Text>

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
            itemStyle={{ color: "#E5E7EB", fontSize: 18 }}
            dropdownIconColor="#22D3EE"
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
          <Text className="text-xs text-gray-400">Tap to open list</Text>
          <Text className="text-xs text-gray-400">{displayValue}</Text>
        </View>
      ) : null}
    </View>
  );
}
