@echo off
setlocal
cd /d "%~dp0"

call npm ci --no-audit --no-fund || goto :error
call npm test || goto :error
call npm run dist:win7:x86 || goto :error

echo.
echo Done. See release folder.
pause
exit /b 0

:error
echo.
echo Build failed.
pause
exit /b 1
