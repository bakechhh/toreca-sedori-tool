// トレカせどり判定ツールの型定義

export interface OtherCost {
  id: string;
  name: string;
  amount: number;
}

export interface CardJudgment {
  id: string;
  cardName: string;
  cardNumber: string;
  rarity: string;
  isPsa: boolean;
  psaGrade: number | null;
  purchasePrice: number;
  sellingPrice: number;
  platformId: string;
  platformName: string;
  feeRate: number;
  feeAmount: number;
  shippingCost: number;
  otherCosts: OtherCost[];
  totalOtherCosts: number;
  netRevenue: number;
  profit: number;
  roi: number;
  salesCount3Days: number;
  judgment: JudgmentResult;
  createdAt: string;
}

export type JudgmentResult = 'buy' | 'consider' | 'skip';

export interface Platform {
  id: string;
  name: string;
  feeRate: number;
  isDefault: boolean;
}

export interface OtherCostPreset {
  id: string;
  name: string;
  defaultAmount: number;
}

export interface Settings {
  platforms: Platform[];
  defaultShippingCost: number;
  otherCostPresets: OtherCostPreset[];
  minRoi: number;
  minSalesCount: number;
}

// 判定入力フォームの型
export interface JudgmentFormData {
  cardName: string;
  cardNumber: string;
  rarity: string;
  isPsa: boolean;
  psaGrade: string;
  purchasePrice: string;
  sellingPrice: string;
  platformId: string;
  shippingCost: string;
  otherCosts: OtherCost[];
  salesCount3Days: string;
}

// デフォルト設定
export const DEFAULT_PLATFORMS: Platform[] = [
  { id: 'mercari', name: 'メルカリ', feeRate: 10, isDefault: true },
  { id: 'yahoo-flea', name: 'Yahooフリマ', feeRate: 5, isDefault: false },
  { id: 'snkrdunk-low', name: 'スニダン(低)', feeRate: 7, isDefault: false },
  { id: 'snkrdunk-high', name: 'スニダン(高)', feeRate: 9.5, isDefault: false },
  { id: 'ebay', name: 'eBay', feeRate: 15, isDefault: false },
];

export const DEFAULT_SETTINGS: Settings = {
  platforms: DEFAULT_PLATFORMS,
  defaultShippingCost: 200,
  otherCostPresets: [],
  minRoi: 10,
  minSalesCount: 2,
};

// ユーティリティ関数
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 判定ロジック
export function calculateJudgment(
  purchasePrice: number,
  sellingPrice: number,
  feeRate: number,
  shippingCost: number,
  otherCosts: OtherCost[],
  salesCount3Days: number,
  minRoi: number,
  minSalesCount: number
): {
  feeAmount: number;
  totalOtherCosts: number;
  netRevenue: number;
  profit: number;
  roi: number;
  judgment: JudgmentResult;
} {
  const feeAmount = Math.floor(sellingPrice * (feeRate / 100));
  const totalOtherCosts = otherCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const netRevenue = sellingPrice - feeAmount - shippingCost - totalOtherCosts;
  const profit = netRevenue - purchasePrice;
  const roi = purchasePrice > 0 ? (profit / purchasePrice) * 100 : 0;

  let judgment: JudgmentResult;
  if (salesCount3Days === 0) {
    judgment = 'skip';
  } else if (roi >= minRoi && salesCount3Days >= minSalesCount) {
    judgment = 'buy';
  } else if (roi >= minRoi || salesCount3Days >= minSalesCount) {
    judgment = 'consider';
  } else {
    judgment = 'skip';
  }

  return {
    feeAmount,
    totalOtherCosts,
    netRevenue,
    profit,
    roi,
    judgment,
  };
}

// クリップボード用TSV生成
export function generateTSV(judgment: CardJudgment): string {
  const headers = [
    'カード名',
    '番号',
    'レアリティ',
    'PSA',
    'グレード',
    '仕入れ価格',
    '販売価格',
    'プラットフォーム',
    '手数料率',
    '手数料額',
    '送料',
    'その他経費',
    '実質売上',
    '利益',
    'ROI',
    '回転数',
    '判定',
    '判定日時',
  ];

  const judgmentLabel = {
    buy: '買い推奨',
    consider: '要検討',
    skip: '見送り',
  };

  const values = [
    judgment.cardName,
    judgment.cardNumber,
    judgment.rarity,
    judgment.isPsa ? 'PSA' : '-',
    judgment.psaGrade !== null ? judgment.psaGrade.toString() : '-',
    judgment.purchasePrice.toString(),
    judgment.sellingPrice.toString(),
    judgment.platformName,
    `${judgment.feeRate}%`,
    judgment.feeAmount.toString(),
    judgment.shippingCost.toString(),
    judgment.totalOtherCosts.toString(),
    judgment.netRevenue.toString(),
    judgment.profit.toString(),
    `${judgment.roi.toFixed(1)}%`,
    judgment.salesCount3Days.toString(),
    judgmentLabel[judgment.judgment],
    judgment.createdAt,
  ];

  return headers.join('\t') + '\n' + values.join('\t');
}

