/// Comparative quotes list.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/models.dart';
import '../../widgets/cad_text.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/workspace_scaffold.dart';

final quotesProvider = FutureProvider<List<QuoteRecord>>((ref) async {
  final json = await ref.watch(apiClientProvider).get('/quotes');
  return itemsFrom(json, QuoteRecord.fromJson);
});

class QuotesScreen extends ConsumerWidget {
  const QuotesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(quotesProvider);
    return async.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text('$e'))),
      data: (quotes) => WorkspaceScaffold(
        title: 'Quotes',
        subtitle: '${quotes.length} open · comparative rating',
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: const [
                  DataColumn(label: Text('Quote')),
                  DataColumn(label: Text('Client')),
                  DataColumn(label: Text('Product')),
                  DataColumn(label: Text('Carrier')),
                  DataColumn(label: Text('Premium'), numeric: true),
                  DataColumn(label: Text('Status')),
                  DataColumn(label: Text('Effective')),
                ],
                rows: [
                  for (final q in quotes)
                    DataRow(
                      cells: [
                        DataCell(Text(q.number, style: const TextStyle(fontWeight: FontWeight.w600))),
                        DataCell(Text(q.client)),
                        DataCell(Text(q.products)),
                        DataCell(Text(q.carrier)),
                        DataCell(CadText(q.premium, compact: true)),
                        DataCell(StatusChip(q.status)),
                        DataCell(Text(q.effective)),
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
