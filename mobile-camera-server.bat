@echo off
echo ======================================================
echo     HTTPS SERVER FOR MOBILE CAMERA ACCESS
echo ======================================================
echo.
echo This script will start the HTTPS server on port 5443
echo which enables camera access on mobile devices.
echo.
echo Make sure the main server is already running on port 5001.
echo.
echo ======================================================
echo.

cd %~dp0\backend
node simple-https.js

pause 