import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/colors.dart';
import '../../shared/utils/currency.dart';
import '../../shared/widgets/loading_overlay.dart';

/// Employee home — clock in/out, quick links to schedule/leave/salary.
class EmployeeHomeScreen extends ConsumerStatefulWidget {
  const EmployeeHomeScreen({super.key});

  @override
  ConsumerState<EmployeeHomeScreen> createState() =>
      _EmployeeHomeScreenState();
}

class _EmployeeHomeScreenState extends ConsumerState<EmployeeHomeScreen> {
  bool _clockedIn = false;
  String? _clockInTime;
  bool _loading = false;

  Future<Position?> _getLocation() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return null;
    }
    if (permission == LocationPermission.deniedForever) return null;
    return Geolocator.getCurrentPosition();
  }

  Future<void> _clockIn() async {
    setState(() => _loading = true);
    final user = ref.read(authProvider).value;
    if (user == null) return;

    final position = await _getLocation();
    final client = ref.read(apiClientProvider);
    final result = await client.post(Endpoints.attendanceClockIn, {
      'employee_id': user.id,
      if (position != null) 'lat': position.latitude,
      if (position != null) 'lng': position.longitude,
    });

    setState(() => _loading = false);
    if (result case ApiSuccess()) {
      setState(() {
        _clockedIn = true;
        _clockInTime =
            TimeOfDay.now().format(context);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Clocked in successfully'),
            backgroundColor: BizColors.success,
          ),
        );
      }
    } else if (result case ApiError(message: final msg)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: BizColors.danger),
        );
      }
    }
  }

  Future<void> _clockOut() async {
    setState(() => _loading = true);
    final user = ref.read(authProvider).value;
    if (user == null) return;

    final client = ref.read(apiClientProvider);
    final result = await client.post(
      Endpoints.attendanceClockOut,
      {'employee_id': user.id},
    );

    setState(() => _loading = false);
    if (result case ApiSuccess()) {
      setState(() {
        _clockedIn = false;
        _clockInTime = null;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Clocked out. See you tomorrow!'),
            backgroundColor: BizColors.primary,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _loading,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Greeting
              Text(
                'Hello, ${user?.name ?? 'Employee'}!',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: BizColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _clockedIn
                    ? 'You clocked in at $_clockInTime'
                    : 'You have not clocked in today',
                style: const TextStyle(color: BizColors.textSecondary),
              ),
              const SizedBox(height: 24),

              // Clock in/out card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: _clockedIn
                        ? [BizColors.success, const Color(0xFF15803D)]
                        : [BizColors.primary, const Color(0xFF1D4ED8)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Icon(
                      _clockedIn
                          ? Icons.logout_rounded
                          : Icons.login_rounded,
                      color: Colors.white,
                      size: 48,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _clockedIn ? 'Clock Out' : 'Clock In',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _clockedIn ? _clockOut : _clockIn,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: _clockedIn
                            ? BizColors.success
                            : BizColors.primary,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 32, vertical: 14),
                      ),
                      child: Text(
                        _clockedIn ? 'Clock Out Now' : 'Clock In Now',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Quick links
              const Text(
                'Quick Links',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: BizColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.6,
                children: [
                  _QuickLink(
                    label: 'Schedule',
                    icon: Icons.calendar_month_outlined,
                    color: BizColors.primary,
                    onTap: () => context.go('/employee/schedule'),
                  ),
                  _QuickLink(
                    label: 'Attendance',
                    icon: Icons.fact_check_outlined,
                    color: BizColors.success,
                    onTap: () => context.go('/employee/attendance'),
                  ),
                  _QuickLink(
                    label: 'Leave Request',
                    icon: Icons.event_busy_outlined,
                    color: BizColors.warning,
                    onTap: () => context.go('/employee/leave'),
                  ),
                  _QuickLink(
                    label: 'Salary Slips',
                    icon: Icons.receipt_long_outlined,
                    color: BizColors.danger,
                    onTap: () => context.go('/employee/salary'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickLink extends StatelessWidget {
  const _QuickLink({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
