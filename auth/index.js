const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json());

const SECRET = "cheie_secret";

app.post('/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === 'admin' && pass === '1234') {
    const token = jwt.sign({ user }, SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }
  res.status(401).json({ message: 'Unauthorized' });
});

app.listen(4000, () => console.log('Auth server running on port 4000'));