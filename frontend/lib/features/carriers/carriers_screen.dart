/// Carrier directory.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/models.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/workspace_scaffold.dart';

final carriersProvider = FutureProvider<List<CarrierRecord>>((ref) async {
  final json = await ref.watch(apiClientProvider).get('/workspace/carriers');
  return itemsFrom(json, CarrierRecord.fromJson);
});

class CarriersScreen extends ConsumerWidget {
  const CarriersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(carriersProvider);
    return async.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text('$e'))),
      data: (carriers) => WorkspaceScaffold(
        title: 'Carriers',
        subtitle: '${carriers.length} appointments · AM Best + provincial licensing',
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: const [
                  DataColumn(label: Text('Carrier')),
                  DataColumn(label: Text('Code')),
                  DataColumn(label: Text('AM Best')),
                  DataColumn(label: Text('Lines')),
                  DataColumn(label: Text('Provinces')),
                  DataColumn(label: Text('Products'), numeric: true),
                  DataColumn(label: Text('Appointment')),
                ],
                rows: [
                  for (final c in carriers)
                    DataRow(
                      cells: [
                        DataCell(Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                        DataCell(Text(c.code)),
                        DataCell(StatusChip(c.amBest)),
                        DataCell(Text(c.lines)),
                        DataCell(Text(c.provinces)),
                        DataCell(Text('${c.activeProducts}')),
                        DataCell(Text(c.appointmentExpiry)),
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
