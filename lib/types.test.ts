import { describe, it, expect } from 'vitest';
import {
  calculateJudgment,
  generateTSV,
  generateMultipleTSV,
  formatCurrency,
  formatPercent,
  CardJudgment,
  OtherCost,
} from './types';

describe('calculateJudgment', () => {
  it('should return "buy" when ROI >= minRoi and salesCount >= minSalesCount', () => {
    const result = calculateJudgment(
      8000,  // purchasePrice
      10000, // sellingPrice
      10,    // feeRate (10%)
      200,   // shippingCost
      [],    // otherCosts
      3,     // salesCount3Days
      10,    // minRoi
      2      // minSalesCount
    );

    // 手数料: 10000 * 10% = 1000
    // 実質売上: 10000 - 1000 - 200 = 8800
    // 利益: 8800 - 8000 = 800
    // ROI: 800 / 8000 * 100 = 10%
    expect(result.feeAmount).toBe(1000);
    expect(result.netRevenue).toBe(8800);
    expect(result.profit).toBe(800);
    expect(result.roi).toBe(10);
    expect(result.judgment).toBe('buy');
  });

  it('should return "skip" when salesCount is 0', () => {
    const result = calculateJudgment(
      5000,
      10000,
      10,
      200,
      [],
      0,     // salesCount3Days = 0
      10,
      2
    );

    expect(result.judgment).toBe('skip');
  });

  it('should return "consider" when only ROI meets criteria', () => {
    const result = calculateJudgment(
      8000,
      10000,
      10,
      200,
      [],
      1,     // salesCount3Days = 1 (below minSalesCount of 2)
      10,
      2
    );

    expect(result.roi).toBe(10);
    expect(result.judgment).toBe('consider');
  });

  it('should return "consider" when only salesCount meets criteria', () => {
    const result = calculateJudgment(
      9000,  // Higher purchase price = lower ROI
      10000,
      10,
      200,
      [],
      3,
      10,
      2
    );

    // 手数料: 1000, 実質売上: 8800, 利益: -200, ROI: -2.2%
    expect(result.roi).toBeLessThan(10);
    expect(result.judgment).toBe('consider');
  });

  it('should return "skip" when neither criteria is met', () => {
    const result = calculateJudgment(
      9500,
      10000,
      10,
      200,
      [],
      1,
      10,
      2
    );

    expect(result.judgment).toBe('skip');
  });

  it('should correctly calculate with other costs', () => {
    const otherCosts: OtherCost[] = [
      { id: '1', name: 'PSA鑑定', amount: 3000 },
      { id: '2', name: '関税', amount: 500 },
    ];

    const result = calculateJudgment(
      5000,
      15000,
      10,
      200,
      otherCosts,
      5,
      10,
      2
    );

    // 手数料: 15000 * 10% = 1500
    // その他経費: 3000 + 500 = 3500
    // 実質売上: 15000 - 1500 - 200 - 3500 = 9800
    // 利益: 9800 - 5000 = 4800
    // ROI: 4800 / 5000 * 100 = 96%
    expect(result.feeAmount).toBe(1500);
    expect(result.totalOtherCosts).toBe(3500);
    expect(result.netRevenue).toBe(9800);
    expect(result.profit).toBe(4800);
    expect(result.roi).toBe(96);
    expect(result.judgment).toBe('buy');
  });

  it('should handle zero purchase price', () => {
    const result = calculateJudgment(
      0,
      10000,
      10,
      200,
      [],
      3,
      10,
      2
    );

    expect(result.roi).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('should format positive numbers with yen symbol', () => {
    expect(formatCurrency(1000)).toBe('¥1,000');
    expect(formatCurrency(10000)).toBe('¥10,000');
    expect(formatCurrency(1234567)).toBe('¥1,234,567');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('¥0');
  });

  it('should format negative numbers', () => {
    expect(formatCurrency(-500)).toBe('¥-500');
  });
});

describe('formatPercent', () => {
  it('should format percentages with one decimal place', () => {
    expect(formatPercent(10)).toBe('10.0%');
    expect(formatPercent(10.5)).toBe('10.5%');
    expect(formatPercent(10.55)).toBe('10.6%'); // rounds
  });

  it('should format negative percentages', () => {
    expect(formatPercent(-5.5)).toBe('-5.5%');
  });
});

describe('generateTSV', () => {
  it('should generate valid TSV format', () => {
    const judgment: CardJudgment = {
      id: 'test-id',
      cardName: 'ピカチュウVMAX',
      cardNumber: '123/456',
      rarity: 'SAR',
      isPsa: false,
      psaGrade: null,
      purchasePrice: 8000,
      sellingPrice: 10000,
      platformId: 'mercari',
      platformName: 'メルカリ',
      feeRate: 10,
      feeAmount: 1000,
      shippingCost: 200,
      otherCosts: [],
      totalOtherCosts: 0,
      netRevenue: 8800,
      profit: 800,
      roi: 10,
      salesCount3Days: 3,
      judgment: 'buy',
      createdAt: '2026-01-18T10:30:00.000Z',
    };

    const tsv = generateTSV(judgment);
    const lines = tsv.split('\n');
    
    expect(lines.length).toBe(2);
    
    // Check headers
    const headers = lines[0].split('\t');
    expect(headers).toContain('カード名');
    expect(headers).toContain('ROI');
    expect(headers).toContain('判定');
    
    // Check values
    const values = lines[1].split('\t');
    expect(values[0]).toBe('ピカチュウVMAX');
    expect(values).toContain('買い推奨');
  });
});

describe('generateMultipleTSV', () => {
  it('should generate TSV for multiple judgments', () => {
    const judgments: CardJudgment[] = [
      {
        id: '1',
        cardName: 'カード1',
        cardNumber: '001',
        rarity: 'R',
        isPsa: false,
        psaGrade: null,
        purchasePrice: 1000,
        sellingPrice: 2000,
        platformId: 'mercari',
        platformName: 'メルカリ',
        feeRate: 10,
        feeAmount: 200,
        shippingCost: 200,
        otherCosts: [],
        totalOtherCosts: 0,
        netRevenue: 1600,
        profit: 600,
        roi: 60,
        salesCount3Days: 5,
        judgment: 'buy',
        createdAt: '2026-01-18T10:00:00.000Z',
      },
      {
        id: '2',
        cardName: 'カード2',
        cardNumber: '002',
        rarity: 'SR',
        isPsa: true,
        psaGrade: 10,
        purchasePrice: 5000,
        sellingPrice: 5500,
        platformId: 'yahoo',
        platformName: 'Yahooフリマ',
        feeRate: 5,
        feeAmount: 275,
        shippingCost: 200,
        otherCosts: [],
        totalOtherCosts: 0,
        netRevenue: 5025,
        profit: 25,
        roi: 0.5,
        salesCount3Days: 1,
        judgment: 'skip',
        createdAt: '2026-01-18T11:00:00.000Z',
      },
    ];

    const tsv = generateMultipleTSV(judgments);
    const lines = tsv.split('\n');
    
    expect(lines.length).toBe(3); // header + 2 data rows
    expect(lines[1]).toContain('カード1');
    expect(lines[2]).toContain('カード2');
  });

  it('should handle empty array', () => {
    const tsv = generateMultipleTSV([]);
    const lines = tsv.split('\n');
    
    // header + empty row from join
    expect(lines[0]).toContain('カード名');
  });
});
