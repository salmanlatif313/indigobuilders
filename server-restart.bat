@echo off
cd /d "%~dp0"
echo Restarting IndigoBuilders API...
call pm2 restart indigobuilders-api
if %errorlevel% neq 0 (
  echo Restart failed. Trying start...
  call pm2 start ecosystem.config.cjs
)
call pm2 save
echo Done.
pause
