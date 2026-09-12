import { useLayoutEffect, useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

export type AppAlertButton = {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type AppAlertRequest = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

type Presenter = (alert: AppAlertRequest) => void;

let presentAlert: Presenter | null = null;

function resolveButtons(buttons?: AppAlertButton[]): AppAlertButton[] {
  if (buttons && buttons.length > 0) return buttons;
  return [{ text: "OK", style: "default" }];
}

export function showAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
) {
  presentAlert?.({
    title,
    message,
    buttons: resolveButtons(buttons),
  });
}

function buttonClass(style?: AppAlertButton["style"]) {
  if (style === "destructive") {
    return "rounded-xl border border-danger/40 bg-danger/10 px-4 py-3";
  }
  if (style === "cancel") {
    return "rounded-xl border border-border bg-surface px-4 py-3";
  }
  return "rounded-xl border border-accent-cyan/60 bg-accent-cyan/10 px-4 py-3";
}

function buttonTextClass(style?: AppAlertButton["style"]) {
  if (style === "destructive") return "text-center font-semibold text-danger";
  if (style === "cancel") return "text-center font-semibold text-muted";
  return "text-center font-semibold text-accent-cyan";
}

export function AlertHost() {
  const queueRef = useRef<AppAlertRequest[]>([]);
  const [current, setCurrent] = useState<AppAlertRequest | null>(null);

  useLayoutEffect(() => {
    presentAlert = (alert) => {
      queueRef.current = [...queueRef.current, alert];
      setCurrent(queueRef.current[0] ?? null);
    };
    return () => {
      presentAlert = null;
    };
  }, []);

  const dismissAndRun = (onPress?: () => void) => {
    queueRef.current = queueRef.current.slice(1);
    setCurrent(queueRef.current[0] ?? null);
    onPress?.();
  };

  const cancelButton = current?.buttons.find((button) => button.style === "cancel");
  const stacked = (current?.buttons.length ?? 0) > 2;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={current != null}
      onRequestClose={() => {
        if (cancelButton) {
          dismissAndRun(cancelButton.onPress);
          return;
        }
        if (current?.buttons.length === 1) {
          dismissAndRun(current.buttons[0].onPress);
        }
      }}
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <Pressable
          className="absolute inset-0"
          onPress={() => {
            if (cancelButton) dismissAndRun(cancelButton.onPress);
          }}
        />
        {current ? (
          <View className="z-10 w-full max-w-md rounded-2xl border border-border bg-background p-4">
            <Text className="text-lg font-bold text-white" selectable>
              {current.title}
            </Text>
            {current.message ? (
              <Text className="mt-2 text-sm text-muted" selectable>
                {current.message}
              </Text>
            ) : null}
            <View className={stacked ? "mt-4 gap-2" : "mt-4 flex-row gap-2"}>
              {current.buttons.map((button, index) => (
                <Pressable
                  key={`${button.text ?? "ok"}-${index}`}
                  className={`${stacked ? "w-full" : "flex-1"} ${buttonClass(button.style)}`}
                  onPress={() => dismissAndRun(button.onPress)}
                >
                  <Text className={buttonTextClass(button.style)}>
                    {button.text ?? "OK"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
