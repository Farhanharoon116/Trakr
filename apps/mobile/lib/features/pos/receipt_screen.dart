import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';
import '../../shared/utils/currency.dart';

/// Shown after a successful sale — offers print / WhatsApp / new sale.
class ReceiptScreen extends ConsumerWidget {
  const ReceiptScreen({
    super.key,
    required this.offlineId,
    required this.total,
    required this.synced,
    required this.paymentMethod,
  });

  final String offlineId;
  final double total;
  final bool synced;
  final String paymentMethod;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sale Complete'),
        leading: const SizedBox.shrink(),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 24),
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: BizColors.success.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_outline,
                  size: 48,
                  color: BizColors.success,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Sale Complete!',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: BizColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                CurrencyUtils.format(total),
                style: const TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w800,
                  color: BizColors.primary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Payment: ${paymentMethod.toUpperCase()}',
                style: const TextStyle(color: BizColors.textSecondary),
              ),
              const SizedBox(height: 12),
              if (!synced)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: BizColors.warning.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                        color: BizColors.warning.withOpacity(0.3)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.wifi_off, size: 14, color: BizColors.warning),
                      SizedBox(width: 6),
                      Text(
                        'Saved offline — will sync when connected',
                        style: TextStyle(
                          fontSize: 12,
                          color: BizColors.warning,
                        ),
                      ),
                    ],
                  ),
                ),
              const Spacer(),
              // Action buttons
              OutlinedButton.icon(
                onPressed: () {
                  // TODO: Trigger Bluetooth print
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text(
                            'Connect a printer in Settings to print receipts')),
                  );
                },
                icon: const Icon(Icons.print_outlined),
                label: const Text('Print Receipt'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () {
                  // WhatsApp receipt — requires backend support
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text(
                            'WhatsApp receipts require API configuration')),
                  );
                },
                icon: const Icon(Icons.message_outlined),
                label: const Text('Send via WhatsApp'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: BizColors.success,
                  minimumSize: const Size(double.infinity, 48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => context.go('/pos'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 52),
                ),
                child: const Text(
                  'New Sale',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
