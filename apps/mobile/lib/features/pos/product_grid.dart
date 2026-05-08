import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/offline/offline_db.dart';
import '../../core/theme/colors.dart';
import '../../shared/utils/currency.dart';
import 'pos_screen.dart';

/// Displays the product catalogue in a responsive grid.
class ProductGrid extends ConsumerWidget {
  const ProductGrid({
    super.key,
    required this.search,
    required this.selectedCategory,
  });

  final String search;
  final String? selectedCategory;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    var products = OfflineDatabase.getActiveProducts();

    // Filter by search query
    if (search.isNotEmpty) {
      final query = search.toLowerCase();
      products = products.where((p) {
        return p.nameEn.toLowerCase().contains(query) ||
            (p.nameUr?.toLowerCase().contains(query) ?? false) ||
            (p.sku?.toLowerCase().contains(query) ?? false);
      }).toList();
    }

    // Filter by category
    if (selectedCategory != null) {
      products =
          products.where((p) => p.categoryId == selectedCategory).toList();
    }

    if (products.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inventory_2_outlined, size: 48, color: BizColors.textMuted),
            SizedBox(height: 12),
            Text(
              'No products found',
              style: TextStyle(color: BizColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(8),
      gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 160,
        childAspectRatio: 0.85,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        return _ProductCard(product: products[index]);
      },
    );
  }
}

class _ProductCard extends ConsumerWidget {
  const _ProductCard({required this.product});
  final LocalProduct product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stock = OfflineDatabase.getStock(product.id, '');
    final inCart = ref
        .watch(cartProvider)
        .where((e) => e.product.id == product.id)
        .fold(0, (sum, e) => sum + e.qty);

    return GestureDetector(
      onTap: () {
        ref.read(cartProvider.notifier).addProduct(product);
        // Haptic feedback
        // HapticFeedback.lightImpact();
      },
      child: Container(
        decoration: BoxDecoration(
          color: BizColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: inCart > 0 ? BizColors.primary : BizColors.border,
            width: inCart > 0 ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(11)),
                    child: product.imageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: product.imageUrl!,
                            fit: BoxFit.cover,
                            errorWidget: (_, __, ___) =>
                                _ProductIcon(product: product),
                          )
                        : _ProductIcon(product: product),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.nameEn,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: BizColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        CurrencyUtils.format(product.price),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: BizColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            // Stock badge
            Positioned(
              top: 6,
              right: 6,
              child: _StockBadge(stock: stock),
            ),
            // Cart qty badge
            if (inCart > 0)
              Positioned(
                top: 6,
                left: 6,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: BizColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$inCart',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ProductIcon extends StatelessWidget {
  const _ProductIcon({required this.product});
  final LocalProduct product;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: BizColors.primary.withOpacity(0.08),
      child: Center(
        child: Text(
          product.nameEn.isNotEmpty ? product.nameEn[0].toUpperCase() : '?',
          style: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w700,
            color: BizColors.primary,
          ),
        ),
      ),
    );
  }
}

class _StockBadge extends StatelessWidget {
  const _StockBadge({required this.stock});
  final double stock;

  @override
  Widget build(BuildContext context) {
    final Color color;
    final String label;
    if (stock <= 0) {
      color = BizColors.danger;
      label = 'Out';
    } else if (stock <= 5) {
      color = BizColors.warning;
      label = stock.toInt().toString();
    } else {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
