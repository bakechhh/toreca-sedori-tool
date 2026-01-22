import { useState, useEffect, useMemo } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { Alert } from "@/lib/alert";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import {
  OtherCost,
  JudgmentFormData,
  generateId,
  calculateJudgment,
  CardJudgment,
  formatCurrency,
  formatPercent,
  calculateMaxPurchasePrice,
  calculateMinSellingPrice,
} from "@/lib/types";
import { savePurchase, PurchaseInput } from "@/lib/supabase";

type TabMode = "judgment" | "calculator";
type CalculatorMode = "sellingToMax" | "purchaseToMin";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, addJudgment, setLastJudgment } = useApp();
  const { settings, workers, currentWorkerId, isSupabaseEnabled } = state;
  const currentWorker = workers.find((w) => w.id === currentWorkerId);

  // タブモード: 通常判定 or クイック逆算
  const [tabMode, setTabMode] = useState<TabMode>("judgment");
  // 逆算モード: 販売価格から最大仕入れ価格 or 仕入れ価格から最低販売価格
  const [calcMode, setCalcMode] = useState<CalculatorMode>("sellingToMax");
  // 逆算用入力
  const [calcInput, setCalcInput] = useState({
    price: "",
    platformId: settings.platforms[0]?.id || "",
    shippingCost: settings.defaultShippingCost.toString(),
    otherCostsTotal: "0",
    targetRoi: settings.minRoi.toString(),
  });

  // 仕入れ保存モーダル用
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    cardName: "",
    cardNumber: "",
    rarity: "",
    isPsa: false,
    psaGrade: "",
    notes: "",
  });
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);

  const [formData, setFormData] = useState<JudgmentFormData>({
    cardName: "",
    cardNumber: "",
    rarity: "",
    isPsa: false,
    psaGrade: "",
    purchasePrice: "",
    sellingPrice: "",
    platformId: settings.platforms[0]?.id || "",
    shippingCost: settings.defaultShippingCost.toString(),
    otherCosts: [],
    salesCount3Days: "",
  });

  // 設定が読み込まれたらデフォルト値を更新
  useEffect(() => {
    if (settings.platforms.length > 0 && !formData.platformId) {
      setFormData((prev) => ({
        ...prev,
        platformId: settings.platforms[0].id,
        shippingCost: settings.defaultShippingCost.toString(),
      }));
    }
  }, [settings]);

  // 逆算用設定も更新
  useEffect(() => {
    if (settings.platforms.length > 0 && !calcInput.platformId) {
      setCalcInput((prev) => ({
        ...prev,
        platformId: settings.platforms[0].id,
        shippingCost: settings.defaultShippingCost.toString(),
        targetRoi: settings.minRoi.toString(),
      }));
    }
  }, [settings]);

  const selectedPlatform = settings.platforms.find((p) => p.id === formData.platformId);
  const calcSelectedPlatform = settings.platforms.find((p) => p.id === calcInput.platformId);

  // 逆算結果の計算
  const calcResult = useMemo(() => {
    const price = parseInt(calcInput.price) || 0;
    const shippingCost = parseInt(calcInput.shippingCost) || 0;
    const otherCostsTotal = parseInt(calcInput.otherCostsTotal) || 0;
    const targetRoi = parseFloat(calcInput.targetRoi) || settings.minRoi;
    const feeRate = calcSelectedPlatform?.feeRate || 0;

    if (price === 0) return null;

    if (calcMode === "sellingToMax") {
      return {
        mode: "sellingToMax" as const,
        ...calculateMaxPurchasePrice(price, feeRate, shippingCost, otherCostsTotal, targetRoi),
        inputPrice: price,
        targetRoi,
      };
    } else {
      return {
        mode: "purchaseToMin" as const,
        ...calculateMinSellingPrice(price, feeRate, shippingCost, otherCostsTotal, targetRoi),
        inputPrice: price,
        targetRoi,
      };
    }
  }, [calcInput, calcMode, calcSelectedPlatform, settings.minRoi]);

  // 逆算結果を通常判定に引き継ぐ
  const transferToJudgment = () => {
    if (!calcResult) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (calcResult.mode === "sellingToMax") {
      setFormData((prev) => ({
        ...prev,
        purchasePrice: calcResult.maxPurchasePrice.toString(),
        sellingPrice: calcResult.inputPrice.toString(),
        platformId: calcInput.platformId,
        shippingCost: calcInput.shippingCost,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        purchasePrice: calcResult.inputPrice.toString(),
        sellingPrice: calcResult.minSellingPrice.toString(),
        platformId: calcInput.platformId,
        shippingCost: calcInput.shippingCost,
      }));
    }

    setTabMode("judgment");
  };

  // クイック逆算から直接仕入れ保存
  const openPurchaseModal = () => {
    if (!currentWorkerId) {
      Alert.alert("作業者未選択", "設定画面で作業者を選択してください");
      return;
    }
    if (!calcResult) return;

    setPurchaseForm({
      cardName: "",
      cardNumber: "",
      rarity: "",
      isPsa: false,
      psaGrade: "",
      notes: "",
    });
    setShowPurchaseModal(true);
  };

  const handleSavePurchaseFromCalc = async () => {
    if (!calcResult || !currentWorkerId || !calcSelectedPlatform) return;

    if (!purchaseForm.cardName.trim()) {
      Alert.alert("エラー", "カード名を入力してください");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsSavingPurchase(true);

    const purchasePrice = calcResult.mode === "sellingToMax"
      ? calcResult.maxPurchasePrice
      : calcResult.inputPrice;
    const sellingPrice = calcResult.mode === "sellingToMax"
      ? calcResult.inputPrice
      : calcResult.minSellingPrice;

    const purchaseInput: PurchaseInput = {
      worker_id: currentWorkerId,
      card_name: purchaseForm.cardName.trim(),
      card_number: purchaseForm.cardNumber.trim() || null,
      rarity: purchaseForm.rarity.trim() || null,
      is_psa: purchaseForm.isPsa,
      psa_grade: purchaseForm.isPsa && purchaseForm.psaGrade ? parseInt(purchaseForm.psaGrade) : null,
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      platform_id: calcInput.platformId,
      platform_name: calcSelectedPlatform.name,
      fee_rate: calcSelectedPlatform.feeRate,
      fee_amount: calcResult.feeAmount,
      shipping_cost: parseInt(calcInput.shippingCost) || 0,
      other_costs_total: parseInt(calcInput.otherCostsTotal) || 0,
      net_revenue: calcResult.netRevenue,
      profit: calcResult.profit,
      roi: calcResult.targetRoi,
      notes: purchaseForm.notes.trim() || null,
    };

    const result = await savePurchase(purchaseInput);
    setIsSavingPurchase(false);

    if (result) {
      setShowPurchaseModal(false);
      Alert.alert("保存完了", "仕入れ記録をSupabaseに保存しました");
    } else {
      Alert.alert("エラー", "仕入れ記録の保存に失敗しました");
    }
  };

  // リアルタイム計算プレビュー
  const preview = useMemo(() => {
    const purchasePrice = parseInt(formData.purchasePrice) || 0;
    const sellingPrice = parseInt(formData.sellingPrice) || 0;
    const shippingCost = parseInt(formData.shippingCost) || 0;
    const salesCount3Days = parseInt(formData.salesCount3Days) || 0;
    const feeRate = selectedPlatform?.feeRate || 0;

    if (purchasePrice === 0 || sellingPrice === 0) {
      return null;
    }

    return calculateJudgment(
      purchasePrice,
      sellingPrice,
      feeRate,
      shippingCost,
      formData.otherCosts,
      salesCount3Days,
      settings.minRoi,
      settings.minSalesCount
    );
  }, [
    formData.purchasePrice,
    formData.sellingPrice,
    formData.shippingCost,
    formData.otherCosts,
    formData.salesCount3Days,
    selectedPlatform?.feeRate,
    settings.minRoi,
    settings.minSalesCount,
  ]);

  const updateField = (field: keyof JudgmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addOtherCost = () => {
    const newCost: OtherCost = {
      id: generateId(),
      name: "",
      amount: 0,
    };
    setFormData((prev) => ({
      ...prev,
      otherCosts: [...prev.otherCosts, newCost],
    }));
  };

  const updateOtherCost = (id: string, field: "name" | "amount", value: string) => {
    setFormData((prev) => ({
      ...prev,
      otherCosts: prev.otherCosts.map((cost) =>
        cost.id === id
          ? { ...cost, [field]: field === "amount" ? parseInt(value) || 0 : value }
          : cost
      ),
    }));
  };

  const removeOtherCost = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      otherCosts: prev.otherCosts.filter((cost) => cost.id !== id),
    }));
  };

  const resetForm = () => {
    setFormData({
      cardName: "",
      cardNumber: "",
      rarity: "",
      isPsa: false,
      psaGrade: "",
      purchasePrice: "",
      sellingPrice: "",
      platformId: settings.platforms[0]?.id || "",
      shippingCost: settings.defaultShippingCost.toString(),
      otherCosts: [],
      salesCount3Days: "",
    });
  };

  const handleJudge = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const purchasePrice = parseInt(formData.purchasePrice) || 0;
    const sellingPrice = parseInt(formData.sellingPrice) || 0;
    const shippingCost = parseInt(formData.shippingCost) || 0;
    const salesCount3Days = parseInt(formData.salesCount3Days) || 0;
    const feeRate = selectedPlatform?.feeRate || 0;

    const result = calculateJudgment(
      purchasePrice,
      sellingPrice,
      feeRate,
      shippingCost,
      formData.otherCosts,
      salesCount3Days,
      settings.minRoi,
      settings.minSalesCount
    );

    const judgment: CardJudgment = {
      id: generateId(),
      cardName: formData.cardName,
      cardNumber: formData.cardNumber,
      rarity: formData.rarity,
      isPsa: formData.isPsa,
      psaGrade: formData.isPsa && formData.psaGrade ? parseInt(formData.psaGrade) : null,
      purchasePrice,
      sellingPrice,
      platformId: formData.platformId,
      platformName: selectedPlatform?.name || "",
      feeRate,
      feeAmount: result.feeAmount,
      shippingCost,
      otherCosts: formData.otherCosts,
      totalOtherCosts: result.totalOtherCosts,
      netRevenue: result.netRevenue,
      profit: result.profit,
      roi: result.roi,
      salesCount3Days,
      judgment: result.judgment,
      createdAt: new Date().toISOString(),
    };

    setLastJudgment(judgment);
    router.push("/result");
  };

  const isFormValid =
    formData.purchasePrice &&
    formData.sellingPrice &&
    formData.platformId &&
    formData.salesCount3Days;

  if (state.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">読み込み中...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ヘッダー */}
          <View className="px-4 pt-4 pb-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-foreground">
                {tabMode === "judgment" ? "せどり判定" : "クイック逆算"}
              </Text>
              {tabMode === "judgment" && (formData.cardName || formData.purchasePrice || formData.sellingPrice) && (
                <TouchableOpacity
                  onPress={resetForm}
                  className="px-3 py-1.5"
                >
                  <Text className="text-muted text-sm">リセット</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-sm text-muted mt-1">
              {tabMode === "judgment"
                ? "カード情報を入力して利益率を判定"
                : "価格から逆算で仕入れ・販売の目安を計算"}
            </Text>
          </View>

          {/* タブ切り替え */}
          <View className="px-4 mt-2">
            <View
              className="flex-row rounded-xl p-1"
              style={{ backgroundColor: colors.surface }}
            >
              <TouchableOpacity
                onPress={() => setTabMode("judgment")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: tabMode === "judgment" ? colors.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: tabMode === "judgment" ? "#FFFFFF" : colors.muted,
                  }}
                >
                  通常判定
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTabMode("calculator")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: tabMode === "calculator" ? colors.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: tabMode === "calculator" ? "#FFFFFF" : colors.muted,
                  }}
                >
                  クイック逆算
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* クイック逆算モード */}
          {tabMode === "calculator" && (
            <>
              {/* 逆算モード切替 */}
              <View className="px-4 mt-4">
                <Text className="text-sm font-semibold text-muted mb-2">逆算モード</Text>
                <View
                  className="flex-row rounded-xl p-1"
                  style={{ backgroundColor: colors.surface }}
                >
                  <TouchableOpacity
                    onPress={() => setCalcMode("sellingToMax")}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: calcMode === "sellingToMax" ? colors.background : "transparent",
                      borderWidth: calcMode === "sellingToMax" ? 1 : 0,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        fontWeight: "500",
                        fontSize: 13,
                        color: calcMode === "sellingToMax" ? colors.foreground : colors.muted,
                      }}
                    >
                      販売価格 → 最大仕入れ
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCalcMode("purchaseToMin")}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: calcMode === "purchaseToMin" ? colors.background : "transparent",
                      borderWidth: calcMode === "purchaseToMin" ? 1 : 0,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        fontWeight: "500",
                        fontSize: 13,
                        color: calcMode === "purchaseToMin" ? colors.foreground : colors.muted,
                      }}
                    >
                      仕入れ価格 → 最低販売
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 逆算入力 */}
              <View className="px-4 mt-4">
                <Text className="text-sm font-semibold text-muted mb-2">
                  {calcMode === "sellingToMax" ? "販売予定価格" : "仕入れ予定価格"}
                </Text>
                <View className="bg-surface rounded-xl p-4">
                  <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
                    <Text className="text-foreground mr-1">¥</Text>
                    <TextInput
                      className="flex-1 py-3 text-foreground text-lg"
                      placeholder="0"
                      placeholderTextColor={colors.muted}
                      value={calcInput.price}
                      onChangeText={(v) => setCalcInput((prev) => ({ ...prev, price: v.replace(/[^0-9]/g, "") }))}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>

              {/* 経費条件 */}
              <View className="px-4 mt-4">
                <Text className="text-sm font-semibold text-muted mb-2">経費条件</Text>
                <View className="bg-surface rounded-xl p-4 gap-3">
                  {/* プラットフォーム選択 */}
                  <View>
                    <Text className="text-xs text-muted mb-1">プラットフォーム</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="flex-row"
                    >
                      {settings.platforms.map((platform) => (
                        <TouchableOpacity
                          key={platform.id}
                          onPress={() => setCalcInput((prev) => ({ ...prev, platformId: platform.id }))}
                          style={{
                            backgroundColor:
                              calcInput.platformId === platform.id
                                ? colors.primary
                                : colors.background,
                            borderColor:
                              calcInput.platformId === platform.id
                                ? colors.primary
                                : colors.border,
                            borderWidth: 1,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            marginRight: 8,
                          }}
                        >
                          <Text
                            style={{
                              color:
                                calcInput.platformId === platform.id
                                  ? "#FFFFFF"
                                  : colors.foreground,
                              fontSize: 13,
                              fontWeight: "500",
                            }}
                          >
                            {platform.name} ({platform.feeRate}%)
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* 送料 */}
                  <View>
                    <Text className="text-xs text-muted mb-1">送料</Text>
                    <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
                      <Text className="text-foreground mr-1">¥</Text>
                      <TextInput
                        className="flex-1 py-2.5 text-foreground"
                        placeholder="0"
                        placeholderTextColor={colors.muted}
                        value={calcInput.shippingCost}
                        onChangeText={(v) => setCalcInput((prev) => ({ ...prev, shippingCost: v.replace(/[^0-9]/g, "") }))}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  {/* その他経費合計 */}
                  <View>
                    <Text className="text-xs text-muted mb-1">その他経費（合計）</Text>
                    <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
                      <Text className="text-foreground mr-1">¥</Text>
                      <TextInput
                        className="flex-1 py-2.5 text-foreground"
                        placeholder="0"
                        placeholderTextColor={colors.muted}
                        value={calcInput.otherCostsTotal}
                        onChangeText={(v) => setCalcInput((prev) => ({ ...prev, otherCostsTotal: v.replace(/[^0-9]/g, "") }))}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* 目標ROI */}
              <View className="px-4 mt-4">
                <Text className="text-sm font-semibold text-muted mb-2">目標ROI</Text>
                <View className="bg-surface rounded-xl p-4">
                  <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
                    <TextInput
                      className="flex-1 py-2.5 text-foreground"
                      placeholder={settings.minRoi.toString()}
                      placeholderTextColor={colors.muted}
                      value={calcInput.targetRoi}
                      onChangeText={(v) => setCalcInput((prev) => ({ ...prev, targetRoi: v.replace(/[^0-9.]/g, "") }))}
                      keyboardType="decimal-pad"
                    />
                    <Text className="text-foreground ml-1">%</Text>
                  </View>
                  <Text className="text-xs text-muted mt-2">
                    ※ 設定の最小ROI: {settings.minRoi}%
                  </Text>
                </View>
              </View>

              {/* 逆算結果 */}
              {calcResult && (
                <View className="px-4 mt-4">
                  <Text className="text-sm font-semibold text-muted mb-2">計算結果</Text>
                  <View
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: `${colors.primary}15`,
                      borderWidth: 1,
                      borderColor: colors.primary,
                    }}
                  >
                    {/* メイン結果 */}
                    <View className="items-center mb-4">
                      <Text className="text-xs text-muted mb-1">
                        {calcResult.mode === "sellingToMax" ? "最大仕入れ価格" : "最低販売価格"}
                      </Text>
                      <Text
                        className="text-3xl font-bold"
                        style={{ color: colors.primary }}
                      >
                        {formatCurrency(
                          calcResult.mode === "sellingToMax"
                            ? calcResult.maxPurchasePrice
                            : calcResult.minSellingPrice
                        )}
                      </Text>
                      <Text className="text-xs text-muted mt-1">
                        ROI {calcResult.targetRoi}% 確保時
                      </Text>
                    </View>

                    {/* 詳細 */}
                    <View
                      className="rounded-lg p-3"
                      style={{ backgroundColor: colors.background }}
                    >
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-xs text-muted">
                          {calcResult.mode === "sellingToMax" ? "販売価格" : "仕入れ価格"}
                        </Text>
                        <Text className="text-sm text-foreground">
                          {formatCurrency(calcResult.inputPrice)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-xs text-muted">
                          手数料 ({calcSelectedPlatform?.feeRate || 0}%)
                        </Text>
                        <Text className="text-sm text-foreground">
                          - {formatCurrency(calcResult.feeAmount)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-xs text-muted">送料</Text>
                        <Text className="text-sm text-foreground">
                          - {formatCurrency(parseInt(calcInput.shippingCost) || 0)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-xs text-muted">その他経費</Text>
                        <Text className="text-sm text-foreground">
                          - {formatCurrency(parseInt(calcInput.otherCostsTotal) || 0)}
                        </Text>
                      </View>
                      <View
                        className="flex-row justify-between pt-2 mt-2"
                        style={{ borderTopWidth: 1, borderTopColor: colors.border }}
                      >
                        <Text className="text-xs text-muted">実質売上</Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {formatCurrency(calcResult.netRevenue)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between mt-2">
                        <Text className="text-xs text-muted">見込み利益</Text>
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: calcResult.profit >= 0 ? colors.success : colors.error }}
                        >
                          {formatCurrency(calcResult.profit)}
                        </Text>
                      </View>
                    </View>

                    {/* 判定へ引き継ぎボタン */}
                    <TouchableOpacity
                      onPress={transferToJudgment}
                      style={{
                        backgroundColor: colors.primary,
                        borderRadius: 10,
                        paddingVertical: 12,
                        marginTop: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconSymbol name="arrow.right.circle.fill" size={18} color="#FFFFFF" />
                      <Text className="text-white font-semibold ml-2">
                        この条件で判定へ
                      </Text>
                    </TouchableOpacity>

                    {/* 仕入れとして保存ボタン（Supabase有効時） */}
                    {isSupabaseEnabled && (
                      <TouchableOpacity
                        onPress={openPurchaseModal}
                        style={{
                          backgroundColor: currentWorkerId ? colors.success : colors.muted,
                          borderRadius: 10,
                          paddingVertical: 12,
                          marginTop: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: currentWorkerId ? 1 : 0.6,
                        }}
                      >
                        <IconSymbol name="plus.circle.fill" size={18} color="#FFFFFF" />
                        <Text className="text-white font-semibold ml-2">
                          {currentWorkerId
                            ? `仕入れとして保存（${currentWorker?.name}）`
                            : "仕入れ保存には作業者を選択"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* 使い方ヒント */}
              <View className="px-4 mt-4 mb-8">
                <View
                  className="rounded-xl p-4"
                  style={{ backgroundColor: colors.surface }}
                >
                  <View className="flex-row items-center mb-2">
                    <IconSymbol name="lightbulb.fill" size={16} color={colors.warning} />
                    <Text className="text-sm font-semibold text-foreground ml-2">
                      使い方のヒント
                    </Text>
                  </View>
                  <Text className="text-xs text-muted leading-5">
                    {calcMode === "sellingToMax"
                      ? "「販売価格 → 最大仕入れ」は、商品をいくらで売る予定か決まっている時に、いくらまでなら仕入れても利益が出るかを計算します。"
                      : "「仕入れ価格 → 最低販売」は、仕入れ価格が決まっている時に、最低いくらで売れば目標の利益率を達成できるかを計算します。"}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* 通常判定モード */}
          {tabMode === "judgment" && (
            <>
          {/* カード情報セクション */}
          <View className="px-4 mt-4">
            <Text className="text-sm font-semibold text-muted mb-2">カード情報</Text>
            <View className="bg-surface rounded-xl p-4 gap-3">
              <View>
                <Text className="text-xs text-muted mb-1">カード名</Text>
                <TextInput
                  className="bg-background border border-border rounded-lg px-3 py-2.5 text-foreground"
                  placeholder="例: ピカチュウVMAX"
                  placeholderTextColor={colors.muted}
                  value={formData.cardName}
                  onChangeText={(v) => updateField("cardName", v)}
                  returnKeyType="next"
                />
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-xs text-muted mb-1">カード番号</Text>
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2.5 text-foreground"
                    placeholder="例: 123/456"
                    placeholderTextColor={colors.muted}
                    value={formData.cardNumber}
                    onChangeText={(v) => updateField("cardNumber", v)}
                    returnKeyType="next"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-muted mb-1">レアリティ/備考</Text>
                  <TextInput
                    className="bg-background border border-border rounded-lg px-3 py-2.5 text-foreground"
                    placeholder="例: SAR"
                    placeholderTextColor={colors.muted}
                    value={formData.rarity}
                    onChangeText={(v) => updateField("rarity", v)}
                    returnKeyType="next"
                  />
                </View>
              </View>
              {/* PSA鑑定情報 */}
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={() => setFormData((prev) => ({ ...prev, isPsa: !prev.isPsa, psaGrade: prev.isPsa ? "" : prev.psaGrade }))}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: formData.isPsa ? colors.primary : colors.background,
                    borderWidth: 1,
                    borderColor: formData.isPsa ? colors.primary : colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: formData.isPsa ? "#FFFFFF" : colors.border,
                      backgroundColor: formData.isPsa ? colors.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    {formData.isPsa && (
                      <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={{
                      color: formData.isPsa ? "#FFFFFF" : colors.foreground,
                      fontWeight: "600",
                    }}
                  >
                    PSA鑑定品
                  </Text>
                </TouchableOpacity>
                {formData.isPsa && (
                  <View className="flex-1">
                    <Text className="text-xs text-muted mb-1">グレード</Text>
                    <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
                      <Text className="text-foreground mr-1">PSA</Text>
                      <TextInput
                        className="flex-1 py-2.5 text-foreground"
                        placeholder="10"
                        placeholderTextColor={colors.muted}
                        value={formData.psaGrade}
                        onChangeText={(v) => {
                          const num = v.replace(/[^0-9]/g, "");
                          if (num === "" || (parseInt(num) >= 1 && parseInt(num) <= 10)) {
                            setFormData((prev) => ({ ...prev, psaGrade: num }));
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* 価格情報セクション */}
          <View className="px-4 mt-4">
            <Text className="text-sm font-semibold text-muted mb-2">価格情報</Text>
            <View className="bg-surface rounded-xl p-4 gap-3">
              <View>
                <Text className="text-xs text-muted mb-1">仕入れ価格 *</Text>
                <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
                  <Text className="text-foreground mr-1">¥</Text>
                  <TextInput
                    className="flex-1 py-2.5 text-foreground"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    value={formData.purchasePrice}
                    onChangeText={(v) => updateField("purchasePrice", v.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />
                </View>
              </View>
              <View>
                <Text className="text-xs text-muted mb-1">販売予定価格 *</Text>
                <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
                  <Text className="text-foreground mr-1">¥</Text>
                  <TextInput
                    className="flex-1 py-2.5 text-foreground"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    value={formData.sellingPrice}
                    onChangeText={(v) => updateField("sellingPrice", v.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 経費セクション */}
          <View className="px-4 mt-4">
            <Text className="text-sm font-semibold text-muted mb-2">経費</Text>
            <View className="bg-surface rounded-xl p-4 gap-3">
              {/* プラットフォーム選択 */}
              <View>
                <Text className="text-xs text-muted mb-1">プラットフォーム *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-row"
                >
                  {settings.platforms.map((platform) => (
                    <TouchableOpacity
                      key={platform.id}
                      onPress={() => updateField("platformId", platform.id)}
                      style={{
                        backgroundColor:
                          formData.platformId === platform.id
                            ? colors.primary
                            : colors.background,
                        borderColor:
                          formData.platformId === platform.id
                            ? colors.primary
                            : colors.border,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        marginRight: 8,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            formData.platformId === platform.id
                              ? "#FFFFFF"
                              : colors.foreground,
                          fontSize: 13,
                          fontWeight: "500",
                        }}
                      >
                        {platform.name} ({platform.feeRate}%)
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 送料 */}
              <View>
                <Text className="text-xs text-muted mb-1">送料</Text>
                <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
                  <Text className="text-foreground mr-1">¥</Text>
                  <TextInput
                    className="flex-1 py-2.5 text-foreground"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    value={formData.shippingCost}
                    onChangeText={(v) => updateField("shippingCost", v.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* その他経費 */}
              <View>
                <Text className="text-xs text-muted mb-1">その他経費</Text>
                {formData.otherCosts.map((cost) => (
                  <View key={cost.id} className="flex-row items-center gap-2 mb-2">
                    <TextInput
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
                      placeholder="項目名"
                      placeholderTextColor={colors.muted}
                      value={cost.name}
                      onChangeText={(v) => updateOtherCost(cost.id, "name", v)}
                    />
                    <View className="flex-row items-center bg-background border border-border rounded-lg px-2 w-28">
                      <Text className="text-foreground mr-1">¥</Text>
                      <TextInput
                        className="flex-1 py-2 text-foreground text-sm"
                        placeholder="0"
                        placeholderTextColor={colors.muted}
                        value={cost.amount > 0 ? cost.amount.toString() : ""}
                        onChangeText={(v) => updateOtherCost(cost.id, "amount", v)}
                        keyboardType="number-pad"
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => removeOtherCost(cost.id)}
                      style={{ padding: 4 }}
                    >
                      <IconSymbol name="minus.circle.fill" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={addOtherCost}
                  className="flex-row items-center justify-center py-2 border border-dashed border-border rounded-lg"
                >
                  <IconSymbol name="plus.circle.fill" size={20} color={colors.primary} />
                  <Text className="text-primary ml-1 text-sm">経費を追加</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 回転率セクション */}
          <View className="px-4 mt-4">
            <Text className="text-sm font-semibold text-muted mb-2">回転率</Text>
            <View className="bg-surface rounded-xl p-4">
              <Text className="text-xs text-muted mb-1">3日以内の成約数 *</Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-3 py-2.5 text-foreground"
                placeholder="0"
                placeholderTextColor={colors.muted}
                value={formData.salesCount3Days}
                onChangeText={(v) => updateField("salesCount3Days", v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                returnKeyType="done"
              />
              <Text className="text-xs text-muted mt-2">
                ※ 0件は見送り、2件以上で問題なし
              </Text>
            </View>
          </View>

          {/* リアルタイムプレビュー */}
          {preview && (
            <View className="px-4 mt-4">
              <Text className="text-sm font-semibold text-muted mb-2">計算プレビュー</Text>
              <View
                className="rounded-xl p-4"
                style={{
                  backgroundColor:
                    preview.judgment === "buy"
                      ? `${colors.success}15`
                      : preview.judgment === "consider"
                        ? `${colors.warning}15`
                        : `${colors.error}15`,
                  borderWidth: 1,
                  borderColor:
                    preview.judgment === "buy"
                      ? colors.success
                      : preview.judgment === "consider"
                        ? colors.warning
                        : colors.error,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <IconSymbol
                      name={
                        preview.judgment === "buy"
                          ? "checkmark.circle.fill"
                          : preview.judgment === "consider"
                            ? "exclamationmark.triangle.fill"
                            : "xmark.circle.fill"
                      }
                      size={24}
                      color={
                        preview.judgment === "buy"
                          ? colors.success
                          : preview.judgment === "consider"
                            ? colors.warning
                            : colors.error
                      }
                    />
                    <Text
                      className="ml-2 font-bold text-base"
                      style={{
                        color:
                          preview.judgment === "buy"
                            ? colors.success
                            : preview.judgment === "consider"
                              ? colors.warning
                              : colors.error,
                      }}
                    >
                      {preview.judgment === "buy"
                        ? "買い推奨"
                        : preview.judgment === "consider"
                          ? "要検討"
                          : "見送り"}
                    </Text>
                  </View>
                </View>
                <View className="flex-row mt-3 gap-4">
                  <View className="flex-1">
                    <Text className="text-xs text-muted">利益</Text>
                    <Text
                      className="font-bold text-lg"
                      style={{
                        color: preview.profit >= 0 ? colors.success : colors.error,
                      }}
                    >
                      {formatCurrency(preview.profit)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-muted">ROI</Text>
                    <Text
                      className="font-bold text-lg"
                      style={{
                        color: preview.roi >= settings.minRoi ? colors.success : colors.error,
                      }}
                    >
                      {formatPercent(preview.roi)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-muted">実質売上</Text>
                    <Text className="font-bold text-lg text-foreground">
                      {formatCurrency(preview.netRevenue)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 判定ボタン */}
          <View className="px-4 mt-6 mb-4">
            <TouchableOpacity
              onPress={handleJudge}
              disabled={!isFormValid}
              style={{
                backgroundColor: isFormValid ? colors.primary : colors.border,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
                opacity: isFormValid ? 1 : 0.5,
              }}
            >
              <Text className="text-white font-bold text-lg">判定する</Text>
            </TouchableOpacity>
          </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 仕入れ保存モーダル（クイック逆算から） */}
      <Modal
        visible={showPurchaseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            style={{ backgroundColor: colors.background }}
            className="rounded-t-3xl p-4"
          >
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity onPress={() => setShowPurchaseModal(false)}>
                <Text className="text-muted">キャンセル</Text>
              </TouchableOpacity>
              <Text className="text-foreground font-bold text-lg">仕入れ情報を入力</Text>
              <TouchableOpacity onPress={handleSavePurchaseFromCalc} disabled={isSavingPurchase}>
                <Text
                  className="font-bold"
                  style={{ color: isSavingPurchase ? colors.muted : colors.primary }}
                >
                  {isSavingPurchase ? "保存中..." : "保存"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 計算結果サマリー */}
            {calcResult && (
              <View
                className="rounded-xl p-3 mb-4"
                style={{ backgroundColor: colors.surface }}
              >
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted">仕入れ価格</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {formatCurrency(
                      calcResult.mode === "sellingToMax"
                        ? calcResult.maxPurchasePrice
                        : calcResult.inputPrice
                    )}
                  </Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-xs text-muted">販売価格</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {formatCurrency(
                      calcResult.mode === "sellingToMax"
                        ? calcResult.inputPrice
                        : calcResult.minSellingPrice
                    )}
                  </Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-xs text-muted">見込み利益</Text>
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: calcResult.profit >= 0 ? colors.success : colors.error }}
                  >
                    {formatCurrency(calcResult.profit)}
                  </Text>
                </View>
              </View>
            )}

            <View className="gap-3 mb-4">
              <View>
                <Text className="text-xs text-muted mb-1">カード名 *</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-3 py-3 text-foreground"
                  placeholder="例: ピカチュウVMAX"
                  placeholderTextColor={colors.muted}
                  value={purchaseForm.cardName}
                  onChangeText={(v) => setPurchaseForm((prev) => ({ ...prev, cardName: v }))}
                  autoFocus
                  editable={!isSavingPurchase}
                />
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-xs text-muted mb-1">カード番号</Text>
                  <TextInput
                    className="bg-surface border border-border rounded-lg px-3 py-3 text-foreground"
                    placeholder="例: 123/456"
                    placeholderTextColor={colors.muted}
                    value={purchaseForm.cardNumber}
                    onChangeText={(v) => setPurchaseForm((prev) => ({ ...prev, cardNumber: v }))}
                    editable={!isSavingPurchase}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-muted mb-1">レアリティ</Text>
                  <TextInput
                    className="bg-surface border border-border rounded-lg px-3 py-3 text-foreground"
                    placeholder="例: SAR"
                    placeholderTextColor={colors.muted}
                    value={purchaseForm.rarity}
                    onChangeText={(v) => setPurchaseForm((prev) => ({ ...prev, rarity: v }))}
                    editable={!isSavingPurchase}
                  />
                </View>
              </View>
              {/* PSA鑑定情報 */}
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={() => setPurchaseForm((prev) => ({ ...prev, isPsa: !prev.isPsa, psaGrade: prev.isPsa ? "" : prev.psaGrade }))}
                  disabled={isSavingPurchase}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: purchaseForm.isPsa ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: purchaseForm.isPsa ? colors.primary : colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: purchaseForm.isPsa ? "#FFFFFF" : colors.border,
                      backgroundColor: purchaseForm.isPsa ? colors.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 6,
                    }}
                  >
                    {purchaseForm.isPsa && (
                      <IconSymbol name="checkmark.circle.fill" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={{
                      color: purchaseForm.isPsa ? "#FFFFFF" : colors.foreground,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    PSA
                  </Text>
                </TouchableOpacity>
                {purchaseForm.isPsa && (
                  <View className="flex-1">
                    <View className="flex-row items-center bg-surface border border-border rounded-lg px-3">
                      <Text className="text-foreground mr-1">PSA</Text>
                      <TextInput
                        className="flex-1 py-2.5 text-foreground"
                        placeholder="10"
                        placeholderTextColor={colors.muted}
                        value={purchaseForm.psaGrade}
                        onChangeText={(v) => {
                          const num = v.replace(/[^0-9]/g, "");
                          if (num === "" || (parseInt(num) >= 1 && parseInt(num) <= 10)) {
                            setPurchaseForm((prev) => ({ ...prev, psaGrade: num }));
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                        editable={!isSavingPurchase}
                      />
                    </View>
                  </View>
                )}
              </View>
              <View>
                <Text className="text-xs text-muted mb-1">メモ</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-3 py-3 text-foreground"
                  placeholder="任意のメモ"
                  placeholderTextColor={colors.muted}
                  value={purchaseForm.notes}
                  onChangeText={(v) => setPurchaseForm((prev) => ({ ...prev, notes: v }))}
                  editable={!isSavingPurchase}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
