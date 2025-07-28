@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   TSX/TS File Beautifier for Windows
echo ========================================
echo.

:: Check if Prettier is available
echo Checking for Prettier...
npx prettier --version >nul 2>&1
if errorlevel 1 (
    echo Prettier not found. Installing...
    npm install --save-dev prettier
    if errorlevel 1 (
        echo Failed to install Prettier
        pause
        exit /b 1
    )
    echo Prettier installed successfully
) else (
    echo Prettier is available
)

:: Create .prettierrc if it doesn't exist
if not exist ".prettierrc" (
    echo Creating .prettierrc configuration file...
    (
        echo {
        echo   "semi": true,
        echo   "trailingComma": "es5",
        echo   "singleQuote": false,
        echo   "printWidth": 100,
        echo   "tabWidth": 2,
        echo   "useTabs": false,
        echo   "bracketSpacing": true,
        echo   "bracketSameLine": false,
        echo   "arrowParens": "avoid",
        echo   "endOfLine": "lf",
        echo   "quoteProps": "as-needed",
        echo   "jsxSingleQuote": false,
        echo   "parser": "typescript"
        echo }
    ) > .prettierrc
    echo Created .prettierrc configuration file
) else (
    echo Using existing .prettierrc configuration
)

echo.
echo Formatting all TSX/TS files in frontend directory...
echo.

:: Use npx prettier to format all files at once
npx prettier --write "frontend/**/*.{ts,tsx}" --ignore-path .prettierignore

if errorlevel 1 (
    echo.
    echo Some files may have failed to format due to syntax errors.
    echo Please check the output above for details.
) else (
    echo.
    echo All files have been successfully formatted!
)

echo.
echo Done!
pause 