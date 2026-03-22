@echo off
echo.
echo  ================================
echo   NepalDaan - Quick Restart
echo  ================================
echo.

start "NepalDaan Backend"  cmd /k "cd /d %~dp0project\backend  && npm run dev"
timeout /t 3 /nobreak >nul
start "NepalDaan Frontend" cmd /k "cd /d %~dp0project\frontend && npm run dev"

timeout /t 5 /nobreak >nul
start http://localhost:5173

echo  Done! Browser opening...
