import '../../widgets/module_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';

/// Dashboard: org summary counts (wire to /dashboard/summary once backend is up).
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final api = ref.watch(apiClientProvider);
    return FutureBuilder(
      future: api.get('/dashboard/summary').then((j) => j).catchError((_) => null),
      builder: (context, snapshot) {
        final summary = snapshot.data as Map<String, dynamic>?;
        return ModuleScreen(
          title: 'Dashboard',
          icon: Icons.dashboard_outlined,
          description: summary == null
              ? 'Backend not reachable yet — AutoBE generation in progress.\nSummary tiles will appear here (clients, quotes, policies, expiries).'
              : 'Summary: $summary',
        );
      },
    );
  }
}