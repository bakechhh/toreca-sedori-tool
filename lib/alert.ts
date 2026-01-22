import { Alert as RNAlert, Platform } from "react-native";

interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

/**
 * Cross-platform alert utility that works on both mobile and web.
 * On web, uses window.confirm for confirmation dialogs and window.alert for simple alerts.
 */
export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
  ): void => {
    if (Platform.OS === "web") {
      // Web implementation
      if (!buttons || buttons.length <= 1) {
        // Simple alert with OK button
        window.alert(message ? `${title}\n\n${message}` : title);
        buttons?.[0]?.onPress?.();
      } else if (buttons.length === 2) {
        // Confirm dialog (Cancel/OK pattern)
        const cancelButton = buttons.find((b) => b.style === "cancel");
        const confirmButton = buttons.find((b) => b.style !== "cancel");

        const result = window.confirm(message ? `${title}\n\n${message}` : title);
        if (result) {
          confirmButton?.onPress?.();
        } else {
          cancelButton?.onPress?.();
        }
      } else {
        // Multiple options - use prompt-like approach
        const options = buttons.map((b, i) => `${i + 1}. ${b.text}`).join("\n");
        const input = window.prompt(
          `${title}\n\n${message || ""}\n\n${options}\n\nEnter number:`
        );
        if (input) {
          const index = parseInt(input) - 1;
          if (index >= 0 && index < buttons.length) {
            buttons[index].onPress?.();
          }
        }
      }
    } else {
      // Native implementation
      RNAlert.alert(title, message, buttons);
    }
  },
};
