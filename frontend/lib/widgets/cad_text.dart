/// CAD money formatting.
library;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

final cadFormat = NumberFormat.currency(locale: 'en_CA', name: 'CAD', symbol: r'$');

String cad(num value) => '${cadFormat.format(value)} CAD';

class CadText extends StatelessWidget {
  const CadText(this.value, {super.key, this.style, this.compact = false});

  final num value;
  final TextStyle? style;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final text = compact ? cadFormat.format(value) : cad(value);
    return Text(text, style: style);
  }
}
