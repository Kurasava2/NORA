@echo off
setlocal
cd /d "%~dp0"
call npm install || goto :error
call npm run dist:win7 || goto :error
echo.
echo Done. See release folder.
pause
exit /b 0
:error
echo.
echo Build failed.
pause
exit /b 1
