import { ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function HelpScreen() {
  const colors = useColors();

  const Section = ({
    icon,
    title,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
  }) => (
    <View className="bg-surface rounded-xl p-4 mb-4">
      <View className="flex-row items-center mb-3">
        {icon}
        <Text className="text-foreground font-bold text-base ml-2">{title}</Text>
      </View>
      {children}
    </View>
  );

  const Step = ({ number, text }: { number: number; text: string }) => (
    <View className="flex-row mb-2">
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Text className="text-white font-bold text-xs">{number}</Text>
      </View>
      <Text className="text-foreground flex-1 leading-6">{text}</Text>
    </View>
  );

  const Tip = ({ text }: { text: string }) => (
    <View
      className="flex-row items-start p-3 rounded-lg mt-2"
      style={{ backgroundColor: `${colors.warning}15` }}
    >
      <IconSymbol name="lightbulb.fill" size={16} color={colors.warning} />
      <Text className="text-foreground text-sm flex-1 ml-2">{text}</Text>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ヘッダー */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">使い方ガイド</Text>
          <Text className="text-sm text-muted mt-1">
            トレカせどりツールの使い方を解説
          </Text>
        </View>

        <View className="px-4 mt-4">
          {/* 基本的な使い方 */}
          <Section
            icon={<IconSymbol name="calculator.fill" size={20} color={colors.primary} />}
            title="基本的な使い方"
          >
            <Text className="text-muted text-sm mb-3">
              カードを仕入れる前に、利益が出るかを判定します。
            </Text>
            <Step number={1} text="「判定」タブを開く" />
            <Step number={2} text="カード名、番号、レアリティを入力（任意）" />
            <Step number={3} text="PSA鑑定品の場合はチェックしてグレードを入力" />
            <Step number={4} text="仕入れ価格（いくらで買うか）を入力" />
            <Step number={5} text="販売予定価格（いくらで売るか）を入力" />
            <Step number={6} text="プラットフォーム（メルカリ等）を選択" />
            <Step number={7} text="送料を確認・修正" />
            <Step number={8} text="3日以内の成約数を入力（メルカリの売れた数など）" />
            <Step number={9} text="「判定する」ボタンをタップ" />
            <Tip text="成約数0は自動的に「見送り」判定になります。売れ行きを必ず確認しましょう。" />
          </Section>

          {/* 判定結果の見方 */}
          <Section
            icon={<IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />}
            title="判定結果の見方"
          >
            <View className="gap-3">
              <View className="flex-row items-center">
                <View
                  style={{
                    backgroundColor: colors.success,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text className="text-white font-bold text-sm">買い推奨</Text>
                </View>
                <Text className="text-foreground flex-1 ml-3 text-sm">
                  ROIと成約数の両方が基準を満たしています
                </Text>
              </View>
              <View className="flex-row items-center">
                <View
                  style={{
                    backgroundColor: colors.warning,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text className="text-white font-bold text-sm">要検討</Text>
                </View>
                <Text className="text-foreground flex-1 ml-3 text-sm">
                  ROIまたは成約数のどちらかは基準を満たしています
                </Text>
              </View>
              <View className="flex-row items-center">
                <View
                  style={{
                    backgroundColor: colors.error,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text className="text-white font-bold text-sm">見送り</Text>
                </View>
                <Text className="text-foreground flex-1 ml-3 text-sm">
                  基準を満たさない、または成約数が0です
                </Text>
              </View>
            </View>
            <Tip text="ROI（利益率）の基準は設定画面で変更できます。デフォルトは10%です。" />
          </Section>

          {/* クイック逆算 */}
          <Section
            icon={<IconSymbol name="arrow.right.circle.fill" size={20} color={colors.primary} />}
            title="クイック逆算の使い方"
          >
            <Text className="text-muted text-sm mb-3">
              価格から逆算して、仕入れや販売の目安を計算します。
            </Text>

            <Text className="text-foreground font-semibold mb-2">
              販売価格 → 最大仕入れ価格
            </Text>
            <Text className="text-muted text-sm mb-3">
              「この価格で売れそう」という時に、いくらまで仕入れても利益が出るか計算します。
            </Text>

            <Text className="text-foreground font-semibold mb-2">
              仕入れ価格 → 最低販売価格
            </Text>
            <Text className="text-muted text-sm mb-3">
              「この価格で仕入れられる」という時に、最低いくらで売れば利益が出るか計算します。
            </Text>

            <Tip text="「この条件で判定へ」をタップすると、計算結果を判定フォームに引き継げます。" />
          </Section>

          {/* 仕入れ保存（Supabase） */}
          <Section
            icon={<IconSymbol name="plus.circle.fill" size={20} color={colors.success} />}
            title="仕入れ記録の保存"
          >
            <Text className="text-muted text-sm mb-3">
              判定して仕入れを決めたら、記録を保存できます。
            </Text>
            <Step number={1} text="設定画面で作業者を追加・選択" />
            <Step number={2} text="判定またはクイック逆算で計算" />
            <Step number={3} text="「仕入れとして保存」をタップ" />
            <Step number={4} text="（クイック逆算の場合）カード情報を入力して保存" />
            <Tip text="Supabase連携が必要です。環境変数を設定してください。" />
          </Section>

          {/* PSA鑑定品 */}
          <Section
            icon={<IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />}
            title="PSA鑑定品の入力"
          >
            <Text className="text-muted text-sm mb-3">
              PSA鑑定済みカードの場合、専用のフラグを使います。
            </Text>
            <Step number={1} text="「PSA鑑定品」チェックボックスをタップ" />
            <Step number={2} text="グレード（1〜10）を入力" />
            <Text className="text-muted text-sm mt-2">
              PSA情報は履歴やエクスポートに含まれます。
            </Text>
          </Section>

          {/* 履歴機能 */}
          <Section
            icon={<IconSymbol name="clock.fill" size={20} color={colors.primary} />}
            title="履歴の使い方"
          >
            <Text className="text-muted text-sm mb-3">
              過去の判定結果を確認・管理できます。
            </Text>
            <Text className="text-foreground text-sm mb-2">
              <Text className="font-semibold">タップ：</Text> クリップボードにコピー
            </Text>
            <Text className="text-foreground text-sm mb-2">
              <Text className="font-semibold">長押し：</Text> 複数選択モードへ
            </Text>
            <Text className="text-foreground text-sm">
              <Text className="font-semibold">右上メニュー：</Text> 全コピー・全削除
            </Text>
          </Section>

          {/* 設定のカスタマイズ */}
          <Section
            icon={<IconSymbol name="gearshape.fill" size={20} color={colors.primary} />}
            title="設定のカスタマイズ"
          >
            <Text className="text-muted text-sm mb-3">
              自分の環境に合わせて設定を変更できます。
            </Text>

            <Text className="text-foreground font-semibold mb-1">作業者</Text>
            <Text className="text-muted text-sm mb-3">
              仕入れ記録を保存する作業者を管理します。
            </Text>

            <Text className="text-foreground font-semibold mb-1">プラットフォーム</Text>
            <Text className="text-muted text-sm mb-3">
              販売先（メルカリ、ヤフオク等）と手数料率を設定します。
            </Text>

            <Text className="text-foreground font-semibold mb-1">デフォルト送料</Text>
            <Text className="text-muted text-sm mb-3">
              判定時に自動入力される送料です。
            </Text>

            <Text className="text-foreground font-semibold mb-1">判定基準</Text>
            <Text className="text-muted text-sm">
              最低ROI（利益率）と最低回転数（成約数）を設定します。
            </Text>
          </Section>

          {/* 用語説明 */}
          <Section
            icon={<IconSymbol name="doc.on.clipboard.fill" size={20} color={colors.primary} />}
            title="用語説明"
          >
            <View className="gap-3">
              <View>
                <Text className="text-foreground font-semibold">ROI（利益率）</Text>
                <Text className="text-muted text-sm">
                  仕入れ価格に対する利益の割合。{"\n"}
                  計算式: 利益 ÷ 仕入れ価格 × 100
                </Text>
              </View>
              <View>
                <Text className="text-foreground font-semibold">実質売上</Text>
                <Text className="text-muted text-sm">
                  販売価格から手数料・送料・経費を引いた金額
                </Text>
              </View>
              <View>
                <Text className="text-foreground font-semibold">利益</Text>
                <Text className="text-muted text-sm">
                  実質売上から仕入れ価格を引いた金額
                </Text>
              </View>
              <View>
                <Text className="text-foreground font-semibold">回転率（成約数）</Text>
                <Text className="text-muted text-sm">
                  3日以内に売れた数。メルカリなどで確認できます。
                </Text>
              </View>
              <View>
                <Text className="text-foreground font-semibold">PSAグレード</Text>
                <Text className="text-muted text-sm">
                  PSA社による鑑定評価。1〜10の10段階で、10が最高評価。
                </Text>
              </View>
            </View>
          </Section>

          {/* バージョン情報 */}
          <View className="items-center py-4">
            <Text className="text-muted text-xs">
              トレカせどり判定ツール v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
