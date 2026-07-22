#!/usr/bin/env python3
"""
NIKS ARTPHOTO — Telegram Management Bot
Enables the site owner to publish blog articles with full rich formatting and post portfolio images.
Automatically commits and pushes every update to GitHub Pages.
"""

import os
import sys
import json
import re
import datetime
import subprocess
import logging
import telebot
from telebot import types

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Base directory setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR = os.path.join(BASE_DIR, 'media')
PORTFOLIO_MEDIA_DIR = os.path.join(MEDIA_DIR, 'portfolio')
CONFIG_FILE = os.path.join(BASE_DIR, 'bot_config.json')

# Ensure directories exist
os.makedirs(PORTFOLIO_MEDIA_DIR, exist_ok=True)

# Load configuration
def load_config():
    config = {
        "bot_token": os.environ.get("BOT_TOKEN", ""),
        "admin_ids": [int(uid) for uid in os.environ.get("ADMIN_IDS", "").split(",") if uid.strip().isdigit()],
        "site_url": "https://reparsing.github.io/niksartphoto"
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                config.update(saved)
        except Exception as e:
            logging.error(f"Error reading {CONFIG_FILE}: {e}")
    return config

def save_config(config):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

config = load_config()

# If token not in config, prompt or check env
BOT_TOKEN = config.get("bot_token", "")
ADMIN_IDS = set(config.get("admin_ids", []))

if not BOT_TOKEN:
    print("Warning: BOT_TOKEN is empty in config or environment. Please set BOT_TOKEN in bot_config.json or environment variable.")

bot = telebot.TeleBot(BOT_TOKEN if BOT_TOKEN else "DUMMY_TOKEN", parse_mode='HTML')

# In-memory user states for interactive blog editor and portfolio uploader
user_states = {}

def is_admin(user_id):
    if not ADMIN_IDS:
        return True # Allow initial setup if ADMIN_IDS is empty
    return user_id in ADMIN_IDS

def run_git_commit_and_push(commit_message):
    """Executes git add, commit, and push automatically."""
    try:
        logging.info("Executing git add .")
        subprocess.run(["git", "add", "."], cwd=BASE_DIR, check=True)
        
        logging.info(f"Executing git commit -m '{commit_message}'")
        res_commit = subprocess.run(["git", "commit", "-m", commit_message], cwd=BASE_DIR, capture_output=True, text=True)
        
        logging.info("Executing git push origin main")
        res_push = subprocess.run(["git", "push", "origin", "main"], cwd=BASE_DIR, capture_output=True, text=True)
        
        return True, res_push.stdout + res_push.stderr
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr if hasattr(e, 'stderr') and e.stderr else str(e)
        logging.error(f"Git error: {err_msg}")
        return False, err_msg
    except Exception as e:
        logging.error(f"Unexpected git error: {e}")
        return False, str(e)

def slugify(text):
    """Generates a clean URL slug from Russian text."""
    translit_dict = {
        'а':'a', 'б':'b', 'в':'v', 'г':'g', 'д':'d', 'е':'e', 'ё':'yo', 'ж':'zh',
        'з':'z', 'и':'i', 'й':'y', 'к':'k', 'л':'l', 'м':'m', 'н':'n', 'о':'o',
        'п':'p', 'р':'r', 'с':'s', 'т':'t', 'у':'u', 'ф':'f', 'х':'h', 'ц':'ts',
        'ч':'ch', 'ш':'sh', 'щ':'sch', 'ъ':'', 'ы':'y', 'ь':'', 'э':'e', 'ю':'yu', 'я':'ya'
    }
    res = []
    for char in text.lower():
        if char in translit_dict:
            res.append(translit_dict[char])
        elif char.isalnum():
            res.append(char)
        elif char in [' ', '-', '_']:
            res.append('-')
    slug = re.sub(r'-+', '-', ''.join(res)).strip('-')
    return slug if slug else f"post-{int(datetime.datetime.now().timestamp())}"

def format_date_ru(dt):
    months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
    return f"{dt.day} {months[dt.month - 1]} {dt.year}"

# --- BOT MAIN KEYBOARDS ---

def get_main_keyboard():
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("📝 Создать новость в блог", callback_data="btn_new_blog"),
        types.InlineKeyboardButton("📸 Добавить фото в портфолио", callback_data="btn_new_portfolio")
    )
    markup.add(
        types.InlineKeyboardButton("📊 Статус сайта & Git", callback_data="btn_status"),
        types.InlineKeyboardButton("ℹ️ Справка", callback_data="btn_help")
    )
    return markup

