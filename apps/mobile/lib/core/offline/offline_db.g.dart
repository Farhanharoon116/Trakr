// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
part of 'offline_db.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class LocalProductAdapter extends TypeAdapter<LocalProduct> {
  @override
  final int typeId = 0;

  @override
  LocalProduct read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LocalProduct()
      ..id = fields[0] as String
      ..nameEn = fields[1] as String
      ..nameUr = fields[2] as String?
      ..price = fields[3] as double
      ..sku = fields[4] as String?
      ..categoryId = fields[5] as String?
      ..imageUrl = fields[6] as String?
      ..taxRate = fields[7] as double
      ..isActive = fields[8] as bool
      ..updatedAt = fields[9] as String;
  }

  @override
  void write(BinaryWriter writer, LocalProduct obj) {
    writer
      ..writeByte(10)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.nameEn)
      ..writeByte(2)
      ..write(obj.nameUr)
      ..writeByte(3)
      ..write(obj.price)
      ..writeByte(4)
      ..write(obj.sku)
      ..writeByte(5)
      ..write(obj.categoryId)
      ..writeByte(6)
      ..write(obj.imageUrl)
      ..writeByte(7)
      ..write(obj.taxRate)
      ..writeByte(8)
      ..write(obj.isActive)
      ..writeByte(9)
      ..write(obj.updatedAt);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LocalProductAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;

  @override
  int get hashCode => typeId.hashCode;
}

class LocalInventoryAdapter extends TypeAdapter<LocalInventory> {
  @override
  final int typeId = 1;

  @override
  LocalInventory read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LocalInventory()
      ..productId = fields[0] as String
      ..branchId = fields[1] as String
      ..qtyOnHand = fields[2] as double
      ..reorderPoint = fields[3] as double;
  }

  @override
  void write(BinaryWriter writer, LocalInventory obj) {
    writer
      ..writeByte(4)
      ..writeByte(0)
      ..write(obj.productId)
      ..writeByte(1)
      ..write(obj.branchId)
      ..writeByte(2)
      ..write(obj.qtyOnHand)
      ..writeByte(3)
      ..write(obj.reorderPoint);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LocalInventoryAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;

  @override
  int get hashCode => typeId.hashCode;
}

class OfflineSaleItemAdapter extends TypeAdapter<OfflineSaleItem> {
  @override
  final int typeId = 2;

  @override
  OfflineSaleItem read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return OfflineSaleItem()
      ..productId = fields[0] as String
      ..qty = fields[1] as double
      ..unitPrice = fields[2] as double
      ..taxRate = fields[3] as double
      ..total = fields[4] as double;
  }

  @override
  void write(BinaryWriter writer, OfflineSaleItem obj) {
    writer
      ..writeByte(5)
      ..writeByte(0)
      ..write(obj.productId)
      ..writeByte(1)
      ..write(obj.qty)
      ..writeByte(2)
      ..write(obj.unitPrice)
      ..writeByte(3)
      ..write(obj.taxRate)
      ..writeByte(4)
      ..write(obj.total);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OfflineSaleItemAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;

  @override
  int get hashCode => typeId.hashCode;
}

class OfflineSaleAdapter extends TypeAdapter<OfflineSale> {
  @override
  final int typeId = 3;

  @override
  OfflineSale read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return OfflineSale()
      ..offlineId = fields[0] as String
      ..branchId = fields[1] as String
      ..cashierId = fields[2] as String
      ..shiftId = fields[3] as String?
      ..customerId = fields[4] as String?
      ..subtotal = fields[5] as double
      ..discount = fields[6] as double
      ..taxAmount = fields[7] as double
      ..total = fields[8] as double
      ..paymentMethod = fields[9] as String
      ..items = (fields[10] as List).cast<OfflineSaleItem>()
      ..createdAt = fields[11] as String
      ..synced = fields[12] as bool;
  }

  @override
  void write(BinaryWriter writer, OfflineSale obj) {
    writer
      ..writeByte(13)
      ..writeByte(0)
      ..write(obj.offlineId)
      ..writeByte(1)
      ..write(obj.branchId)
      ..writeByte(2)
      ..write(obj.cashierId)
      ..writeByte(3)
      ..write(obj.shiftId)
      ..writeByte(4)
      ..write(obj.customerId)
      ..writeByte(5)
      ..write(obj.subtotal)
      ..writeByte(6)
      ..write(obj.discount)
      ..writeByte(7)
      ..write(obj.taxAmount)
      ..writeByte(8)
      ..write(obj.total)
      ..writeByte(9)
      ..write(obj.paymentMethod)
      ..writeByte(10)
      ..write(obj.items)
      ..writeByte(11)
      ..write(obj.createdAt)
      ..writeByte(12)
      ..write(obj.synced);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OfflineSaleAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;

  @override
  int get hashCode => typeId.hashCode;
}
