@echo off
echo Starting IndigoBuilders ERP (dev mode)...
cd /d "%~dp0"

if not exist ".env" (
    echo ERROR: .env file not found. Copy .env.example to .env and fill in your values.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)

echo Launching server and client...
call npm run dev
