import { CheckCircle, X, Printer, MessageCircle } from 'lucide-react';
import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { useAuthStore } from '../../store/auth.store';
import type { CartItemState } from '../../store/pos.store';

interface ReceiptModalProps {
  receiptNumber: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  cartItems: CartItemState[];
  paymentMethod: string;
  isOnline: boolean;
  onClose: () => void;
  onWhatsApp?: () => void;
}

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function ReceiptModal({
  receiptNumber,
  total,
  subtotal,
  discountAmount,
  taxAmount,
  cartItems,
  paymentMethod,
  isOnline,
  onClose,
  onWhatsApp,
}: ReceiptModalProps) {
  const { business } = useAuthStore();

  const handlePrint = useCallback(() => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 297], // 80mm thermal width, long height
      orientation: 'portrait',
    });

    const pageWidth = 80;
    let y = 10;
    const lineH = 5;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(business?.name ?? 'BizOS', pageWidth / 2, y, { align: 'center' });
    y += lineH + 1;

    if (business?.address) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const addrLines = doc.splitTextToSize(business.address, pageWidth - 10) as string[];
      addrLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += 4;
      });
    }

    if (business?.phone) {
      doc.setFontSize(8);
      doc.text(`Phone: ${business.phone}`, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }

    // Divider
    y += 1;
    doc.setDrawColor('#E2E8F0');
    doc.line(5, y, pageWidth - 5, y);
    y += 3;

    // Receipt info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt: ${receiptNumber}`, 5, y);
    doc.text(new Date().toLocaleDateString('en-PK'), pageWidth - 5, y, { align: 'right' });
    y += lineH;
    doc.text(new Date().toLocaleTimeString('en-PK'), pageWidth - 5, y, { align: 'right' });
    y += lineH;

    // Divider
    doc.line(5, y, pageWidth - 5, y);
    y += 3;

    // Items header
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 5, y);
    doc.text('Qty', 42, y, { align: 'right' });
    doc.text('Price', 57, y, { align: 'right' });
    doc.text('Total', pageWidth - 5, y, { align: 'right' });
    y += lineH;

    doc.line(5, y, pageWidth - 5, y);
    y += 3;

    // Items
    doc.setFont('helvetica', 'normal');
    for (const item of cartItems) {
      const name = item.product.name_en.slice(0, 22);
      const lineTotal = item.qty * item.unitPrice;
      doc.text(name, 5, y);
      doc.text(String(item.qty), 42, y, { align: 'right' });
      doc.text(`${item.unitPrice.toFixed(0)}`, 57, y, { align: 'right' });
      doc.text(`${lineTotal.toFixed(0)}`, pageWidth - 5, y, { align: 'right' });
      y += lineH;
    }

    // Divider
    doc.line(5, y, pageWidth - 5, y);
    y += 3;

    // Totals
    doc.text('Subtotal', 5, y);
    doc.text(formatRs(subtotal), pageWidth - 5, y, { align: 'right' });
    y += lineH;

    if (discountAmount > 0) {
      doc.text('Discount', 5, y);
      doc.text(`-${formatRs(discountAmount)}`, pageWidth - 5, y, { align: 'right' });
      y += lineH;
    }

    doc.text('GST (17%)', 5, y);
    doc.text(formatRs(taxAmount), pageWidth - 5, y, { align: 'right' });
    y += lineH;

    // Total
    doc.line(5, y, pageWidth - 5, y);
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL', 5, y);
    doc.text(formatRs(total), pageWidth - 5, y, { align: 'right' });
    y += lineH + 1;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment: ${paymentMethod.toUpperCase()}`, 5, y);
    y += lineH + 3;

    // Footer
    doc.line(5, y, pageWidth - 5, y);
    y += 3;
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });
    y += lineH;

    if (business?.phone) {
      doc.setFont('helvetica', 'normal');
      doc.text(`WhatsApp: ${business.phone}`, pageWidth / 2, y, { align: 'center' });
    }

    doc.autoPrint();
    doc.output('dataurlnewwindow');
  }, [business, receiptNumber, cartItems, subtotal, discountAmount, taxAmount, total, paymentMethod]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Sale Complete!</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 rounded-xl bg-success/5 p-4 text-center">
          <p className="text-sm text-slate-600">Receipt #{receiptNumber}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatRs(total)}</p>
          {!isOnline && (
            <p className="mt-1 text-xs text-warning">Saved offline — will sync when connected</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Print Receipt (PDF)
          </button>
          {onWhatsApp && (
            <button
              onClick={onWhatsApp}
              className="flex items-center justify-center gap-2 rounded-xl bg-success/10 py-2.5 text-sm font-medium text-success hover:bg-success/20"
            >
              <MessageCircle className="h-4 w-4" />
              Send via WhatsApp
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}
