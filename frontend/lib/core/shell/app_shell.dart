/// Responsive shell: NavigationRail (desktop/tablet) + bottom nav (mobile).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_state.dart';
import '../config.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  static bool _tourStarted = false;

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
  void initState() {
    super.initState();
    if (AppConfig.demoTour && !_tourStarted) {
      _tourStarted = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _runTour());
    }
  }

  Future<void> _runTour() async {
    const pages = ['/dashboard', '/clients', '/quotes', '/policies', '/carriers', '/reports'];
    for (final path in pages) {
      if (!mounted) return;
      context.go(path);
      await Future<void>.delayed(const Duration(milliseconds: 2800));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final child = widget.child;
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
                  padding: const EdgeInsets.fromLTRB(8, 16, 8, 8),
                  child: Column(
                    children: [
                      Text('🦾', style: Theme.of(context).textTheme.headlineSmall),
                      const SizedBox(height: 4),
                      Text(
                        AppConfig.appName,
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ],
                  ),
                ),
                trailing: Expanded(
                  child: Align(
                    alignment: Alignment.bottomCenter,
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (user != null) ...[
                            CircleAvatar(
                              radius: 16,
                              child: Text(user.name.isEmpty ? '?' : user.name[0]),
                            ),
                            const SizedBox(height: 6),
                            SizedBox(
                              width: 80,
                              child: Text(
                                user.name,
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.labelSmall,
                              ),
                            ),
                            Text(user.role, style: Theme.of(context).textTheme.labelSmall),
                          ],
                          IconButton(
                            tooltip: 'Log out',
                            icon: const Icon(Icons.logout),
                            onPressed: () => ref.read(authProvider.notifier).logout(),
                          ),
                        ],
                      ),
                    ),
                  ),
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
                      actions: [
                        IconButton(
                          tooltip: 'Log out',
                          icon: const Icon(Icons.logout),
                          onPressed: () => ref.read(authProvider.notifier).logout(),
                        ),
                      ],
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
}
