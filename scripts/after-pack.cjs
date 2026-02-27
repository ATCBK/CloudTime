const fs = require("node:fs");
const path = require("node:path");
const { rcedit } = require("rcedit");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const projectDir = context.packager.projectDir;
  const iconPath = path.join(projectDir, "build", "icon.ico");
  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);

  if (!fs.existsSync(iconPath)) {
    throw new Error(`Missing icon file for rcedit: ${iconPath}`);
  }
  if (!fs.existsSync(exePath)) {
    throw new Error(`Missing app executable for rcedit: ${exePath}`);
  }

  await rcedit(exePath, { icon: iconPath });
  console.log(`Applied app icon via rcedit: ${exePath}`);
};