def get_blog_constructor_keyboard(chat_id):
    state = user_states.get(chat_id, {})
    blocks_count = len(state.get('blocks', []))
    
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("➕ Текст (<p>)", callback_data="blog_add_p"),
        types.InlineKeyboardButton("➕ Заголовок (<h2>)", callback_data="blog_add_h2")
    )
    markup.add(
        types.InlineKeyboardButton("🔵 Синяя цитата", callback_data="blog_add_qblue"),
        types.InlineKeyboardButton("🔴 Красная цитата", callback_data="blog_add_qred")
    )
    markup.add(
        types.InlineKeyboardButton("📷 Загрузить фото в текст", callback_data="blog_add_img"),
        types.InlineKeyboardButton("🖼 Изменить обложку", callback_data="blog_set_cover")
    )
    markup.add(
        types.InlineKeyboardButton(f"👁 Предпросмотр ({blocks_count} блоков)", callback_data="blog_preview"),
        types.InlineKeyboardButton("🏷 Категория", callback_data="blog_set_category")
    )
    markup.add(
        types.InlineKeyboardButton("🚀 Опубликовать в блог & Git", callback_data="blog_publish")
    )
    markup.add(
        types.InlineKeyboardButton("❌ Отмена", callback_data="btn_cancel")
    )
    return markup

# --- COMMAND HANDLERS ---

@bot.message_handler(commands=['start', 'menu'])
def cmd_start(message):
    if not is_admin(message.from_user.id):
        # Store admin if none registered
        if not ADMIN_IDS:
            ADMIN_IDS.add(message.from_user.id)
            config['admin_ids'] = list(ADMIN_IDS)
            save_config(config)
            bot.reply_to(message, f"✅ Вы зарегистрированы как администратор бота (ID: {message.from_user.id}).")
        else:
            bot.reply_to(message, "⛔ Доступ запрещен. Этот бот предназначен только для владельца портфолио.")
            return

    bot.send_message(
        message.chat.id,
        "👋 <b>Добро пожаловать в панель управления сайта Никс Фотограф!</b>\n\n"
        "Выберите действие из интерактивного меню ниже:",
        reply_markup=get_main_keyboard()
    )

@bot.message_handler(commands=['help'])
def cmd_help(message):
    bot.send_message(
        message.chat.id,
        "📖 <b>Справка по возможностям бота:</b>\n\n"
        "1. <b>Блог</b>: Позволяет пошагово составить статью любой сложности:\n"
        "   • Название, обложка, категория (Личное / Техника / Стрит)\n"
        "   • Абзацы текста, подзаголовки\n"
        "   • Фирменные синие цитаты («📷 Я выбрал компетенцию...»)\n"
        "   • Фирменные красные предупреждения/акценты\n"
        "   • Изображения внутри текста с подписями\n\n"
        "2. <b>Портфолио</b>: Загрузка снимков в категории (Портреты / Улица / Граффити).\n\n"
        "3. <b>Автоматический Git Commit & Push</b>: Каждая публикация сразу выгружается на GitHub Pages!"
    )

# --- CALLBACK QUERY HANDLER ---

