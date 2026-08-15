/**
 * The name to greet a signed-in customer by in the masthead.
 *
 * Deliberately not just `session.user.name`. The customer Credentials provider
 * returns `name: customer.name ?? customer.email` (lib/auth.ts), and
 * `customers.name` is nullable — an account created through Google carries
 * whatever Google supplied, but one created with email and password may carry
 * nothing at all. So `user.name` is *frequently the email address*, and
 * rendering it raw puts a full address in the top-right corner of every page.
 *
 * That is worth avoiding twice over: an email is far wider than a first name in
 * a bar that already has a width problem at its breakpoints, and it is legible
 * to anyone glancing at the screen in a cafe. The local part is enough to say
 * "we know who you are", which is the whole job of the label.
 *
 * Returns null rather than a placeholder when there is nothing usable, so the
 * caller renders no label at all instead of "Signed in as there".
 *
 * **The name this reads is frozen at sign-in.** `@auth/core` seeds `token.name`
 * from the user object once, and this project's `jwt` callback (lib/auth.ts)
 * only touches `role`, `id` and `authTime` — the no-`user` branch returns the
 * token untouched. So a customer who signs up without a name, or whose name is
 * backfilled later by linking Google, keeps whatever this resolved to on the
 * day they signed in, for up to the session's 30-day life. Refreshing it would
 * cost a database read per request for every shopper, which is the same trade
 * `hasPasswordChangedSince` declines for customers — so the staleness is
 * accepted, not overlooked. Signing out and back in corrects it.
 */
export function accountDisplayName(
  user?: { name?: string | null; email?: string | null } | null,
): string | null {
  const name = user?.name?.trim();

  // A real name wins outright. The `@` test is what distinguishes it from the
  // provider's email fallback — checking `customers.name` for null here is not
  // possible, because by this point the two have already been collapsed into
  // one field and the session carries no record of which one it was.
  if (name && !name.includes("@")) return name;

  const source = name || user?.email?.trim();
  if (!source) return null;

  const local = source.split("@")[0]?.trim();
  return local || null;
}
