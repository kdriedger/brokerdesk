/// In-process mock of the AutoBE NestJS API. Canada-first seed data.
library;

import 'package:dio/dio.dart';

/// Intercepts HTTP and serves fixture JSON so the Flutter shell can be demoed
/// while AutoBE generation is still in progress.
class MockApiInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    try {
      final data = MockApi.handle(options.method, options.path, options.data);
      handler.resolve(
        Response<dynamic>(
          requestOptions: options,
          data: data,
          statusCode: 200,
        ),
      );
    } on _MockHttpException catch (e) {
      handler.reject(
        DioException(
          requestOptions: options,
          response: Response<dynamic>(
            requestOptions: options,
            statusCode: e.status,
            data: {'message': e.message},
          ),
          type: DioExceptionType.badResponse,
          message: e.message,
        ),
      );
    }
  }
}

class _MockHttpException implements Exception {
  const _MockHttpException(this.status, this.message);
  final int status;
  final String message;
}

class MockApi {
  MockApi._();

  static dynamic handle(String method, String path, Object? body) {
    final normalized = path.startsWith('http') ? Uri.parse(path).path : path;
    final key = '${method.toUpperCase()} $normalized';
    switch (key) {
      case 'POST /auth/login':
        return _login(body);
      case 'GET /dashboard/summary':
        return _dashboard;
      case 'GET /clients':
        return {'items': _clients};
      case 'GET /quotes':
        return {'items': _quotes};
      case 'GET /policies':
        return {'items': _policies};
      case 'GET /carriers':
        return {'items': _carriers};
      case 'GET /reports/overview':
        return _reports;
      default:
        throw _MockHttpException(404, 'No mock for $key');
    }
  }

  static Map<String, dynamic> _login(Object? body) {
    final map = body is Map ? Map<String, dynamic>.from(body) : <String, dynamic>{};
    final email = '${map['email'] ?? ''}'.trim();
    final password = '${map['password'] ?? ''}';
    if (!email.contains('@') || password != 'demo') {
      throw const _MockHttpException(401, 'Invalid email or password');
    }
    return {
      'accessToken': 'mock.northshore.jwt',
      'user': {
        'id': 'u-maya',
        'email': email,
        'displayName': 'Maya Chen',
        'role': 'PRODUCER',
      },
    };
  }

  static const _dashboard = {
    'organization': 'Northshore Insurance Brokers',
    'clients': 48,
    'openQuotes': 7,
    'activePolicies': 126,
    'expiries30d': 9,
    'pipelinePremium': 184250,
    'recentActivity': [
      {
        'when': 'Today 09:14',
        'who': 'Maya Chen',
        'what': 'Priced home+auto package for Patel Family — \$2,840 CAD',
      },
      {
        'when': 'Today 08:41',
        'who': 'Alex Rivera',
        'what': 'Submitted Harbourview CGL to Intact (ref INT-S-44119)',
      },
      {
        'when': 'Yesterday',
        'who': 'Maya Chen',
        'what': 'Bound Wawanesa cargo for Harbourview Logistics',
      },
      {
        'when': 'Yesterday',
        'who': 'Priya Nair',
        'what': 'Added Lévesque Résidentiel (QC) as quoted prospect',
      },
    ],
    'upcomingRenewals': [
      {
        'policyNumber': 'WAW-CM-22910',
        'client': 'Harbourview Logistics Inc.',
        'expiry': '2026-09-15',
        'premium': 24600,
        'daysLeft': 23,
      },
      {
        'policyNumber': 'INT-HO-104882',
        'client': 'Patel Family',
        'expiry': '2027-03-01',
        'premium': 1920,
        'daysLeft': 190,
      },
      {
        'policyNumber': 'ECO-AU-55201',
        'client': 'Nguyen Household',
        'expiry': '2026-09-28',
        'premium': 1688,
        'daysLeft': 36,
      },
    ],
  };

