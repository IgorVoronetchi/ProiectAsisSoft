const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Secret key for JWT verification (should match auth service)
const SECRET = 'cheie_secret';

// Service URLs (using environment variables or defaults)
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4000';
const SERVICE1_URL = process.env.SERVICE1_URL || 'http://localhost:3001';
const SERVICE2_URL = process.env.SERVICE2_URL || 'http://localhost:3002';

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const verifyToken = (req, res, next) => {
  // Skip token verification for auth routes
  if (req.path === '/login') {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Apply auth middleware to all routes
app.use(verifyToken);

// Proxy /login requests to Auth Service
app.use('/login', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/login': '/login'
  }
}));

// Route for search (main application functionality)
app.post('/search', async (req, res) => {
  try {
    const { name, type } = req.body;
    
    // Validate request
    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }
    
    let serviceUrl;
    
    // Route based on type (client or company)
    if (type.toLowerCase() === 'client') {
      serviceUrl = `${SERVICE1_URL}`;
    } else if (type.toLowerCase() === 'company') {
      serviceUrl = `${SERVICE2_URL}`;
    } else {
      return res.status(400).json({ message: 'Type must be either "client" or "company"' });
    }
    
    // Forward request to appropriate service
    const response = await axios.post(`${serviceUrl}/search`, {
      name,
      type
    }, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    
    // Return the response from the microservice
    return res.json(response.data);
    
  } catch (error) {
    console.error('Search error:', error.message);
    
    // Check if the error is from the microservice response
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    // Generic error
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'API Gateway',
    status: 'running',
    timestamp: new Date()
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Routing to services:`);
  console.log(`Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`Microservice 1: ${SERVICE1_URL}`);
  console.log(`Microservice 2: ${SERVICE2_URL}`);
});