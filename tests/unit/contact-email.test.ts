import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * The dead `hello@crochette.shop` address was removed from the whole UI as a
 * stopgap (PR #20, `7f5a91b`) because publishing a bouncing address as a live
 * route is worse than publishing none. Stage A (issue #17) replaces it with a
 * real one held in a single constant. This guards both ends of that: the
 * constant points at the verified domain, and the old dead domain has not
 * crept back into any source file — including comments, so a future reader
 * can't copy a stale literal back into a `mailto:`.
 */

const ROOTS = ["app", "components", "lib"];
const EXTENSIONS = [".ts", ".tsx", ".css"];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...sourceFiles(full));
    } else if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

describe("contact address", () => {
  it("resolves to the verified yarnsandbuttons.com domain", () => {
    expect(CONTACT_EMAIL).toBe("hello@yarnsandbuttons.com");
    expect(CONTACT_EMAIL.endsWith("@yarnsandbuttons.com")).toBe(true);
  });

  it("leaves no trace of the dead crochette.shop address anywhere in source", () => {
    const offenders = ROOTS.flatMap(sourceFiles).filter((file) =>
      readFileSync(file, "utf8").includes("crochette.shop")
    );
    expect(offenders).toEqual([]);
  });
});
