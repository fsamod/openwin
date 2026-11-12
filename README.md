# OpenWin

<img src="docs/logo.png" alt="OpenWin logo" width="96" />

A compact, Ninite-style app picker for Windows with light and dark themes. Choose from a fixed list of 231 curated apps and copy exact `winget install` commands for the ones you need.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/fsamod/openwin?style=flat&logo=github&color=gold)](https://github.com/fsamod/openwin/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/fsamod/openwin?style=flat&logo=github)](https://github.com/fsamod/openwin/network/members)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Ffsamod.github.io%2Fopenwin)](https://fsamod.github.io/openwin/)

- **Website:** [fsamod.github.io/openwin](https://fsamod.github.io/openwin/)
- **Repository:** [github.com/fsamod/openwin](https://github.com/fsamod/openwin)
- **Issue tracker:** [github.com/fsamod/openwin/issues](https://github.com/fsamod/openwin/issues)
- **Contact:** [fsamod@proton.me](mailto:fsamod@proton.me)

## Demo

[![OpenWin demo](docs/openwin-demo.gif)](docs/openwin-demo.mp4)

Click the preview to open the full video.

## What it does

OpenWin presents a curated set of Windows apps in 11 categories. Pick what you need, review the commands, then copy them into Windows Terminal. The site never runs anything on your PC.

- **Fixed catalog:** 231 apps across browsers, communications, development, documents, games, Microsoft tools, multimedia, professional tools, self-hosted software, utilities, and system utilities.
- **Exact commands:** one `winget install` command per selected app, using the `winget` or `msstore` source.
- **Search and filters:** search names, publishers, package IDs, descriptions, categories, and source labels. Filter by category.
- **App details:** each app has a details dialog with its package ID, publisher, category, homepage, and source. Beta entries are labeled.
- **Shareable selections:** the selected app list is stored in the URL fragment and in local storage.
- **Light and dark themes:** the site follows your device theme by default. Pull the header cord to switch, and your choice is remembered locally.
- **No account or analytics:** the site is static and makes no third-party requests. Icons are served locally.

## Privacy and security

OpenWin has no backend, accounts, database, or feedback form. The site stores three local storage keys: one for the selected apps, one for the language choice, and one for the light or dark theme choice. The URL fragment contains selected package IDs, not personal information. GitHub Pages may process standard request data such as IP addresses and user agents for security and operations. Email sent to the contact address is processed by Proton Mail.

Read the full pages:

- [Privacy](https://fsamod.github.io/openwin/privacy.html)
- [Security](https://fsamod.github.io/openwin/security.html)
- [Why OpenWin](https://fsamod.github.io/openwin/why.html)
- [Contact and feedback](https://fsamod.github.io/openwin/contact.html)

OpenWin checks that package IDs use a safe character set, that each entry uses a known source, and that commands are shown before they are copied. It does not verify package contents, malware status, publisher identity beyond catalog metadata, licenses, or Microsoft Store certification. A package ID resolving in winget or the Store does not mean the package is safe.

## Run locally

Requires Node.js 20.19 or newer, or 22.12 or newer. CI uses Node.js 24 LTS.

```cmd
git clone https://github.com/fsamod/openwin.git
cd openwin
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Development

```cmd
npm test
npm run build
npm run preview
npm run check
```

The catalog is a fixed list in [`src/data/apps.json`](src/data/apps.json); icons live in `public/icons/`. Pushes to `main` deploy through GitHub Pages after tests and a dependency audit pass.

The site is built with Vite 8 and plain JavaScript. There is no framework, runtime dependency, backend, or database.

## Catalog

Each app has an exact package ID, name, publisher, description, homepage, category, source, and icon. Optional `preview: true` marks beta or preview releases.

Package IDs were checked against winget 1.29.380 on 9 November 2026. To verify a package yourself:

```cmd
winget show --id <package-id> --exact --source <winget-or-msstore> --accept-source-agreements
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the catalog rules and description limits.

## Localization

Interface strings live in `src/locales/`. English is the default; a switcher in the header stores the choice in local storage, otherwise the browser language is used. Catalog app text stays English.

To add a language, create `src/locales/xx.json` with all keys from `en.json`, import it and register it in the `LOCALES` map in `src/i18n.js`, and add the option to the switcher in `index.html`. `npm test` checks that translations cover every English key with the same placeholders.

The Why, Privacy, Security, and Contact pages are currently English only. The app picker supports English and German.

## Feedback

Email **fsamod@proton.me** for general questions, privacy concerns, or security reports. For catalog corrections and app suggestions, use the [issue chooser](https://github.com/fsamod/openwin/issues/new/choose) so other people can follow the discussion. There is no contact form.

Do not open a public issue with exploit details. See [`SECURITY.md`](SECURITY.md).

## Support

OpenWin is free and built in my spare time. If it saved you a fresh-install headache, you can tip in crypto:

- **Solana:** `HntwBQHT4LqKMCPjib8zkvQHqcfWZQ65DJyrsTisMCSy`
- **Ethereum:** `0x328373857c3932f9edeb0918b46884f57a99a00`
- **Bitcoin:** `bc1pyzzlumc4j4p0khv78zfsnc04skfrvj5j80zl3actuhen247zru4js9ulj52`

Tips are voluntary and never unlock anything.

## License

OpenWin is open-source software licensed under the [MIT License](LICENSE). Package metadata and app icons belong to their respective publishers. OpenWin is not affiliated with Microsoft, Ninite, or any app publisher.
