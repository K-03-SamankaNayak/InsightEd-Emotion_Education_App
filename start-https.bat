@echo off
echo Starting HTTPS Server for Mobile Camera Access...
cd /d %~dp0
cd backend
node simple-https.js
pause 