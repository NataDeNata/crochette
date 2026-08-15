import { describe, expect, it } from "vitest";
import { accountDisplayName } from "@/lib/account/display-name";

describe("accountDisplayName", () => {
  it("prefers a real name", () => {
    expect(accountDisplayName({ name: "Joshua", email: "joshua@example.com" })).toBe("Joshua");
  });

  it("keeps a multi-word name intact", () => {
    expect(accountDisplayName({ name: "Ana Maria", email: "am@example.com" })).toBe("Ana Maria");
  });

  /* The case this function exists for: the customer provider returns
   * `customer.name ?? customer.email`, so a passwordless-signup account with no
   * name arrives here with an address in the name field. */
  it("takes the local part when the name is really an email", () => {
    expect(accountDisplayName({ name: "joshua@example.com", email: "joshua@example.com" })).toBe(
      "joshua",
    );
  });

  it("falls back to the email when there is no name", () => {
    expect(accountDisplayName({ name: null, email: "joshua@example.com" })).toBe("joshua");
  });

  it("treats a blank name as absent", () => {
    expect(accountDisplayName({ name: "   ", email: "joshua@example.com" })).toBe("joshua");
  });

  it("trims surrounding whitespace off a real name", () => {
    expect(accountDisplayName({ name: "  Joshua  " })).toBe("Joshua");
  });

  /* Null rather than a placeholder, so the caller omits the label entirely
   * instead of rendering "Signed in as" with nothing after it. */
  it("returns null when nothing is usable", () => {
    expect(accountDisplayName({ name: null, email: null })).toBeNull();
    expect(accountDisplayName({})).toBeNull();
    expect(accountDisplayName(null)).toBeNull();
    expect(accountDisplayName(undefined)).toBeNull();
  });

  it("returns null for an email with an empty local part", () => {
    expect(accountDisplayName({ email: "@example.com" })).toBeNull();
  });
});
