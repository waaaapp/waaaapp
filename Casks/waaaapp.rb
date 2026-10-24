cask "waaaapp" do
  version "2.0.9"
  sha256 "59d7d468e8f8a56e46cebeaa9526539ba5cfa1bada65fc0b5d8ca75acbc74971"

  url "https://github.com/waaaapp/waaaapp/releases/download/v#{version}/waaaapp-#{version}-mac-universal.dmg"
  name "waaaapp"
  desc "A desktop workspace for multiple WhatsApp accounts"
  homepage "https://github.com/waaaapp/waaaapp"

  depends_on macos: :ventura
  app "waaaapp.app"

  zap trash: "~/Library/Application Support/waaaapp"
end
