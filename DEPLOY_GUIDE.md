# 🚀 Руководство по развертыванию и запуску (NIKS ARTPHOTO DEV)

Данный документ доступен только в разработческой ветке `dev` и содержит полные инструкции по установке зависимостей, настройке бота и развертыванию на операционных системах **Windows** и **Linux**.

---

## 🛠 1. Зависимости проекта

### Требования к окружению:
* **Python**: 3.9 или выше.
* **Git**: должен быть установлен и доступен в консоли (`git --version`).
* **Библиотека Python**:
  ```bash
  pip install pyTelegramBotAPI
  ```

---

## ⚙️ 2. Конфигурация доступа (`bot_config.json`)

В корне проекта должен находиться файл `bot_config.json` (защищен от попадания в публичные коммиты через `.gitignore`):

```json
{
  "bot_token": "ВАШ_ТОКЕН_ОТ_BOTFATHER",
  "admin_ids": [
    646815112,
    7709067838
  ],
  "site_url": "https://reparsing.github.io/niksartphoto"
}
```

* **`bot_token`**: Токен телеграм-бота, полученный у [@BotFather](https://t.me/BotFather).
* **`admin_ids`**: Список Telegram ID администраторов, имеющих доступ к управлению сайтом.
* **`site_url`**: Прямой адрес публичной версии сайта на GitHub Pages.

---

## 💻 3. Запуск на Windows

### Вариант А: Запуск через готовый батник (Рекомендуется)
Двойной клик по файлу **`run_bot.bat`**. 
Скрипт откроет окно командной строки, выведет статус запуска и начнет записывать логи в `logs/bot.log`.

### Вариант Б: Запуск из командной строки (CMD / PowerShell)
```cmd
python bot.py
```

---

## 🐧 4. Запуск на Linux (Ubuntu / Debian / CentOS)

### Вариант А: Ручной запуск в фоновом режиме (`nohup`)
```bash
# 1. Клонирование ветки dev
git clone -b dev https://github.com/Reparsing/niksartphoto.git
cd niksartphoto

# 2. Установка виртуального окружения
python3 -m venv venv
source venv/bin/activate
pip install pyTelegramBotAPI

# 3. Запуск в фоновом режиме с записью логов
nohup python3 bot.py > logs/bot.log 2>&1 &
```

### Вариант Б: Автоматический сервис `systemd` (Автозапуск при перезагрузке сервера)
Создайте файл сервиса `/etc/systemd/system/niks-bot.service`:

```ini
[Unit]
Description=Niks Artphoto Telegram Management Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/niksartphoto
ExecStart=/var/www/niksartphoto/venv/bin/python3 /var/www/niksartphoto/bot.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Команды для управления сервисом на Linux:
```bash
sudo systemctl daemon-reload
sudo systemctl enable niks-bot
sudo systemctl start niks-bot
sudo systemctl status niks-bot
```

---

## 🌿 5. Архитектура веток Git

1. **`main`**: Публичная ветка деплоя сайта для хостинга GitHub Pages (содержит только веб-файлы без документации деплоя).
2. **`dev`**: Приватная/Разработческая ветка, содержащая полный код бота, инструкции, конфиги и батники.

> 💡 **Автоматическая двойная синхронизация:**
> При любой публикации, редактировании или удалении постов/фотографий через Telegram-бота, бот автоматически выполняет коммит и пушит изменения **одновременно в обе ветки (`main` и `dev`)**.
