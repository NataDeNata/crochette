import { describe, expect, it } from "vitest";
import { containsPattern, escapeLikePattern } from "@/lib/db/search";

describe("escapeLikePattern", () => {
  it("leaves an ordinary query untouched", () => {
    expect(escapeLikePattern("granny square")).toBe("granny square");
  });

  it("escapes the percent wildcard", () => {
    // The bug this exists for: `%` unescaped made `%100%%`, which matches every
    // row, so a search for a discount name silently returned the whole table.
    expect(escapeLikePattern("100%")).toBe("100\\%");
  });

  it("escapes the underscore wildcard", () => {
    expect(escapeLikePattern("blanket_v2")).toBe("blanket\\_v2");
  });

  it("escapes backslashes before the wildcards, not after", () => {
    // Order matters: escaping `%` first and `\` second would double-escape the
    // backslashes this function itself introduces, turning `\%` into `\\%` —
    // a literal backslash followed by a live wildcard.
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
    expect(escapeLikePattern("50%\\off")).toBe("50\\%\\\\off");
  });

  it("handles a query that is nothing but wildcards", () => {
    expect(escapeLikePattern("%_%")).toBe("\\%\\_\\%");
  });
});

describe("containsPattern", () => {
  it("wraps the escaped query in unescaped bounding wildcards", () => {
    // The outer `%` are ours and must stay live — only the user's input is
    // neutralised.
    expect(containsPattern("100%")).toBe("%100\\%%");
  });

  it("still matches substrings for an ordinary query", () => {
    expect(containsPattern("scarf")).toBe("%scarf%");
  });
});
