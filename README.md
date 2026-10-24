# waaaapp

A desktop workspace for multiple WhatsApp accounts. Made by Chris Ochieng.

## What changed in version 2

- A right-hand account rail with automatic self-profile photos where WhatsApp exposes them, custom photos, initials as a fallback, and unread badges.
- Separate persistent account sessions. Existing version 1 partition identifiers are retained.
- Electron WebContentsView replaces renderer-managed webviews. Remote pages are sandboxed, have no Node access, and cannot invoke workspace commands.
- Accounts load on first selection and stay connected until removed or the app exits. Unopened accounts do not receive notifications.
- Confirmation before closing the app or deleting a local account session.
- First-run camera/microphone setup, immediate device release after testing, and permission setup in settings. macOS builds include usage descriptions and camera/audio entitlements.
- Encrypted, portable workspace backups with authenticated AES-256-GCM encryption and scrypt key derivation. Names and photos transfer; sessions and messages do not. Restoring adds new accounts and requires QR linking. Version 1 ZIP backups are unsupported.
- Automatic updates for Windows NSIS installs and Linux AppImages. Signed macOS releases also use the updater. Older unsigned builds need one manual upgrade.

## Development

Node 24 or later:

```sh
npm ci
npm test
npm start
```

For an isolated test profile:

```sh
WAAAAPP_DATA_DIR=/absolute/path/to/qa-profile npm start
```

Keep generated local packages outside the source checkout:

```sh
npm run build:mac -- --arm64 --config.directories.output=/Users/jangita/code/codex_workings/waaaapp/build
```

## Releases

Every push to `prod` builds Windows x64/ARM64 installers, a universal macOS DMG and updater ZIP, and Linux x64/ARM64 AppImages. Tests run first. All platform builds must succeed before the workflow creates a draft release, uploads every installer and update manifest, and publishes it. Versions use `2.0.<GitHub run number>` so clients see increasing versions. Pull requests build but do not publish.

The release script checks required assets and emits SHA256SUMS.txt. It also writes a checksum-pinned Homebrew cask to `Casks/waaaapp.rb` and commits it to `prod`. That bot commit uses GITHUB_TOKEN and does not trigger another workflow run.

```sh
brew tap waaaapp/desktop https://github.com/waaaapp/waaaapp
brew trust waaaapp/desktop
brew install --cask waaaapp
brew upgrade --cask waaaapp
```

This is the project's own tap, not a claim of acceptance into Homebrew's official cask repository. The cask is generated only after a successful release.

Existing version 1 installations have no updater and must install version 2 once. They cannot be upgraded remotely by publishing a release. Updates download in the background and install on normal quit or an explicit restart. Closing confirms first.

### Apple signing

Production releases require `MAC_CERTIFICATE` (base64 P12), `MAC_CERTIFICATE_PASSWORD`, `APPLE_API_KEY_CONTENT` (the P8 file), `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER`. The workflow imports the certificate into an isolated temporary keychain, signs and notarizes the app, and checks codesign, Gatekeeper and the stapled ticket before publishing. Missing credentials or failed checks stop the release. Pull requests build without signing secrets. Signing identity must remain compatible between releases. A real signed N-to-N+1 upgrade still needs verification.

Mac App Store packages use `npm run build:mas` with a separate App Store distribution certificate, installer certificate and provisioning profile. Supply the profile using `-c.mas.provisioningProfile=/absolute/path/waaaapp.provisionprofile` and keep signing files outside the repository. This build uses App Sandbox and App Store updates instead of the desktop updater.

Windows packages are currently unsigned unless a Windows signing integration is configured; SmartScreen can warn. Do not bypass OS protections automatically.

### Platform and calling checks

The shared Chromium engine provides consistent behavior across platforms and avoids OS-webview variation. Electron is heavier than a native shell; accounts are loaded lazily to avoid starting every session at launch. Keep Electron updated for security fixes.

WhatsApp controls calling availability and its DOM. Photos use only explicit self-profile selectors; contact avatars are never used as a fallback. Test with a linked account after WhatsApp changes its UI. Calls require OS permissions, a working device and network, and WhatsApp Web calling availability. Denied macOS permissions must be changed in System Settings and may require restarting. Linux permissions depend on the desktop and device setup.

## Website

The `waaaapp/website` repository contains a dependency-free static site for Cloudflare Pages. It remains private; GitHub Actions validates the build. Configure Cloudflare Pages to build its `prod` branch with `npm run build` and publish `dist`. Downloads query the latest published app release, so new binaries do not require a website commit.

## License

See LICENSE, including attribution to Chris Ochieng. waaaapp is independent of WhatsApp and Meta.
