@echo off
echo Starting EmoEdu Application...

REM Start the main application server in a new window
start cmd /k "cd %~dp0 && node backend/server.js"

REM Start the test login page server in another window
start cmd /k "cd %~dp0/backend && node serve-test.js"

echo.
echo ======================================================
echo EmoEdu servers are now running in separate windows
echo.
echo Main application: http://localhost:5001
echo Test login page: http://localhost:8000
echo ======================================================
echo. 