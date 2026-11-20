@echo off
rem Starts the Classroom app on THIS computer only (127.0.0.1) and opens it in your browser.
rem Keep this window open while you use the app. Close it (or press Ctrl+C) to stop the app.
cd /d "%~dp0"
title Classroom App (running - close this window to stop)

rem --- Check that everything the app needs is next to this file -------------------------------------------
if not exist "%~dp0node\node.exe" goto missing
if not exist "%~dp0server.js" goto missing
if not exist "%~dp0.next" goto missing
goto ready

:missing
echo.
echo  The app cannot start because some of its files are missing next to this file.
echo.
echo  The most common cause: Start App.bat was opened from INSIDE a zip file.
echo  Windows lets you open a zip like a folder, but that only unpacks this one file.
echo.
echo  To fix it:
echo    1. Close this window.
echo    2. Right-click the zip file and choose "Extract All..."  (do this for every zip, if there is a zip inside a zip)
echo    3. Open the extracted ClassroomApp folder. It should contain: node, library, node_modules, .next, server.js
echo    4. Double-click Start App.bat from that folder.
echo.
echo  This file is currently in:
echo    %~dp0
echo.
pause
exit /b 1

:ready
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
