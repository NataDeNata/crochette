import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/resend", () => ({
  sendEmail: vi.fn(),
  EMAIL_FROM: "Crochette <test@example.test>",
}));

const { sendEmail } = await import("@/lib/email/resend");
const {
  notifyOrderPaid,
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyEmailVerification,
  notifyPasswordReset,
  notifyPasswordResetUnavailable,
  notifyPasswordChanged,
} = await import("@/lib/email/notifications");

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

/**
 * The two Stage B links.
 *
 * What is worth pinning is not the prose but the URL: these are the only mails
 * whose body is a credential, and a link that loses its token, points at the
 * wrong path, or mangles the token in transit is a dead link that looks like a
 * live one. The token's own correctness is tested in
 * tests/unit/security/account-token.test.ts.
 */
describe("account link emails", () => {
  const token = "v1.3f2504e0-4f89-41d3-9a0c-0305e82c3301.c2FtQGV4YW1wbGUuY29t.1700000604800.c2ln";

  it("points the verification link at the confirmation page, token intact", async () => {
    await notifyEmailVerification({ email: "sam@example.com", name: "Sam", token });

    const { html } = sentTo("sam@example.com");
    expect(html).toContain(`/account/verify?token=${encodeURIComponent(token)}`);
  });

  it("points the reset link at the reset page, token intact", async () => {
    await notifyPasswordReset({ email: "sam@example.com", name: "Sam", token });

    const { html } = sentTo("sam@example.com");
    expect(html).toContain(`/account/reset-password?token=${encodeURIComponent(token)}`);
  });

  it("greets an account with no name on it without a hole in the sentence", async () => {
    // Google accounts can arrive nameless, and a bare `Hi ,` is the kind of
    // detail that makes a real email look like a phishing attempt.
    await notifyEmailVerification({ email: "sam@example.com", name: null, token });

    const { html } = sentTo("sam@example.com");
    expect(html).toContain("Hello,");
    expect(html).not.toContain("Hi ,");
  });

  it("escapes markup in the name, like every other template here", async () => {
    await notifyPasswordReset({ email: "sam@example.com", name: '<script>alert("xss")</script>', token });

    const { html } = sentTo("sam@example.com");
    expect(html).not.toContain("<script>");
  });

  it("offers a Google-only account a route in rather than a reset link", async () => {
    await notifyPasswordResetUnavailable({ email: "sam@example.com", name: "Sam" });

    const { html } = sentTo("sam@example.com");
    expect(html).not.toContain("/account/reset-password");
    expect(html).toContain("/account/login");
  });

  it("never propagates a send failure to the caller", async () => {
    // Signup calls this after the row is committed; a throw would tell a
    // shopper their account was not created when it was.
    vi.mocked(sendEmail).mockRejectedValue(new Error("Resend send failed: unverified domain"));

    await expect(notifyEmailVerification({ email: "sam@example.com", token })).resolves.toBeUndefined();
    await expect(notifyPasswordReset({ email: "sam@example.com", token })).resolves.toBeUndefined();
  });
});

/**
 * The mail sent *after* a password actually changes.
 *
 * Its whole job is to reach someone who did not ask for it. So the cases worth
 * pinning are: it says when, it says what to do, and it hands over nothing
 * spendable — a "your password changed" mail is a natural phishing shape, and
 * one carrying a live link would be training the reader to click exactly the
 * thing that would hurt them.
 */
describe("password changed notification", () => {
  it("carries no reset link and no token", async () => {
    await notifyPasswordChanged({ email: "sam@example.com", name: "Sam" });

    const { html } = sentTo("sam@example.com");
    expect(html).not.toContain("/account/reset-password");
    expect(html).not.toContain("token=");
  });

  it("names the time and the zone, so the reader can place it", async () => {
    // A bare timestamp in an unknown zone is not evidence anyone can act on.
    // The question this mail has to answer is "was that me, this morning?"
    await notifyPasswordChanged({
      email: "sam@example.com",
      name: "Sam",
      at: new Date("2026-09-21T02:30:00Z"),
    });

    const { html } = sentTo("sam@example.com");
    expect(html).toContain("2026");
    expect(html).toContain("Philippine time");
  });

  it("tells the reader what to do when it was not them", async () => {
    await notifyPasswordChanged({ email: "sam@example.com", name: "Sam" });

    const { html } = sentTo("sam@example.com");
    expect(html).toContain("/contact");
    // A raw apostrophe, not `&#x27;` — `escapeHtml` is applied to the values
    // interpolated into these templates (the name, the timestamp), never to the
    // static prose around them.
    expect(html).toContain("wasn't you");
  });

  it("says the other sessions are gone, because they are", async () => {
    // completePasswordReset advances password_changed_at, which lib/auth-session
    // reads on every authenticated request. The mail should not claim this
    // unless the code does it — and it does.
    await notifyPasswordChanged({ email: "sam@example.com" });

    expect(sentTo("sam@example.com").html).toContain("signed out");
  });

  it("greets a nameless account without a hole in the sentence", async () => {
    await notifyPasswordChanged({ email: "sam@example.com", name: null });

    const { html } = sentTo("sam@example.com");
    expect(html).toContain("Hello,");
    expect(html).not.toContain("Hi ,");
  });

  it("never propagates a send failure to the caller", async () => {
    // Fires after the password is already written. A throw here would report a
    // failure for a change that succeeded, which is the worst possible thing to
    // tell someone about their own password.
    vi.mocked(sendEmail).mockRejectedValue(new Error("Resend send failed"));

    await expect(notifyPasswordChanged({ email: "sam@example.com" })).resolves.toBeUndefined();
  });
});
