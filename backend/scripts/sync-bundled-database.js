const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dataDb = path.join(root, "data", "sentinel.db");
const assetsDb = path.join(root, "assets", "sentinel.db");

if (fs.existsSync(dataDb)) {
  fs.mkdirSync(path.dirname(assetsDb), { recursive: true });
  fs.copyFileSync(dataDb, assetsDb);
  // eslint-disable-next-line no-console
  console.log("Synced data/sentinel.db -> assets/sentinel.db (bundled into the desktop installer).");
} else {
  // eslint-disable-next-line no-console
  console.log(
    "No data/sentinel.db found; keeping assets/sentinel.db as-is for the installer bundle."
  );
}
