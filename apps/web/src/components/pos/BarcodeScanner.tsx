import { useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Scan Barcode</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Scan a barcode or type/paste the SKU below.
        </p>
        <input
          ref={inputRef}
          type="text"
          placeholder="Barcode / SKU..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = (e.target as HTMLInputElement).value.trim();
              if (value) {
                onScan(value);
                onClose();
              }
            }
          }}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
