import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/colors.dart';
import '../../shared/utils/currency.dart';
import 'pos_screen.dart';

/// Scrollable cart sidebar / tab.
class CartWidget extends ConsumerWidget {
  const CartWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final notifier = ref.read(cartProvider.notifier);

    if (cart.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.shopping_cart_outlined, size: 48, color: BizColors.textMuted),
            SizedBox(height: 12),
            Text(
              'Cart is empty',
              style: TextStyle(color: BizColors.textSecondary, fontSize: 14),
            ),
            SizedBox(height: 4),
            Text(
              'Tap a product to add it',
              style: TextStyle(color: BizColors.textMuted, fontSize: 12),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: cart.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final entry = cart[i];
              return _CartItemRow(
                entry: entry,
                onIncrease: () => notifier.updateQty(entry.product.id, entry.qty + 1),
                onDecrease: () => notifier.updateQty(entry.product.id, entry.qty - 1),
                onRemove: () => notifier.removeProduct(entry.product.id),
              );
            },
          ),
        ),
        // Totals panel
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            color: BizColors.surface,
            border: Border(top: BorderSide(color: BizColors.border)),
          ),
          child: Column(
            children: [
              _TotalRow('Subtotal', notifier.subtotal),
              const SizedBox(height: 4),
              _TotalRow('GST (17%)', notifier.taxAmount),
              const Divider(height: 16),
              _TotalRow(
                'Total',
                notifier.total,
                bold: true,
                large: true,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CartItemRow extends StatelessWidget {
  const _CartItemRow({
    required this.entry,
    required this.onIncrease,
    required this.onDecrease,
    required this.onRemove,
  });

  final CartEntry entry;
  final VoidCallback onIncrease;
  final VoidCallback onDecrease;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(entry.product.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onRemove(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: BizColors.danger,
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.product.nameEn,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w500,
                      color: BizColors.textPrimary,
                    ),
                  ),
                  Text(
                    CurrencyUtils.format(entry.product.price),
                    style: const TextStyle(
                      fontSize: 12,
                      color: BizColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            // Qty stepper
            Row(
              children: [
                _StepButton(
                  icon: Icons.remove,
                  onTap: onDecrease,
                  color: BizColors.textSecondary,
                ),
                GestureDetector(
                  onLongPress: () {
                    // TODO: Show text input for manual qty entry
                  },
                  child: SizedBox(
                    width: 32,
                    child: Text(
                      '${entry.qty}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                _StepButton(
                  icon: Icons.add,
                  onTap: onIncrease,
                  color: BizColors.primary,
                ),
              ],
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 72,
              child: Text(
                CurrencyUtils.format(entry.lineTotal),
                textAlign: TextAlign.right,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: BizColors.textPrimary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({
    required this.icon,
    required this.onTap,
    required this.color,
  });
  final IconData icon;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          border: Border.all(color: color.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, size: 16, color: color),
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow(this.label, this.amount, {this.bold = false, this.large = false});
  final String label;
  final double amount;
  final bool bold;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontSize: large ? 18 : 14,
      fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
      color: bold ? BizColors.primary : BizColors.textSecondary,
    );
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style),
        Text(CurrencyUtils.format(amount), style: style),
      ],
    );
  }
}
