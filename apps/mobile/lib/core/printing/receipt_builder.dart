import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:intl/intl.dart';

/// Builds ESC/POS command sequences for an 80mm thermal printer receipt.
class ReceiptBuilder {
  /// Build a full receipt and return the raw byte list.
  static Future<List<int>> buildReceipt({
    required String businessName,
    required String? ntn,
    required String? address,
    required String? phone,
    required String receiptNumber,
    required String cashierName,
    required DateTime saleDate,
    required List<ReceiptLineItem> items,
    required double subtotal,
    required double discount,
    required double taxAmount,
    required double total,
    required String paymentMethod,
    required String? receiptUrl,
  }) async {
    const profile = PaperSize.mm80;
    final generator = Generator(profile, await CapabilityProfile.load());
    final List<int> bytes = [];

    // ── Header ──────────────────────────────────────────────────────────────
    bytes += generator.setGlobalFont(PosFontType.fontA);
    bytes += generator.text(
      businessName,
      styles: const PosStyles(
        align: PosAlign.center,
        bold: true,
        height: PosTextSize.size2,
        width: PosTextSize.size2,
      ),
    );

    if (ntn != null && ntn.isNotEmpty) {
      bytes += generator.text(
        'NTN: $ntn',
        styles: const PosStyles(align: PosAlign.center, bold: true),
      );
    }
    if (address != null && address.isNotEmpty) {
      bytes += generator.text(
        address,
        styles: const PosStyles(align: PosAlign.center),
      );
    }
    if (phone != null && phone.isNotEmpty) {
      bytes += generator.text(
        'Tel: $phone',
        styles: const PosStyles(align: PosAlign.center),
      );
    }

    bytes += generator.hr();

    // ── Receipt meta ─────────────────────────────────────────────────────────
    final dateStr = DateFormat('dd-MMM-yyyy HH:mm').format(saleDate);
    bytes += generator.row([
      PosColumn(text: 'Receipt:', width: 6),
      PosColumn(
        text: receiptNumber,
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    bytes += generator.row([
      PosColumn(text: 'Date:', width: 6),
      PosColumn(
        text: dateStr,
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    bytes += generator.row([
      PosColumn(text: 'Cashier:', width: 6),
      PosColumn(
        text: cashierName,
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);

    bytes += generator.hr();

    // ── Line items ────────────────────────────────────────────────────────────
    bytes += generator.row([
      PosColumn(
        text: 'Item',
        width: 6,
        styles: const PosStyles(bold: true),
      ),
      PosColumn(
        text: 'Qty',
        width: 2,
        styles: const PosStyles(bold: true, align: PosAlign.center),
      ),
      PosColumn(
        text: 'Price',
        width: 4,
        styles: const PosStyles(bold: true, align: PosAlign.right),
      ),
    ]);

    bytes += generator.hr(ch: '-');

    for (final item in items) {
      bytes += generator.row([
        PosColumn(text: item.name, width: 6),
        PosColumn(
          text: item.qty.toStringAsFixed(item.qty == item.qty.roundToDouble() ? 0 : 2),
          width: 2,
          styles: const PosStyles(align: PosAlign.center),
        ),
        PosColumn(
          text: _rs(item.total),
          width: 4,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }

    bytes += generator.hr();

    // ── Totals ────────────────────────────────────────────────────────────────
    bytes += generator.row([
      PosColumn(text: 'Subtotal', width: 8),
      PosColumn(
        text: _rs(subtotal),
        width: 4,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    if (discount > 0) {
      bytes += generator.row([
        PosColumn(text: 'Discount', width: 8),
        PosColumn(
          text: '-${_rs(discount)}',
          width: 4,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }
    final taxableAmount = _round(subtotal - discount);
    bytes += generator.row([
      PosColumn(text: 'Taxable Amount', width: 8),
      PosColumn(
        text: _rs(taxableAmount),
        width: 4,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    bytes += generator.row([
      PosColumn(text: 'GST (17%)', width: 8),
      PosColumn(
        text: _rs(taxAmount),
        width: 4,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);

    bytes += generator.hr();

    bytes += generator.row([
      PosColumn(
        text: 'TOTAL',
        width: 8,
        styles: const PosStyles(bold: true, height: PosTextSize.size2),
      ),
      PosColumn(
        text: _rs(total),
        width: 4,
        styles: const PosStyles(
          bold: true,
          align: PosAlign.right,
          height: PosTextSize.size2,
        ),
      ),
    ]);

    bytes += generator.text(
      'Payment: ${paymentMethod.toUpperCase()}',
      styles: const PosStyles(align: PosAlign.left),
    );

    bytes += generator.hr();

    // ── FBR footer ────────────────────────────────────────────────────────────
    if (ntn != null && ntn.isNotEmpty) {
      bytes += generator.text(
        'FBR Verified ✓',
        styles: const PosStyles(
          align: PosAlign.center,
          bold: true,
        ),
      );
    }
    bytes += generator.text(
      'Thank you for your business!',
      styles: const PosStyles(align: PosAlign.center),
    );

    bytes += generator.feed(2);
    bytes += generator.cut();

    return bytes;
  }

  static String _rs(double amount) {
    final formatted = NumberFormat('#,##0.##').format(amount);
    return 'Rs $formatted';
  }

  static double _round(double v) => (v * 100).round() / 100;
}

class ReceiptLineItem {
  const ReceiptLineItem({
    required this.name,
    required this.qty,
    required this.unitPrice,
    required this.total,
  });
  final String name;
  final double qty;
  final double unitPrice;
  final double total;
}
