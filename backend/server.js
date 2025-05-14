const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Load environment variables
dotenv.config();

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.log('JWT_SECRET not found in environment, setting default');
  process.env.JWT_SECRET = 'emoedu_secret_key_for_authentication_2024';
} else {
  console.log('Using JWT_SECRET from environment variables');
}

// Log environment configuration
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5001,
  MONGO_URI: process.env.MONGO_URI ? 'Set (masked)' : 'Not set',
  JWT_SECRET: process.env.JWT_SECRET ? 'Set (masked)' : 'Not set'
});

// Import routes
const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/class');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  // Set transport options for better WebRTC compatibility
  transports: ['websocket', 'polling']
});

// Add clearer console log for connection points
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const k in interfaces) {
    for (const k2 in interfaces[k]) {
      const address = interfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
      }
    }
  }
  return addresses;
}

// Middleware
app.use(cors({
  origin: '*', // In production, you might want to limit this
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add security headers for WebRTC and secure contexts
app.use((req, res, next) => {
  // Set security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Allow access to camera/mic from all origins for WebRTC
  res.setHeader('Feature-Policy', "camera *; microphone *");
  res.setHeader('Permissions-Policy', "camera=*, microphone=*");
  
  // Add Cross-Origin headers to support WebRTC on mobile devices
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  next();
});

// Connect to MongoDB or use memory server
async function connectDatabase() {
  try {
    console.log('Attempting to connect to MongoDB...');
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/emoedu';
    console.log(`Using MongoDB URI: ${MONGO_URI.includes('localhost') ? MONGO_URI : 'External DB (masked)'}`);
    
    // Try connecting to external MongoDB first
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('External MongoDB connection failed, using in-memory MongoDB');
    
    try {
      // If external connection fails, use memory server
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      console.log('In-memory MongoDB URI:', mongoUri);
      
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('In-memory MongoDB instance created and connected');
      return true;
    } catch (memoryDbError) {
      console.error('Failed to create in-memory database:', memoryDbError.message);
      return false;
    }
  }
}

// Connect to database before starting server
connectDatabase().then(() => {
  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/class', classRoutes);

  // Serve static files
  app.use(express.static(path.join(__dirname, '../frontend')));

  // Route for all frontend routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });

  // WebSocket connection for live classes
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Join a class room
    socket.on('join-class', (data) => {
      const { classId, userId, name, isTeacher } = data;
      console.log(`User ${socket.id} (ID: ${userId}, Name: ${name}) joining class ${classId} as ${isTeacher ? 'teacher' : 'student'}`);
      
      // Leave any previous rooms (if any)
      if (socket.userData && socket.userData.classId) {
        const oldClassId = socket.userData.classId.toString();
        console.log(`User ${socket.id} leaving previous class ${oldClassId}`);
        socket.leave(oldClassId);
      }
      
      // Store user data in socket for future reference
      socket.userData = {
        userId,
        classId,
        name,
        isTeacher
      };
      
      console.log(`Socket user data set for ${socket.id}:`, socket.userData);
      
      // Join the room for the class
      socket.join(classId.toString());
      console.log(`User ${socket.id} joined room ${classId}`);
      
      // Log rooms for debugging
      console.log(`Socket ${socket.id} is now in rooms:`, [...socket.rooms]);
      
      // Notify other users in the room
      socket.to(classId.toString()).emit('user-joined', { userId });
      console.log(`Notified other users in class ${classId} about user ${userId} joining`);
    });
    
    // Handle rejoin event for reconnection
    socket.on('rejoin-class', (data) => {
      const { classId, userId } = data;
      console.log(`User ${socket.id} (ID: ${userId}) is attempting to rejoin class ${classId}`);
      
      // Join the room again
      socket.join(classId.toString());
      
      // Notify other users that this user is reconnecting
      socket.to(classId.toString()).emit('user-rejoined', {
        userId
      });
    });
    
    // Handle WebRTC signaling - offers
    socket.on('offer', (data) => {
      const { targetUserId, offer } = data;
      console.log(`Relaying offer from ${socket.id} to user ${targetUserId}`);
      
      // Forward the offer to the target user
      io.to(targetUserId).emit('offer', {
        userId: socket.userData?.userId,
        offer
      });
    });
    
    // Handle WebRTC signaling - answers
    socket.on('answer', (data) => {
      const { targetUserId, answer } = data;
      console.log(`Relaying answer from ${socket.id} to user ${targetUserId}`);
      
      // Forward the answer to the target user
      io.to(targetUserId).emit('answer', {
        userId: socket.userData?.userId,
        answer
      });
    });
    
    // Handle WebRTC signaling - ICE candidates
    socket.on('ice-candidate', (data) => {
      const { targetUserId, candidate } = data;
      console.log(`Relaying ICE candidate from ${socket.id} to user ${targetUserId}`);
      
      // Forward the ICE candidate to the target user
      io.to(targetUserId).emit('ice-candidate', {
        userId: socket.userData?.userId,
        candidate
      });
    });
    
    // Broadcast emotion data to classroom
    socket.on('emotion-data', (data) => {
      const { userId, classId, emotion, confidence } = data;
      console.log(`Emotion data from ${socket.id}: ${emotion} (${confidence}) for user ${userId} in class ${classId}`);
      
      // Ensure user data is set correctly
      if (!socket.userData) {
        console.log(`Socket ${socket.id} has no userData, setting it now using the provided data`);
        socket.userData = { userId, classId };
      }
      
      // Double check that user is in the right room
      if (!socket.rooms.has(classId.toString())) {
        console.log(`Socket ${socket.id} not in room ${classId}, joining now`);
        socket.join(classId.toString());
      }
      
      // Broadcast to all users in the class except the sender
      console.log(`Broadcasting emotion ${emotion} to all users in class ${classId}`);
      socket.to(classId.toString()).emit('emotion-update', {
        userId,
        emotion,
        confidence
      });
      
      // Log detailed info for debugging
      console.log(`Socket rooms:`, [...socket.rooms]);
      console.log(`Broadcasting emotion ${emotion} from user ${userId} to class ${classId}`);
    });
    
    // Handle leave class
    socket.on('leave-class', (data) => {
      const { classId, userId } = data;
      console.log(`User ${socket.id} (ID: ${userId}) left class ${classId}`);
      
      // Leave the room
      socket.leave(classId.toString());
      
      // Notify other users in the room
      socket.to(classId.toString()).emit('user-left', {
        userId
      });
      
      // Clear user data
      socket.userData = null;
    });
    
    // Disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // If user was in a class, notify others
      if (socket.userData) {
        const { classId, userId } = socket.userData;
        socket.to(classId.toString()).emit('user-left', {
          userId
        });
      }
    });
  });

  // Start server
  const PORT = process.env.PORT || 5001; // Changed from 5000 to 5001
  const HOST = '0.0.0.0'; // Listen on all network interfaces
  server.listen(PORT, HOST, () => {
    console.log(`\n🚀 EmoEdu Server running on port ${PORT}`);
    console.log(`\n📱 Access options:`);
    console.log(`   • Local access: http://localhost:${PORT}`);
    
    // Get all network IPs
    const networkIPs = getNetworkIPs();
    if (networkIPs.length > 0) {
      console.log(`   • Other devices on your network can connect using:`);
      networkIPs.forEach(ip => {
        console.log(`     - http://${ip}:${PORT}`);
      });
      console.log(`\n⚠️  Note: Other devices must be on the same network to connect.`);
    } else {
      console.log(`   • No external network interfaces detected.`);
    }
    
    console.log(`\n⚙️  To allow access from the internet, consider using ngrok or a similar service.`);
    console.log(`   To install ngrok: npm install -g ngrok`);
    console.log(`   To expose your server: ngrok http ${PORT}\n`);
  });
});

module.exports = { app, server, io }; 