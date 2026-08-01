import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent git worktrees. Each gets its own node_modules, and eslint walks it
    // unless told not to — a bare `npm run lint` reported 1003 errors, none in
    // project code, which makes the real result unreadable. .gitignore does not
    // cover this: eslint never reads it.
    ".claude/**",
  ]),
]);

export default eslintConfig;
