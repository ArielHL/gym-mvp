import { Text as RNText, type TextProps } from "react-native";
import { fontStyle } from "@/theme";

export type TextVariant = "body" | "subtitle" | "title" | "display";

type AppTextProps = TextProps & {
  className?: string;
  variant?: TextVariant;
};

const variantStyle = {
  body: fontStyle.body,
  subtitle: fontStyle.subtitle,
  title: fontStyle.title,
  display: fontStyle.display,
} as const;

export function Text({
  variant = "body",
  className,
  style,
  ...props
}: AppTextProps) {
  return (
    <RNText
      className={className}
      style={[
        variantStyle[variant],
        style,
        variant === "title" || variant === "display" ? { fontWeight: "normal" } : null,
      ]}
      {...props}
    />
  );
}
