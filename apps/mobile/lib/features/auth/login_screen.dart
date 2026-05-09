import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/colors.dart';
import '../../shared/utils/validators.dart';

/// Phone OTP login screen — supports Pakistani numbers.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _phoneFocus = FocusNode();
  final _otpFocus = FocusNode();

  bool _otpSent = false;
  bool _loading = false;
  String? _error;
  int _countdown = 0;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    _phoneFocus.dispose();
    _otpFocus.dispose();
    super.dispose();
  }

  String get _formattedPhone {
    final raw = _phoneController.text.trim();
    if (raw.startsWith('0')) return '+92${raw.substring(1)}';
    if (raw.startsWith('92')) return '+$raw';
    return raw;
  }

  Future<void> _sendOtp() async {
    final phone = _formattedPhone;
    if (!Validators.isValidPhone(phone)) {
      setState(() => _error = 'Enter a valid Pakistani number (03XXXXXXXXX)');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    final service = ref.read(authServiceProvider);
    final result = await service.sendOtp(phone);

    setState(() => _loading = false);

    if (result case SendOtpSuccess(expiresIn: final secs)) {
      setState(() {
        _otpSent = true;
        _countdown = secs;
      });
      _otpFocus.requestFocus();
    } else if (result case SendOtpFailure(message: final msg)) {
      setState(() => _error = msg);
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      setState(() => _error = 'Enter the 6-digit OTP');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    final service = ref.read(authServiceProvider);
    final result = await service.verifyOtp(_formattedPhone, otp);

    setState(() => _loading = false);

    if (!mounted) return;

    switch (result) {
      case VerifyOtpExistingUser(user: final user):
        await ref.read(authProvider.notifier).setUser(user);
        if (user.isCashierOrAbove) {
          context.go('/pos');
        } else {
          context.go('/employee');
        }
      case VerifyOtpNewUser():
        // TODO: Navigate to business setup wizard
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Welcome! Please set up your business.')),
        );
      case VerifyOtpFailure(message: final msg):
        setState(() => _error = msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 48),
              // Logo / Brand
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: BizColors.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.storefront, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'BizOS',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      color: BizColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
              Text(
                _otpSent ? 'Enter OTP' : 'Sign in',
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: BizColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _otpSent
                    ? 'Enter the 6-digit code sent to ${_phoneController.text}'
                    : 'Enter your mobile number to continue',
                style: const TextStyle(
                  fontSize: 14,
                  color: BizColors.textSecondary,
                ),
              ),
              const SizedBox(height: 32),

              if (!_otpSent) ...[
                TextField(
                  controller: _phoneController,
                  focusNode: _phoneFocus,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'Mobile Number',
                    hintText: '03001234567',
                    prefixIcon: Icon(Icons.phone),
                  ),
                  onSubmitted: (_) => _sendOtp(),
                ),
              ] else ...[
                TextField(
                  controller: _otpController,
                  focusNode: _otpFocus,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'OTP Code',
                    hintText: '• • • • • •',
                    prefixIcon: Icon(Icons.lock_outline),
                    counterText: '',
                  ),
                  onChanged: (val) {
                    if (val.length == 6) _verifyOtp();
                  },
                ),
              ],

              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: BizColors.danger.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: BizColors.danger, fontSize: 13),
                  ),
                ),
              ],

              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading
                      ? null
                      : (_otpSent ? _verifyOtp : _sendOtp),
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(_otpSent ? 'Verify OTP' : 'Get OTP'),
                ),
              ),

              if (_otpSent) ...[
                const SizedBox(height: 16),
                Center(
                  child: TextButton(
                    onPressed: () => setState(() {
                      _otpSent = false;
                      _otpController.clear();
                      _error = null;
                    }),
                    child: const Text('Change number'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
