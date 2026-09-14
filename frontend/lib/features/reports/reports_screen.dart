/// Production, expiry, and commission reports.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/models.dart';
import '../../widgets/cad_text.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/workspace_scaffold.dart';

final reportsProvider = FutureProvider<ReportOverview>((ref) async {
  final json = await ref.watch(apiClientProvider).get('/workspace/reports');
  return ReportOverview.fromJson(Map<String, dynamic>.from(json as Map));
});

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(reportsProvider);
    return async.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text('$e'))),
      data: (report) {
        final maxPremium = report.productionByProducer.fold<double>(
          1,
          (m, r) => r.premium > m ? r.premium : m,
        );
        return WorkspaceScaffold(
          title: 'Reports',
          subtitle: 'Production · expiries · commissions (CAD)',
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text('Production by producer', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              for (final row in report.productionByProducer) ...[
                Row(
                  children: [
                    SizedBox(width: 120, child: Text(row.name)),
                    Expanded(
                      child: LinearProgressIndicator(
                        value: row.premium / maxPremium,
                        minHeight: 10,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const SizedBox(width: 12),
                    CadText(row.premium, compact: true),
                    const SizedBox(width: 8),
                    Text('${row.policies} pol.', style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 16),
              Text('Expiry list', style: Theme.of(context).textTheme.titleMedium),
              DataTable(
                columns: const [
                  DataColumn(label: Text('Policy')),
                  DataColumn(label: Text('Client')),
                  DataColumn(label: Text('Expiry')),
                  DataColumn(label: Text('Premium'), numeric: true),
                  DataColumn(label: Text('Days')),
                ],
                rows: [
                  for (final e in report.expiries)
                    DataRow(
                      cells: [
                        DataCell(Text(e.policyNumber)),
                        DataCell(Text(e.client)),
                        DataCell(Text(e.expiry)),
                        DataCell(CadText(e.premium, compact: true)),
                        DataCell(StatusChip('${e.daysLeft}d')),
                      ],
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Text('Commissions', style: Theme.of(context).textTheme.titleMedium),
              DataTable(
                columns: const [
                  DataColumn(label: Text('Carrier')),
                  DataColumn(label: Text('Statement')),
                  DataColumn(label: Text('Amount'), numeric: true),
                  DataColumn(label: Text('Status')),
                ],
                rows: [
                  for (final c in report.commissionsDue)
                    DataRow(
                      cells: [
                        DataCell(Text(c.carrier)),
                        DataCell(Text(c.statement)),
                        DataCell(CadText(c.amount, compact: true)),
                        DataCell(StatusChip(c.status)),
                      ],
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