  static const _clients = [
    {
      'id': 'c1',
      'name': 'Patel Family',
      'type': 'Individual',
      'city': 'Mississauga',
      'province': 'ON',
      'status': 'Active',
      'producer': 'Maya Chen',
      'email': 'anika.patel@example.ca',
      'phone': '905-555-0142',
      'pipeline': 'Bound',
    },
    {
      'id': 'c2',
      'name': 'Harbourview Logistics Inc.',
      'type': 'Business',
      'city': 'Hamilton',
      'province': 'ON',
      'status': 'Active',
      'producer': 'Alex Rivera',
      'email': 'risk@harbourview.ca',
      'phone': '289-555-0190',
      'pipeline': 'Quoted',
    },
    {
      'id': 'c3',
      'name': 'Lévesque Résidentiel',
      'type': 'Individual',
      'city': 'Montréal',
      'province': 'QC',
      'status': 'Quoted',
      'producer': 'Priya Nair',
      'email': 'marie.levesque@example.ca',
      'phone': '514-555-0166',
      'pipeline': 'Quoted',
    },
    {
      'id': 'c4',
      'name': 'Prairie Grain Co-op',
      'type': 'Business',
      'city': 'Regina',
      'province': 'SK',
      'status': 'Prospect',
      'producer': 'Maya Chen',
      'email': 'ops@prairiegrain.coop',
      'phone': '306-555-0118',
      'pipeline': 'Prospect',
    },
    {
      'id': 'c5',
      'name': 'Nguyen Household',
      'type': 'Individual',
      'city': 'Vancouver',
      'province': 'BC',
      'status': 'Active',
      'producer': 'Alex Rivera',
      'email': 'lien.nguyen@example.ca',
      'phone': '604-555-0177',
      'pipeline': 'Bound',
    },
    {
      'id': 'c6',
      'name': 'Cedars Clinic',
      'type': 'Business',
      'city': 'Ottawa',
      'province': 'ON',
      'status': 'Active',
      'producer': 'Priya Nair',
      'email': 'admin@cedarsclinic.ca',
      'phone': '613-555-0133',
      'pipeline': 'Active',
    },
  ];

  static const _quotes = [
    {
      'id': 'q1',
      'number': 'Q-2026-1184',
      'client': 'Patel Family',
      'products': 'Home + Auto package',
      'carrier': 'Intact / Aviva',
      'premium': 2840,
      'status': 'Priced',
      'effective': '2026-09-01',
    },
    {
      'id': 'q2',
      'number': 'Q-2026-1191',
      'client': 'Harbourview Logistics Inc.',
      'products': 'CGL + Cargo',
      'carrier': 'Intact',
      'premium': 18200,
      'status': 'Submitted',
      'effective': '2026-09-15',
    },
    {
      'id': 'q3',
      'number': 'Q-2026-1202',
      'client': 'Lévesque Résidentiel',
      'products': 'Habitation',
      'carrier': 'Aviva',
      'premium': 1156,
      'status': 'Draft',
      'effective': '2026-10-01',
    },
    {
      'id': 'q4',
      'number': 'Q-2026-1208',
      'client': 'Prairie Grain Co-op',
      'products': 'Farm + Liability',
      'carrier': 'Wawanesa',
      'premium': 42150,
      'status': 'Draft',
      'effective': '2026-11-01',
    },
    {
      'id': 'q5',
      'number': 'Q-2026-1170',
      'client': 'Cedars Clinic',
      'products': 'Professional liability',
      'carrier': 'Travelers Canada',
      'premium': 9800,
      'status': 'Priced',
      'effective': '2026-09-20',
    },
  ];