@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    chat_id = call.message.chat.id
    user_id = call.from_user.id

    if not is_admin(user_id):
        bot.answer_callback_query(call.id, "⛔ Доступ запрещен.", show_alert=True)
        return

    data = call.data

    if data == "btn_cancel":
        user_states.pop(chat_id, None)
        bot.edit_message_text("❌ Операция отменена.", chat_id, call.message.message_id)
        bot.send_message(chat_id, "Главное меню:", reply_markup=get_main_keyboard())
        bot.answer_callback_query(call.id)
        return

    elif data == "btn_status":
        bot.answer_callback_query(call.id)
        res = subprocess.run(["git", "status", "-s"], cwd=BASE_DIR, capture_output=True, text=True)
        status_text = res.stdout if res.stdout else "Рабочая директория чиста."
        bot.send_message(chat_id, f"📊 <b>Статус Git:</b>\n<code>{status_text}</code>", reply_markup=get_main_keyboard())
        return

    elif data == "btn_help":
        bot.answer_callback_query(call.id)
        cmd_help(call.message)
        return

    # --- PORTFOLIO FLOW ---
    elif data == "btn_new_portfolio":
        bot.answer_callback_query(call.id)
        user_states[chat_id] = {'step': 'WAIT_PORTFOLIO_PHOTO'}
        bot.send_message(chat_id, "📸 <b>Отправьте фотографию</b>, которую хотите добавить в портфолио:")
        return

    # --- BLOG FLOW ---
    elif data == "btn_new_blog":
        bot.answer_callback_query(call.id)
        dt = datetime.datetime.now()
        user_states[chat_id] = {
            'step': 'WAIT_BLOG_TITLE',
            'title': '',
            'category': 'личное',
            'category_name': 'Личное',
            'excerpt': '',
            'cover_img': '',
            'date_iso': dt.strftime('%Y-%m-%d'),
            'date_ru': format_date_ru(dt),
            'blocks': []
        }
        bot.send_message(chat_id, "📝 <b>Шаг 1 из 3:</b> Введите заголовок новой статьи:")
        return

    elif data == "blog_set_category":
        bot.answer_callback_query(call.id)
        markup = types.InlineKeyboardMarkup()
        markup.add(
            types.InlineKeyboardButton("✨ Личное", callback_data="cat_личное"),
            types.InlineKeyboardButton("📷 Техника", callback_data="cat_техника"),
            types.InlineKeyboardButton("🏙️ Стрит", callback_data="cat_стрит")
        )
        bot.send_message(chat_id, "Выберите категорию для статьи:", reply_markup=markup)
        return

    elif data.startswith("cat_"):
        cat_key = data.split("cat_")[1]
        cat_names = {"личное": "Личное", "техника": "Техника", "стрит": "Стрит"}
        if chat_id in user_states:
            user_states[chat_id]['category'] = cat_key
            user_states[chat_id]['category_name'] = cat_names.get(cat_key, "Личное")
        bot.answer_callback_query(call.id, f"Категория установлена: {cat_names.get(cat_key)}")
        show_blog_constructor(chat_id)
        return

    elif data in ["blog_add_p", "blog_add_h2", "blog_add_qblue", "blog_add_qred", "blog_add_img", "blog_set_cover"]:
        bot.answer_callback_query(call.id)
        state = user_states.get(chat_id, {})
        
        if data == "blog_add_p":
            state['step'] = 'WAIT_BLOG_BLOCK_P'
            bot.send_message(chat_id, "💬 Отправьте текст нового абзаца (<p>):")
        elif data == "blog_add_h2":
            state['step'] = 'WAIT_BLOG_BLOCK_H2'
            bot.send_message(chat_id, "📌 Отправьте текст подзаголовка (<h2>):")
        elif data == "blog_add_qblue":
            state['step'] = 'WAIT_BLOG_BLOCK_QBLUE'
            bot.send_message(chat_id, "📷 Отправьте текст для <b>фирменной синей цитаты</b> (акцент):")
        elif data == "blog_add_qred":
            state['step'] = 'WAIT_BLOG_BLOCK_QRED'
            bot.send_message(chat_id, "⚠️ Отправьте текст для <b>фирменного красного предупреждения</b>:")
        elif data == "blog_add_img":
            state['step'] = 'WAIT_BLOG_BLOCK_IMG'
            bot.send_message(chat_id, "📷 Отправьте фотографию для вставки внутрь статьи:")
        elif data == "blog_set_cover":
            state['step'] = 'WAIT_BLOG_COVER_PHOTO'
            bot.send_message(chat_id, "🖼 Отправьте изображение для <b>главной обложки статьи</b>:")
        return

    elif data == "blog_preview":
        bot.answer_callback_query(call.id)
        state = user_states.get(chat_id, {})
        title = state.get('title', 'Без названия')
        cat = state.get('category_name', 'Личное')
        blocks = state.get('blocks', [])
        
        preview_msg = f"👁 <b>Предпросмотр статьи:</b>\n\n"
        preview_msg += f"<b>Заголовок:</b> {title}\n"
        preview_msg += f"<b>Категория:</b> {cat}\n"
        preview_msg += f"<b>Обложка:</b> {'Установлена' if state.get('cover_img') else 'По умолчанию'}\n"
        preview_msg += f"<b>Всего блоков:</b> {len(blocks)}\n\n"
        preview_msg += "<b>Содержимое блоков:</b>\n"
        
        for idx, b in enumerate(blocks, 1):
            btype = b['type']
            content = b.get('content', '')
            if len(content) > 60: content = content[:60] + "..."
            if btype == 'p': preview_msg += f"{idx}. [Текст] {content}\n"
            elif btype == 'h2': preview_msg += f"{idx}. [Подзаголовок] {content}\n"
            elif btype == 'quote_blue': preview_msg += f"{idx}. [Синяя цитата] {content}\n"
            elif btype == 'quote_red': preview_msg += f"{idx}. [Красная цитата] {content}\n"
            elif btype == 'image': preview_msg += f"{idx}. [Картинка] {b.get('src')}\n"

        bot.send_message(chat_id, preview_msg)
        show_blog_constructor(chat_id)
        return

    elif data == "blog_publish":
        bot.answer_callback_query(call.id)
        publish_blog_post(chat_id)
        return

    elif data.startswith("port_cat_"):
        cat = data.split("port_cat_")[1]
        state = user_states.get(chat_id, {})
        photo_path = state.get('photo_path')
        if photo_path:
            publish_portfolio_photo(chat_id, photo_path, cat)
        return

