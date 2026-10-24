## A little room for every account

- New right-hand account rail with profile photos when available, custom photos and unread badges.
- Separate persistent sessions with accounts loaded on first use.
- Confirmation before closing the app or removing an account.
- Passphrase-encrypted workspace export and import. Import preserves existing accounts. Link restored accounts using your phone; messages and login sessions are not transferred.
- Windows x64 and ARM64 installers, macOS universal builds for Intel and Apple Silicon, and Linux x64 and ARM64 AppImages.
- Automatic update checks. Windows installers and Linux AppImages download updates in the background. Signed macOS builds support background updates.

### Existing users
Install this release once to move from version 1 to the new updater. Existing account partitions are preserved. Old ZIP backups are not supported by the new portable workspace format.

### macOS
The macOS application is signed with a Developer ID certificate and notarized by Apple. Install this release once if you are using an older unsigned build. Homebrew installations can be updated with `brew update && brew upgrade --cask waaaapp`.

### Homebrew
```sh
brew tap waaaapp/desktop https://github.com/waaaapp/waaaapp
brew trust waaaapp/desktop
brew install --cask waaaapp
```

Made by Chris Ochieng. Independent of WhatsApp and Meta.
