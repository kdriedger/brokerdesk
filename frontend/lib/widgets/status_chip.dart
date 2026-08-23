/// Colored status pill used across list screens.
library;

import 'package:flutter/material.dart';

class StatusChip extends StatelessWidget {
  const StatusChip(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _colors(Theme.of(context).colorScheme, label);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: fg,
              fontWeight: FontWeight.w600,
              shadows: const [Shadow(offset: Offset.zero, blurRadius: 1.5, color: Color(0xDD000000))],
            ),
      ),
    );
  }

  static (Color, Color) _colors(ColorScheme scheme, String label) {
    switch (label.toLowerCase()) {
      case 'active':
      case 'bound':
      case 'paid':
        return (const Color(0xFF1B5E20), Colors.white);
      case 'priced':
      case 'submitted':
      case 'quoted':
        return (scheme.primary, scheme.onPrimary);
      case 'draft':
      case 'prospect':
        return (scheme.surfaceContainerHighest, scheme.onSurface);
      case 'expired':
      case 'lapsed':
      case 'due':
        return (const Color(0xFFE65100), Colors.white);
      case 'cancelled':
        return (scheme.error, scheme.onError);
      default:
        return (scheme.secondaryContainer, scheme.onSecondaryContainer);
    }
  }
}
