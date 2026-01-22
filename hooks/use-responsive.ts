import { useWindowDimensions, Platform } from "react-native";

export type Breakpoint = "sm" | "md" | "lg" | "xl";

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  const breakpoint: Breakpoint =
    width >= BREAKPOINTS.xl
      ? "xl"
      : width >= BREAKPOINTS.lg
        ? "lg"
        : width >= BREAKPOINTS.md
          ? "md"
          : "sm";

  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === "sm",
    isTablet: breakpoint === "md",
    isDesktop: breakpoint === "lg" || breakpoint === "xl",
    isWeb,
    // Utility functions
    atLeast: (bp: Breakpoint) => width >= BREAKPOINTS[bp],
    atMost: (bp: Breakpoint) => width < BREAKPOINTS[bp],
    // Content max-width for centering on larger screens
    containerMaxWidth: breakpoint === "xl" ? 480 : breakpoint === "lg" ? 480 : breakpoint === "md" ? 420 : undefined,
  };
}
