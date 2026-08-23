/// Core configuration.
library;

class AppConfig {
  AppConfig._();

  /// Backend API base URL. Override with --dart-define=API_BASE_URL=...
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String appName = 'BrokerDesk';
}