/// Shared list + optional detail pane used by CRM/quote/policy screens.
library;

import 'package:flutter/material.dart';

class WorkspaceScaffold extends StatelessWidget {
  const WorkspaceScaffold({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.actions = const [],
    this.detail,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final Widget child;
  final Widget? detail;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title),
            if (subtitle != null)
              Text(
                subtitle!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
          ],
        ),
        actions: actions,
      ),
      body: Row(
        children: [
          Expanded(flex: 3, child: child),
          if (detail != null) ...[
            const VerticalDivider(width: 1),
            Expanded(flex: 2, child: detail!),
          ],
        ],
      ),
    );
  }
}
