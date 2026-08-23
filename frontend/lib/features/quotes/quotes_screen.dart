import '../../widgets/module_screen.dart';
import 'package:flutter/material.dart';

class QuotesScreen extends StatelessWidget {
  const QuotesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ModuleScreen(
      title: 'Quotes',
      icon: Icons.request_quote_outlined,
      description: 'Comparative quoting across carriers, rating inputs,\nproposals & submissions. Wired to /quotes once backend is up.',
    );
  }
}