def show_blog_constructor(chat_id):
    state = user_states.get(chat_id, {})
    title = state.get('title', 'Без заголовка')
    cat_name = state.get('category_name', 'Личное')
    blocks_cnt = len(state.get('blocks', []))

    msg = (
        f"🛠 <b>Конструктор статьи</b>\n\n"
        f"📌 <b>Заголовок:</b> {title}\n"
        f"🏷 <b>Категория:</b> {cat_name}\n"
        f"🧩 <b>Добавлено блоков:</b> {blocks_cnt}\n\n"
        f"Используйте кнопки ниже для добавления форматирования и блоков:"
    )
    bot.send_message(chat_id, msg, reply_markup=get_blog_constructor_keyboard(chat_id))

# --- MESSAGE HANDLERS FOR PHOTO & TEXT STATES ---

@bot.message_handler(content_types=['photo'])
def handle_photo(message):
    chat_id = message.chat.id
    user_id = message.from_user.id
    if not is_admin(user_id): return

    state = user_states.get(chat_id, {})
    current_step = state.get('step')

    if current_step == 'WAIT_PORTFOLIO_PHOTO':
        # Download portfolio photo
        file_info = bot.get_file(message.photo[-1].file_id)
        downloaded = bot.download_file(file_info.file_path)
        
        fname = f"photo_{int(datetime.datetime.now().timestamp())}.jpg"
        save_path = os.path.join(PORTFOLIO_MEDIA_DIR, fname)
        rel_path = f"media/portfolio/{fname}"
        
        with open(save_path, 'wb') as f:
            f.write(downloaded)

        state['photo_path'] = rel_path
        state['step'] = 'WAIT_PORTFOLIO_CAT'

        markup = types.InlineKeyboardMarkup(row_width=1)
        markup.add(
            types.InlineKeyboardButton("👤 Портретная съёмка (portrait)", callback_data="port_cat_portrait"),
            types.InlineKeyboardButton("🏙️ Уличные зарисовки (street)", callback_data="port_cat_street"),
            types.InlineKeyboardButton("🎨 Граффити на улицах (graffiti)", callback_data="port_cat_graffiti")
        )
        bot.send_message(chat_id, "📸 Фотография загружена! Выберите категорию для портфолио:", reply_markup=markup)
        return

    elif current_step == 'WAIT_BLOG_COVER_PHOTO':
        file_info = bot.get_file(message.photo[-1].file_id)
        downloaded = bot.download_file(file_info.file_path)
        fname = f"cover_{int(datetime.datetime.now().timestamp())}.jpg"
        save_path = os.path.join(MEDIA_DIR, fname)
        with open(save_path, 'wb') as f:
            f.write(downloaded)
        state['cover_img'] = f"media/{fname}"
        bot.send_message(chat_id, "✅ Главная обложка статьи успешно установлена!")
        show_blog_constructor(chat_id)
        return

    elif current_step == 'WAIT_BLOG_BLOCK_IMG':
        file_info = bot.get_file(message.photo[-1].file_id)
        downloaded = bot.download_file(file_info.file_path)
        fname = f"article_img_{int(datetime.datetime.now().timestamp())}.jpg"
        save_path = os.path.join(MEDIA_DIR, fname)
        with open(save_path, 'wb') as f:
            f.write(downloaded)
        
        caption = message.caption if message.caption else ""
        state['blocks'].append({
            'type': 'image',
            'src': f"media/{fname}",
            'alt': caption
        })
        bot.send_message(chat_id, "✅ Изображение добавлено в тело статьи!")
        show_blog_constructor(chat_id)
        return

