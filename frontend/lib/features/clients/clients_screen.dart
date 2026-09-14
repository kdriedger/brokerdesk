/// Client CRM list.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/config.dart';
import '../../core/models/models.dart';
import '../../widgets/status_chip.dart';
import '../../widgets/workspace_scaffold.dart';

final clientsProvider = FutureProvider<List<ClientRecord>>((ref) async {
  final json = await ref.watch(apiClientProvider).get('/workspace/clients');
  return itemsFrom(json, ClientRecord.fromJson);
});

class ClientsScreen extends ConsumerStatefulWidget {
  const ClientsScreen({super.key});

  @override
  ConsumerState<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends ConsumerState<ClientsScreen> {
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    if (AppConfig.demoTour) {
      Future<void>.delayed(const Duration(milliseconds: 900), () {
        if (!mounted) return;
        final clients = ref.read(clientsProvider).asData?.value;
        if (clients != null && clients.isNotEmpty) {
          setState(() => _selectedId = clients.first.id);
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(clientsProvider);
    return async.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text('$e'))),
      data: (clients) {
        final selected = clients.where((c) => c.id == _selectedId).firstOrNull;
        return WorkspaceScaffold(
          title: 'Clients',
          subtitle: '${clients.length} in book · CAD brokerage',
          detail: selected == null ? null : _ClientDetail(client: selected),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  showCheckboxColumn: false,
                  columns: const [
                    DataColumn(label: Text('Name')),
                    DataColumn(label: Text('Type')),
                    DataColumn(label: Text('Location')),
                    DataColumn(label: Text('Pipeline')),
                    DataColumn(label: Text('Producer')),
                  ],
                  rows: [
                    for (final c in clients)
                      DataRow(
                        selected: c.id == _selectedId,
                        onSelectChanged: (_) => setState(() => _selectedId = c.id),
                        cells: [
                          DataCell(Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                          DataCell(Text(c.type)),
                          DataCell(Text('${c.city}, ${c.province}')),
                          DataCell(StatusChip(c.pipeline)),
                          DataCell(Text(c.producer)),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ClientDetail extends StatelessWidget {
  const _ClientDetail({required this.client});

  final ClientRecord client;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(client.name, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            StatusChip(client.status),
            StatusChip(client.type),
            StatusChip(client.pipeline),
          ],
        ),
        const SizedBox(height: 16),
        _kv('Location', '${client.city}, ${client.province}'),
        _kv('Producer', client.producer),
        _kv('Email', client.email),
        _kv('Phone', client.phone),
      ],
    );
  }

  Widget _kv(String k, String v) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(k, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
            Text(v),
          ],
        ),
      );
}
