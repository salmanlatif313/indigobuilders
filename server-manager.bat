@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  Unified PM2 Server Manager
::  Manages all 3 applications on this server
:: ============================================================
::
::  App 1 — IndigoBuilders ERP
::    Path : C:\indigobuilders
::    PM2  : indigobuilders-api
::    Port : 4000
::
::  App 2 — Internal Portal
::    Path : C:\InternalPortal
::    PM2  : internalportal-api
::    Port : 3001
::
::  App 3 — SalApp (Personal Accounting)
::    Path : C:\Sites
::    PM2  : salapp-api
::    Port : 3000
::
:: ============================================================

set "APP1_NAME=indigobuilders-api"
set "APP1_ROOT=C:\indigobuilders"
set "APP1_PORT=4000"

set "APP2_NAME=internalportal-api"
set "APP2_ROOT=C:\InternalPortal"
set "APP2_PORT=3001"

set "APP3_NAME=salapp-api"
set "APP3_ROOT=C:\Sites"
set "APP3_PORT=3000"

:MENU
cls
echo.
echo  ============================================================
echo   Server Manager — All Applications
echo  ============================================================
echo.
echo   ALL APPS
echo   [1] Status (all apps)
echo   [2] Restart all
echo   [3] Stop all
echo   [4] Start all (from ecosystem configs)
echo.
echo   INDIVIDUAL
echo   [5] IndigoBuilders ERP   (port %APP1_PORT%)
echo   [6] Internal Portal      (port %APP2_PORT%)
echo   [7] SalApp               (port %APP3_PORT%)
echo.
echo   LOGS
echo   [8] Logs — IndigoBuilders
echo   [9] Logs — Internal Portal
echo   [0] Logs — SalApp
echo.
echo   [X] Exit
echo.
set /p CHOICE=Select option:

if /i "%CHOICE%"=="1" goto STATUS_ALL
if /i "%CHOICE%"=="2" goto RESTART_ALL
if /i "%CHOICE%"=="3" goto STOP_ALL
if /i "%CHOICE%"=="4" goto START_ALL
if /i "%CHOICE%"=="5" goto APP1_MENU
if /i "%CHOICE%"=="6" goto APP2_MENU
if /i "%CHOICE%"=="7" goto APP3_MENU
if /i "%CHOICE%"=="8" goto LOGS_APP1
if /i "%CHOICE%"=="9" goto LOGS_APP2
if /i "%CHOICE%"=="0" goto LOGS_APP3
if /i "%CHOICE%"=="X" goto END
echo.
echo  Invalid choice.
pause
goto MENU

:: ============================================================
::  ALL-APP ACTIONS
:: ============================================================

:STATUS_ALL
cls
echo.
echo  ---- PM2 Status (all apps) ----
call pm2 status
echo.
echo  ---- Health Checks ----
call :health_check "IndigoBuilders" "http://localhost:%APP1_PORT%/api/health"
call :health_check "InternalPortal" "http://localhost:%APP2_PORT%/api/health"
call :health_check "SalApp        " "http://localhost:%APP3_PORT%/api/health"
echo.
pause
goto MENU

:RESTART_ALL
echo.
echo  Restarting all apps...
call pm2 restart %APP1_NAME%
call pm2 restart %APP2_NAME%
call pm2 restart %APP3_NAME%
call pm2 save
echo.
echo  Done. Showing status:
call pm2 status
echo.
pause
goto MENU

:STOP_ALL
echo.
echo  Stopping all apps...
call pm2 stop %APP1_NAME%
call pm2 stop %APP2_NAME%
call pm2 stop %APP3_NAME%
echo.
echo  All apps stopped.
pause
goto MENU

:START_ALL
echo.
echo  Starting all apps from ecosystem configs...
echo.
echo  [1/3] IndigoBuilders...
cd /d "%APP1_ROOT%"
call pm2 start ecosystem.config.cjs --only %APP1_NAME%
echo.
echo  [2/3] InternalPortal...
cd /d "%APP2_ROOT%"
call pm2 start ecosystem.config.cjs --only %APP2_NAME%
echo.
echo  [3/3] SalApp...
cd /d "%APP3_ROOT%"
call pm2 start ecosystem.config.cjs --only %APP3_NAME%
echo.
call pm2 save
echo.
echo  All apps started. Showing status:
call pm2 status
echo.
pause
goto MENU

:: ============================================================
::  INDIVIDUAL APP MENUS
:: ============================================================

