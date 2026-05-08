import { logger } from '../utils/logger';

export interface ReceiptData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  ntn?: string;
  receiptNumber: string;
  date: string;
  cashierName: string;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
}

export function generateReceiptText(data: ReceiptData): string {
  const lines: string[] = [];
  const w = 32; // 80mm thermal at ~10cpi

  const center = (s: string) => s.padStart(Math.floor((w + s.length) / 2)).padEnd(w);
  const row = (left: string, right: string) =>
    left.padEnd(w - right.length) + right;

  lines.push(center(data.businessName));
  if (data.businessAddress) lines.push(center(data.businessAddress));
  if (data.businessPhone) lines.push(center(data.businessPhone));
  if (data.ntn) lines.push(center(`NTN: ${data.ntn}`));
  lines.push('-'.repeat(w));
  lines.push(`Date: ${data.date}`);
  lines.push(`Receipt: ${data.receiptNumber}`);
  lines.push(`Cashier: ${data.cashierName}`);
  lines.push('-'.repeat(w));

  for (const item of data.items) {
    lines.push(item.name.substring(0, w));
    lines.push(row(`  ${item.qty} x Rs ${item.unitPrice.toFixed(2)}`, `Rs ${item.total.toFixed(2)}`));
  }

  lines.push('-'.repeat(w));
  lines.push(row('Subtotal:', `Rs ${data.subtotal.toFixed(2)}`));
  if (data.discount > 0) lines.push(row('Discount:', `-Rs ${data.discount.toFixed(2)}`));
  lines.push(row('GST:', `Rs ${data.taxAmount.toFixed(2)}`));
  lines.push(row('TOTAL:', `Rs ${data.total.toFixed(2)}`));
  lines.push('-'.repeat(w));
  lines.push(center(`Payment: ${data.paymentMethod.toUpperCase()}`));
  lines.push(center('Thank you for your business!'));
  lines.push('');

  return lines.join('\n');
}

export async function storeReceiptPDF(_receiptData: ReceiptData): Promise<string | null> {
  logger.info('Receipt PDF storage is a stub — implement with jsPDF on client side');
  return null;
}
