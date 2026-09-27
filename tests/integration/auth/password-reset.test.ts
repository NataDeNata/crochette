import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare } from "bcryptjs";

/**
 * Password reset, driven through the two Server Actions a shopper actually
 * reaches rather than through the token module underneath them — that has its
 * own unit tests, and the interesting failures here are all at the seam: what
 * the request form discloses, and whether a spent link is really spent.
 *
 * `after()` runs its callback inline here so the mail can be asserted on; the
 * real one defers past the response, which is the point of using it (see the
 * action) but leaves nothing to observe.
 *
 * `next-auth` is stubbed down to the one export the action actually uses. Not
 * for isolation — importing it for real fails outright, because `next-auth`'s
 * `lib/env.js` imports `next/server` in a form Vitest's resolver cannot follow
 * (`Cannot find module .../next/server`, hinting at `next/server.js`). That
 * bites any test importing a module that imports `next-auth`, which until now
 * was none of them: `@/lib/auth` is mocked everywhere, and the three actions
 * that pull `AuthError` straight from the package had no test. Worth knowing
 * before writing the next one.
 */
const afterCallbacks: Array<() => unknown> = [];
vi.mock("next/server", () => ({
  after: (fn: () => unknown) => {
    afterCallbacks.push(fn);
  },
}));

/** Drains what `after()` collected, the way the platform would once the
 * response is out. Awaited so a failing send surfaces here rather than as an
 * unhandled rejection three tests later. */
async function flushAfter() {
  const pending = afterCallbacks.splice(0);
  for (const fn of pending) await fn();
}

/** The action's only use of the package: `error instanceof AuthError`, to tell
 * a failed convenience sign-in from Next's redirect signal. The class identity
 * is what matters, and the action imports this same mocked module.
 *
 * Hoisted so a test can throw one deliberately — `vi.mock` factories are lifted
 * above the file, so a plain `const` declared here would not exist yet when the
 * factory runs. */
const { AuthErrorStub } = vi.hoisted(() => ({ AuthErrorStub: class AuthError extends Error {} }));
vi.mock("next-auth", () => ({ AuthError: AuthErrorStub }));

const isAuthRateLimited = vi.fn(async () => false);
/** Kept separate from `isAuthRateLimited` on purpose: the point of the
 * address-keyed bucket is that it is a *different* call with a *different* key
 * shape, and a mock that collapsed them could not tell the two apart. */
const isRateLimited = vi.fn<(scope: string, key: string) => Promise<boolean>>(async () => false);
vi.mock("@/lib/security/rate-limit", () => ({
  isAuthRateLimited: (...args: unknown[]) => isAuthRateLimited(...(args as [])),
  isRateLimited: (...args: unknown[]) => isRateLimited(...(args as [never, never])),
  getClientIp: async () => "203.0.113.9",
}));

const notifyPasswordReset =
  vi.fn<(data: { email: string; name?: string | null; token: string }) => Promise<void>>(async () => {});
const notifyPasswordResetUnavailable =
  vi.fn<(data: { email: string; name?: string | null }) => Promise<void>>(async () => {});
const notifyPasswordChanged =
  vi.fn<(data: { email: string; name?: string | null }) => Promise<void>>(async () => {});
vi.mock("@/lib/email/notifications", () => ({
  notifyPasswordReset: (...args: unknown[]) => notifyPasswordReset(...(args as [never])),
  notifyPasswordResetUnavailable: (...args: unknown[]) => notifyPasswordResetUnavailable(...(args as [never])),
  notifyPasswordChanged: (...args: unknown[]) => notifyPasswordChanged(...(args as [never])),
}));

/** The convenience sign-in at the end of a reset. Mocked to a no-op: what it
 * does is Auth.js's business and is covered elsewhere, and the real one would
 * need a request context. */
const signIn = vi.fn(async () => {});
vi.mock("@/lib/auth", () => ({ signIn: (...args: unknown[]) => signIn(...(args as [])) }));

const { requestPasswordReset } = await import("@/app/account/forgot-password/actions");
const { completePasswordReset } = await import("@/app/account/reset-password/actions");
const { findCustomerById } = await import("@/lib/db/accounts");
const { makeCustomer } = await import("../helpers/factories");

function resetForm(token: string, password: string, confirmPassword = password): FormData {
  const fd = new FormData();
  fd.set("token", token);
  fd.set("password", password);
  fd.set("confirmPassword", confirmPassword);
  return fd;
}

