import { logger } from '../utils/logger';
import { config } from '../config';

export async function sendReceiptMessage(
  phone: string,
  receiptData: {
    businessName: string;
    receiptNumber: string;
    totalAmount: number;
    itemsSummary: string;
    receiptUrl: string;
  }
): Promise<void> {
  if (!config.INTERAKT_API_KEY) {
    logger.info({ phone }, 'WhatsApp not configured — skipping receipt message');
    return;
  }
  try {
    await sendInteraktMessage(phone, 'receipt_notification', [
      receiptData.businessName,
      receiptData.receiptNumber,
      `Rs ${receiptData.totalAmount.toFixed(2)}`,
      receiptData.itemsSummary,
      receiptData.receiptUrl,
    ]);
  } catch (err) {
    logger.error({ err, phone }, 'Failed to send WhatsApp receipt');
  }
}

export async function sendLowStockAlert(
  phone: string,
  productName: string,
  currentStock: number
): Promise<void> {
  if (!config.INTERAKT_API_KEY) return;
  try {
    await sendInteraktMessage(phone, 'low_stock_alert', [
      productName,
      String(currentStock),
    ]);
  } catch (err) {
    logger.error({ err, phone }, 'Failed to send low stock alert');
  }
}

export async function sendPaymentReminder(
  phone: string,
  customerName: string,
  amount: number
): Promise<void> {
  if (!config.INTERAKT_API_KEY) return;
  try {
    await sendInteraktMessage(phone, 'payment_reminder', [
      customerName,
      `Rs ${amount.toFixed(2)}`,
    ]);
  } catch (err) {
    logger.error({ err, phone }, 'Failed to send payment reminder');
  }
}

async function sendInteraktMessage(
  phone: string,
  templateName: string,
  variables: string[]
): Promise<void> {
  const body = {
    countryCode: '+92',
    phoneNumber: phone.replace('+92', ''),
    type: 'Template',
    template: {
      name: templateName,
      languageCode: 'en',
      bodyValues: variables,
    },
  };

  const res = await fetch(`${config.INTERAKT_BASE_URL}/public/message/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${config.INTERAKT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Interakt API error: ${res.status}`);
  }
}
