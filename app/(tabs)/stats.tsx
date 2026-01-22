import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  RefreshControl,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import {
  PurchaseStats,
  MonthlyStats,
  getPurchaseStats,
  getMonthlyStats,
  isSupabaseEnabled,
} from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/types";

export default function StatsScreen() {
  const colors = useColors();
  const { state } = useApp();
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    if (!isSupabaseEnabled) {
      setIsLoading(false);
      return;
    }
    const [statsData, monthlyData] = await Promise.all([
      getPurchaseStats(state.selectedWorkerId ?? undefined),
      getMonthlyStats(state.selectedWorkerId ?? undefined),
    ]);
    setStats(statsData);
    setMonthlyStats(monthlyData);
    setIsLoading(false);
    setRefreshing(false);
  }, [state.selectedWorkerId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, [loadStats]);

  const StatCard = ({
    title,
    value,
    subtitle,
    color,
    icon,
  }: {
    title: string;
    value: string;
    subtitle?: string;
    color?: string;
    icon: string;
  }) => (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        flex: 1,
        minWidth: 140,
      }}
    >
      <View className="flex-row items-center mb-2">
        <IconSymbol name={icon as any} size={20} color={color || colors.muted} />
        <Text className="text-muted text-xs ml-2">{title}</Text>
      </View>
      <Text
        style={{ color: color || colors.foreground }}
        className="font-bold text-xl"
      >
        {value}
      </Text>
      {subtitle && <Text className="text-muted text-xs mt-1">{subtitle}</Text>}
    </View>
  );

  if (!isSupabaseEnabled) {
    return (
      <ScreenContainer className="items-center justify-center">
        <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.warning} />
        <Text className="text-foreground mt-4 text-center">
          Supabaseが設定されていません
        </Text>
        <Text className="text-muted text-sm mt-2 text-center px-8">
          環境変数にSupabaseのURLとAnon Keyを設定してください
        </Text>
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">読み込み中...</Text>
      </ScreenContainer>
    );
  }

  if (!stats) {
    return (
      <ScreenContainer className="items-center justify-center">
        <IconSymbol name="chart.bar.fill" size={48} color={colors.muted} />
        <Text className="text-muted mt-4">集計データがありません</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ヘッダー */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">集計</Text>
          <Text className="text-sm text-muted mt-1">
            販売実績の統計情報
          </Text>
        </View>

        {/* 数量統計 */}
        <View className="px-4 mt-4">
          <Text className="text-base font-semibold text-foreground mb-3">
            商品数
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <StatCard
              title="総仕入数"
              value={stats.totalPurchases.toString()}
              icon="cube.fill"
            />
            <StatCard
              title="在庫"
              value={stats.totalStock.toString()}
              icon="archivebox.fill"
              color="#3B82F6"
            />
          </View>
          <View className="flex-row flex-wrap gap-3 mt-3">
            <StatCard
              title="出品中"
              value={stats.totalListing.toString()}
              icon="tag.fill"
              color="#F59E0B"
            />
            <StatCard
              title="販売済"
              value={stats.totalSold.toString()}
              icon="checkmark.circle.fill"
              color="#10B981"
            />
          </View>
        </View>

        {/* 金額統計 */}
        <View className="px-4 mt-6">
          <Text className="text-base font-semibold text-foreground mb-3">
            金額
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <StatCard
              title="総仕入額"
              value={formatCurrency(stats.totalPurchaseAmount)}
              icon="cart.fill"
            />
            <StatCard
              title="総売上額"
              value={formatCurrency(stats.totalSoldAmount)}
              subtitle="販売済み商品のみ"
              icon="banknote.fill"
            />
          </View>
          <View className="flex-row flex-wrap gap-3 mt-3">
            <StatCard
              title="総利益"
              value={formatCurrency(stats.totalProfit)}
              subtitle="手数料・送料控除後"
              icon="chart.line.uptrend.xyaxis"
              color={stats.totalProfit >= 0 ? colors.success : colors.error}
            />
            <StatCard
              title="平均ROI"
              value={formatPercent(stats.averageRoi)}
              subtitle="販売済み商品の平均"
              icon="percent"
              color={stats.averageRoi >= 0 ? colors.success : colors.error}
            />
          </View>
        </View>

        {/* 在庫金額 */}
        {stats.totalStock > 0 && (
          <View className="px-4 mt-6">
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <IconSymbol name="archivebox.fill" size={24} color="#3B82F6" />
                  <Text className="text-foreground font-semibold ml-3">
                    在庫資産
                  </Text>
                </View>
                <Text className="text-foreground font-bold text-xl">
                  {formatCurrency(
                    stats.totalPurchaseAmount -
                      (stats.totalPurchases - stats.totalStock) *
                        (stats.totalPurchaseAmount / stats.totalPurchases)
                  )}
                </Text>
              </View>
              <Text className="text-muted text-xs mt-2">
                在庫商品の仕入れ総額（概算）
              </Text>
            </View>
          </View>
        )}

        {/* 月別集計 */}
        {monthlyStats.length > 0 && (
          <View className="px-4 mt-6">
            <Text className="text-base font-semibold text-foreground mb-3">
              月別集計
            </Text>
            {monthlyStats.map((month) => (
              <View
                key={month.month}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 8,
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-foreground font-semibold">
                    {month.month.replace("-", "年")}月
                  </Text>
                  <Text
                    style={{
                      color: month.profit >= 0 ? colors.success : colors.error,
                    }}
                    className="font-bold"
                  >
                    {formatCurrency(month.profit)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Text className="text-muted text-xs">
                      仕入: {month.purchaseCount}件
                    </Text>
                    <Text className="text-muted text-xs mx-2">|</Text>
                    <Text className="text-muted text-xs">
                      販売: {month.soldCount}件
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-muted text-xs">
                      仕入額: {formatCurrency(month.purchaseAmount)}
                    </Text>
                  </View>
                </View>
                {month.soldCount > 0 && (
                  <View className="flex-row items-center justify-end mt-1">
                    <Text className="text-muted text-xs">
                      売上: {formatCurrency(month.soldAmount)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* データがない場合 */}
        {stats.totalPurchases === 0 && (
          <View className="px-4 mt-8 items-center">
            <IconSymbol name="chart.bar.fill" size={48} color={colors.muted} />
            <Text className="text-muted mt-4 text-center">
              データがありません
            </Text>
            <Text className="text-muted text-sm mt-1 text-center">
              判定ページから仕入れを保存すると{"\n"}統計が表示されます
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
