/// All BizOS API endpoint constants.
class Endpoints {
  Endpoints._();

  static const String _base = '/api/v1';

  // Auth
  static const String sendOtp = '$_base/auth/send-otp';
  static const String verifyOtp = '$_base/auth/verify-otp';
  static const String refreshToken = '$_base/auth/refresh';
  static const String setupBusiness = '$_base/auth/setup-business';

  // Business
  static const String businessMe = '$_base/businesses/me';

  // Products
  static const String products = '$_base/products';
  static String product(String id) => '$_base/products/$id';

  // Inventory
  static const String inventory = '$_base/inventory';
  static const String inventoryAdjust = '$_base/inventory/adjust';
  static const String inventoryLowStock = '$_base/inventory/low-stock';

  // Sales
  static const String sales = '$_base/sales';
  static const String salesBulkSync = '$_base/sales/bulk-sync';
  static String saleReceipt(String id) => '$_base/sales/$id/receipt';

  // Customers
  static const String customers = '$_base/customers';
  static String customer(String id) => '$_base/customers/$id';

  // Employees
  static const String employees = '$_base/employees';
  static String employee(String id) => '$_base/employees/$id';
  static String employeeSalarySlip(String id) => '$_base/employees/$id/salary-slip';

  // Attendance
  static const String attendanceClockIn = '$_base/attendance/clock-in';
  static const String attendanceClockOut = '$_base/attendance/clock-out';
  static const String attendanceReport = '$_base/attendance/report';

  // Leave requests
  static const String leaveRequests = '$_base/leave-requests';
  static String leaveRequest(String id) => '$_base/leave-requests/$id';

  // Shifts
  static const String shiftsOpen = '$_base/shifts/open';
  static const String shiftsCurrent = '$_base/shifts/current';
  static String shiftClose(String id) => '$_base/shifts/$id/close';

  // Reports
  static const String reportsDashboard = '$_base/reports/dashboard';
  static const String reportsGST = '$_base/reports/fbr-gst';
}
