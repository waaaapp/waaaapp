cask "waaaapp" do
  version "2.0.8"
  sha256 "7406739a3d7da4a9f1245b497cef04595c11da3793e2f936b124c71401534f3b"

  url "https://github.com/waaaapp/waaaapp/releases/download/v#{version}/waaaapp-#{version}-mac-universal.dmg"
  name "waaaapp"
  desc "A desktop workspace for multiple WhatsApp accounts"
  homepage "https://github.com/waaaapp/waaaapp"

  depends_on macos: ">= :ventura"
  app "waaaapp.app"

  zap trash: "~/Library/Application Support/waaaapp"
end
