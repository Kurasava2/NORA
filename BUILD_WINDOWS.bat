@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo GSM Vedomosti v1.4.1 release verification and Win7 x86 build
echo.
call VERIFY_RELEASE.bat
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" (
  echo Build/verification failed. See messages above.
) else (
  echo Build/verification completed successfully.
)
echo.
pause
exit /b %RC%
