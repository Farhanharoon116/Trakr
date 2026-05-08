/// Input validation utilities matching server-side rules.
class Validators {
  Validators._();

  /// Pakistani mobile numbers: 03XXXXXXXXX or +923XXXXXXXXX
  static bool isValidPhone(String phone) {
    return RegExp(r'^(\+92|0)3[0-9]{9}$').hasMatch(phone);
  }

  /// CNIC format: XXXXX-XXXXXXX-X
  static bool isValidCnic(String cnic) {
    return RegExp(r'^\d{5}-\d{7}-\d$').hasMatch(cnic);
  }

  /// NTN format: XXXXXXX-X (7 digits, dash, 1 digit)
  static bool isValidNtn(String ntn) {
    return RegExp(r'^\d{7}-\d$').hasMatch(ntn);
  }

  /// Validate positive money amount.
  static bool isValidAmount(double? amount) {
    return amount != null && amount > 0;
  }
}
