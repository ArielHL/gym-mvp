import { Pressable, ScrollView, Text, View } from "react-native";

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
      <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">
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
              className={`rounded-full border px-4 py-2 ${active ? "border-cyan-400/60 bg-cyan-950/40" : "border-border bg-background"}`}
              onPress={() => onSelect(option.value)}
            >
              <Text
                className={`text-xs font-bold ${active ? "text-cyan-300" : "text-gray-400"}`}
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