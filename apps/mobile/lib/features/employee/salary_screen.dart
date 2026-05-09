import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/colors.dart';
import '../../shared/utils/currency.dart';
import '../../shared/widgets/loading_overlay.dart';

/// Salary slip history for an employee.
class SalaryScreen extends ConsumerStatefulWidget {
  const SalaryScreen({super.key});

  @override
  ConsumerState<SalaryScreen> createState() => _SalaryScreenState();
}

class _SalaryScreenState extends ConsumerState<SalaryScreen> {
  List<Map<String, dynamic>> _slips = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(authProvider).value;
    if (user == null) return;

    final client = ref.read(apiClientProvider);
    final result = await client.get(Endpoints.employeeSalarySlip(user.id));
    setState(() => _loading = false);
    if (result case ApiSuccess(data: final d)) {
      setState(() {
        _slips = (d['data'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Salary Slips')),
      body: LoadingOverlay(
        isLoading: _loading,
        child: _slips.isEmpty && !_loading
            ? const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.receipt_long_outlined,
                        size: 48, color: BizColors.textMuted),
                    SizedBox(height: 12),
                    Text('No salary slips available',
                        style: TextStyle(color: BizColors.textSecondary)),
                  ],
                ),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: _slips.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, i) {
                  final slip = _slips[i];
                  final period = slip['period'] as String? ?? '';
                  final netSalary =
                      (slip['net_salary'] as num?)?.toDouble() ?? 0;
                  return Card(
                    child: ListTile(
                      leading: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: BizColors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.receipt_long_outlined,
                          color: BizColors.primary,
                        ),
                      ),
                      title: Text(
                        period,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        'Net: ${CurrencyUtils.format(netSalary)}',
                        style: const TextStyle(color: BizColors.textSecondary),
                      ),
                      trailing: const Icon(
                        Icons.download_outlined,
                        color: BizColors.primary,
                      ),
                      onTap: () {
                        // TODO: Download/preview PDF salary slip
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('PDF download coming soon'),
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
      ),
    );
  }
}
