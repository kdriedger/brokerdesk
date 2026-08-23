import '../../widgets/module_screen.dart';
import 'package:flutter/material.dart';

class PoliciesScreen extends StatelessWidget {
  const PoliciesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ModuleScreen(
      title: 'Policies',
      icon: Icons.description_outlined,
      description: 'Policy write-up & lifecycle: bind, endorsements,\nrenewals, cancellations, documents. Wired to /policies once backend is up.',
    );
  }
}