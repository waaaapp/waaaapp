cask "waaaapp" do
  version "2.0.12"
  sha256 "1b21b2d6b9b5b4647dafd59be0d6fc49745c4cea0617c14fe10c6476596ca8b4"

  url "https://github.com/waaaapp/waaaapp/releases/download/v#{version}/waaaapp-#{version}-mac-universal.dmg"
  name "waaaapp"
  desc "A desktop workspace for multiple WhatsApp accounts"
  homepage "https://github.com/waaaapp/waaaapp"

  depends_on macos: :ventura
  app "waaaapp.app"

  zap trash: "~/Library/Application Support/waaaapp"
end
