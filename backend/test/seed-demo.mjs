const BASE = process.env.BROKERDESK_API ?? "http://127.0.0.1:37001";
const EMAIL = "maya.chen@northshore.broker";
const PASSWORD = "demo";

const iso = (d) => d.toISOString();
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const req = async (method, path, { token, body, allow } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok && !(allow ?? []).includes(res.status)) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 600)}`);
  }
  return { status: res.status, json };
};

const loginOrJoin = async () => {
  const logged = await req("POST", "/auth/admin/login", {
    body: { email: EMAIL, password: PASSWORD },
    allow: [401, 403],
  });
  if (logged.status === 200) return logged.json.token.access;
  const joined = await req("POST", "/auth/admin/join", {
    body: {
      organization: {
        legal_name: "Northshore Insurance Brokers",
        operating_name: "Northshore Insurance Brokers",
        primary_province: "ON",
        phone: "416-555-0100",
        city: "Toronto",
        province: "ON",
      },
      email: EMAIL,
      password: PASSWORD,
      display_name: "Maya Chen",
    },
    allow: [409],
  });
  if (joined.status === 200) return joined.json.token.access;
  const retry = await req("POST", "/auth/admin/login", {
    body: { email: EMAIL, password: PASSWORD },
  });
  return retry.json.token.access;
};

const findCarrier = async (token, code) => {
  const page = await req("PATCH", "/carriers", {
    token,
    body: { search: code, limit: 20 },
  });
  return (page.json.data ?? []).find((c) => c.code === code) ?? null;
};

const ensureCarrier = async (token, body) => {
  const existing = await findCarrier(token, body.code);
  if (existing) return existing;
  const created = await req("POST", "/carriers", { token, body, allow: [409] });
  if (created.status === 200) return created.json;
  return findCarrier(token, body.code);
};

const ensureProduct = async (token, body) => {
  const page = await req("PATCH", "/products", {
    token,
    body: { search: body.code, limit: 20 },
  });
  const existing = (page.json.data ?? []).find((p) => p.code === body.code);
  if (existing) return existing;
  const created = await req("POST", "/products", { token, body, allow: [409] });
  if (created.status === 200) return created.json;
  const retry = await req("PATCH", "/products", {
    token,
    body: { search: body.code, limit: 20 },
  });
  return (retry.json.data ?? []).find((p) => p.code === body.code);
};

const quoteFlow = async (token, { clientId, productId, premium, fee, bind, effective }) => {
  const quote = (
    await req("POST", "/quotes", {
      token,
      body: {
        broker_desk_client_id: clientId,
        desired_effective_date: iso(effective ?? new Date()),
        notes: "Northshore demo book",
        lines: [
          {
            broker_desk_product_id: productId,
            coverage_selections: {
              dwelling: { code: "DWELL", name: "Dwelling", limit_amount: 500000 },
            },
            rating_inputs: { limit: 500000 },
            premium_cad: premium,
            broker_fee_cad: fee,
          },
        ],
      },
    })
  ).json;
  const lineId = quote.lines[0].id;
  await req("POST", `/quotes/${quote.id}/price`, {
    token,
    body: {
      lines: [
        {
          broker_desk_quote_line_id: lineId,
          manual_premium_cad: premium,
          manual_broker_fee_cad: fee,
        },
      ],
    },
  });
  if (!bind) return quote;
  await req("PUT", `/quotes/${quote.id}`, { token, body: { status: "submitted" } });
  return (
    await req("POST", `/quotes/${quote.id}/bind`, {
      token,
      body: { broker_desk_quote_line_id: lineId },
    })
  ).json;
};

const main = async () => {
  const health = await fetch(`${BASE}/`);
  if ((await health.text()) !== "OK") throw new Error("API not healthy");
  const token = await loginOrJoin();
  const book = (await req("GET", "/workspace/clients", { token })).json;
  if ((book.items ?? []).length >= 4) {
    console.log(`seed skip: ${(book.items ?? []).length} clients already present`);
    return;
  }

  const alex = (
    await req("POST", "/admin/producers", {
      token,
      body: {
        email: "alex.rivera@northshore.broker",
        display_name: "Alex Rivera",
        active: true,
      },
      allow: [409],
    })
  ).json;

  const intact = await ensureCarrier(token, {
    name: "Intact Insurance",
    code: "NS-INT",
    financial_strength_note: "A+",
    active: true,
  });
  const wawanesa = await ensureCarrier(token, {
    name: "Wawanesa",
    code: "NS-WAW",
    financial_strength_note: "A",
    active: true,
  });
  const economical = await ensureCarrier(token, {
    name: "Economical",
    code: "NS-ECO",
    financial_strength_note: "A-",
    active: true,
  });
  const aviva = await ensureCarrier(token, {
    name: "Aviva Canada",
    code: "NS-AVI",
    financial_strength_note: "A+",
    active: true,
  });

  const appointedAt = iso(daysFromNow(-200));
  const expiresAt = iso(daysFromNow(400));
  for (const carrier of [intact, wawanesa, economical, aviva]) {
    await req("POST", `/carriers/${carrier.id}/appointments`, {
      token,
      body: {
        broker_desk_carrier_id: carrier.id,
        status: "active",
        appointed_at: appointedAt,
        expires_at: expiresAt,
      },
      allow: [409],
    });
  }

  const ho3 = await ensureProduct(token, {
    broker_desk_carrier_id: intact.id,
    name: "Homeowners HO-3",
    code: "NS-HO3",
    line_of_business: "home",
    active: true,
  });
  const auto = await ensureProduct(token, {
    broker_desk_carrier_id: economical.id,
    name: "Personal Auto",
    code: "NS-PAU",
    line_of_business: "auto",
    active: true,
  });
  const cargo = await ensureProduct(token, {
    broker_desk_carrier_id: wawanesa.id,
    name: "Motor Truck Cargo",
    code: "NS-CARGO",
    line_of_business: "commercial_property",
    active: true,
  });
  const cgl = await ensureProduct(token, {
    broker_desk_carrier_id: intact.id,
    name: "Commercial General Liability",
    code: "NS-CGL",
    line_of_business: "commercial_liability",
    active: true,
  });

  const mkClient = async (body, address) => {
    const listed = await req("PATCH", "/clients", {
      token,
      body: { search: body.email, limit: 20 },
    });
    let client = (listed.json.data ?? []).find((c) => c.email === body.email);
    if (!client) {
      client = (await req("POST", "/clients", { token, body })).json;
    }
    if (alex?.id) {
      await req("PUT", `/clients/${client.id}`, {
        token,
        body: { assigned_producer_id: alex.id },
        allow: [400, 404],
      });
    }
    const addrs = await req("GET", `/clients/${client.id}/addresses`, {
      token,
      allow: [404],
    });
    if (!Array.isArray(addrs.json) || addrs.json.length === 0) {
      await req("POST", `/clients/${client.id}/addresses`, {
        token,
        body: { type: "mailing", ...address },
      });
    }
    return client;
  };

  const patel = await mkClient(
    {
      client_type: "individual",
      legal_name: "Patel Family",
      first_name: "Anika",
      last_name: "Patel",
      primary_province: "ON",
      email: "anika.patel@example.ca",
      phone: "905-555-0142",
      status: "active",
    },
    { line1: "12 King St", city: "Mississauga", province: "ON", postal_code: "L5B 1M2" },
  );
  const harbour = await mkClient(
    {
      client_type: "business",
      legal_name: "Harbourview Logistics Inc.",
      primary_province: "ON",
      email: "risk@harbourview.ca",
      phone: "289-555-0190",
      status: "active",
    },
    { line1: "88 Pier Rd", city: "Hamilton", province: "ON", postal_code: "L8L 1A1" },
  );
  const levesque = await mkClient(
    {
      client_type: "individual",
      legal_name: "Lévesque Résidentiel",
      first_name: "Marie",
      last_name: "Lévesque",
      primary_province: "QC",
      email: "marie.levesque@example.ca",
      phone: "514-555-0166",
      status: "prospect",
    },
    { line1: "441 Rue Saint-Denis", city: "Montréal", province: "QC", postal_code: "H2J 2L1" },
  );
  await mkClient(
    {
      client_type: "business",
      legal_name: "Prairie Grain Co-op",
      primary_province: "SK",
      email: "ops@prairiegrain.coop",
      phone: "306-555-0118",
      status: "prospect",
    },
    { line1: "10 Elevator Ave", city: "Regina", province: "SK", postal_code: "S4P 3C8" },
  );
  const nguyen = await mkClient(
    {
      client_type: "individual",
      legal_name: "Nguyen Household",
      first_name: "Lien",
      last_name: "Nguyen",
      primary_province: "BC",
      email: "lien.nguyen@example.ca",
      phone: "604-555-0177",
      status: "active",
    },
    { line1: "19 Granville St", city: "Vancouver", province: "BC", postal_code: "V6H 3K4" },
  );

  const boundCargo = await quoteFlow(token, {
    clientId: harbour.id,
    productId: cargo.id,
    premium: 24600,
    fee: 450,
    bind: true,
    effective: daysFromNow(-340),
  });
  if (boundCargo.policy?.id) {
    await req("PUT", `/policies/${boundCargo.policy.id}`, {
      token,
      body: { term_end: iso(daysFromNow(23)) },
    });
  }

  await quoteFlow(token, {
    clientId: patel.id,
    productId: ho3.id,
    premium: 1920,
    fee: 75,
    bind: true,
    effective: daysFromNow(-30),
  });

  await quoteFlow(token, {
    clientId: levesque.id,
    productId: ho3.id,
    premium: 2140,
    fee: 80,
    bind: false,
    effective: daysFromNow(14),
  });

  const submitted = await quoteFlow(token, {
    clientId: harbour.id,
    productId: cgl.id,
    premium: 8800,
    fee: 200,
    bind: false,
    effective: daysFromNow(7),
  });
  await req("PUT", `/quotes/${submitted.id}`, {
    token,
    body: { status: "submitted" },
  });

  await quoteFlow(token, {
    clientId: nguyen.id,
    productId: auto.id,
    premium: 1688,
    fee: 50,
    bind: true,
    effective: daysFromNow(-330),
  });

  const dash = (await req("GET", "/workspace/dashboard", { token })).json;
  console.log(
    `seed ok org=${dash.organization} clients=${dash.clients} quotes=${dash.openQuotes} policies=${dash.activePolicies}`,
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
