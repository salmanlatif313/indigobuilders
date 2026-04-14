@echo off
setlocal EnableExtensions

set "TARGET_ROOT=\\internal.deltatechcorp.com\c$\IndigoBuilders"

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%\..\..") do set "SOURCE_ROOT=%%~fI"

set "TARGET_CLIENT_DIST=%TARGET_ROOT%\client\dist"
set "TARGET_SERVER_DIST=%TARGET_ROOT%\server\dist"
set "TARGET_SERVER_DIR=%TARGET_ROOT%\server"
set "TARGET_BACKUP_ROOT=%TARGET_ROOT%\backups"
set "TARGET_DEPS_FLAG=%TARGET_ROOT%\.deploy-server-deps-needed"
set "TARGET_ENV_FILE=%TARGET_ROOT%\.env"

echo.
echo ==================================================
echo IndigoBuilders deployment to %TARGET_ROOT%
echo ==================================================
echo.

if not exist "%TARGET_ROOT%" (
  echo ERROR: Target path does not exist or is not accessible:
  echo   %TARGET_ROOT%
  exit /b 1
)

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "BACKUP_STAMP=%%I"

pushd "%SOURCE_ROOT%"
if errorlevel 1 (
  echo ERROR: Could not access source root %SOURCE_ROOT%
  exit /b 1
)

echo [1/7] Committing and pushing to GitHub...
git add .
for /f "tokens=*" %%i in ('git status --porcelain') do set HAS_CHANGES=1
if defined HAS_CHANGES (
  git commit -m "Deploy %BACKUP_STAMP%"
  if errorlevel 1 goto :git_failed
) else (
  echo No changes to commit.
)
git push origin dev
if errorlevel 1 goto :git_failed
git checkout master
if errorlevel 1 goto :git_failed
git merge dev --no-ff -m "Merge dev into master for deployment %BACKUP_STAMP%"
if errorlevel 1 goto :git_failed
git push origin master
if errorlevel 1 goto :git_failed
git checkout dev
if errorlevel 1 goto :git_failed
echo Git: dev merged into master and pushed.
echo.

echo [2/7] Building application...
call npm run build
if errorlevel 1 goto :build_failed

echo [3/7] Ensuring target folders exist...
call :ensure_dir "%TARGET_CLIENT_DIST%" || goto :failed
call :ensure_dir "%TARGET_SERVER_DIST%" || goto :failed
call :ensure_dir "%TARGET_SERVER_DIR%" || goto :failed
call :ensure_dir "%TARGET_BACKUP_ROOT%" || goto :failed

set "TARGET_SERVER_BACKUP=%TARGET_BACKUP_ROOT%\server-dist-%BACKUP_STAMP%"

dir /b "%TARGET_SERVER_DIST%" >nul 2>&1
if errorlevel 1 (
  echo [4/7] No existing server dist found. Skipping backup.
) else (
  echo [4/7] Backing up current server dist...
  call :ensure_dir "%TARGET_SERVER_BACKUP%" || goto :failed
  robocopy "%TARGET_SERVER_DIST%" "%TARGET_SERVER_BACKUP%" /E /R:2 /W:2 /NFL /NDL /NJH /NJS /NP
  if errorlevel 8 (
    echo ERROR: Server dist backup failed with robocopy exit code %ERRORLEVEL%.
    goto :failed
  )
)

echo [5/7] Syncing client dist...
robocopy "%SOURCE_ROOT%\client\dist" "%TARGET_CLIENT_DIST%" /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS /NP
if errorlevel 8 (
  echo ERROR: Client dist sync failed with robocopy exit code %ERRORLEVEL%.
  goto :failed
)

echo [6/7] Syncing server dist and runtime manifest files...
robocopy "%SOURCE_ROOT%\server\dist" "%TARGET_SERVER_DIST%" /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS /NP
if errorlevel 8 (
  echo ERROR: Server dist sync failed with robocopy exit code %ERRORLEVEL%.
  goto :failed
)

fc /b "%SOURCE_ROOT%\server\package.json" "%TARGET_SERVER_DIR%\package.json" >nul 2>&1
if errorlevel 1 (
  > "%TARGET_DEPS_FLAG%" echo deps-install-required
)

copy /Y "%SOURCE_ROOT%\server\package.json" "%TARGET_SERVER_DIR%\package.json" >nul
if errorlevel 1 (
  echo ERROR: Failed to copy server\package.json
  goto :failed
)

if exist "%SOURCE_ROOT%\.env" (
  copy /Y "%SOURCE_ROOT%\.env" "%TARGET_ENV_FILE%" >nul
  if errorlevel 1 (
    echo ERROR: Failed to copy root .env
    goto :failed
  )
) else (
  echo WARNING: Local root .env not found. Existing server .env was left unchanged.
)

copy /Y "%SOURCE_ROOT%\ecosystem.config.cjs" "%TARGET_ROOT%\ecosystem.config.cjs" >nul
if errorlevel 1 (
  echo ERROR: Failed to copy ecosystem.config.cjs
  goto :failed
)

copy /Y "%SOURCE_ROOT%\server-apply-deployment.bat" "%TARGET_ROOT%\server-apply-deployment.bat" >nul
if errorlevel 1 (
  echo ERROR: Failed to copy server-apply-deployment.bat
  goto :failed
)

copy /Y "%SOURCE_ROOT%\server-manager.bat" "%TARGET_ROOT%\server-manager.bat" >nul
if errorlevel 1 (
  echo ERROR: Failed to copy server-manager.bat
  goto :failed
)

copy /Y "%SOURCE_ROOT%\server-restart.bat" "%TARGET_ROOT%\server-restart.bat" >nul
if errorlevel 1 (
  echo ERROR: Failed to copy server-restart.bat
  goto :failed
)

copy /Y "%SOURCE_ROOT%\deploy\iis\web.config" "%TARGET_CLIENT_DIST%\web.config" >nul
if errorlevel 1 (
  echo ERROR: Failed to copy IIS web.config into client\dist
  goto :failed
)

echo [7/7] Deployment files copied successfully.
echo.
echo Previous server build backup:
echo   %TARGET_SERVER_BACKUP%
echo.
echo Next step on the server:
echo   C:\IndigoBuilders\server-restart.bat
echo.
echo Manual equivalent:
echo   cd C:\IndigoBuilders
echo   pm2 restart indigobuilders-api
echo   pm2 save
echo.

popd
exit /b 0

:ensure_dir
if exist "%~1" exit /b 0
mkdir "%~1"
if errorlevel 1 (
  echo ERROR: Failed to create directory:
  echo   %~1
  exit /b 1
)
exit /b 0

:git_failed
echo ERROR: Git operation failed. Ensure you are on the dev branch and have no conflicts.
goto :failed

:build_failed
echo ERROR: Build failed.
goto :failed

:failed
popd
exit /b 1
