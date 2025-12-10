// Simple validation middleware collection
// Focus: query param validation for logs endpoint

function validateLogsQuery(req, res, next) {
  try {
    const q = req.query || {};
    const severity = q.severity || q.level;
    if (severity) {
      const allowed = ['INFO','WARN','ERROR','DEBUG'];
      if (!allowed.includes(String(severity).toUpperCase())) {
        return res.status(400).json({ success:false, message:'Invalid severity value' });
      }
    }
    if (q.limit !== undefined) {
      const limitNum = parseInt(q.limit, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
        return res.status(400).json({ success:false, message:'Invalid limit value' });
      }
    }
    if (q.page !== undefined) {
      const pageNum = parseInt(q.page, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({ success:false, message:'Invalid page value' });
      }
    }
    const from = q.date_from || q.from;
    const to = q.date_to || q.to;
    if (from && isNaN(new Date(from).getTime())) {
      return res.status(400).json({ success:false, message:'Invalid date_from value' });
    }
    if (to && isNaN(new Date(to).getTime())) {
      return res.status(400).json({ success:false, message:'Invalid date_to value' });
    }
    next();
  } catch (e) {
    return res.status(400).json({ success:false, message:'Invalid query params' });
  }
}

module.exports = { validateLogsQuery };
