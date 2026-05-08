import { CheckCircle, X, Printer, MessageCircle } from 'lucide-react';

interface ReceiptModalProps {
  receiptNumber: string;
  total: number;
  isOnline: boolean;
  onClose: () => void;
  onPrint?: () => void;
  onWhatsApp?: () => void;
}

function formatPrice(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function ReceiptModal({
  receiptNumber,
  total,
  isOnline,
  onClose,
  onPrint,
  onWhatsApp,
}: ReceiptModalProps) {
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
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatPrice(total)}</p>
          {!isOnline && (
            <p className="mt-1 text-xs text-warning">Saved offline — will sync when connected</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {onPrint && (
            <button
              onClick={onPrint}
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>
          )}
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
