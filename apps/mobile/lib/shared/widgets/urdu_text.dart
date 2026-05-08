import 'package:flutter/material.dart';
import '../theme/text_styles.dart';

/// Text widget that uses the Noto Nastaliq Urdu / Naskh Arabic font
/// and automatically applies RTL direction.
class UrduText extends StatelessWidget {
  const UrduText(
    this.text, {
    super.key,
    this.style,
    this.textAlign,
  });

  final String text;
  final TextStyle? style;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Text(
        text,
        textAlign: textAlign ?? TextAlign.right,
        style: BizTextStyles.urdu.merge(style),
      ),
    );
  }
}
