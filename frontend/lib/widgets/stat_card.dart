/// Dashboard metric tile.
library;

import 'package:flutter/material.dart';

class StatCard extends StatelessWidget {
  const StatCard({super.key, required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: scheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    label,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    shadows: const [
                      Shadow(offset: Offset(-1.5, -1.5), color: Color(0x99000000)),
                      Shadow(offset: Offset(1.5, -1.5), color: Color(0x99000000)),
                      Shadow(offset: Offset(-1.5, 1.5), color: Color(0x99000000)),
                      Shadow(offset: Offset(1.5, 1.5), color: Color(0x99000000)),
                    ],
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
