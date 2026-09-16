@echo off
setlocal
pushd "%~dp0"

if not exist "node_modules\.bin\vite.cmd" (
  echo [sandimations] Dependencies are not installed yet. Running Setup.cmd first...
  call "%~dp0Setup.cmd" --no-pause
  if errorlevel 1 goto :failed
)

echo [sandimations] Running repository verification...
call npm run verify
if errorlevel 1 goto :failed

echo.
echo [sandimations] Verification passed.
popd
if /I "%~1"=="--no-pause" exit /b 0
pause
exit /b 0

:failed
echo.
echo [sandimations] Verification failed. Review the output above.
popd
if /I "%~1"=="--no-pause" exit /b 1
pause
exit /b 1
