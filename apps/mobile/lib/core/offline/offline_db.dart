import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

part 'offline_db.g.dart';

// ─── Hive Adapters ──────────────────────────────────────────────────────────

@HiveType(typeId: 0)
class LocalProduct extends HiveObject {
  @HiveField(0)
  late String id;

  @HiveField(1)
  late String nameEn;

  @HiveField(2)
  String? nameUr;

  @HiveField(3)
  late double price;

  @HiveField(4)
  String? sku;

  @HiveField(5)
  String? categoryId;

  @HiveField(6)
  String? imageUrl;

  @HiveField(7)
  late double taxRate;

  @HiveField(8)
  late bool isActive;

  @HiveField(9)
  late String updatedAt;
}

@HiveType(typeId: 1)
class LocalInventory extends HiveObject {
  @HiveField(0)
  late String productId;

  @HiveField(1)
  late String branchId;

  @HiveField(2)
  late double qtyOnHand;

  @HiveField(3)
  late double reorderPoint;
}

@HiveType(typeId: 2)
class OfflineSaleItem extends HiveObject {
  @HiveField(0)
  late String productId;

  @HiveField(1)
  late double qty;

  @HiveField(2)
  late double unitPrice;

  @HiveField(3)
  late double taxRate;

  @HiveField(4)
  late double total;
}

@HiveType(typeId: 3)
class OfflineSale extends HiveObject {
  @HiveField(0)
  late String offlineId;

  @HiveField(1)
  late String branchId;

  @HiveField(2)
  late String cashierId;

  @HiveField(3)
  String? shiftId;

  @HiveField(4)
  String? customerId;

  @HiveField(5)
  late double subtotal;

  @HiveField(6)
  late double discount;

  @HiveField(7)
  late double taxAmount;

  @HiveField(8)
  late double total;

  @HiveField(9)
  late String paymentMethod;

  @HiveField(10)
  late List<OfflineSaleItem> items;

  @HiveField(11)
  late String createdAt;

  @HiveField(12)
  late bool synced;
}

// ─── Database Initialiser ───────────────────────────────────────────────────

class OfflineDatabase {
  OfflineDatabase._();

  static const String _productsBox = 'products';
  static const String _inventoryBox = 'inventory';
  static const String _offlineQueueBox = 'offline_queue';

  static Future<void> init() async {
    Hive.registerAdapter(LocalProductAdapter());
    Hive.registerAdapter(LocalInventoryAdapter());
    Hive.registerAdapter(OfflineSaleItemAdapter());
    Hive.registerAdapter(OfflineSaleAdapter());

    await Future.wait([
      Hive.openBox<LocalProduct>(_productsBox),
      Hive.openBox<LocalInventory>(_inventoryBox),
      Hive.openBox<OfflineSale>(_offlineQueueBox),
    ]);
  }

  static Box<LocalProduct> get products =>
      Hive.box<LocalProduct>(_productsBox);

  static Box<LocalInventory> get inventory =>
      Hive.box<LocalInventory>(_inventoryBox);

  static Box<OfflineSale> get offlineQueue =>
      Hive.box<OfflineSale>(_offlineQueueBox);

  // ─── Products ─────────────────────────────────────────────────────────────

  static Future<void> saveProducts(List<Map<String, dynamic>> rawList) async {
    final box = products;
    await box.clear();
    for (final raw in rawList) {
      final p = LocalProduct()
        ..id = raw['id'] as String
        ..nameEn = raw['name_en'] as String
        ..nameUr = raw['name_ur'] as String?
        ..price = (raw['price'] as num).toDouble()
        ..sku = raw['sku'] as String?
        ..categoryId = raw['category_id'] as String?
        ..imageUrl = raw['image_url'] as String?
        ..taxRate = (raw['tax_rate'] as num).toDouble()
        ..isActive = raw['is_active'] as bool? ?? true
        ..updatedAt = raw['updated_at'] as String? ?? '';
      await box.put(p.id, p);
    }
  }

  static List<LocalProduct> getActiveProducts() {
    return products.values.where((p) => p.isActive).toList();
  }

  // ─── Inventory ────────────────────────────────────────────────────────────

  static Future<void> saveInventory(List<Map<String, dynamic>> rawList) async {
    final box = inventory;
    await box.clear();
    for (final raw in rawList) {
      final inv = LocalInventory()
        ..productId = raw['product_id'] as String
        ..branchId = raw['branch_id'] as String
        ..qtyOnHand = (raw['qty_on_hand'] as num).toDouble()
        ..reorderPoint = (raw['reorder_point'] as num).toDouble();
      await box.put('${inv.productId}_${inv.branchId}', inv);
    }
  }

  static double getStock(String productId, String branchId) {
    return inventory.get('${productId}_$branchId')?.qtyOnHand ?? 0;
  }

  // ─── Offline Queue ────────────────────────────────────────────────────────

  static Future<String> queueSale(Map<String, dynamic> saleData) async {
    const uuid = Uuid();
    final offlineId = uuid.v4();
    final sale = OfflineSale()
      ..offlineId = offlineId
      ..branchId = saleData['branch_id'] as String
      ..cashierId = saleData['cashier_id'] as String
      ..shiftId = saleData['shift_id'] as String?
      ..customerId = saleData['customer_id'] as String?
      ..subtotal = (saleData['subtotal'] as num).toDouble()
      ..discount = (saleData['discount'] as num? ?? 0).toDouble()
      ..taxAmount = (saleData['tax_amount'] as num).toDouble()
      ..total = (saleData['total'] as num).toDouble()
      ..paymentMethod = saleData['payment_method'] as String
      ..items = (saleData['items'] as List<dynamic>).map((item) {
        final raw = item as Map<String, dynamic>;
        return OfflineSaleItem()
          ..productId = raw['product_id'] as String
          ..qty = (raw['qty'] as num).toDouble()
          ..unitPrice = (raw['unit_price'] as num).toDouble()
          ..taxRate = (raw['tax_rate'] as num).toDouble()
          ..total = (raw['total'] as num).toDouble();
      }).toList()
      ..createdAt = DateTime.now().toIso8601String()
      ..synced = false;
    await offlineQueue.put(offlineId, sale);
    return offlineId;
  }

  static List<OfflineSale> getPendingSales() {
    return offlineQueue.values.where((s) => !s.synced).toList();
  }

  static Future<void> markSynced(String offlineId) async {
    final sale = offlineQueue.get(offlineId);
    if (sale != null) {
      sale.synced = true;
      await sale.save();
    }
  }

  static int get pendingCount =>
      offlineQueue.values.where((s) => !s.synced).length;
}
