## A little room for every account

- New right-hand account rail with profile photos when available, custom photos and unread badges.
- Separate persistent sessions with accounts loaded on first use.
- Confirmation before closing the app or removing an account.
- Passphrase-encrypted workspace export and import. Import preserves existing accounts. Link restored accounts using your phone; messages and login sessions are not transferred.
- Windows x64 and ARM64 installers, macOS universal builds for Intel and Apple Silicon, and Linux x64 and ARM64 AppImages.
- Automatic update checks. Windows installers and Linux AppImages download updates in the background. Unsigned macOS builds require manual installation.

### Existing users
Install this release once to move from version 1 to the new updater. Existing account partitions are preserved. Old ZIP backups are not supported by the new portable workspace format.

### macOS
This release may be unsigned until Apple Developer credentials are configured. macOS may block installation. Only install artifacts from this repository if you trust the publisher. Homebrew does not bypass macOS security checks.

### Homebrew
```sh
brew tap waaaapp/desktop https://github.com/waaaapp/waaaapp
brew install --cask waaaapp
```

Made by Chris Ochieng. Independent of WhatsApp and Meta.
