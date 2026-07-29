import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import {
  beforeBreadcrumb,
  beforeSend,
  scrubString,
  scrubValue,
} from "@/lib/observability/sentry-shared";

/**
 * Permanent replacement for the disposable 65-assertion probe written during the
 * 2026-07-28 logging work.
 *
 * Every case is asserted in BOTH directions. A scrubber that redacts everything
 * passes a one-sided test and destroys the diagnostics the logging exists for,
 * so the "must survive" half matters as much as the "must redact" half — the
 * original probe found a `\bcity\b`-style pattern that silently matched nothing
 * in a camelCase codebase, and only a two-sided test tells those apart.
 */

const CANARY = {
  email: "buyer@example.com",
  phoneIntl: "+639171234567",
  phoneLocal: "09171234567",
  card: "4111111111111111",
  xenditKey: "xnd_development_A1b2C3d4",
  resendKey: "re_A1b2C3d4e5",
  dbUrl: "postgresql://postgres:hunter2@db.abcdefg.supabase.co:6543/postgres",
  street: "12 Mabini Street",
  person: "Nata Dela Cruz",
};

describe("scrubString", () => {
  it("replaces an email address", () => {
    expect(scrubString(`contact ${CANARY.email} today`)).toBe("contact [email] today");
  });

  it("replaces PH mobile numbers in both international and local form", () => {
    expect(scrubString(CANARY.phoneIntl)).toBe("[phone]");
    expect(scrubString(CANARY.phoneLocal)).toBe("[phone]");
    expect(scrubString("+63 917 123 4567")).toBe("[phone]");
  });

  it("replaces card-length digit runs", () => {
    expect(scrubString(CANARY.card)).not.toContain("4111");
  });

  it("leaves a 13-digit epoch timestamp alone", () => {
    // The 14-digit floor exists precisely so Date.now() isn't mistaken for a card.
    const epochMs = String(Date.now());
    expect(epochMs).toHaveLength(13);
    expect(scrubString(`ts=${epochMs}`)).toBe(`ts=${epochMs}`);
  });

  it("replaces Xendit and Resend API keys", () => {
    expect(scrubString(CANARY.xenditKey)).toBe("[xendit-key]");
    expect(scrubString(CANARY.resendKey)).toBe("[resend-key]");
  });

  it("removes the credentials and host from a Postgres connection string", () => {
    const scrubbed = scrubString(`connect failed: ${CANARY.dbUrl}`);
    expect(scrubbed).not.toContain("hunter2");
    expect(scrubbed).not.toContain("supabase.co");
  });

  it("truncates drizzle's `params:` tail, which carries bound values verbatim", () => {
    // postgres-js formats failures as "Failed query: <sql>\nparams: a,b,c" — the
    // real bound values. Key-based redaction can't reach them: they're one flat
    // comma-joined string, so the whole tail goes.
    const message = [
      "Failed query: insert into orders (customer_name, shipping_line1) values ($1, $2)",
      `params: ${CANARY.person},${CANARY.street}`,
    ].join("\n");

    const scrubbed = scrubString(message);

    expect(scrubbed).not.toContain(CANARY.person);
    expect(scrubbed).not.toContain(CANARY.street);
    expect(scrubbed).toContain("params: [redacted]");
    // The SQL above the params is the diagnostic part and must survive.
    expect(scrubbed).toContain("insert into orders");
  });

  it("leaves ordinary diagnostic text untouched", () => {
    const message = "order 3 items totalling 149000 centavos, status=paid";
    expect(scrubString(message)).toBe(message);
  });
});

describe("scrubValue — keys that must be redacted", () => {
  // The camelCase variants are the regression cases: there is no word boundary
  // inside `shippingCity`, so an un-normalized `\bcity\b` matched none of these.
  it.each([
    ["email", "buyer@example.com"],
    ["customerEmail", "buyer@example.com"],
    ["customer_email", "buyer@example.com"],
    ["phone", "09171234567"],
    ["customerPhone", "09171234567"],
    ["name", "Nata Dela Cruz"],
    ["customerName", "Nata Dela Cruz"],
    ["shippingCity", "Quezon City"],
    ["shipping_city", "Quezon City"],
    ["shippingLine1", "12 Mabini Street"],
    ["shippingProvince", "Metro Manila"],
    ["shippingPostalCode", "1100"],
    ["address", "12 Mabini Street"],
    ["x-callback-token", "supersecrettoken"],
    ["authorization", "Bearer abc"],
    ["cookie", "session=abc"],
    ["password", "hunter2"],
    ["apiKey", "xnd_development_A1b2C3d4"],
    ["cardNumber", "4111111111111111"],
    ["ip", "203.0.113.9"],
  ])("redacts %s", (key, value) => {
    expect(scrubValue({ [key]: value })).toEqual({ [key]: "[redacted]" });
  });
});

describe("scrubValue — identifiers that must survive", () => {
  // Over-scrubbing is the failure mode that makes the logs worthless, and it is
  // silent. These are the exact keys the app legitimately logs.
  const survivors = {
    orderId: "550e8400-e29b-41d4-a716-446655440000",
    productId: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    imageId: "c3d4e5f6-a7b8-4c9d-8e0f-2a3b4c5d6e7f",
    discountCodeId: "d4e5f6a7-b8c9-4d0e-9f1a-3b4c5d6e7f80",
    customerId: "cust_123",
    xenditPaymentId: "pay_abc123",
    xenditSessionId: "ps_abc123",
    productName: "Milo the Bear",
    pieceType: "amigurumi",
    slug: "milo-the-bear",
    status: "paid",
    orderStatus: "shipped",
    totalCents: 149000,
    itemCount: 3,
    ms: 42,
    hasHeader: true,
    bodyBytes: 512,
  };

  it("passes every legitimate identifier through unchanged", () => {
    expect(scrubValue(survivors)).toEqual(survivors);
  });

  it("does not mistake a uuid for a card number", () => {
    expect(scrubString(survivors.orderId)).toBe(survivors.orderId);
  });
});

