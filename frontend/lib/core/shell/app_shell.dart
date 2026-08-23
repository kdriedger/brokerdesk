/// Responsive shell: NavigationRail (desktop/tablet) + bottom nav (mobile).
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  static const _destinations = [
    (icon: Icons.dashboard_outlined, selected: Icons.dashboard, label: 'Dashboard'),
    (icon: Icons.people_outline, selected: Icons.people, label: 'Clients'),
    (icon: Icons.request_quote_outlined, selected: Icons.request_quote, label: 'Quotes'),
    (icon: Icons.description_outlined, selected: Icons.description, label: 'Policies'),
    (icon: Icons.apartment_outlined, selected: Icons.apartment, label: 'Carriers'),
    (icon: Icons.bar_chart_outlined, selected: Icons.bar_chart, label: 'Reports'),
  ];

  static const _paths = ['/dashboard', '/clients', '/quotes', '/policies', '/carriers', '/reports'];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final wide = constraints.maxWidth >= 900;
      return Scaffold(
        body: Row(
          children: [
            if (wide)
              NavigationRail(
                selectedIndex: _currentIndex(context),
                onDestinationSelected: (i) => context.go(_paths[i]),
                labelType: NavigationRailLabelType.all,
                leading: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('🦾', style: Theme.of(context).textTheme.headlineSmall),
                ),
                destinations: [
                  for (final d in _destinations)
                    NavigationRailDestination(
                      icon: Icon(d.icon),
                      selectedIcon: Icon(d.selected),
                      label: Text(d.label),
                    ),
                ],
              ),
            Expanded(
              child: Column(
                children: [
                  if (!wide)
                    AppBar(
                      title: const Text('BrokerDesk'),
                      actions: [_logoutAction(context)],
                    ),
                  Expanded(child: child),
                ],
              ),
            ),
          ],
        ),
        bottomNavigationBar: wide
            ? null
            : NavigationBar(
                selectedIndex: _currentIndex(context),
                onDestinationSelected: (i) => context.go(_paths[i]),
                destinations: [
                  for (final d in _destinations)
                    NavigationDestination(
                      icon: Icon(d.icon),
                      selectedIcon: Icon(d.selected),
                      label: d.label,
                    ),
                ],
              ),
      );
    });
  }

  int _currentIndex(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    final i = _paths.indexWhere((p) => path.startsWith(p));
    return i < 0 ? 0 : i;
  }

  Widget _logoutAction(BuildContext context) {
    return IconButton(
      tooltip: 'Log out',
      icon: const Icon(Icons.logout),
      onPressed: () => context.go('/login'),
    );
  }
}