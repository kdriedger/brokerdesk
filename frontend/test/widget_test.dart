import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:brokerdesk_app/app.dart';

void main() {
  testWidgets('app boots and shows login', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: BrokerDeskApp()));
    await tester.pump();
    expect(find.text('BrokerDesk'), findsWidgets);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
