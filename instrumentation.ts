import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Next's official server-error hook. Fires for uncaught errors in Server
 * Components, Server Actions, route handlers, and `proxy.ts` — including ones
 * the app never catches at all, such as the three unguarded actions in
 * `app/account/addresses/actions.ts`. That baseline coverage is why this hook
 * is worth more than any individual call-site change.
 *
 * Imports are dynamic and DSN-gated so nothing Sentry-related loads when the
 * SDK is switched off.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  const [{ captureRequestError }, { isNextControlFlowError }] = await Promise.all([
    import("@sentry/nextjs"),
    import("@/lib/observability/sentry-shared"),
  ]);

  // redirect()/notFound() throw to signal control flow — never an error.
  if (isNextControlFlowError(err)) return;

  captureRequestError(err, request, context);
};
