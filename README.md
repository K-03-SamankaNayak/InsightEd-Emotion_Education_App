# 📚 InsightEd – Emotion-Based Online Education App

**InsightEd** is a next-generation e-learning platform that combines traditional virtual classrooms with real-time emotion detection to enhance teaching effectiveness and student engagement. Built to work like Google Meet or Zoom, it adds AI-driven emotion insights that help educators tailor their sessions better.

---

## 💡 Key Features

- 🎥 **Live Video/Audio Classes**  
  Real-time virtual classes for students with webcam and mic support.

- 😊 **Emotion Detection**  
  Uses computer vision and deep learning to detect students' emotional states (e.g., happy, confused, distracted) via webcam.

- 📊 **Teacher Dashboard**  
  Live emotion analytics of each student, helping educators adapt their teaching strategies.

- 💬 **Real-Time Chat**  
  In-class chat functionality for questions and collaboration.

- 📑 **Note Sharing**  
  Teachers can upload and share lecture notes with students during or after the session.

---

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript, Bootstrap  
- **Backend**: Node.js, Express.js, Socket.io  
- **Database**: MongoDB  
- **Machine Learning**: Python, OpenCV, TensorFlow/Keras  
- **Real-time Communication**: WebRTC for video/audio, WebSockets for chat/emotion feed

---

## 🧠 Emotion Detection Model

- Uses a **CNN-based deep learning model** trained on facial expression datasets (e.g., FER-2013).
- Detects emotions such as:  
  `Happy`, `Sad`, `Neutral`, `Angry`, `Surprised`, `Fear`, `Disgust`
- Outputs emotion stats to the teacher in real-time.

---


