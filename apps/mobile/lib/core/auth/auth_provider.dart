import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import 'auth_service.dart';

/// Global Riverpod provider for [ApiClient].
final apiClientProvider = Provider<ApiClient>((ref) {
  return apiClientInstance;
});

/// Global Riverpod provider for [AuthService].
final authServiceProvider = Provider<AuthService>((ref) {
  final client = ref.watch(apiClientProvider);
  return AuthService(client);
});

/// Notifier that exposes reactive auth state.
class AuthNotifier extends AsyncNotifier<AuthUser?> {
  @override
  Future<AuthUser?> build() async {
    // Check if we already have a valid token stored.
    final client = ref.read(apiClientProvider);
    final token = await client.accessToken;
    if (token == null) return null;

    // Try to restore user from secure storage.
    // In production, call /businesses/me to validate token + get user.
    return null;
  }

  Future<void> setUser(AuthUser user) async {
    state = AsyncValue.data(user);
  }

  Future<void> signOut() async {
    final service = ref.read(authServiceProvider);
    await service.signOut();
    state = const AsyncValue.data(null);
  }
}

final authProvider = AsyncNotifierProvider<AuthNotifier, AuthUser?>(
  AuthNotifier.new,
);
