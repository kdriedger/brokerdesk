import { requireAdmin } from "./auth/admin";
import { MyGlobal } from "../MyGlobal";
import { readProfile } from "./crm/common";

const DAY_MS = 24 * 60 * 60 * 1000;

const ymd = (value: Date | string | null | undefined): string => {
  if (!value) return "—";
  const iso = value instanceof Date ? value.toISOString() : String(value);
  return iso.slice(0, 10);
};

const title = (value: string): string =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);

export const getWorkspaceDashboard = async () => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const now = Date.now();
  const in30 = new Date(now + 30 * DAY_MS);

  const [clients, quotes, policies] = await Promise.all([
    MyGlobal.prisma.broker_desk_clients.count({
      where: { organization_id: orgId, active: true },
    }),
    MyGlobal.prisma.broker_desk_quotes.findMany({
      where: { broker_desk_organization_id: orgId, deleted_at: null },
      include: { client: { include: { tags: true } }, producer: true },
      orderBy: { updated_at: "desc" },
      take: 40,
    }),
    MyGlobal.prisma.broker_desk_policies.findMany({
      where: { organization_id: orgId, deleted_at: null },
      include: { client: { include: { tags: true } } },
      orderBy: { term_end: "asc" },
    }),
  ]);

  const openQuotes = quotes.filter((q) =>
    ["draft", "priced", "submitted"].includes(q.status),
  );
  const activePolicies = policies.filter((p) => p.status === "active");
  const expiries = activePolicies.filter((p) => p.term_end.getTime() <= in30.getTime());
  const pipelinePremium = openQuotes.reduce((sum, q) => sum + q.grand_total_cad, 0);

  const recentActivity = [
    ...quotes.slice(0, 4).map((q) => ({
      when: ymd(q.updated_at),
      who: q.producer.display_name,
      what: `${title(q.status)} quote for ${readProfile(q.client.tags, q.client, "ON").legal_name} — $${q.grand_total_cad.toFixed(0)} CAD`,
    })),
    ...policies.slice(0, 4).map((p) => ({
      when: ymd(p.updated_at),
      who: admin.display_name,
      what: `${title(p.status)} ${p.org_policy_number} for ${readProfile(p.client.tags, p.client, "ON").legal_name}`,
    })),
  ].slice(0, 6);

  return {
    organization:
      admin.organization.operating_name ?? admin.organization.legal_name,
    clients,
    openQuotes: openQuotes.length,
    activePolicies: activePolicies.length,
    expiries30d: expiries.length,
    pipelinePremium,
    recentActivity,
    upcomingRenewals: expiries.slice(0, 8).map((p) => ({
      policyNumber: p.org_policy_number,
      client: readProfile(p.client.tags, p.client, "ON").legal_name,
      expiry: ymd(p.term_end),
      premium: p.billed_premium_cad,
      daysLeft: Math.max(
        0,
        Math.ceil((p.term_end.getTime() - now) / DAY_MS),
      ),
    })),
  };
};

export const getWorkspaceClients = async () => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const orgProvince = admin.organization.primary_province;
  const rows = await MyGlobal.prisma.broker_desk_clients.findMany({
    where: { organization_id: orgId },
    include: {
      tags: true,
      addressOwners: { include: { address: true } },
      quotes: { where: { deleted_at: null }, select: { status: true } },
      policies: { where: { deleted_at: null }, select: { status: true } },
    },
    orderBy: { created_at: "desc" },
  });
  const producers = await MyGlobal.prisma.broker_desk_producers.findMany({
    where: { broker_desk_organization_id: orgId, deleted_at: null },
  });
  const producerById = new Map(producers.map((p) => [p.id, p.display_name]));

  return {
    items: rows.map((row) => {
      const profile = readProfile(row.tags, row, orgProvince);
      const address = row.addressOwners.find((o) => o.address.deleted_at === null)
        ?.address;
      let pipeline = title(profile.status);
      if (row.policies.some((p) => p.status === "active")) pipeline = "Bound";
      else if (row.quotes.some((q) => ["priced", "submitted"].includes(q.status)))
        pipeline = "Quoted";
      else if (row.quotes.length > 0) pipeline = "Quoted";
      return {
        id: row.id,
        name: profile.preferred_name ?? profile.legal_name,
        type: profile.client_type === "business" ? "Business" : "Individual",
        city: address?.city ?? "—",
        province: profile.primary_province,
        status: title(profile.status),
        producer:
          (profile.assigned_producer_id
            ? producerById.get(profile.assigned_producer_id)
            : undefined) ?? admin.display_name,
        email: row.email,
        phone: profile.phone ?? "—",
        pipeline,
      };
    }),
  };
};

