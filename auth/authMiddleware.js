const jwt = require('jsonwebtoken');
const SECRET = "cheie_secret"; // Should match the secret in index.js

const verifyToken = (req, res, next) => {
  // Get the token from the authorization header
  const authHeader = req.headers.authorization;
  
  // Check if header exists
  if (!authHeader) {
    return res.status(403).json({ message: 'No token provided' });
  }
  
  // Extract token (Bearer token format)
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }
  
  // Verify the token
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { verifyToken };