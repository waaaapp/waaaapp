cask "waaaapp" do
  version "2.0.14"
  sha256 "bee40372f3211368d5d9d3568cc2542799faa91438eb9c08ef4210ccf652ea8f"

  url "https://github.com/waaaapp/waaaapp/releases/download/v#{version}/waaaapp-#{version}-mac-universal.dmg"
  name "waaaapp"
  desc "A desktop workspace for multiple WhatsApp accounts"
  homepage "https://github.com/waaaapp/waaaapp"

  depends_on macos: :ventura
  app "waaaapp.app"

  zap trash: "~/Library/Application Support/waaaapp"
end
