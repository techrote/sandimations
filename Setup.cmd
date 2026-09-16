@echo off
setlocal
pushd "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :missing_node
where npm >nul 2>nul
if errorlevel 1 goto :missing_node

echo [sandimations] Installing exact dependencies from package-lock.json...
call npm ci
if errorlevel 1 goto :failed

echo.
echo [sandimations] Setup complete.
popd
if /I "%~1"=="--no-pause" exit /b 0
pause
exit /b 0

:missing_node
echo.
echo [sandimations] Node.js and npm are required. Install Node.js 24, then run Setup.cmd again.
popd
if /I "%~1"=="--no-pause" exit /b 1
pause
exit /b 1

:failed
echo.
echo [sandimations] Setup failed. Review the npm output above.
popd
if /I "%~1"=="--no-pause" exit /b 1
pause
exit /b 1
