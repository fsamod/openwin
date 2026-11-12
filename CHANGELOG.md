# Changelog

All notable changes to OpenWin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Privacy, Security, Why OpenWin, and Contact pages.
- A custom 404 page.
- Category filter next to search.
- Multi-word search across names, publishers, package IDs, descriptions, categories, and source labels.
- Beta badge for preview catalog entries.
- Open Graph image and expanded social metadata.
- A web app manifest with 192px and 512px icons for installing OpenWin from a browser.
- Contact email `fsamod@proton.me` on the Contact page, with matching notes in the README and security policy.
- A small draggable header pull cord with spring physics and tension-based colors. Pulling it past the threshold switches between light and dark themes.
- A compact theme toggle in the header at 700px and below, where the pull cord is hidden.
- A light theme alongside the existing dark palette. The site follows the device theme by default and remembers a manual choice in `openwin-theme-v1`.
- Content Security Policy meta tag in production builds.
- CI workflow, issue templates, pull request template, contributing guide, security policy, and changelog.
- Tests for search, share URLs, catalog validation, known catalog corrections, page links, sitemap entries, the contact email, the header pull cord, and the production CSP.

### Changed

- Updated Vite from 6 to 8.3.7.
- CI now uses Node.js 24 LTS and runs tests before deployment.
- GitHub Actions are pinned to commit SHAs and use minimal permissions.
- Search placeholder and empty-state text now mention descriptions and categories.
- Hero and metadata now say "curated" instead of "reviewed" and no longer imply that OpenWin updates apps.
- The Privacy page was shortened and reorganized around local storage, URL fragments, hosting, and email.
- Contact and security reports now use email as the private channel; GitHub Issues remains the public option for catalog corrections and app suggestions.
- The pull cord now hangs from the header; its middle sways on hover while the lower tip stays steady enough to grab.
- Pulling the cord switches the theme instantly.
- The cord now leans and swings when the browser window moves, using a lightweight position watch that sleeps while the page is hidden.
- Removed the pull hint so the cord stays a small discovery.
- The footer now explains the workflow in plain language, and the privacy page was cut down to storage, URL fragments, and hosting.
- The old `>_` mark, favicon, Open Graph image, and README logo now use the glossy open-window icon.
- Selection changes now use `history.replaceState` instead of adding a history entry for every click.
- Improved muted text contrast to meet WCAG AA.
- Reduced-motion preference is respected when scrolling to the command preview.
- Clipboard fallback no longer relies on inline styles.

### Fixed

- The pull cord now settles straight after a pull instead of leaving a short folded segment swinging.
- The pull cord no longer shows a focus box or tap highlight while dragging.
- Theme changes no longer delay checkbox or selected-row colors.
- ChatGPT homepage pointed to the ChatGPT Classic Store listing.
- Social preview image pointed to a file that was not deployed.
- Visual C++ redistributable homepages returned 404.
- BlurAutoClicker homepage and repository link returned 404.
- EmulationStation was replaced with the maintained ES-DE package because its installer host was unreachable.
- Zen Browser publisher was listed as Mozilla.
- Go publisher was a URL instead of a publisher name.
- TeamSpeak 6 Beta was not labeled as a beta release.
- Hugo, JPEGView, Kodi, LocalSend, and System Informer were in the wrong categories.
- Several descriptions were excessively long or contained unverified marketing claims.
- Missing package ID guard in the app details dialog.

### Security

- Updated dependencies with `npm audit` reporting zero vulnerabilities.
- Added a restrictive production Content Security Policy.
- Removed inline style support from the production Content Security Policy.
- Added a referrer policy.
- Added `SECURITY.md` with private vulnerability reporting guidance.
- Added tests and catalog validation to CI.

## [1.0.0] - 2026-10-21

- Initial tagged release with 231 apps in 11 categories.
- Localized English and German interface.
- Shareable selections and exact winget command generation.
