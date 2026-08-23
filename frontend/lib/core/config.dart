/// Core configuration.
library;

class AppConfig {
  AppConfig._();

  /// Backend API base URL. Override with --dart-define=API_BASE_URL=...
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// Serve in-process fixtures instead of the NestJS API.
  /// Default on while AutoBE generation is incomplete.
  static const bool useMock = bool.fromEnvironment('USE_MOCK', defaultValue: true);

  /// Auto-login and walk every workspace page. Used by the demo recorder.
  static const bool demoTour = bool.fromEnvironment('DEMO_TOUR');

  static const String appName = 'BrokerDesk';
  static const String demoEmail = 'maya.chen@northshore.broker';
  static const String demoPassword = 'demo';
}
