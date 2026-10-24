const { chmod } = require('node:fs/promises');
const path = require('node:path');

module.exports = async options => {
  const { signAsync } = await import('@electron/osx-sign');
  await signAsync(options);
  // osx-sign copies the source profile's mode, which may be owner-only.
  // The installed profile must be readable when macOS verifies the app.
  await chmod(path.join(options.app, 'Contents', 'embedded.provisionprofile'), 0o644);
};
