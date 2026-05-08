import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/offline/offline_db.dart';
import '../../core/offline/sync_service.dart';
import '../../core/theme/colors.dart';
import '../../shared/utils/currency.dart';
import 'pos_screen.dart';
import 'receipt_screen.dart';

const _paymentMethods = [
  _PaymentOption('Cash', 'cash', Icons.payments_outlined),
  _PaymentOption('Card', 'card', Icons.credit_card),
  _PaymentOption('Easypaisa', 'easypaisa', Icons.mobile_friendly),
  _PaymentOption('JazzCash', 'jazzcash', Icons.account_balance_wallet_outlined),
];

class _PaymentOption {
  const _PaymentOption(this.label, this.value, this.icon);
  final String label;
  final String value;
  final IconData icon;
}

/// Bottom sheet for payment method selection and sale completion.
class PaymentBottomSheet extends ConsumerStatefulWidget {
  const PaymentBottomSheet({
    super.key,
    required this.subtotal,
    required this.taxAmount,
    required this.total,
    required this.items,
  });

  final double subtotal;
  final double taxAmount;
  final double total;
  final List<CartEntry> items;

  @override
  ConsumerState<PaymentBottomSheet> createState() => _PaymentBottomSheetState();
}

class _PaymentBottomSheetState extends ConsumerState<PaymentBottomSheet> {
  String _selectedMethod = 'cash';
  double _amountTendered = 0;
  bool _loading = false;

  double get _changeDue => (_amountTendered - widget.total).clamp(0, double.infinity);

  Future<void> _completeSale() async {
    final user = ref.read(authProvider).value;
    if (user == null) return;

    setState(() => _loading = true);

    final saleData = {
      'branch_id': user.branchId ?? '',
      'cashier_id': user.id,
      'subtotal': widget.subtotal,
      'discount': 0.0,
      'tax_amount': widget.taxAmount,
      'total': widget.total,
      'payment_method': _selectedMethod,
      'items': widget.items.map((e) => {
            'product_id': e.product.id,
            'qty': e.qty,
            'unit_price': e.product.price,
            'discount': 0.0,
            'tax_rate': e.product.taxRate,
            'total': e.lineTotal,
          }).toList(),
    };

    // Always write to offline queue first — sync will handle online upload
    final offlineId = await OfflineDatabase.queueSale(saleData);

    // Attempt immediate sync
    final syncService = ref.read(syncServiceProvider);
    final syncResult = await syncService.syncOfflineSales();

    setState(() => _loading = false);
    ref.read(cartProvider.notifier).clear();

    if (!mounted) return;
    Navigator.of(context).pop();

    // Show receipt screen
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ReceiptScreen(
          offlineId: offlineId,
          total: widget.total,
          synced: syncResult.synced > 0,
          paymentMethod: _selectedMethod,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: BizColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: BizColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Select Payment Method',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: BizColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),

          // Payment method grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 3,
            physics: const NeverScrollableScrollPhysics(),
            children: _paymentMethods.map((pm) {
              final selected = _selectedMethod == pm.value;
              return GestureDetector(
                onTap: () => setState(() => _selectedMethod = pm.value),
                child: Container(
                  decoration: BoxDecoration(
                    color: selected
                        ? BizColors.primary.withOpacity(0.1)
                        : BizColors.background,
                    border: Border.all(
                      color:
                          selected ? BizColors.primary : BizColors.border,
                      width: selected ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(pm.icon,
                          size: 18,
                          color: selected
                              ? BizColors.primary
                              : BizColors.textSecondary),
                      const SizedBox(width: 6),
                      Text(
                        pm.label,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: selected
                              ? BizColors.primary
                              : BizColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),

          if (_selectedMethod == 'cash') ...[
            const SizedBox(height: 16),
            TextField(
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Amount Tendered',
                prefixText: 'Rs ',
                hintText: widget.total.toStringAsFixed(0),
              ),
              onChanged: (v) => setState(() {
                _amountTendered = double.tryParse(v) ?? 0;
              }),
            ),
            if (_amountTendered > 0 && _amountTendered >= widget.total) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: BizColors.success.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Change Due',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: BizColors.success,
                      ),
                    ),
                    Text(
                      CurrencyUtils.format(_changeDue),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 18,
                        color: BizColors.success,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],

          const SizedBox(height: 24),

          // Totals summary
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: BizColors.textPrimary,
                  )),
              Text(
                CurrencyUtils.format(widget.total),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: BizColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _completeSale,
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text(
                      'Complete Sale',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