describe("scrubValue — structural safety", () => {
  it("handles a circular reference without recursing forever", () => {
    const node: Record<string, unknown> = { orderId: "abc" };
    node.self = node;
    expect(scrubValue(node)).toEqual({ orderId: "abc", self: "[circular]" });
  });

  it("stops at the depth limit", () => {
    // 8 levels deep — past the limit of 6.
    let deep: unknown = "bottom";
    for (let i = 0; i < 8; i++) deep = { next: deep };
    expect(JSON.stringify(scrubValue(deep))).toContain("[depth-limit]");
  });

  it("caps long arrays", () => {
    const scrubbed = scrubValue(Array.from({ length: 200 }, (_, i) => i)) as unknown[];
    expect(scrubbed).toHaveLength(50);
  });

  it("scrubs values nested inside arrays and objects", () => {
    const scrubbed = scrubValue({
      items: [{ productName: "Milo", note: `mail ${CANARY.email}` }],
    });
    expect(scrubbed).toEqual({
      items: [{ productName: "Milo", note: "mail [email]" }],
    });
  });

  it("normalizes non-JSON values rather than dropping the whole object", () => {
    const at = new Date("2026-07-30T00:00:00.000Z");
    expect(scrubValue({ at, big: BigInt(10), fn: () => {} })).toEqual({
      at: "2026-07-30T00:00:00.000Z",
      big: "10",
      fn: undefined,
    });
  });
});

describe("beforeSend — the Sentry egress filter", () => {
  function makeEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
    return {
      request: {
        url: `https://crochette.example/order?email=${CANARY.email}`,
        method: "POST",
        // Server Action arguments and form bodies land here.
        data: { customerName: CANARY.person, shippingLine1: CANARY.street },
        cookies: { session: "abc" },
        query_string: `email=${CANARY.email}`,
        headers: {
          "x-callback-token": "supersecrettoken",
          "x-forwarded-for": "203.0.113.9",
          cookie: "session=abc",
          "user-agent": "vitest",
        },
      },
      user: { id: "cust_123", email: CANARY.email, ip_address: "203.0.113.9" },
      ...overrides,
    } as ErrorEvent;
  }

  it("drops request data, cookies and the query string entirely", () => {
    const sent = beforeSend(makeEvent());
    expect(sent?.request?.data).toBeUndefined();
    expect(sent?.request?.cookies).toBeUndefined();
    expect(sent?.request?.query_string).toBeUndefined();
  });

  it("redacts sensitive headers but keeps innocuous ones", () => {
    const headers = beforeSend(makeEvent())?.request?.headers ?? {};
    expect(headers["x-callback-token"]).toBe("[redacted]");
    expect(headers["x-forwarded-for"]).toBe("[redacted]");
    expect(headers.cookie).toBe("[redacted]");
    expect(headers["user-agent"]).toBe("vitest");
  });

  it("reduces the user to an id, dropping email and IP", () => {
    expect(beforeSend(makeEvent())?.user).toEqual({ id: "cust_123" });
  });

  it("scrubs the request URL", () => {
    expect(beforeSend(makeEvent())?.request?.url).not.toContain(CANARY.email);
  });

  it("scrubs exception messages and extra context", () => {
    const sent = beforeSend(
      makeEvent({
        exception: { values: [{ type: "Error", value: `Resend send failed: ${CANARY.email}` }] },
        extra: { shippingCity: "Quezon City", orderId: "ord_1" },
      })
    );

    expect(sent?.exception?.values?.[0]?.value).toBe("Resend send failed: [email]");
    expect(sent?.extra).toEqual({ shippingCity: "[redacted]", orderId: "ord_1" });
  });

  it("leaves no canary anywhere in the serialized outgoing event", () => {
    // The 2026-07-28 audit's central lesson: assert against what actually leaves
    // the process, not against what each rule is believed to do.
    const serialized = JSON.stringify(
      beforeSend(
        makeEvent({
          exception: { values: [{ type: "Error", value: `to ${CANARY.email} (${CANARY.phoneLocal})` }] },
          extra: { customerName: CANARY.person, shippingLine1: CANARY.street, card: CANARY.card },
        })
      )
    );

    for (const canary of Object.values(CANARY)) {
      expect(serialized).not.toContain(canary);
    }
  });
});

describe("beforeBreadcrumb", () => {
  // Sentry's consoleIntegration turns every one of our JSON log lines into a
  // breadcrumb, so anything logged is already on its way to Sentry whether or
  // not it was captured deliberately. This is the net under that.
  it("scrubs breadcrumb messages and data", () => {
    const crumb = beforeBreadcrumb({
      message: `sending to ${CANARY.email}`,
      data: { customerEmail: CANARY.email, orderId: "ord_1" },
    });

    expect(crumb?.message).toBe("sending to [email]");
    expect(crumb?.data).toEqual({ customerEmail: "[redacted]", orderId: "ord_1" });
  });
});
