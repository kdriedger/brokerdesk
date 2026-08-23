import '../../widgets/module_screen.dart';
import 'package:flutter/material.dart';

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ModuleScreen(
      title: 'Reports',
      icon: Icons.bar_chart_outlined,
      description: 'Expiry lists, production by producer, commission\nstatements, book of business. Wired to /reports once backend is up.',
    );
  }
}