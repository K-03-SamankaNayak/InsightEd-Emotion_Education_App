const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Class = require('../models/Class');

// Middleware to protect routes
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error();
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication required' });
  }
};

// Create a new class (teachers only)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create classes' });
    }
    
    console.log('Creating class with data:', req.body);
    const { name, description, schedule } = req.body;
    
    // Create new class
    const newClass = new Class({
      name,
      description,
      teacher: req.user._id,
      schedule
    });
    
    await newClass.save();
    
    // Initialize classes array if it doesn't exist
    if (!req.user.classes) {
      req.user.classes = [];
    }
    
    // Add class to teacher's classes
    req.user.classes.push(newClass._id);
    await req.user.save();
    
    console.log(`Class created successfully: ${newClass._id}`);
    
    res.status(201).json({
      message: 'Class created successfully',
      class: newClass
    });
  } catch (error) {
    console.error('Class creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all classes for current user
router.get('/', auth, async (req, res) => {
  try {
    let classes;
    
    if (req.user.role === 'teacher') {
      // Get classes where user is the teacher
      classes = await Class.find({ teacher: req.user._id })
                         .populate('teacher', 'name email')
                         .populate('students', 'name email');
    } else {
      // Get classes where user is a student
      classes = await Class.find({ students: req.user._id })
                         .populate('teacher', 'name email')
                         .populate('students', 'name email');
    }
    
    res.json({ classes });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get class by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
                               .populate('teacher', 'name email')
                               .populate('students', 'name email');
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if user is the teacher or a student in the class
    const isTeacher = classItem.teacher._id.toString() === req.user._id.toString();
    const isStudent = classItem.students.some(student => student._id.toString() === req.user._id.toString());
    
    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({ class: classItem });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update class (teachers only)
router.put('/:id', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if user is the teacher of the class
    if (classItem.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the teacher can update the class' });
    }
    
    const { name, description, schedule } = req.body;
    
    if (name) classItem.name = name;
    if (description) classItem.description = description;
    if (schedule) classItem.schedule = schedule;
    
    await classItem.save();
    
    res.json({
      message: 'Class updated successfully',
      class: classItem
    });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join class (students only)
router.post('/:id/join', auth, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can join classes' });
    }
    
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if student is already in the class
    const isAlreadyJoined = classItem.students.some(
      student => student.toString() === req.user._id.toString()
    );
    
    if (isAlreadyJoined) {
      return res.status(400).json({ message: 'Already joined this class' });
    }
    
    // Add student to class
    classItem.students.push(req.user._id);
    await classItem.save();
    
    // Initialize classes array if it doesn't exist
    if (!req.user.classes) {
      req.user.classes = [];
    }
    
    // Add class to student's classes
    req.user.classes.push(classItem._id);
    await req.user.save();
    
    console.log(`Student ${req.user._id} joined class ${classItem._id}`);
    
    res.json({
      message: 'Successfully joined the class',
      class: classItem
    });
  } catch (error) {
    console.error('Join class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start live class (teachers only)
router.post('/:id/start', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if user is the teacher of the class
    if (classItem.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the teacher can start the class' });
    }
    
    // Set class to active
    classItem.active = true;
    await classItem.save();
    
    res.json({
      message: 'Class started successfully',
      class: classItem
    });
  } catch (error) {
    console.error('Start class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End live class (teachers only)
router.post('/:id/end', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if user is the teacher of the class
    if (classItem.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the teacher can end the class' });
    }
    
    // Set class to inactive
    classItem.active = false;
    await classItem.save();
    
    res.json({
      message: 'Class ended successfully',
      class: classItem
    });
  } catch (error) {
    console.error('End class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record emotion data
router.post('/:id/emotion', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if class is active
    if (!classItem.active) {
      return res.status(400).json({ message: 'Class is not active' });
    }
    
    // Check if user is a student in the class
    const isStudent = classItem.students.some(
      student => student.toString() === req.user._id.toString()
    );
    
    if (!isStudent && classItem.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { emotion, confidence } = req.body;
    
    // Add emotion data
    classItem.emotionData.push({
      student: req.user._id,
      timestamp: new Date(),
      emotion,
      confidence
    });
    
    await classItem.save();
    
    res.json({
      message: 'Emotion data recorded successfully'
    });
  } catch (error) {
    console.error('Record emotion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get emotion data for a class (teachers only)
router.get('/:id/emotion', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if user is the teacher of the class
    if (classItem.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the teacher can view emotion data' });
    }
    
    // Get emotion data
    const emotionData = classItem.emotionData;
    
    res.json({ emotionData });
  } catch (error) {
    console.error('Get emotion data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 