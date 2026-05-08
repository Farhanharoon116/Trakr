import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/offline/offline_db.dart';
import '../../core/offline/sync_service.dart';
import '../../core/theme/colors.dart';
import '../../shared/utils/currency.dart';
import '../../shared/widgets/offline_banner.dart';
import 'product_grid.dart';
import 'cart_widget.dart';
import 'payment_bottom_sheet.dart';

/// Cart item in memory.
class CartEntry {
  CartEntry({
    required this.product,
    this.qty = 1,
  });

  final LocalProduct product;
  int qty;

  double get lineTotal {
    final subtotal = product.price * qty;
    final gst = (subtotal * product.taxRate / 100 * 100).round() / 100;
    return (subtotal + gst * 100).round() / 100;
  }
}

/// Provider for the in-memory cart.
class CartNotifier extends Notifier<List<CartEntry>> {
  @override
  List<CartEntry> build() => [];

  void addProduct(LocalProduct product) {
    final existing = state.where((e) => e.product.id == product.id).toList();
    if (existing.isNotEmpty) {
      state = [
        for (final e in state)
          if (e.product.id == product.id)
            CartEntry(product: e.product, qty: e.qty + 1)
          else
            e,
      ];
    } else {
      state = [...state, CartEntry(product: product)];
    }
  }

  void updateQty(String productId, int qty) {
    if (qty <= 0) {
      removeProduct(productId);
      return;
    }
    state = [
      for (final e in state)
        if (e.product.id == productId)
          CartEntry(product: e.product, qty: qty)
        else
          e,
    ];
  }

  void removeProduct(String productId) {
    state = state.where((e) => e.product.id != productId).toList();
  }

  void clear() => state = [];

  double get subtotal => state.fold(0, (sum, e) => sum + e.product.price * e.qty);

  double get taxAmount {
    return state.fold(0, (sum, e) {
      final sub = e.product.price * e.qty;
      return sum + (sub * e.product.taxRate / 100 * 100).round() / 100;
    });
  }

  double get total => (subtotal + taxAmount) * 100 ~/ 1 / 100;
}

final cartProvider = NotifierProvider<CartNotifier, List<CartEntry>>(
  CartNotifier.new,
);

/// Main POS screen — product grid on the left, cart on the right (or tabbed on mobile).
class POSScreen extends ConsumerStatefulWidget {
  const POSScreen({super.key});

  @override
  ConsumerState<POSScreen> createState() => _POSScreenState();
}

class _POSScreenState extends ConsumerState<POSScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  String _search = '';
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    ref.read(syncServiceProvider).startListening();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _openPayment() {
    final cart = ref.read(cartProvider.notifier);
    if (cart.state.isEmpty) return;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PaymentBottomSheet(
        subtotal: cart.subtotal,
        taxAmount: cart.taxAmount,
        total: cart.total,
        items: cart.state,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final pendingCount = OfflineDatabase.pendingCount;
    final isTablet = MediaQuery.of(context).size.width >= 768;

    return Scaffold(
      appBar: AppBar(
        title: const Text('POS', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          if (pendingCount > 0)
            Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: BizColors.warning,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '$pendingCount pending',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
        bottom: isTablet
            ? null
            : TabBar(
                controller: _tabController,
                tabs: [
                  Tab(
                    text: 'Products',
                    icon: cart.isNotEmpty
                        ? null
                        : const Icon(Icons.grid_view_outlined),
                  ),
                  Tab(
                    text: 'Cart (${cart.length})',
                    icon: const Icon(Icons.shopping_cart_outlined),
                  ),
                ],
              ),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: isTablet
                ? _TabletLayout(
                    search: _search,
                    selectedCategory: _selectedCategory,
                    onSearchChanged: (v) => setState(() => _search = v),
                    onCategoryChanged: (v) =>
                        setState(() => _selectedCategory = v),
                  )
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _ProductTab(
                        search: _search,
                        selectedCategory: _selectedCategory,
                        onSearchChanged: (v) => setState(() => _search = v),
                        onCategoryChanged: (v) =>
                            setState(() => _selectedCategory = v),
                      ),
                      const CartWidget(),
                    ],
                  ),
          ),
        ],
      ),
      floatingActionButton: cart.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: _openPayment,
              backgroundColor: BizColors.primary,
              icon: const Icon(Icons.payment, color: Colors.white),
              label: Text(
                'Pay ${CurrencyUtils.format(ref.read(cartProvider.notifier).total)}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            )
          : null,
    );
  }
}

class _TabletLayout extends StatelessWidget {
  const _TabletLayout({
    required this.search,
    required this.selectedCategory,
    required this.onSearchChanged,
    required this.onCategoryChanged,
  });

  final String search;
  final String? selectedCategory;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String?> onCategoryChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          flex: 6,
          child: _ProductTab(
            search: search,
            selectedCategory: selectedCategory,
            onSearchChanged: onSearchChanged,
            onCategoryChanged: onCategoryChanged,
          ),
        ),
        const VerticalDivider(width: 1),
        const Expanded(
          flex: 4,
          child: CartWidget(),
        ),
      ],
    );
  }
}

class _ProductTab extends StatelessWidget {
  const _ProductTab({
    required this.search,
    required this.selectedCategory,
    required this.onSearchChanged,
    required this.onCategoryChanged,
  });

  final String search;
  final String? selectedCategory;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String?> onCategoryChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            onChanged: onSearchChanged,
            decoration: const InputDecoration(
              hintText: 'Search products…',
              prefixIcon: Icon(Icons.search),
              isDense: true,
            ),
          ),
        ),
        Expanded(
          child: ProductGrid(
            search: search,
            selectedCategory: selectedCategory,
          ),
        ),
      ],
    );
  }
}
