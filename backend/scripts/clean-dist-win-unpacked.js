const fs = require("fs");
const path = require("path");

const targets = [
  path.join(__dirname, "..", "release", "win-unpacked"),
  path.join(__dirname, "..", "dist-exe", "win-unpacked"),
];

let hadLock = false;

for (const target of targets) {
  if (!fs.existsSync(target)) {
    continue;
  }
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch (err) {
    hadLock = true;
    // eslint-disable-next-line no-console
    console.warn(
      `\nCould not delete ${target} (locked by another process).\n` +
        `Close every "SENTINEL PAY ROLL" / Electron / nodemon process and try again.\n`
    );
  }
}

if (hadLock) {
  // eslint-disable-next-line no-console
  console.warn(
    "Continuing build anyway. If electron-builder fails with a lock error,\n" +
      "reboot Windows or change the output dir in package.json.\n"
  );
}
