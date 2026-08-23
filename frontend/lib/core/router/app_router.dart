/// GoRouter setup with auth redirect + app shell.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_state.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/login/login_screen.dart';
import '../../features/clients/clients_screen.dart';
import '../../features/quotes/quotes_screen.dart';
import '../../features/policies/policies_screen.dart';
import '../../features/carriers/carriers_screen.dart';
import '../../features/reports/reports_screen.dart';
import '../shell/app_shell.dart';

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(Ref ref) {
    ref.listen<AuthState>(authProvider, (_, _) => notifyListeners());
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefresh(ref);
  ref.onDispose(refresh.dispose);
  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: refresh,
    redirect: (context, state) {
      final authed = ref.read(authProvider).authenticated;
      final onLogin = state.matchedLocation == '/login';
      if (!authed && !onLogin) return '/login';
      if (authed && onLogin) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),
          GoRoute(path: '/clients', builder: (context, state) => const ClientsScreen()),
          GoRoute(path: '/quotes', builder: (context, state) => const QuotesScreen()),
          GoRoute(path: '/policies', builder: (context, state) => const PoliciesScreen()),
          GoRoute(path: '/carriers', builder: (context, state) => const CarriersScreen()),
          GoRoute(path: '/reports', builder: (context, state) => const ReportsScreen()),
        ],
      ),
    ],
  );
});
