const db = require("../database/db");

function getAuditLogs(req, res) {
  const {
    action,
    user,
    entity,
    date_from,
    date_to,
    page = 1,
    limit = 20,
  } = req.query;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.max(Number(limit) || 20, 1);
  const offset = (pageNumber - 1) * pageSize;

  const conditions = [];
  const params = [];

  if (action) {
    conditions.push("audit_logs.action LIKE ?");
    params.push(`%${action}%`);
  }
  if (user) {
    conditions.push("users.full_name LIKE ?");
    params.push(`%${user}%`);
  }
  if (entity) {
    conditions.push("audit_logs.entity LIKE ?");
    params.push(`%${entity}%`);
  }
  if (date_from) {
    conditions.push("date(audit_logs.timestamp) >= date(?)");
    params.push(date_from);
  }
  if (date_to) {
    conditions.push("date(audit_logs.timestamp) <= date(?)");
    params.push(date_to);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM audit_logs
       LEFT JOIN users ON users.id = audit_logs.user_id
       ${whereClause}`
    )
    .get(...params).total;

  const rows = db
    .prepare(
      `SELECT
         audit_logs.*,
         users.full_name
       FROM audit_logs
       LEFT JOIN users ON users.id = audit_logs.user_id
       ${whereClause}
       ORDER BY audit_logs.timestamp DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  return res.json({
    data: rows,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total: Number(total || 0),
      totalPages: Math.max(Math.ceil(Number(total || 0) / pageSize), 1),
    },
  });
}

module.exports = { getAuditLogs };
