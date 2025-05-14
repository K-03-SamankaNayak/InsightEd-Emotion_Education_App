const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    console.log('Token received:', token);
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ message: 'Server configuration error: JWT_SECRET missing' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.error('User not found with id:', decoded.userId);
      throw new Error();
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message || error);
    res.status(401).json({ message: 'Authentication required', error: error.message || 'Token validation failed' });
  }
};

// Register a new user
router.post('/register', async (req, res) => {
  try {
    console.log('Register attempt with data:', req.body);
    const { name, email, password, role } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error('User already exists with email:', email);
      return res.status(400).json({ message: 'User already exists with this email' });
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
    console.log('User saved successfully with ID:', user._id);
    
    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ message: 'Server configuration error: JWT_SECRET missing' });
    }
    
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
      error: error.message || error.toString() 
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt with email:', req.body.email);
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.error('Missing required fields');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error('User not found with email:', email);
      return res.status(400).json({ message: 'Invalid credentials - user not found' });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.error('Password does not match for user:', email);
      return res.status(400).json({ message: 'Invalid credentials - password incorrect' });
    }
    
    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ message: 'Server configuration error: JWT_SECRET missing' });
    }
    
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
      error: error.message || error.toString() 
    });
  }
});

// Get current user
router.get('/me', auth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      classes: req.user.classes
    }
  });
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = req.user;
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;
    
    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 