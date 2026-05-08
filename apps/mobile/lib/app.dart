import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/auth/auth_provider.dart';
import 'core/theme/colors.dart';
import 'core/theme/text_styles.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/pin_screen.dart';
import 'features/pos/pos_screen.dart';
import 'features/employee/home_screen.dart';
import 'features/employee/schedule_screen.dart';
import 'features/employee/attendance_screen.dart';
import 'features/employee/leave_screen.dart';
import 'features/employee/salary_screen.dart';
import 'features/settings/printer_settings.dart';

final _router = GoRouter(
  initialLocation: '/login',
  redirect: (BuildContext context, GoRouterState state) {
    // Auth redirect logic is handled in the router's refreshListenable
    return null;
  },
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/pin',
      builder: (context, state) => const PinScreen(),
    ),
    GoRoute(
      path: '/pos',
      builder: (context, state) => const POSScreen(),
    ),
    GoRoute(
      path: '/employee',
      builder: (context, state) => const EmployeeHomeScreen(),
    ),
    GoRoute(
      path: '/employee/schedule',
      builder: (context, state) => const ScheduleScreen(),
    ),
    GoRoute(
      path: '/employee/attendance',
      builder: (context, state) => const AttendanceScreen(),
    ),
    GoRoute(
      path: '/employee/leave',
      builder: (context, state) => const LeaveScreen(),
    ),
    GoRoute(
      path: '/employee/salary',
      builder: (context, state) => const SalaryScreen(),
    ),
    GoRoute(
      path: '/settings/printer',
      builder: (context, state) => const PrinterSettingsScreen(),
    ),
  ],
);

class BizOSApp extends ConsumerWidget {
  const BizOSApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'BizOS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: BizColors.primary,
          primary: BizColors.primary,
          error: BizColors.danger,
          surface: BizColors.surface,
        ),
        scaffoldBackgroundColor: BizColors.background,
        textTheme: BizTextStyles.textTheme,
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: BizColors.surface,
          foregroundColor: Color(0xFF1E293B),
          elevation: 0,
          centerTitle: false,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: BizColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: BizColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: BizColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: BizColors.primary, width: 2),
          ),
          filled: true,
          fillColor: BizColors.surface,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
      routerConfig: _router,
    );
  }
}
