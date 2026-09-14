/// Policy book.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/models.dart';
import '../../widgets/cad_text.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/workspace_scaffold.dart';

final policiesProvider = FutureProvider<List<PolicyRecord>>((ref) async {
  final json = await ref.watch(apiClientProvider).get('/workspace/policies');
  return itemsFrom(json, PolicyRecord.fromJson);
});

class PoliciesScreen extends ConsumerWidget {
  const PoliciesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(policiesProvider);
    return async.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text('$e'))),
      data: (policies) => WorkspaceScaffold(
        title: 'Policies',
        subtitle: '${policies.length} records · bind → term → renew',
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: const [
                  DataColumn(label: Text('Policy #')),
                  DataColumn(label: Text('Client')),
                  DataColumn(label: Text('Carrier')),
                  DataColumn(label: Text('Line')),
                  DataColumn(label: Text('Term')),
                  DataColumn(label: Text('Premium'), numeric: true),
                  DataColumn(label: Text('Status')),
                ],
                rows: [
                  for (final p in policies)
                    DataRow(
                      cells: [
                        DataCell(Text(p.policyNumber, style: const TextStyle(fontWeight: FontWeight.w600))),
                        DataCell(Text(p.client)),
                        DataCell(Text(p.carrier)),
                        DataCell(Text(p.line)),
                        DataCell(Text('${p.termStart} → ${p.termEnd}')),
                        DataCell(CadText(p.premium, compact: true)),
                        DataCell(StatusChip(p.status)),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
