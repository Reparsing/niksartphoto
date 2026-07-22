@echo off
chcp 65001 > nul
title NIKS ARTPHOTO — Telegram Bot Server

echo ========================================================
echo   NIKS ARTPHOTO - TELEGRAM MANAGEMENT BOT
echo ========================================================
echo.
echo Запуск Telegram-бота управления сайтом...
echo Логи выводятся на экран и сохраняются в файл: logs\bot.log
echo.
echo Чтобы остановить бота, нажмите Ctrl+C или закройте это окно.
echo ========================================================
echo.

if not exist "logs" mkdir logs

python bot.py

if %errorlevel% neq 0 (
    echo.
    echo --------------------------------------------------------
    echo [ОШИБКА] Бот завершил работу с кодом %errorlevel%.
    echo Проверьте лог-файл: logs\bot.log
    echo --------------------------------------------------------
    pause
)
