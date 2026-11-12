# Security

OpenWin is a static site that prints `winget` commands. It doesn't run installers, store accounts, or keep a backend.

If you find a security problem, email [fsamod@proton.me](mailto:fsamod@proton.me). Don't open a public issue with exploit details. If private vulnerability reporting is enabled, the repository's Security tab works too.

Please only test against systems you own. Third-party apps in the catalog, winget, the Microsoft Store, GitHub Pages, and GitHub Issues are out of scope.

OpenWin checks that package IDs use a safe character set and that commands are shown before they're copied. It doesn't check whether an app is safe, malware-free, or certified. A package ID resolving in winget or the Store doesn't mean the app is trustworthy.

See the [Security page](https://fsamod.github.io/openwin/security.html) for the longer version.
