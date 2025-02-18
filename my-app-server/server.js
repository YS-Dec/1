require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors()); // Allow requests from different origins
app.use(bodyParser.json()); // Parse incoming JSON data

// File path for storing users added via signup
const usersFilePath = path.join(__dirname, 'users.txt');

// Helper function to read users from the file
const readUsersFromFile = () => {
  try {
    if (fs.existsSync(usersFilePath)) {
      const data = fs.readFileSync(usersFilePath, 'utf8');
      return data ? JSON.parse(data) : [];
    }
    // If file doesn't exist, return an empty array
    return [];
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

// Helper function to write users to the file
const writeUsersToFile = (users) => {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing users file:', error);
    throw error;
  }
};

/* ============================
   Multer Setup for File Uploads
=============================== */
// Configure multer storage to save files in an "uploads" directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Save the file with a timestamp prepended to avoid name collisions
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

/* ============================
   API Endpoints
=============================== */

// **Login Route**
app.post('/login', (req, res) => {
  console.log("Received login request:", req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    console.error("Missing email or password");
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  // Read file-based users from our users.txt
  const fileUsers = readUsersFromFile();
  const user = fileUsers.find(u => u.email === email && u.password === password);

  if (user) {
    console.log("User authenticated:", user);
    return res.json({ success: true, message: 'Login successful' });
  } else {
    console.error("Invalid login:", { email, password });
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
});

// **Signup Route**
app.post('/signup', (req, res) => {
  console.log("Received signup request:", req.body);
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    console.error("Missing fields for signup");
    return res.status(400).json({ success: false, message: 'Full name, email and password are required' });
  }

  // Read existing users from the file
  const fileUsers = readUsersFromFile();

  // Check for an existing account with the same email
  const existingUser = fileUsers.find(u => u.email === email);
  if (existingUser) {
    console.error("Signup attempt with existing email:", email);
    return res.status(400).json({ success: false, message: 'User with this email already exists' });
  }

  // Create new user object
  const newUser = { fullName, email, password, profilePictureUrl: '', role: 'user' };

  // Append the new user and write back to the file
  fileUsers.push(newUser);

  try {
    writeUsersToFile(fileUsers);
    console.log("User registered successfully:", newUser);
    return res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// **Profile Route**
// Returns the profile of a user based on the provided email query parameter.
app.get('/profile', (req, res) => {
  const email = req.query.email;
  console.log('Incoming request for email:', email);
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email query parameter is required' });
  }

  try {
    const fileUsers = readUsersFromFile();
    console.log('Loaded users:', fileUsers);
    const user = fileUsers.find(u => u.email === email);

    console.log('Found user:', user);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Remove sensitive information before sending the response
    const { password, ...profile } = user;
    return res.json({ success: true, profile });
  } catch (error) {
    console.error('Error retrieving profile:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// **Upload Profile Picture Route**
// This endpoint accepts a file upload (profile picture) and an email in the request body.
app.post('/upload-profile-picture', upload.single('profilePicture'), (req, res) => {
  // Retrieve the email from the form data to identify the user
  const email = req.body.email;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  // Build a URL for the uploaded file
  const fileUrl = `http://10.0.0.64:5001/uploads/${req.file.filename}`;
  console.log(`Uploaded file available at: ${fileUrl}`);

  // Update the user record in the fileUsers array
  const fileUsers = readUsersFromFile();
  const userIndex = fileUsers.findIndex(u => u.email === email);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  fileUsers[userIndex].profilePictureUrl = fileUrl;

  try {
    writeUsersToFile(fileUsers);
    return res.json({ success: true, profilePictureUrl: fileUrl });
  } catch (error) {
    console.error('Error updating user data:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/update-role', (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ message: 'Email and role are required' });
  }

  try {
    const fileUsers = readUsersFromFile();
    const userIndex = fileUsers.findIndex(u => u.email === email);

    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's role
    fileUsers[userIndex].role = role;

    // Save the updated users list back to the file
    writeUsersToFile(fileUsers);

    res.status(200).json({ success: true, message: 'Role updated successfully', user: fileUsers[userIndex] });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Serve static files from the "uploads" folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
