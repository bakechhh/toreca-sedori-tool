import { View, type ViewProps, Platform } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/use-responsive";

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["top", "left", "right"].
   * Bottom is typically handled by Tab Bar.
   */
  edges?: Edge[];
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
  /**
   * Disable responsive max-width (use full width).
   */
  fullWidth?: boolean;
}

/**
 * A container component that properly handles SafeArea, background colors,
 * and responsive layout for PC/mobile.
 *
 * On larger screens (tablet/desktop), content is centered with a max-width
 * for optimal readability. On mobile, content uses full width.
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  fullWidth = false,
  style,
  ...props
}: ScreenContainerProps) {
  const { containerMaxWidth, isWeb, isDesktop, isTablet } = useResponsive();
  const shouldCenter = !fullWidth && (isDesktop || isTablet) && isWeb;

  return (
    <View
      className={cn(
        "flex-1",
        "bg-background",
        containerClassName
      )}
      {...props}
    >
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", safeAreaClassName)}
        style={style}
      >
        {shouldCenter ? (
          <View className="flex-1 items-center">
            <View
              className={cn("flex-1 w-full", className)}
              style={{
                maxWidth: containerMaxWidth,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.05,
                shadowRadius: 20,
              }}
            >
              {children}
            </View>
          </View>
        ) : (
          <View className={cn("flex-1", className)}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}
