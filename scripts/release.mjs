import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const version = process.env.VERSION;
if (!/^2\.0\.\d+$/.test(version)) throw new Error('Invalid release version');
const required = ['win-x64.exe', 'win-arm64.exe', 'mac-universal.dmg', 'mac-universal.zip', 'linux-x64.AppImage', 'linux-arm64.AppImage'].map(suffix => `waaaapp-${version}-${suffix}`);
required.push('latest.yml', 'latest-mac.yml', 'latest-linux.yml', 'latest-linux-arm64.yml');
for (const name of required) if (!fs.existsSync(path.join('release', name))) throw new Error(`Missing release artifact: ${name}`);
const checksum = name => crypto.createHash('sha256').update(fs.readFileSync(path.join('release', name))).digest('hex');
const files = fs.readdirSync('release').filter(name => name !== 'SHA256SUMS.txt');
fs.writeFileSync('release/SHA256SUMS.txt', files.map(name => `${checksum(name)}  ${name}`).join('\n') + '\n');
fs.mkdirSync('Casks', { recursive: true });
fs.writeFileSync('Casks/waaaapp.rb', `cask "waaaapp" do
  version "${version}"
  sha256 "${checksum(`waaaapp-${version}-mac-universal.dmg`)}"

  url "https://github.com/waaaapp/waaaapp/releases/download/v#{version}/waaaapp-#{version}-mac-universal.dmg"
  name "waaaapp"
  desc "A desktop workspace for multiple WhatsApp accounts"
  homepage "https://waaaapp.github.io/website/"

  depends_on macos: ">= :monterey"
  app "waaaapp.app"

  zap trash: "~/Library/Application Support/waaaapp"
end
`);
