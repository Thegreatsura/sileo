/*
 * `src/index.ts` and `src/sileo.tsx` pull in `./styles.css` for its side effect,
 * which the bundler understands and TypeScript does not: to the compiler a
 * stylesheet is a module with no declaration, so the import is an error in any
 * project that does not already special-case it.
 *
 * The package's own `tsconfig` happens to be quiet about it, but an editor that
 * resolves these files through a different project — the site's, or an inferred
 * one — is not, and reports a missing module on a line that builds perfectly
 * well. This states the obvious thing once so every consumer agrees.
 */
declare module "*.css";
