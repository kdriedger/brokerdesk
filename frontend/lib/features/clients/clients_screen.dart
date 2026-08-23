import '../../widgets/module_screen.dart';
import 'package:flutter/material.dart';

class ClientsScreen extends StatelessWidget {
  const ClientsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ModuleScreen(
      title: 'Clients',
      icon: Icons.people_outline,
      description: 'Client CRM: individuals & businesses, contacts, activities,\ntasks, documents, pipeline. Wired to /clients once backend is up.',
    );
  }
}