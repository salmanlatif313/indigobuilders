@echo off
setlocal EnableExtensions

set "TARGET_ROOT=C:\InternalPortal"
set "LOG_DIR=%TARGET_ROOT%\logs"
set "PM2_CMD=C:\Users\Administrator\AppData\Roaming\npm\pm2.cmd"

echo.
echo ==================================================
echo InternalPortal first-time server setup
echo ==================================================
echo.

if not exist "%TARGET_ROOT%" (
  echo ERROR: %TARGET_ROOT% does not exist.
  echo Create the deployment folder first or run the deploy copy step once.
  exit /b 1
)

if not exist "%PM2_CMD%" (
  echo ERROR: PM2 command not found at:
  echo   %PM2_CMD%
  echo Update PM2_CMD in this script to the correct path on the server.
  exit /b 1
)

if not exist "%LOG_DIR%" (
  echo Creating logs folder...
  mkdir "%LOG_DIR%"
  if errorlevel 1 (
    echo ERROR: Failed to create %LOG_DIR%
    exit /b 1
  )
)

if not exist "%TARGET_ROOT%\.env" (
  echo WARNING: %TARGET_ROOT%\.env does not exist yet.
  echo If you deployed from the dev machine with deploy-to-share.bat, rerun that first.
)

echo Running server deployment apply script...
call "%TARGET_ROOT%\server-apply-deployment.bat"
if errorlevel 1 (
  echo ERROR: Server apply deployment failed.
  exit /b 1
)

echo.
echo Setup completed.
echo IIS site root should point to:
echo   C:\InternalPortal\client\dist
echo.
echo Verify:
echo   https://internal.deltatechcorp.com/api/health
echo.
exit /b 0
