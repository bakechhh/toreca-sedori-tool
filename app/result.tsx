import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Alert } from "@/lib/alert";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatPercent, generateTSV } from "@/lib/types";
import { savePurchase, PurchaseInput } from "@/lib/supabase";

export default function ResultScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, addJudgment, setLastJudgment } = useApp();
  const judgment = state.lastJudgment;
  const { workers, currentWorkerId, isSupabaseEnabled } = state;
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [isPurchaseSaved, setIsPurchaseSaved] = useState(false);

  const currentWorker = workers.find((w) => w.id === currentWorkerId);

  useEffect(() => {
    return () => {
      // 画面を離れる時にlastJudgmentをクリア
    };
  }, []);

  if (!judgment) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center">
        <Text className="text-muted">判定データがありません</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-3 bg-primary rounded-full"
        >
          <Text className="text-white font-semibold">戻る</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const getJudgmentStyle = () => {
    switch (judgment.judgment) {
      case "buy":
        return {
          bg: colors.success,
          label: "買い推奨",
          icon: "checkmark.circle.fill" as const,
        };
      case "consider":
        return {
          bg: colors.warning,
          label: "要検討",
          icon: "exclamationmark.triangle.fill" as const,
        };
      case "skip":
        return {
          bg: colors.error,
          label: "見送り",
          icon: "xmark.circle.fill" as const,
        };
    }
  };

  const judgmentStyle = getJudgmentStyle();

  const handleCopyToClipboard = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const tsv = generateTSV(judgment);
    await Clipboard.setStringAsync(tsv);
    Alert.alert("コピー完了", "クリップボードにコピーしました");
  };

  const handleSaveToHistory = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await addJudgment(judgment);
    Alert.alert("保存完了", "履歴に保存しました");
    router.back();
  };

  const handleClose = () => {
    setLastJudgment(null);
    router.back();
  };

  const handleSavePurchase = async () => {
    if (!judgment || !currentWorkerId) return;

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsSavingPurchase(true);

    const purchaseInput: PurchaseInput = {
      worker_id: currentWorkerId,
      card_name: judgment.cardName || "カード名未入力",
      card_number: judgment.cardNumber || null,
      rarity: judgment.rarity || null,
      is_psa: judgment.isPsa,
      psa_grade: judgment.psaGrade,
      purchase_price: judgment.purchasePrice,
      selling_price: judgment.sellingPrice,
      platform_id: judgment.platformId,
      platform_name: judgment.platformName,
      fee_rate: judgment.feeRate,
      fee_amount: judgment.feeAmount,
      shipping_cost: judgment.shippingCost,
      other_costs_total: judgment.totalOtherCosts,
      net_revenue: judgment.netRevenue,
      profit: judgment.profit,
      roi: judgment.roi,
      sales_count_3days: judgment.salesCount3Days,
      judgment: judgment.judgment,
    };

    const result = await savePurchase(purchaseInput);
    setIsSavingPurchase(false);

    if (result) {
      setIsPurchaseSaved(true);
      Alert.alert("保存完了", "仕入れ記録をSupabaseに保存しました");
    } else {
      Alert.alert("エラー", "仕入れ記録の保存に失敗しました");
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ヘッダー */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <TouchableOpacity onPress={handleClose} className="p-2">
            <Text className="text-primary text-base">閉じる</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">判定結果</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* 総合判定 */}
        <View className="px-4 mt-4">
          <View
            style={{ backgroundColor: judgmentStyle.bg }}
            className="rounded-2xl p-6 items-center"
          >
            <IconSymbol name={judgmentStyle.icon} size={48} color="#FFFFFF" />
            <Text className="text-white text-2xl font-bold mt-2">
              {judgmentStyle.label}
            </Text>
          </View>
        </View>

        {/* カード情報 */}
        <View className="px-4 mt-4">
          <View className="bg-surface rounded-xl p-4">
            <Text className="text-lg font-bold text-foreground">
              {judgment.cardName || "カード名未入力"}
            </Text>
            {judgment.cardNumber && (
              <Text className="text-sm text-muted mt-1">
                番号: {judgment.cardNumber}
              </Text>
            )}
            {judgment.rarity && (
              <Text className="text-sm text-muted">
                レアリティ: {judgment.rarity}
              </Text>
            )}
            {judgment.isPsa && (
              <View
                className="flex-row items-center mt-2"
                style={{
                  backgroundColor: `${colors.primary}15`,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: "600" }}>
                  PSA {judgment.psaGrade !== null ? judgment.psaGrade : "-"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 収益計算 */}
        <View className="px-4 mt-4">
          <Text className="text-sm font-semibold text-muted mb-2">収益計算</Text>
          <View className="bg-surface rounded-xl p-4">
            <View className="flex-row justify-between py-2">
              <Text className="text-foreground">販売価格</Text>
              <Text className="text-foreground font-medium">
                {formatCurrency(judgment.sellingPrice)}
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-foreground">
                手数料 ({judgment.platformName} {judgment.feeRate}%)
              </Text>
              <Text className="text-error font-medium">
                -{formatCurrency(judgment.feeAmount)}
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-foreground">送料</Text>
              <Text className="text-error font-medium">
                -{formatCurrency(judgment.shippingCost)}
              </Text>
            </View>
            {judgment.otherCosts.length > 0 && (
              <>
                {judgment.otherCosts.map((cost) => (
                  <View key={cost.id} className="flex-row justify-between py-2">
                    <Text className="text-foreground">{cost.name || "その他"}</Text>
                    <Text className="text-error font-medium">
                      -{formatCurrency(cost.amount)}
                    </Text>
                  </View>
                ))}
              </>
            )}
            <View className="border-t border-border my-2" />
            <View className="flex-row justify-between py-2">
              <Text className="text-foreground font-medium">実質売上</Text>
              <Text className="text-foreground font-bold">
                {formatCurrency(judgment.netRevenue)}
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-foreground">仕入れ価格</Text>
              <Text className="text-foreground font-medium">
                -{formatCurrency(judgment.purchasePrice)}
              </Text>
            </View>
            <View className="border-t border-border my-2" />
            <View className="flex-row justify-between py-2">
              <Text className="text-foreground font-bold text-lg">利益</Text>
              <Text
                style={{
                  color: judgment.profit >= 0 ? colors.success : colors.error,
                }}
                className="font-bold text-lg"
              >
                {formatCurrency(judgment.profit)}
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-foreground font-bold text-lg">ROI</Text>
              <Text
                style={{
                  color: judgment.roi >= state.settings.minRoi ? colors.success : colors.error,
                }}
                className="font-bold text-lg"
              >
                {formatPercent(judgment.roi)}
              </Text>
            </View>
          </View>
        </View>

        {/* 回転率評価 */}
        <View className="px-4 mt-4">
          <Text className="text-sm font-semibold text-muted mb-2">回転率評価</Text>
          <View className="bg-surface rounded-xl p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-foreground">3日以内成約数</Text>
              <View className="flex-row items-center">
                <Text className="text-foreground font-bold text-lg mr-2">
                  {judgment.salesCount3Days}件
                </Text>
                {judgment.salesCount3Days === 0 ? (
                  <IconSymbol name="xmark.circle.fill" size={24} color={colors.error} />
                ) : judgment.salesCount3Days >= state.settings.minSalesCount ? (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
                ) : (
                  <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.warning} />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* 判定基準 */}
        <View className="px-4 mt-4">
          <Text className="text-sm font-semibold text-muted mb-2">判定基準</Text>
          <View className="bg-surface rounded-xl p-4">
            <View className="flex-row items-center py-1">
              <IconSymbol
                name={judgment.roi >= state.settings.minRoi ? "checkmark.circle.fill" : "xmark.circle.fill"}
                size={20}
                color={judgment.roi >= state.settings.minRoi ? colors.success : colors.error}
              />
              <Text className="text-foreground ml-2">
                ROI {state.settings.minRoi}%以上
              </Text>
            </View>
            <View className="flex-row items-center py-1">
              <IconSymbol
                name={judgment.salesCount3Days >= state.settings.minSalesCount ? "checkmark.circle.fill" : "xmark.circle.fill"}
                size={20}
                color={judgment.salesCount3Days >= state.settings.minSalesCount ? colors.success : colors.error}
              />
              <Text className="text-foreground ml-2">
                回転率 {state.settings.minSalesCount}件以上
              </Text>
            </View>
            <View className="flex-row items-center py-1">
              <IconSymbol
                name={judgment.salesCount3Days > 0 ? "checkmark.circle.fill" : "xmark.circle.fill"}
                size={20}
                color={judgment.salesCount3Days > 0 ? colors.success : colors.error}
              />
              <Text className="text-foreground ml-2">
                成約実績あり（0件は見送り）
              </Text>
            </View>
          </View>
        </View>

        {/* アクションボタン */}
        <View className="px-4 mt-6 gap-3">
          {/* 仕入れ保存ボタン（Supabase有効 & 作業者選択時） */}
          {isSupabaseEnabled && currentWorkerId && (
            <TouchableOpacity
              onPress={handleSavePurchase}
              disabled={isSavingPurchase || isPurchaseSaved}
              style={{
                backgroundColor: isPurchaseSaved ? colors.success : colors.primary,
                opacity: isSavingPurchase ? 0.7 : 1,
              }}
              className="flex-row items-center justify-center py-4 rounded-xl"
            >
              <IconSymbol
                name={isPurchaseSaved ? "checkmark.circle.fill" : "plus.circle.fill"}
                size={20}
                color="#FFFFFF"
              />
              <Text className="text-white font-bold ml-2">
                {isPurchaseSaved
                  ? "仕入れ保存済み"
                  : isSavingPurchase
                    ? "保存中..."
                    : `仕入れとして保存（${currentWorker?.name}）`}
              </Text>
            </TouchableOpacity>
          )}

          {/* 作業者未選択時の案内 */}
          {isSupabaseEnabled && !currentWorkerId && (
            <View
              style={{ backgroundColor: `${colors.warning}15`, borderColor: colors.warning, borderWidth: 1 }}
              className="flex-row items-center justify-center py-4 rounded-xl"
            >
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.warning} />
              <Text style={{ color: colors.warning }} className="font-medium ml-2">
                仕入れ保存には作業者を選択してください
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleCopyToClipboard}
            className="flex-row items-center justify-center py-4 bg-primary rounded-xl"
          >
            <IconSymbol name="doc.on.clipboard.fill" size={20} color="#FFFFFF" />
            <Text className="text-white font-bold ml-2">クリップボードにコピー</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSaveToHistory}
            style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
            className="flex-row items-center justify-center py-4 rounded-xl"
          >
            <IconSymbol name="clock.fill" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary }} className="font-bold ml-2">
              履歴に保存
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
