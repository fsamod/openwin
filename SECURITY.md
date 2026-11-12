# Security Policy

OpenWin is a static website that generates `winget` commands. It does not run installers, store accounts, or operate a backend.

## Supported versions

Security fixes are made on the `main` branch and deployed to the live site. Older commits and forks are not supported.

## Reporting a vulnerability

Do not open a public issue with exploit details, credentials, or personal data.

1. Email [fsamod@proton.me](mailto:fsamod@proton.me) with the affected page or file, steps to reproduce, and the impact you believe it has.
2. If GitHub private vulnerability reporting is enabled, you can use the repository's [Security tab](https://github.com/fsamod/openwin/security) instead.

Do not test against systems you do not own.

## Scope

In scope:

- The OpenWin website, build configuration, and client-side JavaScript.
- Catalog validation and install command generation.
- Links and metadata published by OpenWin.

Out of scope:

- The contents, installers, or behavior of third-party apps listed in the catalog.
- winget, the Microsoft Store, GitHub Pages, or GitHub Issues.
- Reports that only describe a package being outdated, without a vulnerability in OpenWin itself.

## What OpenWin verifies

OpenWin checks that package IDs match a restricted character set, that each entry uses a known source, and that the generated command is shown before it is copied. The catalog was checked against winget 1.29.380 on 9 November 2026.

OpenWin does not verify package contents, publisher identity beyond catalog metadata, malware status, licenses, or Store certification. A package ID resolving in winget or the Microsoft Store does not mean the package is safe.

See the [Security page](https://fsamod.github.io/openwin/security.html) for the full explanation.

## Disclosure

Please allow time to investigate and release a fix before publishing details. There is no bug bounty program and no guarantee of a response time.
