/// Auth state: token + current user.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

class AuthUser {
  const AuthUser({required this.id, required this.email, required this.name, required this.role});

  final String id;
  final String email;
  final String name;
  final String role;
}

class AuthState {
  const AuthState({this.accessToken, this.user, this.busy = false, this.error});

  final String? accessToken;
  final AuthUser? user;
  final bool busy;
  final String? error;

  bool get authenticated => accessToken != null && user != null;

  AuthState copyWith({String? accessToken, AuthUser? user, bool? busy, String? error}) =>
      AuthState(
        accessToken: accessToken ?? this.accessToken,
        user: user ?? this.user,
        busy: busy ?? this.busy,
        error: error,
      );

  AuthState clear() => const AuthState();
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    // TODO: hydrate from secure storage once backend auth lands.
    return const AuthState();
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(busy: true, error: null);
    try {
      final json = await ref.read(apiClientProvider).post('/auth/login', {
        'email': email,
        'password': password,
      });
      final token = json['accessToken'] as String? ?? json['token'] as String?;
      if (token == null) throw const FormatException('No access token in response');
      final user = json['user'] as Map<String, dynamic>? ?? const {};
      state = AuthState(
        accessToken: token,
        user: AuthUser(
          id: '${user['id'] ?? ''}',
          email: '${user['email'] ?? email}',
          name: '${user['displayName'] ?? user['name'] ?? email}',
          role: '${user['role'] ?? 'PRODUCER'}',
        ),
      );
    } catch (e) {
      final message = e is Exception ? e.toString().replaceFirst(RegExp(r'^[^:]+:\s*'), '') : '$e';
      state = state.copyWith(busy: false, error: message);
      rethrow;
    }
    state = state.copyWith(busy: false);
  }

  void logout() => state = state.clear();
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);