@bot.message_handler(func=lambda msg: True)
def handle_text(message):
    chat_id = message.chat.id
    user_id = message.from_user.id
    if not is_admin(user_id): return

    state = user_states.get(chat_id, {})
    step = state.get('step')

    if step == 'WAIT_BLOG_TITLE':
        title = message.text.strip()
        state['title'] = title
        state['slug'] = slugify(title)
        state['step'] = 'WAIT_BLOG_EXCERPT'
        bot.send_message(chat_id, "📝 <b>Шаг 2 из 3:</b> Введите краткое описание статьи (для карточки в блоге):")
        return

    elif step == 'WAIT_BLOG_EXCERPT':
        state['excerpt'] = message.text.strip()
        state['step'] = 'CONSTRUCTING_BLOG'
        bot.send_message(chat_id, "🎉 <b>Отлично! Основная информация задана.</b> Теперь составьте тело статьи в конструкторе:")
        show_blog_constructor(chat_id)
        return

    elif step == 'WAIT_BLOG_BLOCK_P':
        state['blocks'].append({'type': 'p', 'content': message.text.strip()})
        bot.send_message(chat_id, "✅ Абзац текста добавлен!")
        show_blog_constructor(chat_id)
        return

    elif step == 'WAIT_BLOG_BLOCK_H2':
        state['blocks'].append({'type': 'h2', 'content': message.text.strip()})
        bot.send_message(chat_id, "✅ Подзаголовок (H2) добавлен!")
        show_blog_constructor(chat_id)
        return

    elif step == 'WAIT_BLOG_BLOCK_QBLUE':
        state['blocks'].append({'type': 'quote_blue', 'content': message.text.strip()})
        bot.send_message(chat_id, "✅ Синяя цитата добавлена!")
        show_blog_constructor(chat_id)
        return

    elif step == 'WAIT_BLOG_BLOCK_QRED':
        state['blocks'].append({'type': 'quote_red', 'content': message.text.strip()})
        bot.send_message(chat_id, "✅ Красная цитата добавлена!")
        show_blog_constructor(chat_id)
        return

# --- PUBLISHING LOGIC ---

