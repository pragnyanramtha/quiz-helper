@echo off
echo ========================================
echo  CheatSheet AI - Fix Windows Shortcut
echo ========================================
echo.
echo This will clear Windows icon cache and fix the Start Menu shortcut issue.
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Stopping Explorer...
taskkill /f /im explorer.exe

echo.
echo Clearing icon cache...
cd /d %userprofile%\AppData\Local
attrib -h IconCache.db
del IconCache.db /f /q

echo.
echo Clearing thumbnail cache...
del /f /s /q %localappdata%\Microsoft\Windows\Explorer\thumbcache_*.db

echo.
echo Restarting Explorer...
start explorer.exe

echo.
echo ========================================
echo  Done!
echo ========================================
echo.
echo Next steps:
echo 1. Uninstall CheatSheet AI (if installed)
echo 2. Reinstall using the new installer
echo 3. The shortcut should work correctly now
echo.
pause
