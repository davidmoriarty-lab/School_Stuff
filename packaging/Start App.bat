@echo off
rem Starts the Classroom app on THIS computer only (127.0.0.1) and opens it in your browser.
rem Keep this window open while you use the app. Close it (or press Ctrl+C) to stop the app.
cd /d "%~dp0"
title Classroom App (running - close this window to stop)

set HOSTNAME=127.0.0.1
set PORT=3000
set NODE_ENV=production
set CLASSROOM_LIBRARY_DIR=%~dp0library

echo.
echo  Classroom App is starting at http://127.0.0.1:%PORT%
echo  Your data is saved in the "data" folder next to this file.
echo  Leave this window open while you work.
echo.

rem Open the browser after a short pause so the server is ready.
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://127.0.0.1:%PORT%"

"%~dp0node\node.exe" server.js
echo.
echo  The app has stopped. If you saw an error above, the most common cause is that
echo  another copy is already running (port %PORT% in use). Close it and try again.
pause
