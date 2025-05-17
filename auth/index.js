const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // You'll need to install this: npm install cors
const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Constants
const SECRET = "cheie_secret";
const PORT = process.env.PORT || 4000;

// Import the auth middleware
const { verifyToken } = require('./authMiddleware');

// Login endpoint
app.post('/login', (req, res) => {
  const { user, pass } = req.body;
  
  // Simple validation
  if (!user || !pass) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  // Authenticate user (in a real app, check against database)
  if (user === 'admin' && pass === '1234') {
    // Create token with user info
    const token = jwt.sign(
      { user, role: 'admin' }, // Add more user details if needed
      SECRET,
      { expiresIn: '1h' }
    );
    
    return res.json({ 
      success: true, 
      message: 'Authentication successful',
      token
    });
  }
  
  // Authentication failed
  res.status(401).json({ 
    success: false, 
    message: 'Invalid credentials' 
  });
});

// Verification endpoint (for testing)
app.get('/verify', verifyToken, (req, res) => {
  res.json({ 
    success: true,
    message: 'Authenticated successfully', 
    user: req.user 
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({ 
    service: 'Auth Service',
    status: 'running',
    timestamp: new Date()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});