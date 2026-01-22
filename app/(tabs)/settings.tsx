import { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { Alert } from "@/lib/alert";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useApp } from "@/lib/app-context";
import { Platform as PlatformType, OtherCostPreset, generateId } from "@/lib/types";
import { Worker } from "@/lib/supabase";

export default function SettingsScreen() {
  const colors = useColors();
  const {
    state,
    addPlatform,
    updatePlatform,
    deletePlatform,
    setDefaultShipping,
    addOtherCostPreset,
    updateOtherCostPreset,
    deleteOtherCostPreset,
    setMinRoi,
    setMinSalesCount,
    addWorker,
    deleteWorker,
    setCurrentWorkerId,
  } = useApp();
  const { settings, workers, currentWorkerId, isSupabaseEnabled } = state;

  const [editingPlatform, setEditingPlatform] = useState<PlatformType | null>(null);
  const [editingPreset, setEditingPreset] = useState<OtherCostPreset | null>(null);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newPlatformFeeRate, setNewPlatformFeeRate] = useState("");
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetAmount, setNewPresetAmount] = useState("");
  // 作業者管理
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [isAddingWorker, setIsAddingWorker] = useState(false);

  const handleSavePlatform = () => {
    if (!newPlatformName.trim()) {
      Alert.alert("エラー", "プラットフォーム名を入力してください");
      return;
    }
    const feeRate = parseFloat(newPlatformFeeRate) || 0;
    if (feeRate < 0 || feeRate > 100) {
      Alert.alert("エラー", "手数料率は0〜100の範囲で入力してください");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (editingPlatform) {
      updatePlatform({
        ...editingPlatform,
        name: newPlatformName.trim(),
        feeRate,
      });
    } else {
      addPlatform(newPlatformName.trim(), feeRate);
    }
    closePlatformModal();
  };

  const handleDeletePlatform = (platform: PlatformType) => {
    if (platform.isDefault) {
      Alert.alert("エラー", "デフォルトのプラットフォームは削除できません");
      return;
    }
    Alert.alert("削除確認", `${platform.name}を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => deletePlatform(platform.id),
      },
    ]);
  };

  const openPlatformModal = (platform?: PlatformType) => {
    if (platform) {
      setEditingPlatform(platform);
      setNewPlatformName(platform.name);
      setNewPlatformFeeRate(platform.feeRate.toString());
    } else {
      setEditingPlatform(null);
      setNewPlatformName("");
      setNewPlatformFeeRate("");
    }
    setShowPlatformModal(true);
  };

  const closePlatformModal = () => {
    setShowPlatformModal(false);
    setEditingPlatform(null);
    setNewPlatformName("");
    setNewPlatformFeeRate("");
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      Alert.alert("エラー", "項目名を入力してください");
      return;
    }
    const amount = parseInt(newPresetAmount) || 0;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (editingPreset) {
      updateOtherCostPreset({
        ...editingPreset,
        name: newPresetName.trim(),
        defaultAmount: amount,
      });
    } else {
      addOtherCostPreset(newPresetName.trim(), amount);
    }
    closePresetModal();
  };

  const handleDeletePreset = (preset: OtherCostPreset) => {
    Alert.alert("削除確認", `${preset.name}を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => deleteOtherCostPreset(preset.id),
      },
    ]);
  };

  const openPresetModal = (preset?: OtherCostPreset) => {
    if (preset) {
      setEditingPreset(preset);
      setNewPresetName(preset.name);
      setNewPresetAmount(preset.defaultAmount.toString());
    } else {
      setEditingPreset(null);
      setNewPresetName("");
      setNewPresetAmount("");
    }
    setShowPresetModal(true);
  };

  const closePresetModal = () => {
    setShowPresetModal(false);
    setEditingPreset(null);
    setNewPresetName("");
    setNewPresetAmount("");
  };

  // 作業者管理
  const handleAddWorker = async () => {
    if (!newWorkerName.trim()) {
      Alert.alert("エラー", "作業者名を入力してください");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsAddingWorker(true);
    const worker = await addWorker(newWorkerName.trim());
    setIsAddingWorker(false);

    if (worker) {
      setShowWorkerModal(false);
      setNewWorkerName("");
    } else {
      Alert.alert("エラー", "作業者の追加に失敗しました");
    }
  };

  const handleDeleteWorker = (worker: Worker) => {
    Alert.alert("削除確認", `${worker.name}を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          const success = await deleteWorker(worker.id);
          if (!success) {
            Alert.alert("エラー", "作業者の削除に失敗しました");
          }
        },
      },
    ]);
  };

  const handleSelectWorker = (workerId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentWorkerId(currentWorkerId === workerId ? null : workerId);
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
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ヘッダー */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">設定</Text>
          <Text className="text-sm text-muted mt-1">プリセットと判定基準を管理</Text>
        </View>

        {/* 作業者管理（Supabase有効時のみ） */}
        {isSupabaseEnabled && (
          <View className="px-4 mt-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-muted">作業者</Text>
              <TouchableOpacity
                onPress={() => setShowWorkerModal(true)}
                className="flex-row items-center"
              >
                <IconSymbol name="plus.circle.fill" size={18} color={colors.primary} />
                <Text className="text-primary text-sm ml-1">追加</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-surface rounded-xl overflow-hidden">
              {workers.length === 0 ? (
                <View className="p-4 items-center">
                  <Text className="text-muted text-sm">作業者がいません</Text>
                  <Text className="text-muted text-xs mt-1">
                    「追加」から作業者を登録してください
                  </Text>
                </View>
              ) : (
                workers.map((worker, index) => (
                  <TouchableOpacity
                    key={worker.id}
                    onPress={() => handleSelectWorker(worker.id)}
                    onLongPress={() => handleDeleteWorker(worker)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: index < workers.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      backgroundColor:
                        currentWorkerId === worker.id ? `${colors.primary}15` : "transparent",
                    }}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor:
                            currentWorkerId === worker.id ? colors.primary : colors.border,
                          backgroundColor:
                            currentWorkerId === worker.id ? colors.primary : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        {currentWorkerId === worker.id && (
                          <IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" />
                        )}
                      </View>
                      <Text className="text-foreground text-base">{worker.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
            {currentWorkerId && (
              <Text className="text-xs text-muted mt-2 px-1">
                選択中の作業者で仕入れ記録が保存されます
              </Text>
            )}
            {workers.length > 0 && (
              <Text className="text-xs text-muted mt-1 px-1">
                長押しで削除
              </Text>
            )}
          </View>
        )}

        {/* Supabase未設定時の案内 */}
        {!isSupabaseEnabled && (
          <View className="px-4 mt-4">
            <View className="bg-surface rounded-xl p-4">
              <View className="flex-row items-center mb-2">
                <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.warning} />
                <Text className="text-foreground font-semibold ml-2">データ同期が無効</Text>
              </View>
              <Text className="text-muted text-xs leading-5">
                Supabase環境変数が設定されていないため、仕入れ記録のクラウド保存機能は無効です。{"\n"}
                設定する場合は、EXPO_PUBLIC_SUPABASE_URL と EXPO_PUBLIC_SUPABASE_ANON_KEY を.envファイルに追加してください。
              </Text>
            </View>
          </View>
        )}

        {/* プラットフォーム設定 */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-muted">プラットフォーム</Text>
            <TouchableOpacity
              onPress={() => openPlatformModal()}
              className="flex-row items-center"
            >
              <IconSymbol name="plus.circle.fill" size={18} color={colors.primary} />
              <Text className="text-primary text-sm ml-1">追加</Text>
            </TouchableOpacity>
          </View>
          <View className="bg-surface rounded-xl overflow-hidden">
            {settings.platforms.map((platform, index) => (
              <TouchableOpacity
                key={platform.id}
                onPress={() => openPlatformModal(platform)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: index < settings.platforms.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <View className="flex-row items-center flex-1">
                  <Text className="text-foreground text-base">{platform.name}</Text>
                  {platform.isDefault && (
                    <View
                      style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginLeft: 8,
                      }}
                    >
                      <Text className="text-white text-xs">デフォルト</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center">
                  <Text className="text-muted text-base mr-2">{platform.feeRate}%</Text>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* デフォルト送料 */}
        <View className="px-4 mt-4">
          <Text className="text-sm font-semibold text-muted mb-2">デフォルト送料</Text>
          <View className="bg-surface rounded-xl p-4">
            <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
              <Text className="text-foreground mr-1">¥</Text>
              <TextInput
                className="flex-1 py-2.5 text-foreground"
                placeholder="0"
                placeholderTextColor={colors.muted}
                value={settings.defaultShippingCost.toString()}
                onChangeText={(v) => setDefaultShipping(parseInt(v.replace(/[^0-9]/g, "")) || 0)}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* その他経費プリセット */}
        <View className="px-4 mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-muted">その他経費プリセット</Text>
            <TouchableOpacity
              onPress={() => openPresetModal()}
              className="flex-row items-center"
            >
              <IconSymbol name="plus.circle.fill" size={18} color={colors.primary} />
              <Text className="text-primary text-sm ml-1">追加</Text>
            </TouchableOpacity>
          </View>
          <View className="bg-surface rounded-xl overflow-hidden">
            {settings.otherCostPresets.length === 0 ? (
              <View className="p-4 items-center">
                <Text className="text-muted text-sm">
                  プリセットがありません
                </Text>
              </View>
            ) : (
              settings.otherCostPresets.map((preset, index) => (
                <TouchableOpacity
                  key={preset.id}
                  onPress={() => openPresetModal(preset)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: index < settings.otherCostPresets.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text className="text-foreground text-base flex-1">{preset.name}</Text>
                  <View className="flex-row items-center">
                    <Text className="text-muted text-base mr-2">
                      ¥{preset.defaultAmount.toLocaleString()}
                    </Text>
                    <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* 判定基準 */}
        <View className="px-4 mt-4">
          <Text className="text-sm font-semibold text-muted mb-2">判定基準</Text>
          <View className="bg-surface rounded-xl p-4 gap-4">
            <View>
              <Text className="text-xs text-muted mb-1">最低ROI (%)</Text>
              <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
                <TextInput
                  className="flex-1 py-2.5 text-foreground"
                  placeholder="10"
                  placeholderTextColor={colors.muted}
                  value={settings.minRoi.toString()}
                  onChangeText={(v) => setMinRoi(parseFloat(v.replace(/[^0-9.]/g, "")) || 0)}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <Text className="text-muted ml-1">%</Text>
              </View>
              <Text className="text-xs text-muted mt-1">
                この値以上のROIで「買い推奨」判定
              </Text>
            </View>
            <View>
              <Text className="text-xs text-muted mb-1">最低回転数 (3日以内成約数)</Text>
              <View className="flex-row items-center bg-background border border-border rounded-lg px-3">
                <TextInput
                  className="flex-1 py-2.5 text-foreground"
                  placeholder="2"
                  placeholderTextColor={colors.muted}
                  value={settings.minSalesCount.toString()}
                  onChangeText={(v) => setMinSalesCount(parseInt(v.replace(/[^0-9]/g, "")) || 0)}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
                <Text className="text-muted ml-1">件</Text>
              </View>
              <Text className="text-xs text-muted mt-1">
                この値以上の成約数で回転率OK判定
              </Text>
            </View>
          </View>
        </View>

        {/* アプリ情報 */}
        <View className="px-4 mt-6 mb-4">
          <Text className="text-xs text-muted text-center">
            トレカせどり判定ツール v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* プラットフォーム編集モーダル */}
      <Modal
        visible={showPlatformModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closePlatformModal}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            style={{ backgroundColor: colors.background }}
            className="rounded-t-3xl p-4"
          >
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity onPress={closePlatformModal}>
                <Text className="text-muted">キャンセル</Text>
              </TouchableOpacity>
              <Text className="text-foreground font-bold text-lg">
                {editingPlatform ? "プラットフォーム編集" : "プラットフォーム追加"}
              </Text>
              <TouchableOpacity onPress={handleSavePlatform}>
                <Text className="text-primary font-bold">保存</Text>
              </TouchableOpacity>
            </View>

            <View className="gap-4 mb-4">
              <View>
                <Text className="text-xs text-muted mb-1">プラットフォーム名</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-3 py-3 text-foreground"
                  placeholder="例: メルカリ"
                  placeholderTextColor={colors.muted}
                  value={newPlatformName}
                  onChangeText={setNewPlatformName}
                  autoFocus
                />
              </View>
              <View>
                <Text className="text-xs text-muted mb-1">手数料率 (%)</Text>
                <View className="flex-row items-center bg-surface border border-border rounded-lg px-3">
                  <TextInput
                    className="flex-1 py-3 text-foreground"
                    placeholder="10"
                    placeholderTextColor={colors.muted}
                    value={newPlatformFeeRate}
                    onChangeText={setNewPlatformFeeRate}
                    keyboardType="decimal-pad"
                  />
                  <Text className="text-muted">%</Text>
                </View>
              </View>
            </View>

            {editingPlatform && !editingPlatform.isDefault && (
              <TouchableOpacity
                onPress={() => {
                  closePlatformModal();
                  handleDeletePlatform(editingPlatform);
                }}
                className="py-3 items-center"
              >
                <Text className="text-error font-medium">このプラットフォームを削除</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </View>
        </View>
      </Modal>

      {/* その他経費プリセット編集モーダル */}
      <Modal
        visible={showPresetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closePresetModal}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            style={{ backgroundColor: colors.background }}
            className="rounded-t-3xl p-4"
          >
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity onPress={closePresetModal}>
                <Text className="text-muted">キャンセル</Text>
              </TouchableOpacity>
              <Text className="text-foreground font-bold text-lg">
                {editingPreset ? "経費プリセット編集" : "経費プリセット追加"}
              </Text>
              <TouchableOpacity onPress={handleSavePreset}>
                <Text className="text-primary font-bold">保存</Text>
              </TouchableOpacity>
            </View>

            <View className="gap-4 mb-4">
              <View>
                <Text className="text-xs text-muted mb-1">項目名</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-3 py-3 text-foreground"
                  placeholder="例: PSA鑑定費用"
                  placeholderTextColor={colors.muted}
                  value={newPresetName}
                  onChangeText={setNewPresetName}
                  autoFocus
                />
              </View>
              <View>
                <Text className="text-xs text-muted mb-1">デフォルト金額</Text>
                <View className="flex-row items-center bg-surface border border-border rounded-lg px-3">
                  <Text className="text-foreground mr-1">¥</Text>
                  <TextInput
                    className="flex-1 py-3 text-foreground"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    value={newPresetAmount}
                    onChangeText={setNewPresetAmount}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            {editingPreset && (
              <TouchableOpacity
                onPress={() => {
                  closePresetModal();
                  handleDeletePreset(editingPreset);
                }}
                className="py-3 items-center"
              >
                <Text className="text-error font-medium">このプリセットを削除</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </View>
        </View>
      </Modal>

      {/* 作業者追加モーダル */}
      <Modal
        visible={showWorkerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWorkerModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View
            style={{ backgroundColor: colors.background }}
            className="rounded-t-3xl p-4"
          >
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity onPress={() => setShowWorkerModal(false)}>
                <Text className="text-muted">キャンセル</Text>
              </TouchableOpacity>
              <Text className="text-foreground font-bold text-lg">作業者追加</Text>
              <TouchableOpacity onPress={handleAddWorker} disabled={isAddingWorker}>
                <Text
                  className="font-bold"
                  style={{ color: isAddingWorker ? colors.muted : colors.primary }}
                >
                  {isAddingWorker ? "保存中..." : "保存"}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="gap-4 mb-4">
              <View>
                <Text className="text-xs text-muted mb-1">作業者名</Text>
                <TextInput
                  className="bg-surface border border-border rounded-lg px-3 py-3 text-foreground"
                  placeholder="例: 田中太郎"
                  placeholderTextColor={colors.muted}
                  value={newWorkerName}
                  onChangeText={setNewWorkerName}
                  autoFocus
                  editable={!isAddingWorker}
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