def publish_portfolio_photo(chat_id, photo_path, category):
    bot.send_message(chat_id, "🔄 Загрузка фото в портфолио и публикация в Git...")
    
    portfolio_file = os.path.join(BASE_DIR, 'portfolio.html')
    with open(portfolio_file, 'r', encoding='utf-8') as f:
        content = f.read()

    new_item = f'                <div class="kumo-gallery-item gallery-item" data-category="{category}"><img src="{photo_path}" alt="Фото"></div>\n'
    
    grid_marker = '<div class="kumo-gallery-grid">'
    if grid_marker in content:
        content = content.replace(grid_marker, grid_marker + "\n" + new_item)
        with open(portfolio_file, 'w', encoding='utf-8') as f:
            f.write(content)

    success, git_log = run_git_commit_and_push(f"Add new portfolio photo to category {category}")
    
    user_states.pop(chat_id, None)
    if success:
        site_url = config.get("site_url", "")
        bot.send_message(
            chat_id,
            f"🎉 <b>Фотография успешно добавлена в портфолио!</b>\n\n"
            f"🔗 <b>Категория:</b> {category}\n"
            f"🌐 <b>Портфолио:</b> {site_url}/portfolio.html\n\n"
            f"✅ Git Commit & Push успешно выполнен.",
            reply_markup=get_main_keyboard()
        )
    else:
        bot.send_message(chat_id, f"⚠️ Фото добавлено в локальные файлы, но при Git push произошла ошибка:\n<code>{git_log}</code>", reply_markup=get_main_keyboard())

