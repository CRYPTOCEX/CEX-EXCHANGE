@echo off
echo.
echo ========================================
echo   Quick TSX/TS File Formatter
echo ========================================
echo.

echo Formatting all TSX/TS files...
npx prettier --write "frontend/**/*.{ts,tsx}" --ignore-unknown

echo.
echo Formatting complete!
echo.
pause 