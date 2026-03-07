const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../routes/auth');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.emailPrefix = decoded.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
    req.userName = decoded.name || decoded.email.split('@')[0];
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

module.exports = authMiddleware;