def publish_blog_post(chat_id):
    state = user_states.get(chat_id, {})
    title = state.get('title', 'Новая статья')
    slug = state.get('slug', f"post-{int(datetime.datetime.now().timestamp())}")
    category = state.get('category', 'личное')
    category_name = state.get('category_name', 'Личное')
    excerpt = state.get('excerpt', title)
    cover_img = state.get('cover_img', 'media/portfolio/photo_2025-12-24_07-26-43.jpg')
    date_iso = state.get('date_iso', datetime.datetime.now().strftime('%Y-%m-%d'))
    date_ru = state.get('date_ru', format_date_ru(datetime.datetime.now()))
    blocks = state.get('blocks', [])

    if not blocks:
        bot.send_message(chat_id, "⚠️ Добавьте хотя бы один блок текста перед публикацией!")
        return

    bot.send_message(chat_id, "⏳ Создание файла статьи, обновление блога и отправка на GitHub...")

    # Calculate reading time (avg 150 words per min)
    total_words = sum(len(b.get('content', '').split()) for b in blocks if 'content' in b)
    read_time = max(1, round(total_words / 150))

    # Generate article HTML content
    article_html_body = ""
    for b in blocks:
        btype = b['type']
        cnt = b.get('content', '')
        if btype == 'p':
            article_html_body += f'                <p style="margin-bottom: 20px;">\n                    {cnt}\n                </p>\n'
        elif btype == 'h2':
            article_html_body += f'                <h2 style="font-size: 1.5rem; font-weight: 600; margin: 32px 0 12px;">{cnt}</h2>\n'
        elif btype == 'quote_blue':
            article_html_body += (
                '                <div class="kumo-card" style="border-left: 3px solid var(--kumo-brand); background: var(--kumo-brand-subtle); margin: 28px 0;">\n'
                f'                    <p style="margin: 0; font-size: 1rem; color: var(--kumo-default);">\n                        {cnt}\n                    </p>\n'
                '                </div>\n'
            )
        elif btype == 'quote_red':
            article_html_body += (
                '                <div class="kumo-card" style="border-left: 3px solid #ef4444; background: rgba(239, 68, 68, 0.08); margin: 28px 0;">\n'
                f'                    <p style="margin: 0; font-size: 1rem; color: var(--kumo-default);">\n                        {cnt}\n                    </p>\n'
                '                </div>\n'
            )
        elif btype == 'image':
            src = b.get('src')
            alt = b.get('alt', '')
            article_html_body += (
                '                <div class="kumo-card" style="margin: 28px 0; padding: 0; overflow: hidden;">\n'
                f'                    <img src="{src}" alt="{alt}" style="width: 100%; height: auto; object-fit: cover;">\n'
                '                </div>\n'
            )

    post_filename = f"blog-{slug}.html"
    post_filepath = os.path.join(BASE_DIR, post_filename)

    badge_class = "kumo-badge kumo-badge-brand" if category == "личное" else "kumo-badge"

    full_page_html = f"""<!DOCTYPE html>
<html lang="ru" data-mode="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} — Никс Фотограф</title>
    <meta name="description" content="{excerpt}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="theme.css">
</head>
<body>
    <!-- KUMO NAVBAR -->
    <nav class="kumo-navbar">
        <div class="container nav-container">
            <a href="index.html" class="kumo-brand-logo">
                <div class="kumo-brand-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <span>НИКС</span>
            </a>
            <ul class="kumo-nav-menu">
                <li><a href="index.html" class="kumo-nav-link">🏠 Главная</a></li>
                <li><a href="portfolio.html" class="kumo-nav-link">📸 Портфолио</a></li>
                <li><a href="about.html" class="kumo-nav-link">👤 Обо мне</a></li>
                <li><a href="index.html#schedule" class="kumo-nav-link">⏰ Режим работы</a></li>
                <li><a href="index.html#faq" class="kumo-nav-link">❓ Частые вопросы</a></li>
                <li><a href="blog.html" class="kumo-nav-link active">📝 Блог</a></li>
                <li><a href="contact.html" class="kumo-nav-link">📞 Контакты</a></li>
            </ul>
            <div class="kumo-nav-actions">
                <div class="kumo-dropdown">
                    <button class="kumo-dropdown-toggle" aria-label="Помощь">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span>Помощь</span>
                        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    <div class="kumo-dropdown-menu">
                        <a href="https://t.me/tylenevv" target="_blank" rel="noopener noreferrer" class="kumo-dropdown-item">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            <span>Сообщить о проблеме на сайте</span>
                        </a>
                        <a href="https://t.me/tylenevv" target="_blank" rel="noopener noreferrer" class="kumo-dropdown-item">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <span>Задать вопрос</span>
                        </a>
                    </div>
                </div>
                <button class="kumo-theme-toggle" aria-label="Toggle theme"></button>
                <button class="kumo-mobile-toggle" aria-label="Open menu">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
            </div>
        </div>
    </nav>
    <div class="kumo-sidebar-overlay"></div>
    <aside class="kumo-sidebar">
        <div class="kumo-sidebar-header">
            <div class="kumo-brand-logo">
                <div class="kumo-brand-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <span>НИКС</span>
            </div>
        </div>
        <ul class="kumo-sidebar-nav">
            <li><a href="index.html">🏠 Главная</a></li>
            <li><a href="portfolio.html">📸 Портфолио</a></li>
            <li><a href="about.html">👤 Обо мне</a></li>
            <li><a href="index.html#schedule">⏰ Режим работы</a></li>
            <li><a href="index.html#faq">❓ Частые вопросы</a></li>
            <li><a href="blog.html" class="active">📝 Блог</a></li>
            <li><a href="contact.html">📞 Контакты</a></li>
            <li class="kumo-sidebar-divider"></li>
            <li class="kumo-sidebar-heading">Помощь</li>
            <li><a href="https://t.me/tylenevv" target="_blank">⚠️ Сообщить о проблеме</a></li>
            <li><a href="https://t.me/tylenevv" target="_blank">💬 Задать вопрос</a></li>
        </ul>
    </aside>

    <main style="padding-top: 110px; padding-bottom: 80px;">
        <div class="container" style="max-width: 860px;">
            <div style="margin-bottom: 24px;">
                <a href="blog.html" class="kumo-btn kumo-btn-sm kumo-btn-ghost">&larr; Вернуться в блог</a>
            </div>

            <span class="{badge_class}" style="margin-bottom: 12px;">{category_name}</span>
            <h1 style="font-size: 2.25rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 16px; line-height: 1.25;">
                {title}
            </h1>

            <div style="display: flex; gap: 16px; align-items: center; color: var(--kumo-subtle); font-size: 0.875rem; margin-bottom: 32px; border-bottom: 1px solid var(--kumo-hairline); padding-bottom: 16px;">
                <span>📅 {date_ru}</span>
                <span>⏱ {read_time} мин чтения</span>
                <span>👤 Автор: Никс</span>
            </div>

            <div class="kumo-card" style="margin-bottom: 32px; padding: 0; overflow: hidden;">
                <img src="{cover_img}" alt="{title}" style="width: 100%; height: 380px; object-fit: cover;">
            </div>

            <article style="font-size: 1.05rem; line-height: 1.8; color: var(--kumo-default);">
{article_html_body}            </article>
        </div>
    </main>

    <!-- KUMO FOOTER -->
    <footer class="kumo-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <a href="index.html" class="kumo-brand-logo">
                        <div class="kumo-brand-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </div>
                        <span>НИКС</span>
                    </a>
                    <p>Фотограф</p>
                </div>
                <div>
                    <h4 class="footer-heading">Навигация</h4>
                    <ul class="footer-links">
                        <li><a href="index.html">Главная</a></li>
                        <li><a href="portfolio.html">Портфолио</a></li>
                        <li><a href="about.html">Обо мне</a></li>
                        <li><a href="index.html#schedule">Режим работы</a></li>
                        <li><a href="blog.html">Блог</a></li>
                        <li><a href="contact.html">Контакты</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="footer-heading">Контакты</h4>
                    <ul class="footer-links">
                        <li><a href="mailto:niksfotograf@gmail.com">Email: niksfotograf@gmail.com</a></li>
                        <li><a href="https://t.me/objektivniksa" target="_blank">Telegram: @objektivniksa</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 НИКС. Все права защищены.</p>
            </div>
        </div>
    </footer>

    <script src="theme.js"></script>
</body>
</html>
"""

    with open(post_filepath, 'w', encoding='utf-8') as f:
        f.write(full_page_html)

    # Insert blog card into blog.html
    blog_index_file = os.path.join(BASE_DIR, 'blog.html')
    with open(blog_index_file, 'r', encoding='utf-8') as f:
        blog_content = f.read()

    new_card_html = f"""                <article class="blog-card" data-category="{category}" data-date="{date_iso}">
                    <div class="blog-card-image">
                        <img src="{cover_img}" alt="{title}" loading="lazy">
                    </div>
                    <div class="blog-card-body">
                        <div>
                            <span class="{badge_class}">{category_name}</span>
                        </div>
                        <h2 class="blog-card-title">
                            <a href="{post_filename}">{title}</a>
                        </h2>
                        <p class="blog-card-excerpt">
                            {excerpt}
                        </p>
                        <div class="blog-card-footer">
                            <span>{date_ru}</span>
                            <a href="{post_filename}" class="kumo-btn kumo-btn-sm kumo-btn-ghost">Читать &rarr;</a>
                        </div>
                    </div>
                </article>\n"""

    grid_marker = '<div class="blog-grid">'
    if grid_marker in blog_content:
        blog_content = blog_content.replace(grid_marker, grid_marker + "\n" + new_card_html)
        with open(blog_index_file, 'w', encoding='utf-8') as f:
            f.write(blog_content)

    success, git_log = run_git_commit_and_push(f"Publish blog post: {title}")

    user_states.pop(chat_id, None)
    if success:
        site_url = config.get("site_url", "")
        bot.send_message(
            chat_id,
            f"🎉 <b>Статья успешно опубликована!</b>\n\n"
            f"📌 <b>Заголовок:</b> {title}\n"
            f"🔗 <b>Прямая ссылка:</b> {site_url}/{post_filename}\n"
            f"🌐 <b>Главная страница блога:</b> {site_url}/blog.html\n\n"
            f"✅ Git Commit & Push успешно выполнен.",
            reply_markup=get_main_keyboard()
        )
    else:
        bot.send_message(
            chat_id,
            f"⚠️ Статья создана локально, но при отправке в Git произошла ошибка:\n<code>{git_log}</code>",
            reply_markup=get_main_keyboard()
        )

if __name__ == "__main__":
    if not BOT_TOKEN or BOT_TOKEN == "DUMMY_TOKEN":
        print("Bot cannot start without a valid BOT_TOKEN.")
        print("Please edit bot_config.json and specify 'bot_token' and your admin telegram user id in 'admin_ids'.")
    else:
        print("Bot is starting polling...")
        bot.infinity_polling()
