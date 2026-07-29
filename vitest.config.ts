import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Mirrors tsconfig's `"@/*": ["./*"]`. A regex `find` is used rather than a
 * bare `"@"` prefix so `@/lib/x` maps to `<root>/lib/x` without a doubled
 * separator, and so a package that merely starts with "@" is never rewritten. */
const alias = [{ find: /^@\/(.*)/, replacement: path.join(rootDir, "$1") }];

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/setup/unit.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/setup/global-db.ts"],
          setupFiles: ["tests/setup/integration.ts"],
          // Every file talks to the same database and truncates between tests,
          // so they must not run concurrently or one file's reset would wipe
          // another's fixtures mid-assertion.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
