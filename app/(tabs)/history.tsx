import { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Platform,
} from "react-native";
import { Alert } from "@/lib/alert";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import {
  CardJudgment,
  formatCurrency,
  formatPercent,
  formatDateTime,
  generateTSV,
  generateMultipleTSV,
} from "@/lib/types";

export default function HistoryScreen() {
  const colors = useColors();
  const { state, removeJudgment, clearHistory } = useApp();
  const { history } = state;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleCopySingle = async (judgment: CardJudgment) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const tsv = generateTSV(judgment);
    await Clipboard.setStringAsync(tsv);
    Alert.alert("コピー完了", "クリップボードにコピーしました");
  };

  const handleCopySelected = async () => {
    if (selectedIds.size === 0) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const selectedJudgments = history.filter((j) => selectedIds.has(j.id));
    const tsv = generateMultipleTSV(selectedJudgments);
    await Clipboard.setStringAsync(tsv);
    Alert.alert("コピー完了", `${selectedIds.size}件をクリップボードにコピーしました`);
    setSelectedIds(new Set());
    setIsSelecting(false);
  };

  const handleCopyAll = async () => {
    if (history.length === 0) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const tsv = generateMultipleTSV(history);
    await Clipboard.setStringAsync(tsv);
    Alert.alert("コピー完了", `${history.length}件をクリップボードにコピーしました`);
  };

  const handleDelete = (id: string) => {
    Alert.alert("削除確認", "この履歴を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => removeJudgment(id),
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert("全削除確認", "すべての履歴を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "全削除",
        style: "destructive",
        onPress: () => clearHistory(),
      },
    ]);
  };

  const getJudgmentColor = (judgment: CardJudgment["judgment"]) => {
    switch (judgment) {
      case "buy":
        return colors.success;
      case "consider":
        return colors.warning;
      case "skip":
        return colors.error;
    }
  };

  const getJudgmentLabel = (judgment: CardJudgment["judgment"]) => {
    switch (judgment) {
      case "buy":
        return "買い";
      case "consider":
        return "検討";
      case "skip":
        return "見送";
    }
  };

  const renderItem = ({ item }: { item: CardJudgment }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        onPress={() => (isSelecting ? toggleSelection(item.id) : handleCopySingle(item))}
        onLongPress={() => {
          setIsSelecting(true);
          toggleSelection(item.id);
        }}
        style={{
          backgroundColor: isSelected ? `${colors.primary}20` : colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          marginBottom: 8,
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center">
              {isSelecting && (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primary : "transparent",
                    marginRight: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSelected && (
                    <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
                  )}
                </View>
              )}
              <Text className="text-foreground font-bold text-base flex-1" numberOfLines={1}>
                {item.cardName || "カード名未入力"}
              </Text>
              <View
                style={{
                  backgroundColor: getJudgmentColor(item.judgment),
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text className="text-white text-xs font-bold">
                  {getJudgmentLabel(item.judgment)}
                </Text>
              </View>
            </View>
            {item.cardNumber && (
              <Text className="text-muted text-xs mt-1">{item.cardNumber}</Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center">
            <Text className="text-muted text-xs">{item.platformName}</Text>
            <Text className="text-muted text-xs mx-2">|</Text>
            <Text className="text-muted text-xs">
              仕入: {formatCurrency(item.purchasePrice)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text
              style={{ color: item.profit >= 0 ? colors.success : colors.error }}
              className="font-bold text-sm"
            >
              {formatCurrency(item.profit)}
            </Text>
            <Text className="text-muted text-xs ml-2">
              ({formatPercent(item.roi)})
            </Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-muted text-xs">
            回転: {item.salesCount3Days}件/3日
          </Text>
          <Text className="text-muted text-xs">
            {formatDateTime(item.createdAt)}
          </Text>
        </View>
        {!isSelecting && (
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              padding: 4,
            }}
          >
            <IconSymbol name="trash.fill" size={16} color={colors.muted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (state.isLoading) {
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
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">履歴</Text>
          {history.length > 0 && (
            <View className="flex-row items-center gap-2">
              {isSelecting ? (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setIsSelecting(false);
                      setSelectedIds(new Set());
                    }}
                    className="px-3 py-1.5"
                  >
                    <Text className="text-muted text-sm">キャンセル</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCopySelected}
                    disabled={selectedIds.size === 0}
                    style={{
                      backgroundColor: selectedIds.size > 0 ? colors.primary : colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                    }}
                  >
                    <Text className="text-white text-sm font-medium">
                      コピー ({selectedIds.size})
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={handleCopyAll}
                    className="px-3 py-1.5"
                  >
                    <Text className="text-primary text-sm">全コピー</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleClearAll}
                    className="px-3 py-1.5"
                  >
                    <Text className="text-error text-sm">全削除</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
        <Text className="text-sm text-muted mt-1">
          {history.length}件の判定履歴
          {!isSelecting && history.length > 0 && " (タップでコピー)"}
        </Text>
      </View>

      {history.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <IconSymbol name="clock.fill" size={48} color={colors.muted} />
          <Text className="text-muted mt-4">履歴がありません</Text>
          <Text className="text-muted text-sm mt-1">
            判定結果を保存すると表示されます
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}
