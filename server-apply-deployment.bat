@echo off
cd /d "%~dp0"
echo Applying IndigoBuilders deployment...

if exist ".deploy-server-deps-needed" (
  echo Installing server dependencies...
  cd server
  call npm install --omit=dev
  if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
  cd ..
  del ".deploy-server-deps-needed"
)

echo Creating logs directory...
if not exist "logs" mkdir logs

echo Restarting PM2 app...
call pm2 restart indigobuilders-api
if %errorlevel% neq 0 (
  call pm2 start ecosystem.config.cjs
)
call pm2 save

echo Deployment applied successfully.
pause
