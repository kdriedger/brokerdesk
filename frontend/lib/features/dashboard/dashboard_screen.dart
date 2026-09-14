/// Dashboard: org summary, activity, upcoming renewals.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/models.dart';
import '../../widgets/cad_text.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/status_chip.dart';

final dashboardProvider = FutureProvider<DashboardSummary>((ref) async {
  final json = await ref.watch(apiClientProvider).get('/workspace/dashboard');
  return DashboardSummary.fromJson(Map<String, dynamic>.from(json as Map));
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dashboardProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (summary) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              summary.organization,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                final cols = constraints.maxWidth >= 1100
                    ? 4
                    : constraints.maxWidth >= 700
                        ? 2
                        : 1;
                return GridView.count(
                  crossAxisCount: cols,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 2.4,
                  children: [
                    StatCard(label: 'Clients', value: '${summary.clients}', icon: Icons.people_outline),
                    StatCard(label: 'Open quotes', value: '${summary.openQuotes}', icon: Icons.request_quote_outlined),
                    StatCard(label: 'Active policies', value: '${summary.activePolicies}', icon: Icons.description_outlined),
                    StatCard(label: 'Expiries (30d)', value: '${summary.expiries30d}', icon: Icons.event_outlined),
                  ],
                );
              },
            ),
            const SizedBox(height: 12),
            StatCard(
              label: 'Open pipeline premium',
              value: cad(summary.pipelinePremium),
              icon: Icons.trending_up,
            ),
            const SizedBox(height: 20),
            LayoutBuilder(
              builder: (context, constraints) {
                final stacked = constraints.maxWidth < 980;
                final activity = _Panel(
                  title: 'Recent activity',
                  child: Column(
                    children: [
                      for (final item in summary.recentActivity)
                        ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(item.what),
                          subtitle: Text('${item.who} · ${item.when}'),
                        ),
                    ],
                  ),
                );
                final renewals = _Panel(
                  title: 'Upcoming renewals',
                  child: Column(
                    children: [
                      for (final item in summary.upcomingRenewals)
                        ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(item.client),
                          subtitle: Text('${item.policyNumber} · ${item.expiry}'),
                          trailing: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              CadText(item.premium, compact: true),
                              StatusChip('${item.daysLeft}d'),
                            ],
                          ),
                        ),
                    ],
                  ),
                );
                if (stacked) {
                  return Column(children: [activity, const SizedBox(height: 12), renewals]);
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: activity),
                    const SizedBox(width: 12),
                    Expanded(child: renewals),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            child,
          ],
        ),
      ),
    );
  }
}
