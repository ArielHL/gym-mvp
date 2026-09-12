import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/theme";

export function renderCalendarArrow(direction: "left" | "right") {
  return (
    <MaterialCommunityIcons
      name={direction === "left" ? "chevron-left" : "chevron-right"}
      size={22}
      color={colors.accent.cyan}
    />
  );
}
