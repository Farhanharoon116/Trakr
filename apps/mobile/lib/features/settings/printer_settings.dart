import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/printing/printer_service.dart';
import '../../core/theme/colors.dart';
import '../../shared/widgets/loading_overlay.dart';

final _printerServiceProvider = Provider<PrinterService>((ref) {
  final service = PrinterService();
  ref.onDispose(service.dispose);
  return service;
});

/// Screen to discover and pair a Bluetooth thermal printer.
class PrinterSettingsScreen extends ConsumerStatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  ConsumerState<PrinterSettingsScreen> createState() =>
      _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState
    extends ConsumerState<PrinterSettingsScreen> {
  List<dynamic> _devices = [];
  bool _scanning = false;
  String? _connectedMac;

  @override
  void initState() {
    super.initState();
    _loadSavedPrinter();
  }

  Future<void> _loadSavedPrinter() async {
    final service = ref.read(_printerServiceProvider);
    final mac = await service.getSavedMac();
    if (mounted) setState(() => _connectedMac = mac);
  }

  Future<void> _scan() async {
    setState(() {
      _scanning = true;
      _devices = [];
    });
    final service = ref.read(_printerServiceProvider);
    final devices = await service.discoverDevices();
    setState(() {
      _devices = devices;
      _scanning = false;
    });
  }

  Future<void> _connect(dynamic device) async {
    final service = ref.read(_printerServiceProvider);
    final mac = device.address as String;
    final connected = await service.connect(mac);
    if (connected) {
      await service.savePrinterMac(mac);
      if (mounted) {
        setState(() => _connectedMac = mac);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Connected to ${device.name ?? mac}'),
            backgroundColor: BizColors.success,
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not connect. Is the printer on?'),
            backgroundColor: BizColors.danger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final printerService = ref.watch(_printerServiceProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Printer Settings')),
      body: LoadingOverlay(
        isLoading: _scanning,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: printerService.isConnected
                      ? BizColors.success.withOpacity(0.1)
                      : BizColors.background,
                  border: Border.all(
                    color: printerService.isConnected
                        ? BizColors.success
                        : BizColors.border,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.print_outlined,
                      color: printerService.isConnected
                          ? BizColors.success
                          : BizColors.textMuted,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            printerService.isConnected
                                ? 'Printer Connected'
                                : 'No Printer Paired',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: printerService.isConnected
                                  ? BizColors.success
                                  : BizColors.textPrimary,
                            ),
                          ),
                          if (_connectedMac != null)
                            Text(
                              _connectedMac!,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: BizColors.textSecondary),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Available Printers',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: BizColors.textPrimary,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: _scanning ? null : _scan,
                    icon: const Icon(Icons.bluetooth_searching, size: 18),
                    label: const Text('Scan'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              if (_devices.isEmpty && !_scanning)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Icon(Icons.bluetooth_disabled,
                            size: 40, color: BizColors.textMuted),
                        SizedBox(height: 8),
                        Text(
                          'Tap "Scan" to find Bluetooth printers\n(Make sure printer is turned on)',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: BizColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                )
              else
                Expanded(
                  child: ListView.separated(
                    itemCount: _devices.length,
                    separatorBuilder: (_, __) =>
                        const Divider(height: 1),
                    itemBuilder: (context, i) {
                      final device = _devices[i];
                      final mac = device.address as String;
                      final name = device.name as String? ?? mac;
                      return ListTile(
                        leading: const Icon(Icons.print_outlined,
                            color: BizColors.primary),
                        title: Text(name),
                        subtitle: Text(mac),
                        trailing: _connectedMac == mac
                            ? const Icon(Icons.check_circle,
                                color: BizColors.success)
                            : TextButton(
                                onPressed: () => _connect(device),
                                child: const Text('Connect'),
                              ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
