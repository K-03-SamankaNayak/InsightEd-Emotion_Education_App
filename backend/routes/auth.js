const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes
const auth = async (req, res, next) => {
  try {
    // Check if Authorization header exists
    if (!req.header('Authorization')) {
      console.log('Authentication failed: No Authorization header');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Extract the token
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
      console.log('Authentication failed: Empty token');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('Authentication failed: JWT_SECRET is not defined');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified for user:', decoded.userId);
    
    // Find user by ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log(`Authentication failed: User not found with ID ${decoded.userId}`);
      throw new Error();
    }
    
    // Attach user and token to request
    req.user = user;
    req.token = token;
    console.log(`User authenticated: ${user.name} (${user.role})`);
    next();
  } catch (error) {
    console.error('Authentication error:', error.message || 'Invalid token');
    res.status(401).json({ message: 'Authentication required' });
  }
};

// Register a new user
router.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt received:', req.body.email);
    
    // Validate input
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      console.log('Missing required fields for registration');
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`Registration failed: User already exists with email ${email}`);
      return res.status(400).json({ message: 'User already exists' });
    }
    
    console.log('Creating new user:', { name, email, role: role || 'student' });
    
    // Create new user with explicit empty classes array
    const user = new User({
      name,
      email,
      password,
      role: role || 'student',
      classes: [] // Initialize empty classes array
    });
    
    // Save the user to database
    await user.save();
    console.log('User saved to database with ID:', user._id);
    
    // Check JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined for token generation');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    console.log(`Using JWT_SECRET: ${process.env.JWT_SECRET.substring(0, 5)}... (masked)`);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('Registration successful, token generated');
    
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt received for email:', req.body.email);
    
    // Validate input
    const { email, password } = req.body;
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    console.log('Searching for user with email:', email);
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found with email: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    console.log('User found, verifying password');
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Invalid password for user: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    console.log('Password verified, generating token');
    
    // Check JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined for token generation');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    console.log(`Using JWT_SECRET: ${process.env.JWT_SECRET.substring(0, 5)}... (masked)`);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('Login successful, token generated');
    
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
    res.status(500).json({ message: 'Server error', error: error.message });
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
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 