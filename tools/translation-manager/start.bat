@echo off
setlocal enabledelayedexpansion
title Translation Manager Server

echo =========================================
echo    Translation Management System
echo =========================================
echo.

:: Change to the script's directory
cd /d "%~dp0"
echo Current directory: %CD%
echo.

:: Add pause at the beginning for debugging
echo Press any key to continue with startup checks...
pause >nul

:: Check if Node.js is installed
echo Checking Node.js installation...
node --version 2>nul
if !errorlevel! neq 0 (
    echo.
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo Node.js found: 
node --version
echo.

:: Check if package.json exists
echo Checking for package.json...
if not exist "package.json" (
    echo.
    echo [ERROR] package.json not found in: %CD%
    echo Please ensure you're in the translation-manager directory
    echo.
    dir /b
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)
echo package.json found
echo.

:: Check if node_modules exists
echo Checking dependencies...
if not exist "node_modules" (
    echo.
    echo [INFO] Installing dependencies...
    echo This may take a few minutes...
    echo.
    npm install
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies
        echo Error code: !errorlevel!
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed successfully!
    echo.
)
echo Dependencies OK
echo.

:: Start the server
echo =========================================
echo [INFO] Starting Translation Management System...
echo.
echo Server will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo =========================================
echo.

:: Start the server and keep window open
node server.js

:: If we get here, the server has stopped
echo.
echo =========================================
echo [INFO] Server stopped
echo =========================================
echo.
echo Press any key to close this window...
pause >nul