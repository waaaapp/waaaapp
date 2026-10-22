const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const icons = require('png2icons');
(async () => {
  const output = process.argv[2];
  if (!output || !path.isAbsolute(output)) throw new Error('Pass an absolute output directory.');
  await fs.mkdir(output, { recursive: true });
  const png = await sharp('icon.svg').resize(1024, 1024).png().toBuffer();
  await fs.writeFile(path.join(output, 'icon.png'), png);
  await fs.writeFile(path.join(output, 'icon.icns'), icons.createICNS(png, icons.BICUBIC, 0));
  await fs.writeFile(path.join(output, 'icon.ico'), icons.createICO(png, icons.BICUBIC, 0, true));
})().catch(error => { console.error(error); process.exitCode = 1; });
