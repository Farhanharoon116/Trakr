import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-declare the schemas here to test them in isolation without pulling in
// config/db (which need live env-vars).

const ForecastPredictionSchema = z.object({
  date: z.string(),
  predicted_revenue: z.number(),
  confidence: z.enum(['high', 'medium', 'low']),
});

const ForecastResultSchema = z.object({
  predictions: z.array(ForecastPredictionSchema),
  insights: z.array(z.string()),
  seasonality_flags: z.array(z.string()),
});

const ReorderSuggestionSchema = z.object({
  product_id: z.string(),
  days_until_stockout: z.number(),
  recommended_qty: z.number(),
  urgency: z.enum(['urgent', 'soon', 'monitor']),
});

describe('ForecastResultSchema', () => {
  it('parses a valid forecast response', () => {
    const raw = {
      predictions: [
        { date: '2024-07-01', predicted_revenue: 12500, confidence: 'high' },
        { date: '2024-07-02', predicted_revenue: 9800, confidence: 'medium' },
      ],
      insights: ['Peak sales on weekends', 'Eid boost expected'],
      seasonality_flags: ['eid_ul_adha', 'ramadan'],
    };
    const result = ForecastResultSchema.parse(raw);
    expect(result.predictions).toHaveLength(2);
    expect(result.predictions[0]?.confidence).toBe('high');
    expect(result.insights).toContain('Peak sales on weekends');
    expect(result.seasonality_flags).toContain('eid_ul_adha');
  });

  it('rejects invalid confidence values', () => {
    const raw = {
      predictions: [{ date: '2024-07-01', predicted_revenue: 100, confidence: 'extreme' }],
      insights: [],
      seasonality_flags: [],
    };
    expect(() => ForecastResultSchema.parse(raw)).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => ForecastResultSchema.parse({ insights: [] })).toThrow();
    expect(() => ForecastResultSchema.parse({ predictions: [], seasonality_flags: [] })).toThrow();
  });

  it('accepts empty predictions array', () => {
    const result = ForecastResultSchema.parse({
      predictions: [],
      insights: [],
      seasonality_flags: [],
    });
    expect(result.predictions).toHaveLength(0);
  });
});

describe('ReorderSuggestionSchema', () => {
  it('parses a valid reorder suggestion', () => {
    const raw = {
      product_id: 'prod-uuid-123',
      days_until_stockout: 3,
      recommended_qty: 50,
      urgency: 'urgent',
    };
    const result = ReorderSuggestionSchema.parse(raw);
    expect(result.product_id).toBe('prod-uuid-123');
    expect(result.urgency).toBe('urgent');
    expect(result.days_until_stockout).toBe(3);
  });

  it('rejects invalid urgency values', () => {
    const raw = {
      product_id: 'prod-1',
      days_until_stockout: 5,
      recommended_qty: 10,
      urgency: 'critical',
    };
    expect(() => ReorderSuggestionSchema.parse(raw)).toThrow();
  });

  it('parses all valid urgency levels', () => {
    for (const urgency of ['urgent', 'soon', 'monitor'] as const) {
      const result = ReorderSuggestionSchema.parse({
        product_id: 'prod-1',
        days_until_stockout: 2,
        recommended_qty: 20,
        urgency,
      });
      expect(result.urgency).toBe(urgency);
    }
  });

  it('requires numeric fields to be numbers', () => {
    expect(() =>
      ReorderSuggestionSchema.parse({
        product_id: 'prod-1',
        days_until_stockout: 'five',
        recommended_qty: 20,
        urgency: 'soon',
      })
    ).toThrow();
  });
});

describe('ForecastPredictionSchema', () => {
  it('parses valid prediction', () => {
    const result = ForecastPredictionSchema.parse({
      date: '2024-09-15',
      predicted_revenue: 45000.5,
      confidence: 'low',
    });
    expect(result.predicted_revenue).toBe(45000.5);
  });

  it('rejects missing date', () => {
    expect(() =>
      ForecastPredictionSchema.parse({ predicted_revenue: 100, confidence: 'high' })
    ).toThrow();
  });
});
