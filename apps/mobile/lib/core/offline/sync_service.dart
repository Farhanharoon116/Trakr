import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/endpoints.dart';
import 'offline_db.dart';

/// Service responsible for syncing offline data with the server.
class SyncService {
  SyncService(this._client);

  final ApiClient _client;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  void startListening() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = Connectivity()
        .onConnectivityChanged
        .listen((List<ConnectivityResult> results) {
      final isOnline = results.any(
        (r) => r != ConnectivityResult.none,
      );
      if (isOnline) {
        _syncAll();
      }
    });
  }

  void stopListening() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
  }

  Future<void> _syncAll() async {
    await Future.wait([
      syncOfflineSales(),
      refreshProducts(),
      refreshInventory(),
    ]);
  }

  /// Upload all pending offline sales to the server.
  Future<SyncResult> syncOfflineSales() async {
    final pending = OfflineDatabase.getPendingSales();
    if (pending.isEmpty) return SyncResult(synced: 0, failed: 0);

    final payload = pending.map((s) => _saleToJson(s)).toList();

    final result = await _client.post(
      Endpoints.salesBulkSync,
      {'sales': payload},
    );

    if (result case ApiSuccess()) {
      // Mark all as synced
      for (final sale in pending) {
        await OfflineDatabase.markSynced(sale.offlineId);
      }
      return SyncResult(synced: pending.length, failed: 0);
    }
    return SyncResult(synced: 0, failed: pending.length);
  }

  /// Pull fresh product list and update Hive.
  Future<void> refreshProducts() async {
    final result = await _client.get(Endpoints.products);
    if (result case ApiSuccess(data: final d)) {
      final list = d['data'] as List<dynamic>? ?? [];
      await OfflineDatabase.saveProducts(
        list.cast<Map<String, dynamic>>(),
      );
    }
  }

  /// Pull fresh inventory levels and update Hive.
  Future<void> refreshInventory() async {
    final result = await _client.get(Endpoints.inventory);
    if (result case ApiSuccess(data: final d)) {
      final list = d['data'] as List<dynamic>? ?? [];
      await OfflineDatabase.saveInventory(
        list.cast<Map<String, dynamic>>(),
      );
    }
  }

  Map<String, dynamic> _saleToJson(OfflineSale s) => {
        'offline_id': s.offlineId,
        'branch_id': s.branchId,
        'cashier_id': s.cashierId,
        if (s.shiftId != null) 'shift_id': s.shiftId,
        if (s.customerId != null) 'customer_id': s.customerId,
        'subtotal': s.subtotal,
        'discount': s.discount,
        'tax_amount': s.taxAmount,
        'total': s.total,
        'payment_method': s.paymentMethod,
        'created_at': s.createdAt,
        'items': s.items.map((i) => {
              'product_id': i.productId,
              'qty': i.qty,
              'unit_price': i.unitPrice,
              'tax_rate': i.taxRate,
              'total': i.total,
            }).toList(),
      };
}

class SyncResult {
  const SyncResult({required this.synced, required this.failed});
  final int synced;
  final int failed;
}

final syncServiceProvider = Provider<SyncService>((ref) {
  final client = ref.watch(apiClientProvider);
  return SyncService(client);
});
