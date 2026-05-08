import { WifiOff, RefreshCw } from 'lucide-react';
import { useSales } from '../../hooks/useSales';

export function OfflineBadge() {
  const { isOnline, pendingCount, syncOfflineQueue } = useSales();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        isOnline ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
      }`}
    >
      {!isOnline && <WifiOff className="h-3.5 w-3.5" />}
      {!isOnline ? 'Offline' : ''}
      {pendingCount > 0 && (
        <span>
          {pendingCount} pending
          {isOnline && (
            <button
              onClick={() => syncOfflineQueue().catch(() => void 0)}
              className="ml-1 underline"
            >
              <RefreshCw className="inline h-3 w-3" />
            </button>
          )}
        </span>
      )}
    </div>
  );
}
