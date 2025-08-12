@echo off
cls
echo =========================================
echo    Translation Management System
echo =========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if package.json exists
if not exist package.json (
    echo [ERROR] package.json not found
    echo Please ensure you're in the translation-manager directory
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists, if not install dependencies
if not exist node_modules (
    echo [INFO] Installing dependencies...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed successfully!
    echo.
)

:: Check if Claude Code is available
claude --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Claude Code CLI not found in PATH
    echo AI translation features may not work properly
    echo Install Claude Code CLI for full functionality
    echo.
)

:: Start the server
echo [INFO] Starting Translation Management System...
echo.
echo Server will be available at: http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo =========================================
echo.

:: Start the server
npm start

:: If server stops, show message
echo.
echo [INFO] Translation Management System stopped
echo.
pause