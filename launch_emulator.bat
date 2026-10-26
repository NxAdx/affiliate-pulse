@echo off
title Launch Affiliate Pulse Emulator
color 0A

echo ========================================================
echo   Launching Android Emulator (medium_phone)...
echo ========================================================
echo.

set EMU_PATH=%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe
set ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
set APK_PATH=%~dp0app-release.apk

if not exist "%EMU_PATH%" (
    echo [ERROR] Android emulator not found at: %EMU_PATH%
    pause
    exit /b 1
)

echo Starting emulator window...
start "" "%EMU_PATH%" -avd medium_phone

echo.
echo Waiting for emulator to boot up...
"%ADB_PATH%" wait-for-device

:check_boot
for /f "tokens=*" %%a in ('"%ADB_PATH%" shell getprop sys.boot_completed 2^>nul') do set BOOT=%%a
if "%BOOT%"=="1" goto boot_done
timeout /t 2 /nobreak >nul
goto check_boot

:boot_done
echo.
echo [SUCCESS] Emulator is online!
echo Installing latest Affiliate Pulse release APK...
"%ADB_PATH%" install -r "%APK_PATH%"

echo.
echo Launching Affiliate Pulse...
"%ADB_PATH%" shell am start -n com.nxadx.affiliatepulse/.MainActivity

echo.
echo ========================================================
echo   Affiliate Pulse is now running on your emulator!
echo ========================================================
timeout /t 5
