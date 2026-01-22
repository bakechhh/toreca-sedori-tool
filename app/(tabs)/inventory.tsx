import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Platform,
  RefreshControl,
} from "react-native";
import { Alert } from "@/lib/alert";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import {
  Purchase,
  PurchaseStatus,
  getPurchases,
  updatePurchaseStatus,
  deletePurchase,
  isSupabaseEnabled,
} from "@/lib/supabase";
import { formatCurrency, formatDateTime } from "@/lib/types";

type FilterStatus = "all" | PurchaseStatus;

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  stock: "在庫",
  listing: "出品中",
  sold: "販売済",
};

const STATUS_COLORS: Record<PurchaseStatus, string> = {
  stock: "#3B82F6", // blue
  listing: "#F59E0B", // amber
  sold: "#10B981", // green
};

export default function InventoryScreen() {
  const colors = useColors();
  const { state } = useApp();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [actualSellingPrice, setActualSellingPrice] = useState("");

  const loadPurchases = useCallback(async () => {
    if (!isSupabaseEnabled) {
      setIsLoading(false);
      return;
    }
    const data = await getPurchases(state.selectedWorkerId ?? undefined);
    setPurchases(data);
    setIsLoading(false);
    setRefreshing(false);
  }, [state.selectedWorkerId]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPurchases();
  }, [loadPurchases]);

  const filteredPurchases = purchases.filter((p) => {
    if (filterStatus === "all") return true;
    return p.status === filterStatus;
  });

  const handleStatusChange = async (newStatus: PurchaseStatus) => {
    if (!selectedPurchase) return;

    if (newStatus === "sold") {
      // 販売済みの場合は実際の販売価格を入力させる
      const price = actualSellingPrice ? parseInt(actualSellingPrice, 10) : undefined;
      const result = await updatePurchaseStatus(selectedPurchase.id, newStatus, price);
      if (result) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        loadPurchases();
      }
    } else {
      const result = await updatePurchaseStatus(selectedPurchase.id, newStatus);
      if (result) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        loadPurchases();
      }
    }

    setShowStatusModal(false);
    setSelectedPurchase(null);
    setActualSellingPrice("");
  };

  const handleDelete = (purchase: Purchase) => {
    Alert.alert("削除確認", `「${purchase.card_name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          const success = await deletePurchase(purchase.id);
          if (success) {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            loadPurchases();
          }
        },
      },
    ]);
  };

  const openStatusModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setActualSellingPrice(purchase.actual_selling_price?.toString() ?? purchase.selling_price.toString());
    setShowStatusModal(true);
  };

  const getStatusCounts = () => {
    return {
      all: purchases.length,
      stock: purchases.filter((p) => p.status === "stock").length,
      listing: purchases.filter((p) => p.status === "listing").length,
      sold: purchases.filter((p) => p.status === "sold").length,
    };
  };

  const counts = getStatusCounts();

  const renderFilterTab = (status: FilterStatus, label: string) => {
    const isActive = filterStatus === status;
    const count = counts[status];
    return (
      <TouchableOpacity
        key={status}
        onPress={() => setFilterStatus(status)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: isActive ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: isActive ? colors.primary : colors.border,
          marginRight: 8,
        }}
      >
        <Text
          style={{
            color: isActive ? "#FFFFFF" : colors.foreground,
            fontSize: 13,
            fontWeight: isActive ? "600" : "400",
          }}
        >
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Purchase }) => {
    const statusColor = STATUS_COLORS[item.status];
    const statusLabel = STATUS_LABELS[item.status];
    const displayPrice = item.status === "sold" && item.actual_selling_price
      ? item.actual_selling_price
      : item.selling_price;

    // 実際の利益計算
    const actualFee = Math.floor(displayPrice * (item.fee_rate / 100));
    const actualNetRevenue = displayPrice - actualFee - item.shipping_cost - item.other_costs_total;
    const actualProfit = actualNetRevenue - item.purchase_price;

    return (
      <TouchableOpacity
        onPress={() => openStatusModal(item)}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          marginBottom: 8,
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-foreground font-bold text-base flex-1" numberOfLines={1}>
                {item.card_name}
              </Text>
              <View
                style={{
                  backgroundColor: statusColor,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text className="text-white text-xs font-bold">{statusLabel}</Text>
              </View>
            </View>
            {item.card_number && (
              <Text className="text-muted text-xs mt-1">{item.card_number}</Text>
            )}
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center">
            <Text className="text-muted text-xs">{item.platform_name}</Text>
            <Text className="text-muted text-xs mx-2">|</Text>
            <Text className="text-muted text-xs">
              仕入: {formatCurrency(item.purchase_price)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-muted text-xs mr-2">
              {item.status === "sold" ? "売値" : "予定"}: {formatCurrency(displayPrice)}
            </Text>
            <Text
              style={{ color: actualProfit >= 0 ? colors.success : colors.error }}
              className="font-bold text-sm"
            >
              {formatCurrency(actualProfit)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-muted text-xs">
            {formatDateTime(item.created_at)}
          </Text>
          {item.status === "sold" && item.sold_at && (
            <Text className="text-muted text-xs">
              販売: {formatDateTime(item.sold_at)}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: 4,
          }}
        >
          <IconSymbol name="trash.fill" size={16} color={colors.muted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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

  return (
    <ScreenContainer>
      {/* ヘッダー */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-foreground">在庫管理</Text>
        <Text className="text-sm text-muted mt-1">
          タップしてステータスを変更
        </Text>
      </View>

      {/* フィルタータブ */}
      <View className="px-4 py-2">
        <View className="flex-row">
          {renderFilterTab("all", "全て")}
          {renderFilterTab("stock", "在庫")}
          {renderFilterTab("listing", "出品中")}
          {renderFilterTab("sold", "販売済")}
        </View>
      </View>

      {/* リスト */}
      {filteredPurchases.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <IconSymbol name="archivebox.fill" size={48} color={colors.muted} />
          <Text className="text-muted mt-4">データがありません</Text>
          <Text className="text-muted text-sm mt-1">
            判定ページから仕入れを保存してください
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPurchases}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* ステータス変更モーダル */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: colors.background,
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <Text className="text-lg font-bold text-foreground mb-4">
              ステータス変更
            </Text>
            {selectedPurchase && (
              <Text className="text-muted text-sm mb-4">
                {selectedPurchase.card_name}
              </Text>
            )}

            {/* ステータスボタン */}
            {(["stock", "listing", "sold"] as PurchaseStatus[]).map((status) => {
              const isActive = selectedPurchase?.status === status;
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => {
                    if (status === "sold") {
                      // 販売済みの場合は価格入力後に変更
                    } else {
                      handleStatusChange(status);
                    }
                  }}
                  disabled={status === "sold"}
                  style={{
                    backgroundColor: isActive ? STATUS_COLORS[status] : colors.surface,
                    borderColor: STATUS_COLORS[status],
                    borderWidth: 2,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    opacity: status === "sold" ? 0.5 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? "#FFFFFF" : colors.foreground,
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    {STATUS_LABELS[status]}
                    {status === "sold" && " (下で価格入力)"}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* 販売済み用の価格入力 */}
            <View className="mt-4">
              <Text className="text-sm font-medium text-foreground mb-2">
                実際の販売価格
              </Text>
              <TextInput
                value={actualSellingPrice}
                onChangeText={setActualSellingPrice}
                keyboardType="numeric"
                placeholder="販売価格を入力"
                placeholderTextColor={colors.muted}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  color: colors.foreground,
                  fontSize: 16,
                }}
              />
              <TouchableOpacity
                onPress={() => handleStatusChange("sold")}
                style={{
                  backgroundColor: STATUS_COLORS.sold,
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 12,
                }}
              >
                <Text className="text-white font-bold text-center">
                  販売済みにする
                </Text>
              </TouchableOpacity>
            </View>

            {/* キャンセルボタン */}
            <TouchableOpacity
              onPress={() => {
                setShowStatusModal(false);
                setSelectedPurchase(null);
                setActualSellingPrice("");
              }}
              style={{
                padding: 12,
                marginTop: 8,
              }}
            >
              <Text className="text-muted text-center">キャンセル</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}
