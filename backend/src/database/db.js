const fs = require("fs");
const path = require("path");

const userDataDir = process.env.SENTINEL_USER_DATA;
const useUserData = Boolean(userDataDir && String(userDataDir).trim());
const dataDir = useUserData ? userDataDir : path.join(__dirname, "../../data");
const dbPath = path.join(dataDir, "sentinel.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function openBetterSqlite() {
  const Database = require("better-sqlite3");
  const database = new Database(dbPath);
  database.pragma("foreign_keys = ON");
  return database;
}

function openNodeSqlite() {
  const { DatabaseSync } = require("node:sqlite");
  const database = new DatabaseSync(dbPath);
  database.exec("PRAGMA foreign_keys = ON");

  const originalPrepare = database.prepare.bind(database);
  database.prepare = function prepareCompat(sql) {
    const statement = originalPrepare(sql);
    return {
      get: (...params) => statement.get(...params),
      all: (...params) => statement.all(...params),
      run: (...params) => {
        const result = statement.run(...params);
        return {
          lastInsertRowid:
            typeof result.lastInsertRowid === "bigint"
              ? Number(result.lastInsertRowid)
              : result.lastInsertRowid,
          changes:
            typeof result.changes === "bigint" ? Number(result.changes) : result.changes,
        };
      },
    };
  };

  database.transaction = function transactionCompat(fn) {
    return function runTransaction(...args) {
      database.exec("BEGIN");
      try {
        const value = fn(...args);
        database.exec("COMMIT");
        return value;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    };
  };

  return database;
}

let db;
if (process.env.SENTINEL_USE_NODE_SQLITE === "1") {
  try {
    db = openNodeSqlite();
  } catch (error) {
    throw new Error(
      `Could not open SQLite with node:sqlite (packaged/Electron backend).\n${error.message}`
    );
  }
} else {
  try {
    db = openBetterSqlite();
  } catch (error) {
    try {
      db = openNodeSqlite();
    } catch (fallbackError) {
      throw new Error(
        `Could not open SQLite.\n` +
          `better-sqlite3: ${error.message}\n` +
          `node:sqlite fallback: ${fallbackError.message}\n` +
          `Fix: stop all Node processes, run "npm rebuild better-sqlite3", or use Node 22+ (built-in node:sqlite).`
      );
    }
  }
}

module.exports = db;
