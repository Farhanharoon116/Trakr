import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/colors.dart';
import '../../shared/widgets/loading_overlay.dart';

class ScheduleScreen extends ConsumerStatefulWidget {
  const ScheduleScreen({super.key});

  @override
  ConsumerState<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends ConsumerState<ScheduleScreen> {
  List<Map<String, dynamic>> _shifts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadShifts();
  }

  Future<void> _loadShifts() async {
    final client = ref.read(apiClientProvider);
    final result = await client.get(Endpoints.shiftsCurrent);
    setState(() => _loading = false);
    if (result case ApiSuccess(data: final d)) {
      setState(() {
        _shifts = (d['data'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Schedule')),
      body: LoadingOverlay(
        isLoading: _loading,
        child: _shifts.isEmpty && !_loading
            ? const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.calendar_today_outlined,
                        size: 48, color: BizColors.textMuted),
                    SizedBox(height: 12),
                    Text('No shifts scheduled',
                        style: TextStyle(color: BizColors.textSecondary)),
                  ],
                ),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: _shifts.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, i) {
                  final shift = _shifts[i];
                  final openedAt = DateTime.tryParse(
                      shift['opened_at'] as String? ?? '');
                  final closedAt = DateTime.tryParse(
                      shift['closed_at'] as String? ?? '');
                  return Card(
                    child: ListTile(
                      leading: const Icon(
                        Icons.access_time,
                        color: BizColors.primary,
                      ),
                      title: Text(
                        openedAt != null
                            ? DateFormat('EEE, dd MMM yyyy').format(openedAt)
                            : 'Shift',
                      ),
                      subtitle: Text(
                        openedAt != null
                            ? '${DateFormat('HH:mm').format(openedAt)} — '
                                '${closedAt != null ? DateFormat('HH:mm').format(closedAt) : 'Open'}'
                            : '',
                      ),
                      trailing: closedAt == null
                          ? Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: BizColors.success.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'Active',
                                style: TextStyle(
                                  color: BizColors.success,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            )
                          : null,
                    ),
                  );
                },
              ),
      ),
    );
  }
}
