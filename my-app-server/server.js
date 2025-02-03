require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors()); // Allow requests from different origins
app.use(bodyParser.json()); // Parse incoming JSON data

// Dummy database (Replace with a real database)
const users = [
  { email: 'test@example.com', password: 'password123' },
  { email: 'user@example.com', password: 'mypassword' }
];

// **Login Route**
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
});


// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
