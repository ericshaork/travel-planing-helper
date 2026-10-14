# Netlify function bundle checks

The Next.js server handler must not contain static image libraries. This repository contains large image directories in `public/images` and the offline image pipeline. These are not server-handler dependencies: public images are served as static assets, and offline pipeline assets stay out of the deployed function.

`next.config.ts` applies `outputFileTracingExcludes` globally, rather than only to the explore-production admin routes. It excludes `public`, the Next.js cache, offline pipeline assets, and trip-package image binaries. Trip-package JSON metadata and application data are not globally excluded. The setting is top-level for the installed Next.js version, not inside `experimental`.

The existing Netlify build command runs `capture-traces.js` immediately after Next.js finishes and before the Next.js adapter packages functions. It audits every `.nft.json` file under `.next`, writes an audit summary, and stops packaging if excluded assets are still referenced. It does not silently rewrite traces or remove runtime dependencies.

The local plugin runs after the Next.js adapter. It checks both `FUNCTIONS_DIST` and `.netlify/functions-internal` for loose excluded assets. It continues removing only the publish copy of `images.zip`; source images and ordinary published images are preserved. These checks do not inspect files inside compressed function archives.

## Validation

Run the focused regression checks without producing build artifacts:

```sh
node --test netlify/plugins/exclude-images-zip/index.test.js
npx vitest run tests/netlify-tracing-config.test.ts
```

On the next Netlify deploy, check that `[asset-audit:prepack]` reports available traces with zero excluded asset references, and that the post-build audit reports zero excluded function assets. Confirm the handler uploads successfully and smoke-test image rendering and server routes. If the upload remains oversized, inspect the generated `___netlify-server-handler` and its compressed archive for other large dependencies; the asset audit is not a total function-size check.

No `node_bundler` override or `included_files` additions are needed. The Next.js adapter manages its generated handler; an empty `included_files` list does not remove assets already discovered by Next.js tracing.
