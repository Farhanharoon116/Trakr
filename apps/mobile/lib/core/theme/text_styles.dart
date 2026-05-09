import 'package:flutter/material.dart';
import 'colors.dart';

/// Shared text styles for BizOS mobile app.
class BizTextStyles {
  BizTextStyles._();

  static const TextTheme textTheme = TextTheme(
    displayLarge: TextStyle(
      fontSize: 32,
      fontWeight: FontWeight.w700,
      color: BizColors.textPrimary,
    ),
    displayMedium: TextStyle(
      fontSize: 26,
      fontWeight: FontWeight.w700,
      color: BizColors.textPrimary,
    ),
    headlineMedium: TextStyle(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      color: BizColors.textPrimary,
    ),
    titleLarge: TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: BizColors.textPrimary,
    ),
    titleMedium: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w500,
      color: BizColors.textPrimary,
    ),
    bodyLarge: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      color: BizColors.textPrimary,
    ),
    bodyMedium: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: BizColors.textSecondary,
    ),
    bodySmall: TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      color: BizColors.textMuted,
    ),
    labelLarge: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: BizColors.textPrimary,
    ),
  );

  static const TextStyle urdu = TextStyle(
    fontFamily: 'NotoNastaliqUrdu',
    fontSize: 16,
    color: BizColors.textPrimary,
  );

  static const TextStyle arabic = TextStyle(
    fontFamily: 'NotoNaskhArabic',
    fontSize: 16,
    color: BizColors.textPrimary,
  );
}
