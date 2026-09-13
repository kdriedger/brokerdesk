import assert from "node:assert/strict";
import { test } from "node:test";

const BASE = process.env.BROKERDESK_API ?? "http://127.0.0.1:37001";

const req = async (method, path, { token, body } = {}) => {
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
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
};

test("join → producer → client → carrier/product → quote → price → submit → bind", async () => {
  const stamp = Date.now();
  const email = `maya+${stamp}@northshore.broker`;

  const health = await fetch(`${BASE}/`);
  assert.equal(await health.text(), "OK");

  const joined = await req("POST", "/auth/admin/join", {
    body: {
      organization: {
        legal_name: "North Shore Insurance",
        primary_province: "ON",
        phone: "416-555-0100",
      },
      email,
      password: "correct-horse",
      display_name: "Maya Chen",
    },
  });
  assert.equal(joined.admin.email, email);
  assert.equal(joined.admin.organization.default_currency, "CAD");
  const token = joined.token.access;
  assert.ok(token);

  const me = await req("GET", "/auth/admin/me", { token });
  assert.equal(me.email, email);

  const producer = await req("POST", "/admin/producers", {
    token,
    body: {
      email: `prod+${stamp}@northshore.broker`,
      display_name: "Alex Producer",
      active: true,
    },
  });
  assert.ok(producer.id);

  const client = await req("POST", "/clients", {
    token,
    body: {
      client_type: "individual",
      legal_name: "Jordan Lee",
      first_name: "Jordan",
      last_name: "Lee",
      primary_province: "ON",
      email: `jordan+${stamp}@example.com`,
      phone: "416-555-0199",
      status: "prospect",
    },
  });
  assert.ok(client.id);

  const carrier = await req("POST", "/carriers", {
    token,
    body: {
      name: "Aviva Canada",
      code: `AVI${stamp.toString().slice(-6)}`,
      active: true,
    },
  });
  assert.ok(carrier.id);

  const product = await req("POST", "/products", {
    token,
    body: {
      broker_desk_carrier_id: carrier.id,
      name: "Homeowners HO-3",
      code: `HO3${stamp.toString().slice(-6)}`,
      line_of_business: "home",
      active: true,
    },
  });
  assert.ok(product.id);

  const quote = await req("POST", "/quotes", {
    token,
    body: {
      broker_desk_client_id: client.id,
      notes: "smoke bind",
      lines: [
        {
          broker_desk_product_id: product.id,
          coverage_selections: { dwelling: { code: "DWELL", name: "Dwelling", limit_amount: 500000 } },
          rating_inputs: { limit: 500000 },
          premium_cad: 1200,
          broker_fee_cad: 75,
        },
      ],
    },
  });
  assert.ok(quote.id);
  assert.ok(quote.lines?.length >= 1);
  const lineId = quote.lines[0].id;

  const priced = await req("POST", `/quotes/${quote.id}/price`, {
    token,
    body: {
      lines: [
        {
          broker_desk_quote_line_id: lineId,
          manual_premium_cad: 1200,
          manual_broker_fee_cad: 75,
        },
      ],
    },
  });
  assert.ok(priced.grand_total_cad > 0);

  const submitted = await req("PUT", `/quotes/${quote.id}`, {
    token,
    body: { status: "submitted" },
  });
  assert.equal(submitted.status, "submitted");

  const bound = await req("POST", `/quotes/${quote.id}/bind`, {
    token,
    body: { broker_desk_quote_line_id: lineId },
  });
  assert.equal(bound.quote.status, "bound");
  assert.ok(bound.policy.id);
  assert.equal(bound.policy.status, "active");
  console.log(
    `smoke ok policy=${bound.policy.id} number=${bound.policy.org_policy_number}`,
  );
});
