import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/resend", () => ({
  sendEmail: vi.fn(),
  EMAIL_FROM: "Crochette <test@example.test>",
}));

const { sendEmail } = await import("@/lib/email/resend");
const { notifyOrderPaid, notifyOrderShipped, notifyOrderDelivered } = await import(
  "@/lib/email/notifications"
);

/**
 * `escapeHtml` and `detailList` are module-private, so they are exercised
 * through their callers — which is the honest boundary anyway: what matters is
 * the HTML that would actually be sent.
 */

const ORDER = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  customerName: "Nata",
  customerEmail: "buyer@example.com",
  shippingLine1: "12 Mabini Street",
  shippingLine2: null,
  shippingCity: "Quezon City",
  shippingProvince: "Metro Manila",
  shippingPostalCode: "1100",
  subtotalCents: 120000,
  shippingCents: 10000,
  discountCents: 0,
  totalCents: 130000,
  trackingNumber: null,
  carrier: null,
};

const ITEMS = [{ productName: "Milo the Bear", unitPriceCents: 120000, quantity: 1 }];

/** All emails sent during a call, in send order. */
function sent() {
  return vi.mocked(sendEmail).mock.calls.map(([params]) => params);
}

function sentTo(address: string) {
  const match = sent().find((params) => params.to === address);
  if (!match) throw new Error(`no email was sent to ${address}`);
  return match;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sendEmail).mockResolvedValue(undefined);
});

describe("HTML escaping", () => {
  it("escapes markup in a customer-supplied name", async () => {
    await notifyOrderShipped({ ...ORDER, customerName: '<script>alert("xss")</script>' });

    const { html } = sentTo(ORDER.customerEmail);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;xss&quot;");
  });

  it("escapes markup in a product name on the receipt", async () => {
    await notifyOrderPaid(ORDER, [{ ...ITEMS[0], productName: "Bear <b>&</b> Basket" }]);

    const { html } = sentTo(ORDER.customerEmail);
    expect(html).toContain("Bear &lt;b&gt;&amp;&lt;/b&gt; Basket");
  });

  it("escapes markup in free-text tracking fields", async () => {
    await notifyOrderShipped({ ...ORDER, carrier: "J&T", trackingNumber: "<b>123</b>" });

    const { html } = sentTo(ORDER.customerEmail);
    expect(html).toContain("J&amp;T");
    expect(html).not.toContain("<b>123</b>");
  });
});

describe("notifyOrderShipped", () => {
  it("omits carrier and tracking lines entirely when neither was recorded", async () => {
    await notifyOrderShipped(ORDER);

    const { html } = sentTo(ORDER.customerEmail);
    expect(html).not.toContain("Carrier");
    expect(html).not.toContain("Tracking number");
    expect(html).not.toContain("null");
  });

  it("includes each tracking field that is present, and only those", async () => {
    await notifyOrderShipped({ ...ORDER, carrier: "LBC", trackingNumber: null });

    const { html } = sentTo(ORDER.customerEmail);
    expect(html).toContain("Carrier: LBC");
    expect(html).not.toContain("Tracking number");
  });

  it("emails only the customer — the studio just performed this action itself", async () => {
    await notifyOrderShipped({ ...ORDER, carrier: "LBC", trackingNumber: "ABC123" });

    expect(sent()).toHaveLength(1);
    expect(sent()[0].to).toBe(ORDER.customerEmail);
    expect(sent()[0].html).toContain(`/order/${ORDER.id}`);
  });
});

describe("notifyOrderDelivered", () => {
  it("emails only the customer", async () => {
    await notifyOrderDelivered(ORDER);

    expect(sent()).toHaveLength(1);
    expect(sent()[0].to).toBe(ORDER.customerEmail);
  });
});

describe("notifyOrderPaid", () => {
  it("sends a receipt to the customer and a notification to the studio", async () => {
    await notifyOrderPaid(ORDER, ITEMS);

    expect(sent()).toHaveLength(2);
    expect(sent().map((params) => params.to)).toEqual(
      expect.arrayContaining([ORDER.customerEmail, "studio@crochette.test"])
    );
  });

  it("renders peso amounts, not raw centavos", async () => {
    await notifyOrderPaid(ORDER, ITEMS);

    const receipt = sentTo(ORDER.customerEmail).html;
    expect(receipt).toContain("₱1,300");
    expect(receipt).not.toContain("130000");
  });

  it("omits the discount line when no code was used", async () => {
    await notifyOrderPaid(ORDER, ITEMS);
    expect(sentTo(ORDER.customerEmail).html).not.toContain("Discount");
  });

  it("shows the discount as a negative amount when one was applied", async () => {
    await notifyOrderPaid({ ...ORDER, discountCents: 20000, totalCents: 110000 }, ITEMS);
    expect(sentTo(ORDER.customerEmail).html).toContain("Discount: -₱200");
  });

  it("joins the shipping address, skipping the absent second line", async () => {
    await notifyOrderPaid(ORDER, ITEMS);
    expect(sentTo(ORDER.customerEmail).html).toContain(
      "12 Mabini Street, Quezon City, Metro Manila, 1100"
    );
  });

  it("links the studio copy to the admin order page", async () => {
    await notifyOrderPaid(ORDER, ITEMS);
    expect(sentTo("studio@crochette.test").html).toContain(`/admin/orders/${ORDER.id}`);
  });
});

describe("delivery failures", () => {
  it("never propagates a send failure to the caller", async () => {
    // Every notification fires after a database write has already committed, so
    // a throw here would surface an error for work that actually succeeded.
    vi.mocked(sendEmail).mockRejectedValue(new Error("Resend send failed: unverified domain"));

    await expect(notifyOrderPaid(ORDER, ITEMS)).resolves.toBeUndefined();
    await expect(notifyOrderShipped(ORDER)).resolves.toBeUndefined();
  });

  it("still attempts the studio copy when the customer copy fails", async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("bounced")).mockResolvedValue(undefined);

    await notifyOrderPaid(ORDER, ITEMS);

    expect(sent()).toHaveLength(2);
  });
});