  static const _policies = [
    {
      'id': 'p1',
      'policyNumber': 'INT-HO-104882',
      'client': 'Patel Family',
      'carrier': 'Intact Insurance',
      'line': 'Home',
      'termStart': '2026-03-01',
      'termEnd': '2027-03-01',
      'premium': 1920,
      'status': 'Active',
    },
    {
      'id': 'p2',
      'policyNumber': 'AVI-AU-883201',
      'client': 'Patel Family',
      'carrier': 'Aviva Canada',
      'line': 'Auto',
      'termStart': '2026-03-01',
      'termEnd': '2027-03-01',
      'premium': 1104,
      'status': 'Active',
    },
    {
      'id': 'p3',
      'policyNumber': 'WAW-CM-22910',
      'client': 'Harbourview Logistics Inc.',
      'carrier': 'Wawanesa',
      'line': 'Cargo',
      'termStart': '2025-09-15',
      'termEnd': '2026-09-15',
      'premium': 24600,
      'status': 'Active',
    },
    {
      'id': 'p4',
      'policyNumber': 'ECO-AU-55201',
      'client': 'Nguyen Household',
      'carrier': 'Economical',
      'line': 'Auto',
      'termStart': '2025-09-28',
      'termEnd': '2026-09-28',
      'premium': 1688,
      'status': 'Active',
    },
    {
      'id': 'p5',
      'policyNumber': 'TRV-PL-10044',
      'client': 'Cedars Clinic',
      'carrier': 'Travelers Canada',
      'line': 'Professional',
      'termStart': '2026-01-01',
      'termEnd': '2027-01-01',
      'premium': 12400,
      'status': 'Active',
    },
    {
      'id': 'p6',
      'policyNumber': 'INT-GL-77412',
      'client': 'Harbourview Logistics Inc.',
      'carrier': 'Intact Insurance',
      'line': 'CGL',
      'termStart': '2025-06-01',
      'termEnd': '2026-06-01',
      'premium': 18880,
      'status': 'Expired',
    },
  ];

  static const _carriers = [
    {
      'id': 'k1',
      'name': 'Intact Insurance',
      'code': 'INT',
      'amBest': 'A+',
      'lines': 'Home, Auto, CGL, Commercial',
      'provinces': 'ON, QC, BC, AB',
      'appointmentExpiry': '2027-04-30',
      'activeProducts': 18,
    },
    {
      'id': 'k2',
      'name': 'Aviva Canada',
      'code': 'AVI',
      'amBest': 'A',
      'lines': 'Home, Auto, Habitation',
      'provinces': 'ON, QC, BC',
      'appointmentExpiry': '2026-12-31',
      'activeProducts': 11,
    },
    {
      'id': 'k3',
      'name': 'Economical',
      'code': 'ECO',
      'amBest': 'A−',
      'lines': 'Auto, Home',
      'provinces': 'ON, AB',
      'appointmentExpiry': '2027-01-15',
      'activeProducts': 7,
    },
    {
      'id': 'k4',
      'name': 'Wawanesa',
      'code': 'WAW',
      'amBest': 'A',
      'lines': 'Farm, Cargo, Personal',
      'provinces': 'MB, SK, ON',
      'appointmentExpiry': '2026-11-01',
      'activeProducts': 9,
    },
    {
      'id': 'k5',
      'name': 'Travelers Canada',
      'code': 'TRV',
      'amBest': 'A++',
      'lines': 'Professional, CGL',
      'provinces': 'ON, QC, BC',
      'appointmentExpiry': '2028-03-01',
      'activeProducts': 6,
    },
  ];

  static const _reports = {
    'productionByProducer': [
      {'name': 'Maya Chen', 'premium': 86240, 'policies': 41},
      {'name': 'Alex Rivera', 'premium': 71410, 'policies': 33},
      {'name': 'Priya Nair', 'premium': 39880, 'policies': 22},
    ],
    'expiries': [
      {
        'policyNumber': 'WAW-CM-22910',
        'client': 'Harbourview Logistics Inc.',
        'expiry': '2026-09-15',
        'premium': 24600,
        'daysLeft': 23,
      },
      {
        'policyNumber': 'ECO-AU-55201',
        'client': 'Nguyen Household',
        'expiry': '2026-09-28',
        'premium': 1688,
        'daysLeft': 36,
      },
      {
        'policyNumber': 'INT-HO-104882',
        'client': 'Patel Family',
        'expiry': '2027-03-01',
        'premium': 1920,
        'daysLeft': 190,
      },
    ],
    'commissionsDue': [
      {'carrier': 'Intact Insurance', 'statement': 'Aug 2026', 'amount': 12440, 'status': 'Due'},
      {'carrier': 'Aviva Canada', 'statement': 'Aug 2026', 'amount': 3180, 'status': 'Due'},
      {'carrier': 'Wawanesa', 'statement': 'Jul 2026', 'amount': 4920, 'status': 'Paid'},
    ],
  };
}
