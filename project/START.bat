@echo off
echo.
echo  ================================
echo   NepalDaan - Starting Project
echo  ================================
echo.

echo  [1/3] Installing Backend packages...
cd /d "%~dp0project\backend"
call npm install --silent

echo  [2/3] Setting up database...
node src/models/seed.js

echo  [3/3] Installing Frontend packages...
cd /d "%~dp0project\frontend"
call npm install --silent

echo.
echo  Starting Backend and Frontend...
echo.

start "NepalDaan Backend" cmd /k "cd /d %~dp0project\backend && npm run dev"
timeout /t 3 /nobreak >nul
start "NepalDaan Frontend" cmd /k "cd /d %~dp0project\frontend && npm run dev"

echo.
echo  ================================
echo   Both servers are starting...
echo   Backend  -> http://localhost:5000
echo   Frontend -> http://localhost:5173
echo  ================================
echo.
echo  Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:5173

pause
