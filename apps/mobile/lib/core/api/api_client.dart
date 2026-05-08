import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'endpoints.dart';

/// Result type for API calls.
sealed class ApiResult<T> {
  const ApiResult();
}

final class ApiSuccess<T> extends ApiResult<T> {
  const ApiSuccess(this.data);
  final T data;
}

final class ApiError<T> extends ApiResult<T> {
  const ApiError(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
}

/// Lightweight HTTP client that handles auth headers + token refresh.
class ApiClient {
  ApiClient({
    required this.baseUrl,
    FlutterSecureStorage? storage,
  }) : _storage = storage ?? const FlutterSecureStorage();

  final String baseUrl;
  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';

  Future<String?> get accessToken => _storage.read(key: _accessTokenKey);
  Future<String?> get refreshToken => _storage.read(key: _refreshTokenKey);

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
    ]);
  }

  Future<Map<String, String>> _authHeaders() async {
    final token = await accessToken;
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<ApiResult<Map<String, dynamic>>> get(String path) async {
    return _request('GET', path, null);
  }

  Future<ApiResult<Map<String, dynamic>>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    return _request('POST', path, body);
  }

  Future<ApiResult<Map<String, dynamic>>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    return _request('PATCH', path, body);
  }

  Future<ApiResult<Map<String, dynamic>>> _request(
    String method,
    String path,
    Map<String, dynamic>? body,
  ) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = await _authHeaders();

    http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await http.get(uri, headers: headers);
        case 'POST':
          response = await http.post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          );
        case 'PATCH':
          response = await http.patch(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          );
        default:
          return ApiError('Unsupported HTTP method: $method');
      }
    } catch (e) {
      return ApiError('Network error: $e');
    }

    // Token expired — attempt refresh
    if (response.statusCode == 401) {
      final refreshed = await _attemptTokenRefresh();
      if (refreshed) return _request(method, path, body);
      return const ApiError('Session expired. Please log in again.', statusCode: 401);
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          return ApiSuccess(decoded);
        }
        return ApiSuccess({'data': decoded});
      } catch (_) {
        return const ApiSuccess({});
      }
    }

    try {
      final error = jsonDecode(response.body) as Map<String, dynamic>;
      final message = error['message'] as String? ?? 'Request failed';
      return ApiError(message, statusCode: response.statusCode);
    } catch (_) {
      return ApiError('Request failed (${response.statusCode})',
          statusCode: response.statusCode);
    }
  }

  Future<bool> _attemptTokenRefresh() async {
    final refresh = await refreshToken;
    if (refresh == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl${Endpoints.refreshToken}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh_token': refresh}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        await saveTokens(
          accessToken: data['access_token'] as String,
          refreshToken: data['refresh_token'] as String,
        );
        return true;
      }
    } catch (_) {
      // Refresh failed; tokens will be cleared by caller
    }
    await clearTokens();
    return false;
  }
}

/// Provider-level singleton. Initialised from environment / config.
final apiClientInstance = ApiClient(
  baseUrl: const String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:3001',
  ),
);
