@echo off
title NIKS ARTPHOTO — Telegram Bot Server

echo ========================================================
echo   NIKS ARTPHOTO - TELEGRAM MANAGEMENT BOT
echo ========================================================
echo.
echo Starting Telegram Bot...
echo Logs are output here and saved to: logs\bot.log
echo.
echo Press Ctrl+C or close this window to stop the bot.
echo ========================================================
echo.

if not exist "logs" mkdir logs

python bot.py

if %errorlevel% neq 0 (
    echo.
    echo --------------------------------------------------------
    echo [ERROR] Bot exited with error code %errorlevel%.
    echo Check log file: logs\bot.log
    echo --------------------------------------------------------
    pause
)
