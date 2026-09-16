@echo off
setlocal
pushd "%~dp0"

if not exist "node_modules\.bin\vite.cmd" (
  echo [sandimations] Dependencies are not installed yet. Running Setup.cmd first...
  call "%~dp0Setup.cmd" --no-pause
  if errorlevel 1 goto :failed
)

echo [sandimations] Starting development server and opening the app...
call npm run dev -- --open
set EXIT_CODE=%ERRORLEVEL%
popd
exit /b %EXIT_CODE%

:failed
popd
exit /b 1
