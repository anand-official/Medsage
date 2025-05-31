const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
  try {
    // For development, allow requests without auth
    if (process.env.NODE_ENV === 'development') {
      req.user = { _id: 'development_user_id' };
      return next();
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token verification failed, authorization denied' });
  }
}; 