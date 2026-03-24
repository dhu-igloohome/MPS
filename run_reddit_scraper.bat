@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo Complaints scraper (HN + GitHub)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Please install Node.js 18+ from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    echo.
    pause
    exit /b 1
  )
)

echo Starting data collection...
echo.
call npm run complaints:scrape

echo.
echo Finished. Press any key to close.
pause >nul
