# OpenWin

A free, open-source app catalog for Windows powered by winget.

- **Website:** [fsamod.github.io/openwin](https://fsamod.github.io/openwin/)
- **Repository:** [github.com/fsamod/openwin](https://github.com/fsamod/openwin)
- **Issue Tracker:** [github.com/fsamod/openwin/issues](https://github.com/fsamod/openwin/issues)

OpenWin lets you discover Windows software, browse curated collections and categories, queue up multiple apps into a personal basket, and generate clean `winget install` commands to run on your own PC.

## Features

- **Instant Search:** Find applications by name, exact package ID, publisher, or tags.
- **Curated Collections:** Browse popular, trending, fresh arrivals, and updated tools via segmented collections.
- **Categories:** Explore apps grouped by browsers, development, media, utilities, security, and office tools.
- **Package Details:** Inspect version numbers, licenses, verified publishers, package IDs, and upstream manifest links.
- **My Apps Basket:** Select multiple applications and get a single batch of exact install commands.
- **Shareable baskets:** self-explanatory
- **Install options:** Pick output format (commands, PowerShell, winget configure), scope, silent flag, and version pinning.
- **Safe Command Generation:** Commands are generated as plain text using `--exact` package IDs. Nothing is installed automatically; you inspect and run the commands yourself in Command Prompt or Windows Terminal.

## How It Works

OpenWin is a static web application that runs directly in your browser.

- Application metadata is indexed from Microsoft's community [winget-pkgs](https://github.com/microsoft/winget-pkgs) repository.
- Descriptions, tags, and categories reflect community manifest data, which can occasionally have minor classification inaccuracies or missing descriptions.
- The web application never runs installation commands or scripts on your computer. You copy the generated commands and execute them on Windows 10 or 11 with Windows Package Manager installed.
- Always review generated commands before running them, and only install software you trust.

## Run Locally

To run OpenWin on your computer:

```cmd
git clone https://github.com/fsamod/openwin.git
cd openwin
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Building for Production

To create an optimized production build:

```cmd
npm run build
```

To preview the production build locally:

```cmd
npm run preview
```

## Catalog Updates

The package index is refreshed automatically every Sunday at 03:00 UTC via GitHub Actions (`.github/workflows/update-catalog.yml`). You can also trigger the workflow manually from the **Actions** tab on GitHub using `workflow_dispatch`.

To regenerate the catalog index locally:

```cmd
npm run generate:catalog
```

## Contributing

Contributions, bug reports, and suggestions are welcome:

1. **Issues:** Report bugs or suggest features using the [GitHub issue tracker](https://github.com/fsamod/openwin/issues).
2. **Pull Requests:** Fork the repository, create a branch for your change, test your changes locally with `npm run build`, and open a pull request.

## License

OpenWin is open-source software licensed under the [MIT License](LICENSE). Package metadata comes from the upstream [winget-pkgs](https://github.com/microsoft/winget-pkgs) repository.
