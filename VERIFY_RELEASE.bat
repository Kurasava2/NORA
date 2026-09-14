@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "APP_VERSION=1.4.2"
set "EXE=release\GSM-Vedomosti-%APP_VERSION%-portable-Win7-ia32.exe"

echo [1/5] Clean install...
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release
call npm ci
if errorlevel 1 goto :fail

echo [2/5] Regression tests...
call npm test
if errorlevel 1 goto :fail

echo [3/5] Production Vite build...
call npm run build
if errorlevel 1 goto :fail

echo [4/5] Electron portable Win7 x86 package...
call npx electron-builder --win portable --ia32
if errorlevel 1 goto :fail

if not exist "%EXE%" (
  echo ERROR: Expected artifact not found: %EXE%
  goto :fail
)

echo [5/5] Verify PE32/i386 machine type...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=[IO.Path]::GetFullPath('%EXE%'); $b=[IO.File]::ReadAllBytes($p); if($b.Length -lt 256){Write-Error 'EXE too small'; exit 2}; $pe=[BitConverter]::ToInt32($b,60); if($pe -lt 0 -or $pe+6 -gt $b.Length){Write-Error 'Invalid PE header'; exit 3}; $m=[BitConverter]::ToUInt16($b,$pe+4); if($m -ne 0x014c){Write-Error ('Wrong PE machine: 0x{0:X4}; expected 0x014C i386' -f $m); exit 4}; Write-Host ('OK: PE32/i386 0x{0:X4}' -f $m)"
if errorlevel 1 goto :fail

echo.
echo RELEASE GATE PASSED
echo Artifact: %EXE%
exit /b 0

:fail
echo.
echo RELEASE GATE FAILED
exit /b 1
