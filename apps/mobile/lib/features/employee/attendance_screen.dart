import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/colors.dart';
import '../../shared/widgets/loading_overlay.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  List<Map<String, dynamic>> _records = [];
  bool _loading = true;
  late DateTimeRange _range;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _range = DateTimeRange(
      start: DateTime(now.year, now.month, 1),
      end: now,
    );
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final user = ref.read(authProvider).value;
    if (user == null) return;

    final client = ref.read(apiClientProvider);
    final from = DateFormat('yyyy-MM-dd').format(_range.start);
    final to = DateFormat('yyyy-MM-dd').format(_range.end);
    final result = await client.get(
      '${Endpoints.attendanceReport}?start_date=$from&end_date=$to&employee_id=${user.id}',
    );
    setState(() => _loading = false);
    if (result case ApiSuccess(data: final d)) {
      setState(() {
        _records = (d['data'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>();
      });
    }
  }

  Color _statusColor(String status) => switch (status) {
        'present' => BizColors.success,
        'absent' => BizColors.danger,
        'leave' => BizColors.warning,
        'half_day' => BizColors.primary,
        _ => BizColors.textMuted,
      };

  @override
  Widget build(BuildContext context) {
    final present =
        _records.where((r) => r['status'] == 'present').length;
    final absent =
        _records.where((r) => r['status'] == 'absent').length;
    final leave = _records.where((r) => r['status'] == 'leave').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Attendance'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: () async {
              final picked = await showDateRangePicker(
                context: context,
                firstDate: DateTime(2024),
                lastDate: DateTime.now(),
                initialDateRange: _range,
              );
              if (picked != null) {
                setState(() => _range = picked);
                await _load();
              }
            },
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _loading,
        child: Column(
          children: [
            // Summary bar
            Container(
              padding: const EdgeInsets.all(16),
              color: BizColors.surface,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _SummaryChip('Present', present, BizColors.success),
                  _SummaryChip('Absent', absent, BizColors.danger),
                  _SummaryChip('Leave', leave, BizColors.warning),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _records.isEmpty && !_loading
                  ? const Center(
                      child: Text('No records for this period',
                          style:
                              TextStyle(color: BizColors.textSecondary)))
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _records.length,
                      itemBuilder: (context, i) {
                        final r = _records[i];
                        final date = r['date'] as String? ?? '';
                        final status = r['status'] as String? ?? '';
                        final hoursWorked =
                            (r['hours_worked'] as num?)?.toDouble();
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor:
                                _statusColor(status).withOpacity(0.15),
                            child: Text(
                              status[0].toUpperCase(),
                              style: TextStyle(
                                color: _statusColor(status),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          title: Text(date),
                          subtitle: Text(status),
                          trailing: hoursWorked != null
                              ? Text(
                                  '${hoursWorked.toStringAsFixed(1)}h',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: BizColors.textSecondary,
                                  ),
                                )
                              : null,
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip(this.label, this.count, this.color);
  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        Text(label,
            style: const TextStyle(fontSize: 12, color: BizColors.textSecondary)),
      ],
    );
  }
}