function requestForm(email: string): FormData {
  const fd = new FormData();
  fd.set("email", email);
  return fd;
}

/** Runs a request and returns the token that reached the mail, failing if none
 * did. */
async function requestAndCaptureToken(email: string): Promise<string> {
  await requestPasswordReset({ status: "idle" }, requestForm(email));
  await flushAfter();
  const call = notifyPasswordReset.mock.calls.at(-1);
  if (!call) throw new Error(`no reset mail was sent to ${email}`);
  return call[0].token;
}

beforeEach(() => {
  afterCallbacks.length = 0;
  isAuthRateLimited.mockClear();
  isAuthRateLimited.mockResolvedValue(false);
  isRateLimited.mockClear();
  isRateLimited.mockResolvedValue(false);
  notifyPasswordReset.mockClear();
  notifyPasswordResetUnavailable.mockClear();
  notifyPasswordChanged.mockClear();
  signIn.mockClear();
});

describe("requestPasswordReset", () => {
  it("answers identically for an address with an account and one without", async () => {
    // The property the form exists to have. An unauthenticated form that
    // confirms an address on demand is an account-enumeration endpoint, and the
    // only way to not be one is for both answers to be the same answer.
    await makeCustomer({ email: "known@example.test" });

    const known = await requestPasswordReset({ status: "idle" }, requestForm("known@example.test"));
    const unknown = await requestPasswordReset({ status: "idle" }, requestForm("nobody@example.test"));

    expect(known).toEqual(unknown);
    expect(known.status).toBe("success");
  });

  it("sends nothing at all for an address with no account", async () => {
    await requestPasswordReset({ status: "idle" }, requestForm("nobody@example.test"));
    await flushAfter();

    expect(notifyPasswordReset).not.toHaveBeenCalled();
    expect(notifyPasswordResetUnavailable).not.toHaveBeenCalled();
  });

  it("explains how to sign in instead of mailing a link to a Google-only account", async () => {
    // An account with no password has nothing to reset. Mailing it a reset link
    // would end at a form that sets a first password on an account whose owner
    // never asked for one.
    const customer = await makeCustomer({ email: "google@example.test", passwordHash: null });

    await requestPasswordReset({ status: "idle" }, requestForm("google@example.test"));
    await flushAfter();

    expect(notifyPasswordReset).not.toHaveBeenCalled();
    expect(notifyPasswordResetUnavailable).toHaveBeenCalledWith(
      expect.objectContaining({ email: customer.email })
    );
  });

  it("defers every send past the response", async () => {
    // Saying the same words is not enough on its own: an awaited send answers
    // "this address has an account" in the response *time*. Nothing may have
    // been sent by the time the action returns.
    await makeCustomer({ email: "timing@example.test" });

    await requestPasswordReset({ status: "idle" }, requestForm("timing@example.test"));
    expect(notifyPasswordReset).not.toHaveBeenCalled();

    await flushAfter();
    expect(notifyPasswordReset).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed address before spending a rate-limit token", async () => {
    const state = await requestPasswordReset({ status: "idle" }, requestForm("not-an-address"));

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email?.[0]).toBeTruthy();
    expect(isAuthRateLimited).not.toHaveBeenCalled();
  });

  it("echoes the address back on a rejection so the form refills itself", async () => {
    const state = await requestPasswordReset({ status: "idle" }, requestForm("not-an-address"));
    expect(state.values?.email).toBe("not-an-address");
  });

  it("caps the address independently of the client, with no IP in the key", async () => {
    // The finding this closes: every other limit here is keyed IP:email, so an
    // attacker with a pool of addresses got a fresh allowance per hop and could
    // have our verified sending domain mail one victim indefinitely. The cap
    // that binds is the one on the address.
    await makeCustomer({ email: "victim@example.test" });

    await requestPasswordReset({ status: "idle" }, requestForm("victim@example.test"));

    expect(isRateLimited).toHaveBeenCalledWith("password-reset-email", "victim@example.test");
  });

  it("refuses when the address bucket is spent even though the client's is not", async () => {
    await makeCustomer({ email: "victim@example.test" });
    isAuthRateLimited.mockResolvedValue(false);
    isRateLimited.mockResolvedValue(true);

    const state = await requestPasswordReset({ status: "idle" }, requestForm("victim@example.test"));
    await flushAfter();

    expect(state.status).toBe("error");
    expect(notifyPasswordReset).not.toHaveBeenCalled();
  });

  it("spends the address bucket for an unknown address too", async () => {
    // A limit that only applied to real accounts would answer "this address
    // exists" by the fourth attempt, undoing the identical-response property
    // the whole action is built around.
    await requestPasswordReset({ status: "idle" }, requestForm("nobody@example.test"));

    expect(isRateLimited).toHaveBeenCalledWith("password-reset-email", "nobody@example.test");
  });

  it("lowercases the address before keying it, so case cannot buy a fresh bucket", async () => {
    await requestPasswordReset({ status: "idle" }, requestForm("Victim@Example.TEST"));

    expect(isRateLimited).toHaveBeenCalledWith("password-reset-email", "victim@example.test");
  });

  it("refuses once the limit trips, and sends nothing", async () => {
    await makeCustomer({ email: "flood@example.test" });
    isAuthRateLimited.mockResolvedValue(true);

    const state = await requestPasswordReset({ status: "idle" }, requestForm("flood@example.test"));
    await flushAfter();

    expect(state.status).toBe("error");
    expect(notifyPasswordReset).not.toHaveBeenCalled();
  });
});

