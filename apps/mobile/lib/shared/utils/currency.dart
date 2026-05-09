import 'package:intl/intl.dart';

/// Currency formatting utilities — all amounts displayed as "Rs 1,234".
class CurrencyUtils {
  CurrencyUtils._();

  static final _formatter = NumberFormat('#,##0.##', 'en_PK');

  /// Format a monetary amount as "Rs 1,234" or "Rs 1,234.50".
  static String format(double amount) {
    return 'Rs ${_formatter.format(amount)}';
  }

  /// Round to 2 decimal places using integer paise math
  /// (avoids floating-point errors in currency calculations).
  static double round(double amount) {
    return (amount * 100).round() / 100;
  }

  /// Calculate GST for a given amount and rate.
  /// Mirrors the packages/fbr calculateGST function.
  static double calculateGST(double amount, double rate) {
    return round(amount * rate / 100);
  }
}
