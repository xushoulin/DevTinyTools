# DevTinyTools

Free online developer tools. Every tool runs entirely in the browser — JSON is
never uploaded, and there is no backend, database or account system.

Current tools:

| Route             | Tool                        |
| ----------------- | --------------------------- |
| `/`               | Home + tool directory       |
| `/json-formatter` | JSON Formatter & Validator  |
| `/json-validator` | JSON Validator              |
| `/json-minifier`  | JSON Minifier               |
| `/about`          | About the site              |
| `/contact`        | Contact information         |
| `/privacy-policy` | Privacy policy              |

## Stack

- Next.js 16 (App Router, static pages) + React 19 + TypeScript
- Tailwind CSS 4
- Vitest for unit tests
- No runtime dependencies beyond React/Next

JSON handling uses the browser's native `JSON.parse` / `JSON.stringify`. Errors
are located with the engine's own position when it reports one, and otherwise
with a small built-in scanner (`locateJsonError` in `src/lib/json-utils.ts`).

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server on http://localhost:3000
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest (40 unit tests)
npm run build      # production build
npm run check      # lint + typecheck + test + build
```

## Environment variables

Both variables are optional. A Vercel deployment needs no configuration at all.

| Variable                    | Purpose                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`      | Overrides the canonical origin used by metadata, `robots.txt` and `sitemap.xml`. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | When set, `/contact` shows a `mailto:` link. When empty, nothing is shown. |

Both are inlined at build time, so changing either one requires a new deployment.

The canonical origin is resolved in this order:

1. `NEXT_PUBLIC_SITE_URL`, when it is a usable absolute URL.
2. `PRODUCTION_SITE_URL` in `src/lib/site.ts` — the domain the site is actually
   published on, currently `https://www.shoulin.shop`, for every non-development
   build.
3. `VERCEL_PROJECT_PRODUCTION_URL`, only if the pin above is removed. That
   variable resolves to the *shortest* production domain, so it prefers the apex
   `shoulin.shop` over `www.shoulin.shop` — which is why the domain is pinned in
   code rather than left to Vercel.
4. `http://localhost:3000` in development.

A localhost value is ignored in a production build, so a misconfigured
environment cannot publish localhost canonical URLs. `VERCEL_URL` is
deliberately not used, because it changes on every deployment.

The contact address can also be set in code instead of the dashboard: edit
`CONTACT_EMAIL_FALLBACK` in `src/lib/site.ts` and push. Values that do not look
like an email address are ignored rather than rendered into a broken `mailto:`
link, which is why a stray full-width colon or trailing space in the dashboard
field silently results in "no address published yet".

## Project structure

```
src/
  app/                     routes, metadata, robots.ts, sitemap.ts, icons
  components/
    tools/                 client-side tool components
    ui/                    small presentational primitives
  lib/
    json-utils.ts          parse / format / minify / analyse + error location
    examples.ts            sample documents
    site.ts                site config and URL resolution
    tools.ts               tool registry (nav, cards, sitemap)
    ads.ts                 AdSense loader + ads.txt configuration
    clipboard.ts           clipboard helper with fallback
    download.ts            blob download + safe filenames
public/
  google5bbee8250864d585.html
                           Google Search Console HTML-file verification token.
                           The file name and its single line of content must
                           stay byte-identical, or verification fails.
```

## Privacy guarantees enforced by the code

- Tool components never call `fetch`, `XMLHttpRequest` or server actions.
- Input is not written to the URL, `localStorage`, `sessionStorage` or cookies.
- Nothing is logged to the console.
- Downloads use fixed, sanitised filenames — never the document content.

## Advertising

`src/lib/ads.ts` holds two independent switches.

`ADSENSE_PUBLISHER_ID` is set, so every page emits Google's AdSense loader in
the `<head>` and `/ads.txt` serves the matching record:

```
google.com, pub-XXXX, DIRECT, f08c47fec0942fa0
```

That is what AdSense needs in order to verify the domain and review it. The
loader alone displays no ad.

`ADS_ENABLED` is still `false` and every slot id is empty, so the three reserved
positions in `src/components/ad-slot.tsx` return `null` — no empty box ever
renders. Enabling a slot requires `ADS_ENABLED = true` **and** an ad unit id.

Both `/ads.txt` and the advertising section of the privacy policy are generated
from the same constant, so they cannot drift apart. Setting
`ADSENSE_PUBLISHER_ID = ""` removes the script, makes `/ads.txt` answer 404, and
reverts the policy to its "no advertising code" wording.

In the AdSense dashboard, enable Google's consent management (Privacy & messaging
→ GDPR / EEA) before ads are served to visitors in the EEA, the UK or
Switzerland.

## Icons

`src/app/favicon.ico`, `src/app/apple-icon.png` and `src/app/icon.svg` are
generated from the same mark. To regenerate the raster versions after changing
the geometry:

```bash
node scripts/generate-icons.mjs
```

## Deploy

```bash
git init
git add .
git commit -m "feat: DevTinyTools JSON tools"
git branch -M main
git remote add origin git@github.com:<user>/<repo>.git
git push -u origin main
```

Then import the repository at <https://vercel.com/new> and deploy. No other
configuration is required: every page is static, and the canonical origin comes
from `PRODUCTION_SITE_URL` in `src/lib/site.ts`. Set `NEXT_PUBLIC_CONTACT_EMAIL`
(or `CONTACT_EMAIL_FALLBACK` in the same file) once you have a public contact
address to publish.

### Custom domain

1. Add both `shoulin.shop` and `www.shoulin.shop` to the Vercel project.
2. Set `www.shoulin.shop` as the primary domain; Vercel then 301-redirects the
   apex to it. Pick one host and stay on it — the other must redirect, never
   serve the pages itself, or the two hosts compete for the same canonical.
3. `PRODUCTION_SITE_URL` already points at `https://www.shoulin.shop`, so
   canonicals, Open Graph URLs, `robots.txt` and the sitemap follow the domain
   automatically on the next deployment.
