import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const pngToIco = require("png-to-ico");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const sourcePng = path.join(projectRoot, "etc", "云朵待办.png");
const targetIco = path.join(projectRoot, "build", "icon.ico");
const iconSizes = [16, 24, 32, 48, 64, 128, 256];

await fs.mkdir(path.dirname(targetIco), { recursive: true });
await fs.access(sourcePng);

const iconPngBuffers = await Promise.all(
  iconSizes.map((size) =>
    sharp(sourcePng)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer()
  )
);

const iconBuffer = await pngToIco(iconPngBuffers);
await fs.writeFile(targetIco, iconBuffer);

console.log(`Prepared icon: ${targetIco}`);
