/// Shared view models for mock + future API payloads.
library;

class DashboardSummary {
  const DashboardSummary({
    required this.organization,
    required this.clients,
    required this.openQuotes,
    required this.activePolicies,
    required this.expiries30d,
    required this.pipelinePremium,
    required this.recentActivity,
    required this.upcomingRenewals,
  });

  final String organization;
  final int clients;
  final int openQuotes;
  final int activePolicies;
  final int expiries30d;
  final double pipelinePremium;
  final List<ActivityItem> recentActivity;
  final List<RenewalItem> upcomingRenewals;

  factory DashboardSummary.fromJson(Map<String, dynamic> json) => DashboardSummary(
        organization: '${json['organization'] ?? ''}',
        clients: json['clients'] as int? ?? 0,
        openQuotes: json['openQuotes'] as int? ?? 0,
        activePolicies: json['activePolicies'] as int? ?? 0,
        expiries30d: json['expiries30d'] as int? ?? 0,
        pipelinePremium: (json['pipelinePremium'] as num?)?.toDouble() ?? 0,
        recentActivity: [
          for (final row in json['recentActivity'] as List? ?? const [])
            ActivityItem.fromJson(Map<String, dynamic>.from(row as Map)),
        ],
        upcomingRenewals: [
          for (final row in json['upcomingRenewals'] as List? ?? const [])
            RenewalItem.fromJson(Map<String, dynamic>.from(row as Map)),
        ],
      );
}

class ActivityItem {
  const ActivityItem({required this.when, required this.who, required this.what});

  final String when;
  final String who;
  final String what;

  factory ActivityItem.fromJson(Map<String, dynamic> json) => ActivityItem(
        when: '${json['when']}',
        who: '${json['who']}',
        what: '${json['what']}',
      );
}

class RenewalItem {
  const RenewalItem({
    required this.policyNumber,
    required this.client,
    required this.expiry,
    required this.premium,
    required this.daysLeft,
  });

  final String policyNumber;
  final String client;
  final String expiry;
  final double premium;
  final int daysLeft;

  factory RenewalItem.fromJson(Map<String, dynamic> json) => RenewalItem(
        policyNumber: '${json['policyNumber']}',
        client: '${json['client']}',
        expiry: '${json['expiry']}',
        premium: (json['premium'] as num).toDouble(),
        daysLeft: json['daysLeft'] as int,
      );
}

class ClientRecord {
  const ClientRecord({
    required this.id,
    required this.name,
    required this.type,
    required this.city,
    required this.province,
    required this.status,
    required this.producer,
    required this.email,
    required this.phone,
    required this.pipeline,
  });

  final String id;
  final String name;
  final String type;
  final String city;
  final String province;
  final String status;
  final String producer;
  final String email;
  final String phone;
  final String pipeline;

  factory ClientRecord.fromJson(Map<String, dynamic> json) => ClientRecord(
        id: '${json['id']}',
        name: '${json['name']}',
        type: '${json['type']}',
        city: '${json['city']}',
        province: '${json['province']}',
        status: '${json['status']}',
        producer: '${json['producer']}',
        email: '${json['email']}',
        phone: '${json['phone']}',
        pipeline: '${json['pipeline']}',
      );
}

class QuoteRecord {
  const QuoteRecord({
    required this.id,
    required this.number,
    required this.client,
    required this.products,
    required this.carrier,
    required this.premium,
    required this.status,
    required this.effective,
  });

  final String id;
  final String number;
  final String client;
  final String products;
  final String carrier;
  final double premium;
  final String status;
  final String effective;

  factory QuoteRecord.fromJson(Map<String, dynamic> json) => QuoteRecord(
        id: '${json['id']}',
        number: '${json['number']}',
        client: '${json['client']}',
        products: '${json['products']}',
        carrier: '${json['carrier']}',
        premium: (json['premium'] as num).toDouble(),
        status: '${json['status']}',
        effective: '${json['effective']}',
      );
}

class PolicyRecord {
  const PolicyRecord({
    required this.id,
    required this.policyNumber,
    required this.client,
    required this.carrier,
    required this.line,
    required this.termStart,
    required this.termEnd,
    required this.premium,
    required this.status,
  });

  final String id;
  final String policyNumber;
  final String client;
  final String carrier;
  final String line;
  final String termStart;
  final String termEnd;
  final double premium;
  final String status;

  factory PolicyRecord.fromJson(Map<String, dynamic> json) => PolicyRecord(
        id: '${json['id']}',
        policyNumber: '${json['policyNumber']}',
        client: '${json['client']}',
        carrier: '${json['carrier']}',
        line: '${json['line']}',
        termStart: '${json['termStart']}',
        termEnd: '${json['termEnd']}',
        premium: (json['premium'] as num).toDouble(),
        status: '${json['status']}',
      );
}

class CarrierRecord {
  const CarrierRecord({
    required this.id,
    required this.name,
    required this.code,
    required this.amBest,
    required this.lines,
    required this.provinces,
    required this.appointmentExpiry,
    required this.activeProducts,
  });

  final String id;
  final String name;
  final String code;
  final String amBest;
  final String lines;
  final String provinces;
  final String appointmentExpiry;
  final int activeProducts;

  factory CarrierRecord.fromJson(Map<String, dynamic> json) => CarrierRecord(
        id: '${json['id']}',
        name: '${json['name']}',
        code: '${json['code']}',
        amBest: '${json['amBest']}',
        lines: '${json['lines']}',
        provinces: '${json['provinces']}',
        appointmentExpiry: '${json['appointmentExpiry']}',
        activeProducts: json['activeProducts'] as int,
      );
}

class ReportOverview {
  const ReportOverview({
    required this.productionByProducer,
    required this.expiries,
    required this.commissionsDue,
  });

  final List<ProducerRow> productionByProducer;
  final List<RenewalItem> expiries;
  final List<CommissionRow> commissionsDue;

  factory ReportOverview.fromJson(Map<String, dynamic> json) => ReportOverview(
        productionByProducer: [
          for (final row in json['productionByProducer'] as List? ?? const [])
            ProducerRow.fromJson(Map<String, dynamic>.from(row as Map)),
        ],
        expiries: [
          for (final row in json['expiries'] as List? ?? const [])
            RenewalItem.fromJson(Map<String, dynamic>.from(row as Map)),
        ],
        commissionsDue: [
          for (final row in json['commissionsDue'] as List? ?? const [])
            CommissionRow.fromJson(Map<String, dynamic>.from(row as Map)),
        ],
      );
}

class ProducerRow {
  const ProducerRow({required this.name, required this.premium, required this.policies});

  final String name;
  final double premium;
  final int policies;

  factory ProducerRow.fromJson(Map<String, dynamic> json) => ProducerRow(
        name: '${json['name']}',
        premium: (json['premium'] as num).toDouble(),
        policies: json['policies'] as int,
      );
}

class CommissionRow {
  const CommissionRow({
    required this.carrier,
    required this.statement,
    required this.amount,
    required this.status,
  });

  final String carrier;
  final String statement;
  final double amount;
  final String status;

  factory CommissionRow.fromJson(Map<String, dynamic> json) => CommissionRow(
        carrier: '${json['carrier']}',
        statement: '${json['statement']}',
        amount: (json['amount'] as num).toDouble(),
        status: '${json['status']}',
      );
}

List<T> itemsFrom<T>(dynamic data, T Function(Map<String, dynamic>) parse) {
  final raw = data is Map ? data['items'] : data;
  return [
    for (final row in raw as List? ?? const []) parse(Map<String, dynamic>.from(row as Map)),
  ];
}
