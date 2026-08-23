/// Typed API client (dio) with bearer-auth interceptor.
library;

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config.dart';
import '../auth/auth_state.dart';
import 'mock_api.dart';

class ApiClient {
  ApiClient(this._dio);

  final Dio _dio;

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async =>
      (await _dio.get<dynamic>(path, queryParameters: query)).data;

  Future<dynamic> post(String path, [Object? body]) async =>
      (await _dio.post<dynamic>(path, data: body)).data;

  Future<dynamic> patch(String path, [Object? body]) async =>
      (await _dio.patch<dynamic>(path, data: body)).data;

  Future<dynamic> delete(String path) async => (await _dio.delete<dynamic>(path)).data;
}

final apiClientProvider = Provider<ApiClient>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ),
  );
  if (AppConfig.useMock) {
    dio.interceptors.add(MockApiInterceptor());
  }
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = ref.read(authProvider).accessToken;
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (e, handler) async {
        if (e.response?.statusCode == 401) {
          ref.read(authProvider.notifier).logout();
        }
        handler.next(e);
      },
    ),
  );
  return ApiClient(dio);
});
