@echo off
echo Starting Simple Secure HTTPS EmoEdu Server...

REM Go to project directory
cd /d %~dp0
cd backend

REM Make sure the main server is running
start cmd /k "node server.js"

REM Wait for main server to start
timeout /t 3

REM Run the HTTPS server
echo Starting HTTPS server on port 5443...
node simple-https.js

pause 