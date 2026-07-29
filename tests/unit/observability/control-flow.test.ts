import { describe, expect, it } from "vitest";
import { isNextControlFlowError } from "@/lib/observability/sentry-shared";

/**
 * Next signals navigation by *throwing*. The three login/signup actions
 * additionally `throw error` on their SUCCESS path so `signIn()`'s redirect can
 * propagate — so a false negative here reports every successful login as a
 * failure, and a false positive swallows a real one.
 */
describe("isNextControlFlowError", () => {
  it.each([
    ["redirect()", "NEXT_REDIRECT;replace;/admin;307;"],
    ["notFound() on Next 15+", "NEXT_HTTP_ERROR_FALLBACK;404"],
    ["notFound() legacy digest", "NEXT_NOT_FOUND"],
    ["dynamic server usage", "DYNAMIC_SERVER_USAGE"],
    ["client-render bailout", "BAILOUT_TO_CLIENT_SIDE_RENDERING"],
  ])("recognises %s", (_label, digest) => {
    expect(isNextControlFlowError(Object.assign(new Error("nav"), { digest }))).toBe(true);
  });

  it("recognises a notFound() surfaced only as a message", () => {
    expect(isNextControlFlowError(new Error("NEXT_NOT_FOUND"))).toBe(true);
  });

  it.each([
    ["a genuine application error", new Error("insert into orders failed")],
    ["an error with an unrelated digest", Object.assign(new Error("boom"), { digest: "abc123" })],
    ["a non-string digest", Object.assign(new Error("boom"), { digest: 404 })],
    ["a thrown string", "NEXT_REDIRECT"],
    ["null", null],
    ["undefined", undefined],
  ])("does not swallow %s", (_label, err) => {
    expect(isNextControlFlowError(err)).toBe(false);
  });
});
