# EmoEdu: Emotion-Aware Education Platform

EmoEdu is an innovative online education platform that integrates real-time emotion detection during live classes, providing teachers with valuable insights into student engagement and emotional states.

## Features

- **Live Video Classes:** Interactive classes with video and audio similar to Google Meet
- **Real-time Emotion Detection:** Detect student emotions through webcam using machine learning
- **Emotion Analytics:** Visualize and analyze class emotions to improve teaching strategies
- **Class Management:** Create, join, and manage online classes with ease

## Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Express.js, Node.js
- **Database:** MongoDB
- **ML Model Training:** Python, TensorFlow
- **Real-time Communication:** Socket.IO, WebRTC
- **Emotion Detection:** TensorFlow.js

## Dataset

This project uses the FER2013 dataset for training the emotion detection model. The dataset contains facial expressions categorized into seven emotions:
- Angry
- Disgusted
- Fearful
- Happy
- Neutral
- Sad
- Surprised

## Project Structure

```
EmoEdu/
├── backend/              # Express.js backend
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── config/           # Configuration files
│   └── server.js         # Server entry point
├── frontend/             # Web frontend
│   ├── public/           # Static files and assets
│   ├── src/              # Source files
│   │   ├── css/          # CSS stylesheets
│   │   ├── js/           # JavaScript files
│   │   └── images/       # Images and icons
│   └── index.html        # Main HTML file
├── model_training/       # Python scripts for training the model
│   ├── train_model.py    # Main training script
│   └── requirements.txt  # Python dependencies
└── FER2013/             # Dataset directory
    ├── train/            # Training data
    └── test/             # Testing data
```

## Setup Instructions

### Prerequisites
- Node.js and npm
- MongoDB
- Python 3.7+ with pip
- WebCam for emotion detection

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a .env file with the following variables:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/emoedu
   JWT_SECRET=your_jwt_secret_key_here
   NODE_ENV=development
   ```
4. Start the server:
   ```
   npm run dev
   ```

### Train Emotion Detection Model
1. Navigate to the model_training directory:
   ```
   cd model_training
   ```
2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Train the model:
   ```
   python train_model.py
   ```
   This will create the model files in the `backend/models/` directory and convert them for TensorFlow.js in `frontend/public/model/`.

### Frontend Setup
1. The frontend is served by the backend in production mode. For development, you can use a tool like Live Server in VSCode to serve the frontend files.

## How It Works

1. **Authentication:** Users register and login as either students or teachers
2. **Class Management:** Teachers create classes, students join classes
3. **Live Class:** When a teacher starts a class, students can join the live session
4. **Emotion Detection:** During the live class, the system detects emotions from webcam feeds
5. **Analytics:** Teachers can view real-time emotion analytics to adapt their teaching approach

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Quick Start for Windows Users

The easiest way to run EmoEdu on Windows is using our batch files:

1. **Start Both Servers at Once**:
   - Double-click `start-both-servers.bat`
   - This will open two command windows running both servers

2. **Or Run Servers Individually**:
   - **Main Application**: Double-click `run-server.bat`
   - **Test Login Page**: Double-click `serve-test-page.bat`

## Access the Application

- **Main Application**: http://localhost:5001
- **Test Login Page**: http://localhost:8000

## Troubleshooting

### Login Issues

If you receive "Invalid credentials" when trying to log in:

1. Make sure you're using the correct server
2. The test server (test-server.js) and main server (server.js) have separate databases
3. You need to register an account on each server separately

### Account Registration

To register a new account:
- Navigate to either server URL
- Click "Register" and fill out the form
- Use role "teacher" to create classes

## For PowerShell Users

PowerShell doesn't support the `&&` operator like bash. Use the provided batch files or run the commands separately:

```powershell
# Run main server
cd C:\Users\SAMANKA\OneDrive\Desktop\EmoEdu
node backend/server.js

# In a new window, run test login page server
cd C:\Users\SAMANKA\OneDrive\Desktop\EmoEdu\backend
node serve-test.js
``` 