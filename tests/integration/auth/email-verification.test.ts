import { describe, expect, it } from "vitest";
import { findCustomerById, lookupOrCreateGoogleCustomer, markEmailVerified } from "@/lib/db/accounts";
import { redeemVerificationToken } from "@/lib/account/verification";
import { mintEmailVerificationToken, mintPasswordResetToken } from "@/lib/security/account-token";
import { makeCustomer, makeOrder, readOrder } from "../helpers/factories";

/**
 * Proving a customer's email address, end to end from the link.
 *
 * The stamp is not the point — what it gates is. `claimGuestOrders` matches on
 * email, so until an address is proven a password account's past guest orders
 * stay unreachable on purpose: attaching them on an unproven address would hand
 * whoever signed up with someone else's email that person's name, phone number
 * and full shipping address. So the tests that matter here are the ones about
 * what a bad link must *not* achieve.
 */
describe("email verification", () => {
  describe("markEmailVerified", () => {
    it("stamps an address that still belongs to the account", async () => {
      const customer = await makeCustomer({ email: "sam@example.test" });

      expect(await markEmailVerified(customer.id, "sam@example.test")).toBe(true);
      expect((await findCustomerById(customer.id))?.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it("refuses a token minted for an address the account no longer uses", async () => {
      // Why the token binds the address at all. Without this check a link
      // mailed to an old address would stamp whatever address the row carries
      // today — proving a new address with a click on an inbox the shopper may
      // no longer control.
      const customer = await makeCustomer({ email: "new@example.test" });

      expect(await markEmailVerified(customer.id, "old@example.test")).toBe(false);
      expect((await findCustomerById(customer.id))?.emailVerifiedAt).toBeNull();
    });

    it("is idempotent and keeps the first stamp", async () => {
      // A second click on the same link is the ordinary case, not an attack —
      // and the recorded time should stay the time the address was first
      // proven, since the column exists to answer *when*.
      const customer = await makeCustomer({ email: "sam@example.test" });
      await markEmailVerified(customer.id, "sam@example.test");
      const first = (await findCustomerById(customer.id))?.emailVerifiedAt;

      expect(await markEmailVerified(customer.id, "sam@example.test")).toBe(true);
      expect((await findCustomerById(customer.id))?.emailVerifiedAt).toEqual(first);
    });

    it("matches the stored address case-insensitively", async () => {
      const customer = await makeCustomer({ email: "sam@example.test" });
      expect(await markEmailVerified(customer.id, "SAM@Example.Test")).toBe(true);
    });

    it("refuses an account that no longer exists", async () => {
      expect(await markEmailVerified("00000000-0000-0000-0000-000000000000", "sam@example.test")).toBe(false);
    });
  });

  describe("redeemVerificationToken", () => {
    it("verifies the account and claims its guest orders in one click", async () => {
      // The whole reason the feature is worth shipping: the shopper lands on a
      // page that already has their order history on it.
      const customer = await makeCustomer({ email: "sam@example.test" });
      const order = await makeOrder({ customerEmail: "sam@example.test", customerId: null });

      const outcome = await redeemVerificationToken(mintEmailVerificationToken(customer.id, customer.email));

      expect(outcome).toBe("verified");
      expect((await findCustomerById(customer.id))?.emailVerifiedAt).toBeInstanceOf(Date);
      expect((await readOrder(order.id)).customerId).toBe(customer.id);
    });

    it("leaves the orders alone when the link is not honoured", async () => {
      // The load-bearing negative: the claim must be downstream of the stamp,
      // never beside it. A version that claimed first and verified second would
      // pass every test above and still leak.
      const customer = await makeCustomer({ email: "new@example.test" });
      const order = await makeOrder({ customerEmail: "new@example.test", customerId: null });

      const stale = mintEmailVerificationToken(customer.id, "old@example.test");

      expect(await redeemVerificationToken(stale)).toBe("invalid");
      expect((await readOrder(order.id)).customerId).toBeNull();
    });

    it("refuses a password reset link presented as a verification link", async () => {
      const customer = await makeCustomer({ email: "sam@example.test" });
      const reset = mintPasswordResetToken(customer.id, null);

      expect(await redeemVerificationToken(reset)).toBe("invalid");
      expect((await findCustomerById(customer.id))?.emailVerifiedAt).toBeNull();
    });

    it("refuses an absent or forged token without touching the account", async () => {
      const customer = await makeCustomer({ email: "sam@example.test" });
      const token = mintEmailVerificationToken(customer.id, customer.email);
      const [purpose, id, bound, expiresAt] = token.split(".");

      for (const bad of [undefined, "", "not-a-token", [purpose, id, bound, expiresAt, "forged"].join(".")]) {
        expect(await redeemVerificationToken(bad)).toBe("invalid");
      }
      expect((await findCustomerById(customer.id))?.emailVerifiedAt).toBeNull();
    });
  });

  describe("Google sign-ins", () => {
    it("arrives already verified", async () => {
      // Google asserts email_verified and lib/auth.ts hard-rejects anything
      // else before a row is resolved, so arriving through this function is
      // itself the proof. A Google customer must never see the banner.
      const customer = await lookupOrCreateGoogleCustomer({ email: "google-new@example.test", name: "Sam" });
      expect(customer.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it("stamps an existing password account that Google links to", async () => {
      // Linking is deliberate (see lookupOrCreateGoogleCustomer), and the link
      // itself proves the address — so this account should stop being asked to
      // confirm it, and should get its guest orders at the next sign-in.
      const existing = await makeCustomer({ email: "both@example.test" });
      expect(existing.emailVerifiedAt).toBeNull();

      const linked = await lookupOrCreateGoogleCustomer({ email: "both@example.test", name: "Sam" });

      expect(linked.id).toBe(existing.id);
      expect(linked.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it("does not re-stamp an already verified account on every sign-in", async () => {
      const first = await lookupOrCreateGoogleCustomer({ email: "repeat@example.test", name: "Sam" });
      const second = await lookupOrCreateGoogleCustomer({ email: "repeat@example.test", name: "Sam" });

      expect(second.emailVerifiedAt).toEqual(first.emailVerifiedAt);
    });
  });
});
