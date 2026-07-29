/**
 * Stands in for the `server-only` package under test.
 *
 * `lib/cart/cookie.ts` and `lib/cart/resolve.ts` import it as a build-time
 * guard: it makes a bundler fail loudly if server code is ever pulled into a
 * client bundle. It is meaningless outside a bundler, and it is not a direct
 * dependency of this project — it only appears in node_modules when a
 * transitive install happens to hoist it, which is why importing it resolved
 * locally and failed on a clean CI install.
 *
 * Aliased to this empty module in vitest.config.ts so the guard neither has to
 * be installed nor weakened in the source.
 */
export {};
