# Contributing to OpenWin

OpenWin is a static Vite site with a fixed catalog. Small, focused changes are easier to review than broad rewrites.

## Requirements

- Node.js 20.19 or newer, or 22.12 or newer. Node.js 24 LTS is used in CI.
- npm.
- Windows with `winget` if you are verifying package IDs.

## Run locally

```cmd
git clone https://github.com/fsamod/openwin.git
cd openwin
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Tests and build

```cmd
npm test
npm run build
```

`npm run check` runs both. The build output is written to `dist/`.

## Catalog changes

The catalog is [`src/data/apps.json`](src/data/apps.json). Each entry has:

- `id`: the exact package ID.
- `name`: the display name.
- `publisher`: the publisher shown in the catalog.
- `description`: a short, factual description. Keep it under 220 characters.
- `homepage`: an `https://` page for the app.
- `category`: one of the category IDs in the same file.
- `source`: `winget` or `msstore`.
- `icon`: a path under `public/icons/`.
- `preview`: optional. Set to `true` for beta or preview releases.

Verify a package before adding or changing it:

```cmd
winget show --id <package-id> --exact --source <winget-or-msstore> --accept-source-agreements
```

Do not claim that an app is malware-free, independently security-verified, or guaranteed to be safe. Do not invent homepages or contact addresses. If a package ID does not resolve, do not add it.

When you change the catalog, update `meta.verifiedOn` and `meta.wingetVersion` only if you actually re-checked the catalog. Update `public/sitemap.xml` when you add a page.

## Search and UI changes

Search is implemented in [`src/search.js`](src/search.js). It matches all query words across names, publishers, package IDs, descriptions, categories, and source labels. Keep the existing visual design: the dark slate and light palettes, blue accent, compact rows, and the existing typography.

## Localization

Interface strings live in [`src/locales/`](src/locales/). English is the default. German is included. If you add or change a key, update both files. `npm test` checks key parity and placeholders.

Catalog text stays in English. The information pages (Why, Privacy, Security, Contact) are currently English only.

## Privacy rules

Do not add analytics, advertising, session recording, third-party fonts, or tracking scripts. Do not add a form unless there is a real backend that can receive it, and do not describe a submission channel as anonymous unless it genuinely is.

If you add browser storage, document the key and purpose on the Privacy page. If you add a URL parameter, document it too.

## Pull requests

- Keep the change focused.
- Run `npm run check`.
- Update tests when behavior changes.
- Update the README or docs when setup, behavior, or limitations change.
- Do not commit generated `dist/` files or `node_modules/`.

## Security reports

Do not open a public issue with exploit details. Follow [`SECURITY.md`](SECURITY.md).
