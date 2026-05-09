// NTN format: XXXXXXX-X (7 digits, dash, 1 digit)
// Also accepts 13-digit CNIC format: XXXXX-XXXXXXX-X
export function validateNTN(ntn: string): boolean {
  const ntnPattern = /^\d{7}-\d$/;
  const cnicPattern = /^\d{5}-\d{7}-\d$/;
  return ntnPattern.test(ntn) || cnicPattern.test(ntn);
}

// Returns tax amount rounded to 2 decimal places
export function calculateGST(amount: number, rate: number): number {
  return Math.round((amount * rate) / 100 * 100) / 100;
}

export interface FBRReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface FBRReceiptData {
  ntn: string;
  businessName: string;
  receiptNumber: string;
  date: string;
  items: FBRReceiptItem[];
  subtotal: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

interface SaleInput {
  receipt_number: string;
  created_at: string;
  subtotal: number;
  tax_amount: number;
  total: number;
}

interface BusinessInput {
  name: string;
  tax_id: string | null;
}

interface SaleItemInput {
  name_en: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

export function generateFBRReceiptData(
  sale: SaleInput,
  business: BusinessInput,
  items: SaleItemInput[]
): FBRReceiptData {
  const taxableAmount = Math.round((sale.subtotal - sale.tax_amount) * 100) / 100;

  const receiptItems: FBRReceiptItem[] = items.map((item) => {
    const itemTaxable = Math.round((item.total / (1 + item.tax_rate / 100)) * 100) / 100;
    const taxAmount = calculateGST(itemTaxable, item.tax_rate);
    return {
      name: item.name_en,
      qty: item.qty,
      unitPrice: item.unit_price,
      taxRate: item.tax_rate,
      taxAmount,
      total: item.total,
    };
  });

  return {
    ntn: business.tax_id ?? '',
    businessName: business.name,
    receiptNumber: sale.receipt_number,
    date: sale.created_at,
    items: receiptItems,
    subtotal: sale.subtotal,
    taxableAmount,
    taxAmount: sale.tax_amount,
    total: sale.total,
  };
}

interface GSTSaleInput {
  receipt_number: string;
  created_at: string;
  total: number;
  tax_amount: number;
  customer_name?: string;
  customer_ntn?: string;
}

// Returns CSV string with columns: SR, Invoice#, Date, Buyer Name, Buyer NTN, Taxable Value, GST Amount
export function generateGSTReturn(
  sales: GSTSaleInput[],
  _period: 'monthly' | 'quarterly'
): string {
  const header = 'SR,Invoice#,Date,Buyer Name,Buyer NTN,Taxable Value,GST Amount';
  const rows = sales.map((sale, idx) => {
    const taxableValue = Math.round((sale.total - sale.tax_amount) * 100) / 100;
    const buyerName = (sale.customer_name ?? 'Walk-in Customer').replace(/,/g, ' ');
    const buyerNTN = (sale.customer_ntn ?? '').replace(/,/g, ' ');
    const date = sale.created_at.split('T')[0] ?? sale.created_at;
    return [
      idx + 1,
      sale.receipt_number,
      date,
      buyerName,
      buyerNTN,
      taxableValue.toFixed(2),
      sale.tax_amount.toFixed(2),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}
