@echo off
cd /d "%~dp0"
:menu
echo.
echo  IndigoBuilders — Server Manager
echo  ================================
echo  [1] Status
echo  [2] Restart
echo  [3] Stop
echo  [4] Start
echo  [5] View Logs
echo  [6] Exit
echo.
set /p choice="Select option: "
if "%choice%"=="1" ( pm2 status & goto menu )
if "%choice%"=="2" ( pm2 restart indigobuilders-api & pm2 save & goto menu )
if "%choice%"=="3" ( pm2 stop indigobuilders-api & goto menu )
if "%choice%"=="4" ( pm2 start ecosystem.config.cjs & pm2 save & goto menu )
if "%choice%"=="5" ( pm2 logs indigobuilders-api --lines 50 & goto menu )
if "%choice%"=="6" exit /b 0
goto menu
