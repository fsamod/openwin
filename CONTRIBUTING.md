# Contributing

Small fixes and catalog corrections are welcome. For anything bigger, open an issue first so we can talk it through.

## Local setup

You need Node.js 20.19 or newer, or 22.12 or newer.

```cmd
git clone https://github.com/fsamod/openwin.git
cd openwin
npm ci
npm run dev
```

Open `http://localhost:5173`. `npm run check` runs the tests and a production build.

## Catalog changes

The catalog is [`src/data/apps.json`](src/data/apps.json). Each entry needs an exact package ID, name, publisher, a short factual description, an `https://` homepage, a category, a source (`winget` or `msstore`), and an icon under `public/icons/`. Use `preview: true` for beta or preview releases.

Check a package before adding it:

```cmd
winget show --id <package-id> --exact --source <winget-or-msstore> --accept-source-agreements
```

Don't add a package that doesn't resolve. Don't claim an app is malware-free or guaranteed safe. Don't invent homepages. If you re-check the whole catalog, update `meta.verifiedOn` and `meta.wingetVersion`.

## Pull requests

Keep the change focused, run `npm run check`, and update the tests if behavior changes. Don't commit `dist/` or `node_modules/`. No analytics, ads, tracking scripts, or fake forms.

If you add browser storage or a URL parameter, document it on the privacy page.
