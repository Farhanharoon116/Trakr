import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:local_auth/local_auth.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/colors.dart';

/// 6-digit PIN screen shown after 30 minutes of idle.
class PinScreen extends ConsumerStatefulWidget {
  const PinScreen({super.key});

  @override
  ConsumerState<PinScreen> createState() => _PinScreenState();
}

class _PinScreenState extends ConsumerState<PinScreen> {
  final _pin = StringBuffer();
  int _attempts = 0;
  String? _error;
  bool _biometricAvailable = false;

  @override
  void initState() {
    super.initState();
    _checkBiometrics();
  }

  Future<void> _checkBiometrics() async {
    final auth = LocalAuthentication();
    final canCheck = await auth.canCheckBiometrics;
    if (mounted) setState(() => _biometricAvailable = canCheck);
    if (canCheck) _tryBiometric();
  }

  Future<void> _tryBiometric() async {
    final auth = LocalAuthentication();
    try {
      final authenticated = await auth.authenticate(
        localizedReason: 'Authenticate to access BizOS',
        options: const AuthenticationOptions(biometricOnly: true),
      );
      if (authenticated && mounted) _onSuccess();
    } catch (_) {
      // Biometric failed or cancelled — fall back to PIN
    }
  }

  void _onKeyPress(String digit) {
    if (_pin.length >= 6) return;
    setState(() {
      _pin.write(digit);
      _error = null;
    });
    if (_pin.length == 6) _submit();
  }

  void _onDelete() {
    if (_pin.isEmpty) return;
    final current = _pin.toString();
    setState(() {
      _pin.clear();
      _pin.write(current.substring(0, current.length - 1));
    });
  }

  Future<void> _submit() async {
    final service = ref.read(authServiceProvider);
    final valid = await service.validatePin(_pin.toString());
    if (valid) {
      _onSuccess();
    } else {
      _attempts++;
      setState(() {
        _pin.clear();
        _error = _attempts >= 3
            ? 'Too many attempts. Please log in with OTP.'
            : 'Incorrect PIN. ${3 - _attempts} attempts remaining.';
      });
      if (_attempts >= 3) {
        await ref.read(authProvider.notifier).signOut();
        if (mounted) context.go('/login');
      }
    }
  }

  void _onSuccess() {
    final user = ref.read(authProvider).value;
    if (user == null) {
      context.go('/login');
      return;
    }
    if (user.isCashierOrAbove) {
      context.go('/pos');
    } else {
      context.go('/employee');
    }
  }

  @override
  Widget build(BuildContext context) {
    final dots = _pin.length;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            children: [
              const Spacer(),
              const Icon(Icons.lock_outline, size: 48, color: BizColors.primary),
              const SizedBox(height: 16),
              Text(
                ref.watch(authProvider).value?.name ?? 'BizOS',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: BizColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Enter your PIN',
                style: TextStyle(color: BizColors.textSecondary),
              ),
              const SizedBox(height: 32),

              // Dot indicators
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(6, (i) {
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 8),
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: i < dots
                          ? BizColors.primary
                          : BizColors.border,
                    ),
                  );
                }),
              ),

              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: const TextStyle(color: BizColors.danger, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ],

              const Spacer(),

              // Numpad
              _Numpad(
                onDigit: _onKeyPress,
                onDelete: _onDelete,
                onBiometric: _biometricAvailable ? _tryBiometric : null,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _Numpad extends StatelessWidget {
  const _Numpad({
    required this.onDigit,
    required this.onDelete,
    this.onBiometric,
  });

  final void Function(String) onDigit;
  final VoidCallback onDelete;
  final VoidCallback? onBiometric;

  @override
  Widget build(BuildContext context) {
    final keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return Column(
      children: [
        ...List.generate(3, (row) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(3, (col) {
              final digit = keys[row * 3 + col];
              return _NumKey(
                label: digit,
                onTap: () => onDigit(digit),
              );
            }),
          );
        }),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _NumKey(
              icon: onBiometric != null
                  ? Icons.fingerprint
                  : Icons.circle_outlined,
              onTap: onBiometric,
            ),
            _NumKey(label: '0', onTap: () => onDigit('0')),
            _NumKey(
              icon: Icons.backspace_outlined,
              onTap: onDelete,
            ),
          ],
        ),
      ],
    );
  }
}

class _NumKey extends StatelessWidget {
  const _NumKey({this.label, this.icon, this.onTap});
  final String? label;
  final IconData? icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 72,
        height: 72,
        margin: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: BizColors.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Center(
          child: label != null
              ? Text(
                  label!,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w600,
                    color: BizColors.textPrimary,
                  ),
                )
              : Icon(icon, size: 24, color: BizColors.textSecondary),
        ),
      ),
    );
  }
}
