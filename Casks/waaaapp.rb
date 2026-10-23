cask "waaaapp" do
  version "2.0.7"
  sha256 "4b71d74a75cb3534108ec6642a4873e6c1bab63660e4d3856b2855ee76abe764"

  url "https://github.com/waaaapp/waaaapp/releases/download/v#{version}/waaaapp-#{version}-mac-universal.dmg"
  name "waaaapp"
  desc "A desktop workspace for multiple WhatsApp accounts"
  homepage "https://github.com/waaaapp/waaaapp"

  depends_on macos: ">= :ventura"
  app "waaaapp.app"

  zap trash: "~/Library/Application Support/waaaapp"
end
