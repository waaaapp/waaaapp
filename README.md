# waaaapp

[![Build and Release](https://github.com/jangi/whatsaaapp/actions/workflows/release.yml/badge.svg?branch=prod)](https://github.com/jangi/whatsaaapp/actions/workflows/release.yml)

A multi-tabbed WhatsApp client for managing multiple accounts.

## Why was this made?

This application was born out of the need to manage multiple WhatsApp accounts for different businesses and personal contacts across various countries. As a frequent traveler and business owner, I found it challenging to keep up with conversations on different devices and accounts. `waaaapp` is my solution to this problem.

## What it does

`waaaapp` allows you to run multiple WhatsApp Web instances in a single, tabbed window. Each tab is a separate session, allowing you to stay logged in to multiple accounts simultaneously.

## Features

- Multiple tabs, each with its own persistent WhatsApp Web session (independent profiles).
- Inline tab rename (double-click a tab or use the rename button).
- Profile export/import to `.waaaapp` archives (config + all tab sessions).
- Help tab built in for quick reference.
- Platform-ready icons: ICO (Windows), ICNS (macOS), PNG (Linux).
- Packaged builds: Windows portable, macOS DMG, Linux AppImage (via GitHub Actions).

## Disclaimer

This project is an independent creation and is not affiliated with, endorsed by, or in any way officially connected with WhatsApp or its parent company, Meta. The use of the name "WhatsApp" is for identification and descriptive purposes only. This project is a wrapper for the official WhatsApp Web interface and does not modify it in any way.

## Ideas for Expansion

We're always looking for ways to improve `waaaapp` and expand its capabilities. Here are some ideas for future development:

*   **Profile Backup and Restore**: Implement functionality to back up and restore user profiles, either locally to disk, to various online storage services, or ideally, to our dedicated cloud service.
*   **Enhanced Customization**: More options for themes, notification settings, and tab management.
*   **Plugin System**: Allow users to extend `waaaapp`'s functionality with custom plugins.
*   **Cross-Platform Sync**: Seamless synchronization of tabs and settings across different devices.

## Contributing

Contributions are welcome! If you have an idea for a new feature or have found a bug, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License with an attribution clause. See the [LICENSE](LICENSE) file for details.
