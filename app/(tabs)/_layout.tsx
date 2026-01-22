import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useResponsive } from "@/hooks/use-responsive";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isWeb, isDesktop, isTablet, containerMaxWidth } = useResponsive();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const shouldCenter = (isDesktop || isTablet) && isWeb;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          ...(shouldCenter && {
            justifyContent: "center",
          }),
        },
        tabBarItemStyle: shouldCenter
          ? {
              maxWidth: 120,
            }
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "判定",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calculator.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "在庫",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="archivebox.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "集計",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "履歴",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          href: null, // タブバーから非表示
          title: "ヘルプ",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="questionmark.circle.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