export const getWorkspaceQuotes = async () => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const rows = await MyGlobal.prisma.broker_desk_quotes.findMany({
    where: { broker_desk_organization_id: orgId, deleted_at: null },
    include: {
      client: { include: { tags: true } },
      lines: { include: { product: true }, orderBy: { created_at: "asc" } },
    },
    orderBy: { created_at: "desc" },
  });
  return {
    items: rows.map((row) => {
      const accepted =
        row.lines.find((l) => l.accepted) ?? row.lines[0] ?? null;
      return {
        id: row.id,
        number: `Q-${row.id.slice(0, 8).toUpperCase()}`,
        client: readProfile(row.client.tags, row.client, "ON").legal_name,
        products: row.lines.map((l) => l.product.name).join(", ") || "—",
        carrier: accepted?.carrier_name_snapshot ?? "—",
        premium: row.grand_total_cad,
        status: title(row.status),
        effective: ymd(row.desired_effective_date),
      };
    }),
  };
};

export const getWorkspacePolicies = async () => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const rows = await MyGlobal.prisma.broker_desk_policies.findMany({
    where: { organization_id: orgId, deleted_at: null },
    include: {
      client: { include: { tags: true } },
      carrier: true,
      product: true,
    },
    orderBy: { term_end: "asc" },
  });
  return {
    items: rows.map((row) => ({
      id: row.id,
      policyNumber: row.carrier_policy_number ?? row.org_policy_number,
      client: readProfile(row.client.tags, row.client, "ON").legal_name,
      carrier: row.carrier.name,
      line: row.product.line_of_business,
      termStart: ymd(row.term_start),
      termEnd: ymd(row.term_end),
      premium: row.billed_premium_cad,
      status: title(row.status),
    })),
  };
};

export const getWorkspaceCarriers = async () => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const [carriers, appointments] = await Promise.all([
    MyGlobal.prisma.broker_desk_carriers.findMany({
      include: {
        products: { where: { deleted_at: null } },
      },
      orderBy: { name: "asc" },
    }),
    MyGlobal.prisma.broker_desk_carrier_appointments.findMany({
      where: { broker_desk_organization_id: orgId, deleted_at: null },
    }),
  ]);
  const apptByCarrier = new Map(
    appointments.map((a) => [a.broker_desk_carrier_id, a]),
  );
  return {
    items: carriers
      .filter((row) => apptByCarrier.has(row.id))
      .map((row) => {
        const appt = apptByCarrier.get(row.id);
        const lines = [
          ...new Set(row.products.map((p) => p.line_of_business)),
        ].join(", ");
        return {
          id: row.id,
          name: row.name,
          code: row.code,
          amBest: row.financial_strength_note ?? "—",
          lines: lines || "—",
          provinces: admin.organization.primary_province,
          appointmentExpiry: appt?.expires_at ? ymd(appt.expires_at) : "—",
          activeProducts: row.products.filter((p) => p.active).length,
        };
      }),
  };
};

export const getWorkspaceReports = async () => {
  const { admin } = await requireAdmin();
  const orgId = admin.broker_desk_organization_id;
  const now = Date.now();
  const policies = await MyGlobal.prisma.broker_desk_policies.findMany({
    where: { organization_id: orgId, deleted_at: null },
    include: {
      producer: true,
      client: { include: { tags: true } },
      carrier: true,
    },
  });
  const byProducer = new Map<
    string,
    { name: string; premium: number; policies: number }
  >();
  for (const p of policies) {
    const key = p.producer_id;
    const cur = byProducer.get(key) ?? {
      name: p.producer.display_name,
      premium: 0,
      policies: 0,
    };
    cur.premium += p.billed_premium_cad;
    cur.policies += 1;
    byProducer.set(key, cur);
  }
  const commissions = await MyGlobal.prisma.broker_desk_commissions.findMany({
    where: { broker_desk_organization_id: orgId, deleted_at: null },
    include: { carrier: true },
    take: 20,
    orderBy: { created_at: "desc" },
  });
  return {
    productionByProducer: [...byProducer.values()],
    expiries: policies
      .filter((p) => p.status === "active")
      .sort((a, b) => a.term_end.getTime() - b.term_end.getTime())
      .slice(0, 8)
      .map((p) => ({
        policyNumber: p.org_policy_number,
        client: readProfile(p.client.tags, p.client, "ON").legal_name,
        expiry: ymd(p.term_end),
        premium: p.billed_premium_cad,
        daysLeft: Math.max(
          0,
          Math.ceil((p.term_end.getTime() - now) / DAY_MS),
        ),
      })),
    commissionsDue: commissions.map((c) => ({
      carrier: c.carrier.name,
      statement: c.statement_period,
      amount: c.agency_amount_cad,
      status: title(c.status),
    })),
  };
};
