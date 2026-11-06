cask "waaaapp" do
  version "2.0.13"
  sha256 "18ff5434f4738780cf5c7b6ea1d89afc4c1122cd66cc2232a6ab71b36b1fe0f8"

  url "https://github.com/waaaapp/waaaapp/releases/download/v#{version}/waaaapp-#{version}-mac-universal.dmg"
  name "waaaapp"
  desc "A desktop workspace for multiple WhatsApp accounts"
  homepage "https://github.com/waaaapp/waaaapp"

  depends_on macos: :ventura
  app "waaaapp.app"

  zap trash: "~/Library/Application Support/waaaapp"
end
