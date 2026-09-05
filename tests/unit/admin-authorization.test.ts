import { readdirSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Guards against the exact bug this repo shipped: fifteen admin Server
 * Actions and fifteen admin pages went live without calling
 * `requireAdmin()`/`requireAdminPage()` at all. A test that mocked
 * `@/lib/auth-guard` would pass even with the guard deleted — see the two
 * existing admin-action tests, which do exactly that because the guard isn't
 * what they're testing. This file mocks the *session source* instead
 * (`@/lib/auth`) and lets the real guard run against it, so a missing call
 * site actually fails the suite.
 *
 * Modules are enumerated by walking the filesystem rather than named, so an
 * admin action or page added later is covered on the day it's written.
 */

const authMock = vi.fn<() => Promise<unknown>>();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super("NEXT_REDIRECT");
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new RedirectSignal("__NOT_FOUND__");
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const ADMIN_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "admin");

function collectFiles(dir: string, matches: (name: string) => boolean, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, matches, found);
    else if (matches(entry.name)) found.push(full);
  }
  return found;
}

function relativeToAdmin(absPath: string): string {
  return relative(ADMIN_DIR, absPath).split(sep).join("/");
}

// The login flow establishes a session (nothing to require yet) and sign-out
// needs no session at all — both are correctly exempt, not forgotten.
const EXEMPT_ACTION_FILES = new Set(["actions.ts", "login/actions.ts"]);
const EXEMPT_PAGE_FILES = new Set(["login/page.tsx"]);

const actionFiles = collectFiles(ADMIN_DIR, (name) => name.endsWith("actions.ts")).filter(
  (f) => !EXEMPT_ACTION_FILES.has(relativeToAdmin(f))
);
const pageFiles = collectFiles(ADMIN_DIR, (name) => name === "page.tsx").filter(
  (f) => !EXEMPT_PAGE_FILES.has(relativeToAdmin(f))
);

// Sanity check on the enumeration itself: if these come back empty the tests
// below would trivially pass having asserted nothing.
if (actionFiles.length === 0) throw new Error("No admin action files found — enumeration is broken");
if (pageFiles.length === 0) throw new Error("No admin page files found — enumeration is broken");

async function loadExportedFunctions(absPath: string): Promise<[name: string, fn: (...args: unknown[]) => unknown][]> {
  const mod: Record<string, unknown> = await import(pathToFileURL(absPath).href);
  return Object.entries(mod).filter((e): e is [string, (...args: unknown[]) => unknown] => typeof e[1] === "function");
}

async function expectUnauthorized(fn: (...args: unknown[]) => unknown, label: string) {
  await expect(Promise.resolve().then(() => fn()), label).rejects.toThrow("Unauthorized");
}

async function expectRedirectedToLogin(fn: (...args: unknown[]) => unknown, label: string) {
  try {
    await fn({ params: Promise.resolve({}), searchParams: Promise.resolve({}) });
    throw new Error(`${label}: expected a redirect to /admin/login, but it returned normally`);
  } catch (err) {
    if (!(err instanceof RedirectSignal)) throw err;
    expect(err.url, label).toBe("/admin/login");
  }
}

describe.each([
  ["no session", null],
  ["a customer session", { user: { id: "cust-1", email: "c@example.com", role: "customer" } }],
] as const)("with %s", (_label, session) => {
  beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue(session);
  });

  it(
    "refuses every admin Server Action",
    async () => {
      for (const file of actionFiles) {
        const exported = await loadExportedFunctions(file);
        expect(exported.length, `${relativeToAdmin(file)} exported no functions`).toBeGreaterThan(0);
        for (const [name, fn] of exported) {
          await expectUnauthorized(fn, `${relativeToAdmin(file)}#${name}`);
        }
      }
    },
    30_000
  );

  it(
    "refuses every admin page render",
    async () => {
      for (const file of pageFiles) {
        const mod: Record<string, unknown> = await import(pathToFileURL(file).href);
        const page = mod.default as ((...args: unknown[]) => unknown) | undefined;
        expect(page, `${relativeToAdmin(file)} has no default export`).toBeTypeOf("function");
        await expectRedirectedToLogin(page!, relativeToAdmin(file));
      }
    },
    30_000
  );
});
