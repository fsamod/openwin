# OpenWin

![OpenWin logo](docs/logo.svg)

A dark, Ninite-style app picker for Windows. Choose from a fixed list of 231 apps and copy exact `winget install` commands for the ones you need.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Ffsamod.github.io%2Fopenwin)](https://fsamod.github.io/openwin/)

- **Website:** [fsamod.github.io/openwin](https://fsamod.github.io/openwin/)
- **Repository:** [github.com/fsamod/openwin](https://github.com/fsamod/openwin)
- **Issue tracker:** [github.com/fsamod/openwin/issues](https://github.com/fsamod/openwin/issues)

## What it does

OpenWin presents a reviewed set of Windows apps in 11 categories. You check the apps you want, review the exact commands, then copy them. The site never runs anything on your PC.

- **Fixed catalog:** 231 apps across browsers, communications, development, documents, games, Microsoft tools, multimedia, professional tools, self-hosted software, utilities, and system utilities.
- **Exact commands:** every selected app appears as one `winget install` command, using the `msstore` source where needed.
- **Search and details:** find apps by name, publisher, or package ID. Each app has a details dialog with its package ID and homepage.
- **Shareable selections:** the selected app list is stored in the URL and in local storage.
- **No account or analytics:** the site is static and makes no third-party requests. Icons are served locally.

## How it works

The app is a Vite site with no runtime framework. `src/main.js` renders the catalog, manages selection state, and handles copying and sharing. `src/install-commands.js` builds one exact command per selected app as plain text.

Each command:

1. Uses the exact package ID and the correct `winget` or `msstore` source.
2. Accepts the package and source agreements.
3. Disables interactive prompts.

Copy the commands into Windows Terminal and review them before running. Package IDs are checked against winget, but publishers control their own manifests and installers.

The package IDs in this build were checked against winget 1.29.380 on October 20, 2026. The catalog is fixed; it is not a live mirror of the winget repository.

## Run locally

```cmd
git clone https://github.com/fsamod/openwin.git
cd openwin
npm install
npm run dev
```

Open `http://localhost:5173`.

### Tests and production build

```cmd
npm test
npm run build
npm run preview
```

`npm test` runs the command-generation tests with Node's built-in test runner. The production site is written to `dist/`.

## Catalog

The catalog lives in [`src/data/apps.json`](src/data/apps.json). Each app entry has an exact package ID, name, publisher, description, homepage, category, source, and local icon path. Icons live in `public/icons/`.

To change the catalog:

1. Add or edit the app entry.
2. Add its icon to `public/icons/` and update the `icon` path.
3. Verify the package with `winget show --exact --id <id> --source winget` or `--source msstore`.
4. Run `npm test` and `npm run build`.

There is no scheduled catalog refresh. The previous full-catalog generator and weekly workflow were removed because this build intentionally uses a reviewed, fixed list.

## Deployment

Pushes to `main` deploy `dist/` to GitHub Pages through `.github/workflows/deploy-pages.yml`. The Vite base path is relative, so the site also works from a project subdirectory.

## Contributing

Bug reports and focused pull requests are welcome. Run `npm test` and `npm run build` before opening a pull request. Do not add a package without verifying its exact ID and source.

## Support

OpenWin is free and built in my spare time. If it saved you a fresh-install headache, you can tip in crypto:

- **Solana:** `HntwBQHT4LqKMCPjib8zkvQHqcfWZQ65DJyrsTisMCSy`
- **Ethereum:** `0x328373857c3932f9edeb0918b46884f57a99a00`
- **Bitcoin:** `bc1pyzzlumc4j4p0khv78zfsnc04skfrvj5j80zl3actuhen247zru4js9ulj52`

Tips are voluntary and never unlock anything.

## License

OpenWin is open-source software licensed under the [MIT License](LICENSE). Package metadata and app icons belong to their respective publishers. OpenWin is not affiliated with Microsoft, Ninite, or any app publisher.