:APP1_MENU
cls
echo.
echo  IndigoBuilders ERP  [%APP1_NAME%  port:%APP1_PORT%]
echo  ----------------------------------------
echo  [1] Restart
echo  [2] Stop
echo  [3] Fresh Start (delete + recreate)
echo  [4] Status + health
echo  [5] Apply deployment
echo  [B] Back
echo.
set /p C1=Select:
if /i "%C1%"=="1" ( call pm2 restart %APP1_NAME% & call pm2 save & goto APP1_MENU )
if /i "%C1%"=="2" ( call pm2 stop    %APP1_NAME% & goto APP1_MENU )
if /i "%C1%"=="3" ( call :fresh_start "%APP1_NAME%" "%APP1_ROOT%" & goto APP1_MENU )
if /i "%C1%"=="4" ( call pm2 status & call :health_check "IndigoBuilders" "http://localhost:%APP1_PORT%/api/health" & pause & goto APP1_MENU )
if /i "%C1%"=="5" ( call "%APP1_ROOT%\server-apply-deployment.bat" & pause & goto APP1_MENU )
if /i "%C1%"=="B" goto MENU
goto APP1_MENU

:APP2_MENU
cls
echo.
echo  Internal Portal  [%APP2_NAME%  port:%APP2_PORT%]
echo  ----------------------------------------
echo  [1] Restart
echo  [2] Stop
echo  [3] Fresh Start (delete + recreate)
echo  [4] Status + health
echo  [5] Apply deployment
echo  [B] Back
echo.
set /p C2=Select:
if /i "%C2%"=="1" ( call pm2 restart %APP2_NAME% & call pm2 save & goto APP2_MENU )
if /i "%C2%"=="2" ( call pm2 stop    %APP2_NAME% & goto APP2_MENU )
if /i "%C2%"=="3" ( call :fresh_start "%APP2_NAME%" "%APP2_ROOT%" & goto APP2_MENU )
if /i "%C2%"=="4" ( call pm2 status & call :health_check "InternalPortal" "http://localhost:%APP2_PORT%/api/health" & pause & goto APP2_MENU )
if /i "%C2%"=="5" ( call "%APP2_ROOT%\server-apply-deployment.bat" & pause & goto APP2_MENU )
if /i "%C2%"=="B" goto MENU
goto APP2_MENU

:APP3_MENU
cls
echo.
echo  SalApp  [%APP3_NAME%  port:%APP3_PORT%]
echo  ----------------------------------------
echo  [1] Restart
echo  [2] Stop
echo  [3] Fresh Start (delete + recreate)
echo  [4] Status + health
echo  [5] Apply deployment
echo  [B] Back
echo.
set /p C3=Select:
if /i "%C3%"=="1" ( call pm2 restart %APP3_NAME% & call pm2 save & goto APP3_MENU )
if /i "%C3%"=="2" ( call pm2 stop    %APP3_NAME% & goto APP3_MENU )
if /i "%C3%"=="3" ( call :fresh_start "%APP3_NAME%" "%APP3_ROOT%" & goto APP3_MENU )
if /i "%C3%"=="4" ( call pm2 status & call :health_check "SalApp" "http://localhost:%APP3_PORT%/api/health" & pause & goto APP3_MENU )
if /i "%C3%"=="5" ( call "%APP3_ROOT%\server-apply-deployment.bat" & pause & goto APP3_MENU )
if /i "%C3%"=="B" goto MENU
goto APP3_MENU

:: ============================================================
::  LOGS
:: ============================================================

:LOGS_APP1
echo.
echo  IndigoBuilders logs (Ctrl+C to stop)...
echo.
call pm2 logs %APP1_NAME% --lines 50
pause
goto MENU

:LOGS_APP2
echo.
echo  Internal Portal logs (Ctrl+C to stop)...
echo.
call pm2 logs %APP2_NAME% --lines 50
pause
goto MENU

:LOGS_APP3
echo.
echo  SalApp logs (Ctrl+C to stop)...
echo.
call pm2 logs %APP3_NAME% --lines 50
pause
goto MENU

:: ============================================================
::  SUBROUTINES
:: ============================================================

:fresh_start
set "_APP=%~1"
set "_ROOT=%~2"
echo.
echo  [1/3] Removing existing PM2 entry for %_APP%...
call pm2 delete %_APP% >nul 2>&1
echo  [2/3] Starting from ecosystem.config.cjs in %_ROOT%...
cd /d "%_ROOT%"
call pm2 start ecosystem.config.cjs --only %_APP%
if errorlevel 1 (
  echo  ERROR: pm2 start failed.
  pause
  exit /b 1
)
echo  [3/3] Saving PM2 state...
call pm2 save
echo.
call pm2 status
echo.
pause
exit /b 0

:health_check
set "_LABEL=%~1"
set "_URL=%~2"
set /a _CODE=0
for /f %%i in ('curl -s -o nul -w "%%{http_code}" %_URL% 2^>nul') do set _CODE=%%i
if "%_CODE%"=="200" (
  echo   [OK ]  %_LABEL%  ^(%_URL%^)
) else (
  echo   [ERR]  %_LABEL%  ^(%_URL%^)  HTTP %_CODE%
)
exit /b 0

:END
echo.
echo  Goodbye.
exit /b 0