describe("completePasswordReset", () => {
  it("writes the new password, stamps the rotation and signs the shopper in", async () => {
    const customer = await makeCustomer({ email: "sam@example.test" });
    const token = await requestAndCaptureToken("sam@example.test");

    await completePasswordReset({ status: "idle" }, resetForm(token, "a-better-password"));

    const after = await findCustomerById(customer.id);
    expect(await compare("a-better-password", after!.passwordHash!)).toBe(true);
    expect(after!.passwordChangedAt).toBeInstanceOf(Date);
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("tells the account holder the password changed", async () => {
    // The notification that matters. The reset link says a reset was *asked
    // for*, which its owner can ignore if it wasn't them; this says one
    // *happened*, which they cannot — it is how someone whose account has just
    // been taken finds out.
    const customer = await makeCustomer({ email: "sam@example.test" });
    const token = await requestAndCaptureToken("sam@example.test");

    await completePasswordReset({ status: "idle" }, resetForm(token, "a-better-password"));
    await flushAfter();

    expect(notifyPasswordChanged).toHaveBeenCalledWith(expect.objectContaining({ email: customer.email }));
  });

  it("defers that notification past the response, like every other send here", async () => {
    await makeCustomer({ email: "sam@example.test" });
    const token = await requestAndCaptureToken("sam@example.test");

    await completePasswordReset({ status: "idle" }, resetForm(token, "a-better-password"));
    // Registered, not yet run: a Resend outage must not turn a completed
    // password change into an error on screen.
    expect(notifyPasswordChanged).not.toHaveBeenCalled();

    await flushAfter();
    expect(notifyPasswordChanged).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when the reset did not happen", async () => {
    // A "your password was changed" mail for a password that did not change is
    // worse than no mail at all — it is an alarm the reader cannot act on, and
    // it trains them to ignore the real one.
    await makeCustomer({ email: "sam@example.test" });

    await completePasswordReset({ status: "idle" }, resetForm("not-a-token", "a-better-password"));
    await flushAfter();

    expect(notifyPasswordChanged).not.toHaveBeenCalled();
  });

  it("still notifies when the convenience sign-in fails", async () => {
    // The password is changed either way, so the alert must not be collateral
    // damage of a failed sign-in. `after()` is documented to run even when the
    // response ends in a redirect or an error, which is why it is registered
    // before the signIn call rather than after it.
    await makeCustomer({ email: "sam@example.test" });
    const token = await requestAndCaptureToken("sam@example.test");
    signIn.mockRejectedValueOnce(new AuthErrorStub("sign-in failed"));

    const state = await completePasswordReset({ status: "idle" }, resetForm(token, "a-better-password"));
    await flushAfter();

    expect(state.status).toBe("error");
    expect(notifyPasswordChanged).toHaveBeenCalledTimes(1);
  });

  it("makes the link single-use, with nothing stored to make it so", async () => {
    // The mechanism worth pinning: the token is signed against
    // `password_changed_at`, and completing a reset advances it. Nothing is
    // marked spent anywhere — the token simply stops verifying.
    const customer = await makeCustomer({ email: "sam@example.test" });
    const token = await requestAndCaptureToken("sam@example.test");

    await completePasswordReset({ status: "idle" }, resetForm(token, "first-new-password"));
    const replay = await completePasswordReset({ status: "idle" }, resetForm(token, "second-new-password"));

    expect(replay.status).toBe("error");
    const after = await findCustomerById(customer.id);
    expect(await compare("first-new-password", after!.passwordHash!)).toBe(true);
    expect(await compare("second-new-password", after!.passwordHash!)).toBe(false);
  });

  it("invalidates every other outstanding link for the same account", async () => {
    // Two requests in a row is ordinary behaviour — a shopper who doesn't see
    // the first mail asks again. Spending either one must kill both, or the
    // older link stays live in an inbox after the account has moved on.
    await makeCustomer({ email: "sam@example.test" });
    const older = await requestAndCaptureToken("sam@example.test");
    const newer = await requestAndCaptureToken("sam@example.test");

    await completePasswordReset({ status: "idle" }, resetForm(newer, "a-better-password"));
    const stale = await completePasswordReset({ status: "idle" }, resetForm(older, "another-password"));

    expect(stale.status).toBe("error");
  });

  it("gives a Google-only account its first password when it holds a valid link", async () => {
    // Reachable only by a shopper who set a password, then reset it — or by one
    // whose account was created through Google and who later asks for a reset
    // after setting one. Either way the token is the proof, and refusing here
    // would strand the account.
    const customer = await makeCustomer({ email: "google@example.test", passwordHash: null });
    const { mintPasswordResetToken } = await import("@/lib/security/account-token");

    await completePasswordReset(
      { status: "idle" },
      resetForm(mintPasswordResetToken(customer.id, null), "a-first-password")
    );

    const after = await findCustomerById(customer.id);
    expect(await compare("a-first-password", after!.passwordHash!)).toBe(true);
  });

  it("refuses a forged, absent or expired token without touching the account", async () => {
    const customer = await makeCustomer({ email: "sam@example.test" });
    const before = (await findCustomerById(customer.id))!.passwordHash;

    for (const token of ["", "not-a-token", "r1.x.0.99999999999999.forged"]) {
      const state = await completePasswordReset({ status: "idle" }, resetForm(token, "a-better-password"));
      expect(state.status).toBe("error");
    }

    expect((await findCustomerById(customer.id))!.passwordHash).toBe(before);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("refuses a verification link presented as a reset link", async () => {
    const customer = await makeCustomer({ email: "sam@example.test" });
    const { mintEmailVerificationToken } = await import("@/lib/security/account-token");
    const before = (await findCustomerById(customer.id))!.passwordHash;

    const state = await completePasswordReset(
      { status: "idle" },
      resetForm(mintEmailVerificationToken(customer.id, customer.email), "a-better-password")
    );

    expect(state.status).toBe("error");
    expect((await findCustomerById(customer.id))!.passwordHash).toBe(before);
  });

  it("reports a mismatched confirmation as a field error and keeps the link usable", async () => {
    // A typo in the second box must not burn the link — the shopper is on the
    // page, with the token in the form, and sending them back to their inbox
    // for a fresh one over a typo is the kind of thing that ends in a support
    // email.
    const customer = await makeCustomer({ email: "sam@example.test" });
    const token = await requestAndCaptureToken("sam@example.test");

    const typo = await completePasswordReset({ status: "idle" }, resetForm(token, "a-better-password", "mismatch"));
    expect(typo.fieldErrors?.confirmPassword?.[0]).toBeTruthy();

    await completePasswordReset({ status: "idle" }, resetForm(token, "a-better-password"));
    const after = await findCustomerById(customer.id);
    expect(await compare("a-better-password", after!.passwordHash!)).toBe(true);
  });

  it("refuses a password shorter than signup would accept", async () => {
    // A reset must not be an easier route to a weaker password than the signup
    // form allows; both read the same schema field, and this is what says so.
    const customer = await makeCustomer({ email: "sam@example.test" });
    const token = await requestAndCaptureToken("sam@example.test");
    const before = (await findCustomerById(customer.id))!.passwordHash;

    const state = await completePasswordReset({ status: "idle" }, resetForm(token, "short"));

    expect(state.fieldErrors?.password?.[0]).toBeTruthy();
    expect((await findCustomerById(customer.id))!.passwordHash).toBe(before);
  });
});
