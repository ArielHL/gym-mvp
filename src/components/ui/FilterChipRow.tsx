import { Pressable, ScrollView, View } from "react-native";

import { Text } from "@/components/ui/Text";
export function FilterChipRow<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pr-2"
      >
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={option.value}
              className={`rounded-full border px-4 py-2 ${active ? "border-accent-cyan/60 bg-accent-cyan/10" : "border-border bg-background"}`}
              onPress={() => onSelect(option.value)}
            >
              <Text
                className={`text-xs font-bold ${active ? "text-accent-cyan" : "text-muted"}`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}