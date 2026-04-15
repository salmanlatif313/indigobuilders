@echo off
setlocal EnableDelayedExpansion

set "TARGET_ROOT=C:\InternalPortal"
set "SERVER_DIR=%TARGET_ROOT%\server"
set "APP_NAME=internalportal-api"
set "HEALTH_URL=http://localhost:3001/api/health"
set "DB_HEALTH_URL=http://localhost:3001/api/health/db"

echo ============================================================
echo  InternalPortal - Server PM2 Manager
echo ============================================================
echo.

:MENU
echo  What do you want to do?
echo.
echo  [1] Fresh Start    - Recreate the PM2 app
echo  [2] Restart        - Restart the PM2 app
echo  [3] Stop           - Stop the PM2 app
echo  [4] Status         - Show PM2 status and health checks
echo  [5] Logs           - Tail application logs
echo  [6] Apply Deploy   - Run server-apply-deployment.bat
echo  [7] Exit
echo.
set /p CHOICE=Enter choice [1-7]:

if "%CHOICE%"=="1" goto FRESH_START
if "%CHOICE%"=="2" goto RESTART
if "%CHOICE%"=="3" goto STOP
if "%CHOICE%"=="4" goto STATUS
if "%CHOICE%"=="5" goto LOGS
if "%CHOICE%"=="6" goto APPLY_DEPLOY
if "%CHOICE%"=="7" goto END
echo Invalid choice, try again.
echo.
goto MENU

:FRESH_START
echo.
echo [1/4] Checking required files...
if not exist "%TARGET_ROOT%\ecosystem.config.cjs" (
  echo ERROR: %TARGET_ROOT%\ecosystem.config.cjs not found.
  pause
  goto MENU
)
if not exist "%TARGET_ROOT%\server-apply-deployment.bat" (
  echo ERROR: %TARGET_ROOT%\server-apply-deployment.bat not found.
  pause
  goto MENU
)
if not exist "%TARGET_ROOT%\.env" (
  echo ERROR: %TARGET_ROOT%\.env not found.
  pause
  goto MENU
)
if not exist "%SERVER_DIR%\dist\index.js" (
  echo ERROR: %SERVER_DIR%\dist\index.js not found.
  echo        Run deploy\iis\deploy-to-share.bat on the dev machine first.
  pause
  goto MENU
)

echo [2/4] Removing existing PM2 app...
call pm2 delete %APP_NAME% >nul 2>&1

echo [3/4] Starting PM2 app from ecosystem config...
cd /d "%TARGET_ROOT%"
call pm2 start ecosystem.config.cjs --only %APP_NAME%
if errorlevel 1 (
  echo ERROR: PM2 start failed.
  pause
  goto MENU
)

echo [4/4] Saving PM2 state...
call pm2 save
if errorlevel 1 (
  echo ERROR: PM2 save failed.
  pause
  goto MENU
)

echo.
goto STATUS_INLINE

:RESTART
echo.
echo Restarting %APP_NAME%...
call pm2 restart %APP_NAME%
if errorlevel 1 (
  echo ERROR: PM2 restart failed.
  pause
  goto MENU
)
echo.
goto STATUS_INLINE

:STOP
echo.
echo Stopping %APP_NAME%...
call pm2 stop %APP_NAME%
if errorlevel 1 (
  echo ERROR: PM2 stop failed.
  pause
  goto MENU
)
echo.
pause
goto MENU

:STATUS
echo.
:STATUS_INLINE
call pm2 status
echo.
echo Testing health endpoints...
echo.
echo -- app health --
curl -s -o nul -w "HTTP Status: %%{http_code}" %HEALTH_URL%
echo.
echo -- database health --
curl -s -o nul -w "HTTP Status: %%{http_code}" %DB_HEALTH_URL%
echo.
echo Expected: app=200, database=200
echo.
pause
goto MENU

:LOGS
echo.
echo Showing last 50 lines for %APP_NAME% (Ctrl+C to stop)...
echo.
call pm2 logs %APP_NAME% --lines 50
echo.
pause
goto MENU

:APPLY_DEPLOY
echo.
call "%TARGET_ROOT%\server-apply-deployment.bat"
echo.
pause
goto MENU

:END
echo Bye.
exit /b 0
