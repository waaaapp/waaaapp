cask "waaaapp" do
  version "2.0.6"
  sha256 "917280bb2326a8ab9205646c6438ae3eff3067e42da19d56fb286ff41859a583"

  url "https://github.com/waaaapp/waaaapp/releases/download/v#{version}/waaaapp-#{version}-mac-universal.dmg"
  name "waaaapp"
  desc "A desktop workspace for multiple WhatsApp accounts"
  homepage "https://github.com/waaaapp/waaaapp"

  depends_on macos: ">= :ventura"
  app "waaaapp.app"

  zap trash: "~/Library/Application Support/waaaapp"
end
