#!/usr/bin/env python3
import json
import logging
import os
import signal
import time
import urllib.error
import urllib.request

START_MESSAGE = """Привет! Я Lina ✨
Превращаю списки слов в карточки быстрее, чем вы успеете отложить их до понедельника.
Просто вставьте слова и переводы — я всё разберу и подготовлю к практике.
Учить всё ещё придётся вам. Но сначала давайте спасём первый список 👇"""
MINI_APP_URL = "https://lina-lern.ru"

stopping = False


def telegram_request(token: str, method: str, payload: dict, timeout: int = 35):
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/{method}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        result = json.load(response)
    if not result.get("ok"):
        raise RuntimeError(result.get("description", f"Telegram {method} failed"))
    return result["result"]


def start_chat_id(update):
    message = update.get("message") or {}
    chat_id = (message.get("chat") or {}).get("id")
    text = message.get("text")
    if not isinstance(chat_id, int) or not isinstance(text, str):
        return None
    command = text.split(maxsplit=1)[0].lower().split("@", 1)[0]
    return chat_id if command == "/start" else None


def start_payload(chat_id: int):
    return {
        "chat_id": chat_id,
        "text": START_MESSAGE,
        "reply_markup": {
            "inline_keyboard": [[{
                "text": "Спасти список →",
                "web_app": {"url": MINI_APP_URL},
            }]],
        },
    }


def stop(_signum, _frame):
    global stopping
    stopping = True


def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or ":" not in token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is missing or invalid")

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    offset = 0
    logging.info("Lina bot started in long-polling mode")

    while not stopping:
        try:
            updates = telegram_request(token, "getUpdates", {
                "offset": offset,
                "timeout": 25,
                "allowed_updates": ["message"],
            })
            for update in updates:
                offset = max(offset, update["update_id"] + 1)
                chat_id = start_chat_id(update)
                if chat_id is None:
                    continue
                telegram_request(token, "sendMessage", start_payload(chat_id), timeout=10)
                logging.info("Answered /start")
        except (OSError, RuntimeError, urllib.error.URLError) as error:
            if not stopping:
                logging.error("Telegram polling error: %s", error)
                time.sleep(2)

    logging.info("Lina bot stopped")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    main()