// 逆算計算: 販売価格から最大仕入れ価格を計算
export function calculateMaxPurchasePrice(
  sellingPrice: number,
  feeRate: number,
  shippingCost: number,
  otherCostsTotal: number,
  targetRoi: number
): {
  maxPurchasePrice: number;
  feeAmount: number;
  netRevenue: number;
  profit: number;
} {
  const feeAmount = Math.floor(sellingPrice * (feeRate / 100));
  const netRevenue = sellingPrice - feeAmount - shippingCost - otherCostsTotal;
  // purchasePrice × (1 + targetRoi/100) = netRevenue
  // purchasePrice = netRevenue / (1 + targetRoi/100)
  const maxPurchasePrice = Math.floor(netRevenue / (1 + targetRoi / 100));
  const profit = netRevenue - maxPurchasePrice;

  return {
    maxPurchasePrice: Math.max(0, maxPurchasePrice),
    feeAmount,
    netRevenue,
    profit: Math.max(0, profit),
  };
}

// 逆算計算: 仕入れ価格から最低販売価格を計算
export function calculateMinSellingPrice(
  purchasePrice: number,
  feeRate: number,
  shippingCost: number,
  otherCostsTotal: number,
  targetRoi: number
): {
  minSellingPrice: number;
  feeAmount: number;
  netRevenue: number;
  profit: number;
} {
  // netRevenue = purchasePrice × (1 + targetRoi/100)
  const requiredNetRevenue = purchasePrice * (1 + targetRoi / 100);
  // sellingPrice - sellingPrice × feeRate/100 = requiredNetRevenue + shippingCost + otherCostsTotal
  // sellingPrice × (1 - feeRate/100) = requiredNetRevenue + shippingCost + otherCostsTotal
  // sellingPrice = (requiredNetRevenue + shippingCost + otherCostsTotal) / (1 - feeRate/100)
  const minSellingPrice = Math.ceil(
    (requiredNetRevenue + shippingCost + otherCostsTotal) / (1 - feeRate / 100)
  );
  const feeAmount = Math.floor(minSellingPrice * (feeRate / 100));
  const netRevenue = minSellingPrice - feeAmount - shippingCost - otherCostsTotal;
  const profit = netRevenue - purchasePrice;

  return {
    minSellingPrice: Math.max(0, minSellingPrice),
    feeAmount,
    netRevenue,
    profit,
  };
}

// 複数判定のTSV生成（履歴エクスポート用）
export function generateMultipleTSV(judgments: CardJudgment[]): string {
  const headers = [
    'カード名',
    '番号',
    'レアリティ',
    'PSA',
    'グレード',
    '仕入れ価格',
    '販売価格',
    'プラットフォーム',
    '手数料率',
    '手数料額',
    '送料',
    'その他経費',
    '実質売上',
    '利益',
    'ROI',
    '回転数',
    '判定',
    '判定日時',
  ];

  const judgmentLabel = {
    buy: '買い推奨',
    consider: '要検討',
    skip: '見送り',
  };

  const rows = judgments.map((j) => [
    j.cardName,
    j.cardNumber,
    j.rarity,
    j.isPsa ? 'PSA' : '-',
    j.psaGrade !== null ? j.psaGrade.toString() : '-',
    j.purchasePrice.toString(),
    j.sellingPrice.toString(),
    j.platformName,
    `${j.feeRate}%`,
    j.feeAmount.toString(),
    j.shippingCost.toString(),
    j.totalOtherCosts.toString(),
    j.netRevenue.toString(),
    j.profit.toString(),
    `${j.roi.toFixed(1)}%`,
    j.salesCount3Days.toString(),
    judgmentLabel[j.judgment],
    j.createdAt,
  ].join('\t'));

  return headers.join('\t') + '\n' + rows.join('\n');
}
