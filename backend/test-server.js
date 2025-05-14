/**
 * Test server for EmoEdu
 * This file is used to test the server functionality
 */

// Import required modules
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Set JWT_SECRET directly 
process.env.JWT_SECRET = 'emoedu_secret_key_for_authentication_2024';
console.log('JWT_SECRET:', process.env.JWT_SECRET);

// Create express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic user schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create user model
const User = mongoose.model('User', UserSchema);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test server is running!' });
});

// Register route
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Register attempt with data:', req.body);
    const { name, email, password, role } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'student'
    });
    
    console.log('Saving new user:', { name, email, role: role || 'student' });
    await user.save();
    
    // Generate JWT token
    console.log('JWT_SECRET for token signing:', process.env.JWT_SECRET);
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('JWT token generated successfully');
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: error.message
    });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt with email:', req.body.email);
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found with email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.error('Password does not match for user:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    console.log('JWT_SECRET for token signing:', process.env.JWT_SECRET);
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('Login successful for user:', email);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login', 
      error: error.message
    });
  }
});

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/emoedu_test', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  
  // Start server
  const PORT = 5001;
  app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
    console.log('Try registering at: http://localhost:5001/api/auth/register');
    console.log('Try logging in at: http://localhost:5001/api/auth/login');
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  
  // Start server without MongoDB
  console.log('Starting server without MongoDB...');
  const PORT = 5001;
  app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}`);
  });
}); 