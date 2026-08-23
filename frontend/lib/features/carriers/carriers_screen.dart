import '../../widgets/module_screen.dart';
import 'package:flutter/material.dart';

class CarriersScreen extends StatelessWidget {
  const CarriersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ModuleScreen(
      title: 'Carriers',
      icon: Icons.apartment_outlined,
      description: 'Carrier directory, product catalog, eligibility rules,\ncommission schedules & appointments. Wired to /carriers once backend is up.',
    );
  }
}