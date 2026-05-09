import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/colors.dart';

/// Leave request submission screen.
class LeaveScreen extends ConsumerStatefulWidget {
  const LeaveScreen({super.key});

  @override
  ConsumerState<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends ConsumerState<LeaveScreen> {
  String _leaveType = 'annual';
  DateTime? _fromDate;
  DateTime? _toDate;
  final _reasonController = TextEditingController();
  bool _submitting = false;
  List<Map<String, dynamic>> _history = [];

  static const _leaveTypes = [
    ('annual', 'Annual Leave'),
    ('sick', 'Sick Leave'),
    ('unpaid', 'Unpaid Leave'),
    ('other', 'Other'),
  ];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    final user = ref.read(authProvider).value;
    if (user == null) return;
    final client = ref.read(apiClientProvider);
    final result = await client.get(Endpoints.leaveRequests);
    if (result case ApiSuccess(data: final d)) {
      setState(() {
        _history = (d['data'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>();
      });
    }
  }

  Future<void> _submit() async {
    if (_fromDate == null || _toDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select leave dates')),
      );
      return;
    }

    setState(() => _submitting = true);
    final user = ref.read(authProvider).value;
    if (user == null) return;

    final client = ref.read(apiClientProvider);
    final result = await client.post(Endpoints.leaveRequests, {
      'employee_id': user.id,
      'leave_type': _leaveType,
      'from_date': DateFormat('yyyy-MM-dd').format(_fromDate!),
      'to_date': DateFormat('yyyy-MM-dd').format(_toDate!),
      'reason': _reasonController.text.trim(),
    });

    setState(() => _submitting = false);

    if (!mounted) return;
    if (result case ApiSuccess()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Leave request submitted'),
          backgroundColor: BizColors.success,
        ),
      );
      _reasonController.clear();
      setState(() {
        _fromDate = null;
        _toDate = null;
      });
      await _loadHistory();
    } else if (result case ApiError(message: final msg)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: BizColors.danger),
      );
    }
  }

  Color _statusColor(String status) => switch (status) {
        'approved' => BizColors.success,
        'rejected' => BizColors.danger,
        _ => BizColors.warning,
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leave Requests')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'New Request',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: BizColors.textPrimary,
              ),
            ),
            const SizedBox(height: 16),

            // Leave type
            DropdownButtonFormField<String>(
              value: _leaveType,
              decoration: const InputDecoration(labelText: 'Leave Type'),
              items: _leaveTypes
                  .map((t) =>
                      DropdownMenuItem(value: t.$1, child: Text(t.$2)))
                  .toList(),
              onChanged: (v) => setState(() => _leaveType = v ?? 'annual'),
            ),
            const SizedBox(height: 12),

            // Date range
            Row(
              children: [
                Expanded(
                  child: _DateField(
                    label: 'From',
                    value: _fromDate,
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime(2024),
                        lastDate: DateTime.now()
                            .add(const Duration(days: 365)),
                      );
                      if (date != null) setState(() => _fromDate = date);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DateField(
                    label: 'To',
                    value: _toDate,
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: _fromDate ?? DateTime.now(),
                        firstDate:
                            _fromDate ?? DateTime.now(),
                        lastDate: DateTime.now()
                            .add(const Duration(days: 365)),
                      );
                      if (date != null) setState(() => _toDate = date);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _reasonController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Reason (optional)',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Submit Request'),
              ),
            ),

            const SizedBox(height: 32),

            if (_history.isNotEmpty) ...[
              const Text(
                'History',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: BizColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              ...(_history.map((r) {
                final status = r['status'] as String? ?? 'pending';
                return Card(
                  child: ListTile(
                    title: Text(r['leave_type'] as String? ?? ''),
                    subtitle: Text(
                      '${r['from_date']} — ${r['to_date']}',
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _statusColor(status).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        status[0].toUpperCase() + status.substring(1),
                        style: TextStyle(
                          color: _statusColor(status),
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                );
              })),
            ],
          ],
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final DateTime? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: const Icon(Icons.calendar_today, size: 18),
        ),
        child: Text(
          value != null
              ? DateFormat('dd MMM yyyy').format(value!)
              : 'Select date',
          style: TextStyle(
            color: value != null
                ? BizColors.textPrimary
                : BizColors.textMuted,
          ),
        ),
      ),
    );
  }
}
