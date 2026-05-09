import 'dart:async';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Status of the Bluetooth printer connection.
enum PrinterStatus { disconnected, connecting, connected, error }

/// Manages discovery and connection of Bluetooth thermal printers.
class PrinterService {
  static const _printerMacKey = 'paired_printer_mac';
  static const _storage = FlutterSecureStorage();

  BluetoothConnection? _connection;
  PrinterStatus _status = PrinterStatus.disconnected;

  PrinterStatus get status => _status;
  bool get isConnected => _status == PrinterStatus.connected;

  final _statusController = StreamController<PrinterStatus>.broadcast();
  Stream<PrinterStatus> get statusStream => _statusController.stream;

  /// List nearby Bluetooth devices.
  Future<List<BluetoothDevice>> discoverDevices() async {
    final devices = await FlutterBluetoothSerial.instance.getBondedDevices();
    return devices;
  }

  /// Save a paired printer MAC address for future auto-connect.
  Future<void> savePrinterMac(String mac) async {
    await _storage.write(key: _printerMacKey, value: mac);
  }

  Future<String?> getSavedMac() async {
    return _storage.read(key: _printerMacKey);
  }

  /// Connect to the given MAC address.
  Future<bool> connect(String mac) async {
    _setStatus(PrinterStatus.connecting);
    try {
      _connection = await BluetoothConnection.toAddress(mac);
      _setStatus(PrinterStatus.connected);
      return true;
    } catch (_) {
      _setStatus(PrinterStatus.error);
      return false;
    }
  }

  /// Disconnect from the current printer.
  Future<void> disconnect() async {
    await _connection?.finish();
    _connection = null;
    _setStatus(PrinterStatus.disconnected);
  }

  /// Send raw ESC/POS bytes to the printer.
  Future<bool> sendBytes(List<int> bytes) async {
    if (_connection == null || !isConnected) return false;
    try {
      _connection!.output.add(bytes as dynamic);
      await _connection!.output.allSent;
      return true;
    } catch (_) {
      _setStatus(PrinterStatus.error);
      return false;
    }
  }

  void _setStatus(PrinterStatus s) {
    _status = s;
    _statusController.add(s);
  }

  void dispose() {
    _statusController.close();
    _connection?.finish();
  }
}
