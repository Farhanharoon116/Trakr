import { z } from 'zod';
import { supabase } from '../db';
import { config } from '../config';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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

export type ForecastResult = z.infer<typeof ForecastResultSchema>;

const ReorderSuggestionSchema = z.object({
  product_id: z.string(),
  days_until_stockout: z.number(),
  recommended_qty: z.number(),
  urgency: z.enum(['urgent', 'soon', 'monitor']),
});

export type ReorderSuggestion = z.infer<typeof ReorderSuggestionSchema> & {
  product_name: string;
};

async function callGemini(prompt: string): Promise<string> {
  const apiKey = config.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function extractJson(text: string): string {
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) return obj[0];
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) return arr[0];
  return text;
}

export async function generateSalesForecast(
  businessId: string,
  branchId?: string
): Promise<ForecastResult> {
  const now = new Date();

  // Return cached forecast if still valid
  const { data: cached } = await supabase
    .from('ai_forecasts')
    .select('predictions, insights, seasonality_flags')
    .eq('business_id', businessId)
    .eq('forecast_type', 'sales')
    .gte('expires_at', now.toISOString())
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    return {
      predictions: cached.predictions as ForecastResult['predictions'],
      insights: (cached.insights ?? []) as string[],
      seasonality_flags: (cached.seasonality_flags ?? []) as string[],
    };
  }

  // Fetch last 90 days of sales
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from('sales')
    .select('total, created_at')
    .eq('business_id', businessId)
    .gte('created_at', ninetyDaysAgo)
    .order('created_at', { ascending: true });
  if (branchId) query = query.eq('branch_id', branchId);
  const { data: sales } = await query;

  // Aggregate by day
  const dailyMap = new Map<string, { revenue: number; transactions: number }>();
  for (const sale of sales ?? []) {
    const day = (sale.created_at as string).split('T')[0];
    const prev = dailyMap.get(day) ?? { revenue: 0, transactions: 0 };
    dailyMap.set(day, {
      revenue: prev.revenue + (sale.total as number),
      transactions: prev.transactions + 1,
    });
  }

  const csvLines = ['date,revenue,transactions'];
  for (const [date, { revenue, transactions }] of dailyMap.entries()) {
    csvLines.push(`${date},${revenue.toFixed(2)},${transactions}`);
  }
  const csv = csvLines.join('\n');

  const prompt = `You are a sales analyst for a Pakistani retail business. Here is 90 days of sales data:
${csv}

Analyze trends, seasonality (Pakistani holidays: Eid, Ramadan, independence day), and predict the next 30 days of daily revenue.
Respond ONLY in this JSON format:
{ "predictions": [{"date": "YYYY-MM-DD", "predicted_revenue": number, "confidence": "high"|"medium"|"low"}], "insights": ["string"], "seasonality_flags": ["string"] }`;

  const text = await callGemini(prompt);
  const parsed = ForecastResultSchema.parse(JSON.parse(extractJson(text)));

  // Cache for 24 hours
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('ai_forecasts').insert({
    business_id: businessId,
    branch_id: branchId ?? null,
    forecast_type: 'sales',
    predictions: parsed.predictions,
    insights: parsed.insights,
    seasonality_flags: parsed.seasonality_flags,
    expires_at: expiresAt,
  });

  return parsed;
}

export async function generateReorderSuggestions(
  businessId: string
): Promise<ReorderSuggestion[]> {
  // Fetch all inventory with product info
  const { data: allInventory } = await supabase
    .from('inventory')
    .select('product_id, qty_on_hand, reorder_point, reorder_qty, products(name_en)')
    .eq('business_id', businessId);

  const lowStock = (allInventory ?? []).filter(
    (i) => (i.qty_on_hand as number) < (i.reorder_point as number)
  );

  if (lowStock.length === 0) return [];

  // Fetch sales velocity (last 30 days) for low-stock products
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const productIds = lowStock.map((i) => i.product_id as string);

  const { data: recentItems } = await supabase
    .from('sale_items')
    .select('product_id, qty')
    .in('product_id', productIds)
    .gte('created_at', thirtyDaysAgo);

  const velocityMap = new Map<string, number>();
  for (const item of recentItems ?? []) {
    const pid = item.product_id as string;
    velocityMap.set(pid, (velocityMap.get(pid) ?? 0) + (item.qty as number));
  }
  for (const [pid, total] of velocityMap.entries()) {
    velocityMap.set(pid, total / 30);
  }

  const nameMap = new Map<string, string>();
  const csvLines = ['product_id,product_name,qty_on_hand,reorder_point,avg_daily_sold'];
  for (const inv of lowStock) {
    const pid = inv.product_id as string;
    const name =
      ((inv.products as unknown) as { name_en: string } | null)?.name_en ?? 'Unknown';
    nameMap.set(pid, name);
    const velocity = velocityMap.get(pid) ?? 0;
    csvLines.push(
      `${pid},${name},${inv.qty_on_hand},${inv.reorder_point},${velocity.toFixed(2)}`
    );
  }
  const csv = csvLines.join('\n');

  const prompt = `Given sales velocity and current stock, calculate days until stockout and recommended reorder quantity for each product.
${csv}
Respond ONLY in JSON array format: [{"product_id": "...", "days_until_stockout": number, "recommended_qty": number, "urgency": "urgent"|"soon"|"monitor"}]`;

  const text = await callGemini(prompt);
  const parsed = z.array(ReorderSuggestionSchema).parse(JSON.parse(extractJson(text)));

  return parsed.map((s) => ({ ...s, product_name: nameMap.get(s.product_id) ?? 'Unknown' }));
}
