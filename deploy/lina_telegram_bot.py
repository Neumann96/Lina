#!/usr/bin/env python3
import json
import logging
import os
import signal
import time
import urllib.error
import urllib.request

START_MESSAGE = """Привет! Я Lina ✨

Превращаю списки слов в карточки быстрее, чем вы успеете отложить их до понедельника. Просто вставьте слова и переводы — я всё разберу и подготовлю к практике.

Учить всё ещё придётся вам. Мы проверяли..."""
MINI_APP_URL = "https://lina-lern.ru"
DEFAULT_REMINDER_URL = "http://127.0.0.1:3000/api/reviews/notify"
DEFAULT_REMINDER_INTERVAL_SECONDS = 300

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
                "text": "Ладно, давайте учить →",
                "web_app": {"url": MINI_APP_URL},
            }]],
        },
    }


def trigger_review_reminders(url: str, secret: str, timeout: int = 20):
    request = urllib.request.Request(
        url,
        data=b"{}",
        headers={
            "Content-Type": "application/json",
            "x-lina-reminder-secret": secret,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        result = json.load(response)
    if not isinstance(result, dict):
        raise RuntimeError("Review reminder endpoint returned an invalid response")
    return result


def stop(_signum, _frame):
    global stopping
    stopping = True


def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or ":" not in token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is missing or invalid")
    reminder_secret = os.environ.get("REVIEW_REMINDER_SECRET", "").strip()
    reminder_url = os.environ.get("REVIEW_REMINDER_URL", DEFAULT_REMINDER_URL).strip()
    try:
        reminder_interval = max(60, int(os.environ.get(
            "REVIEW_REMINDER_INTERVAL_SECONDS",
            str(DEFAULT_REMINDER_INTERVAL_SECONDS),
        )))
    except ValueError as error:
        raise RuntimeError("REVIEW_REMINDER_INTERVAL_SECONDS must be an integer") from error

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    offset = 0
    next_reminder_at = 0.0
    logging.info("Lina bot started in long-polling mode")
    if not reminder_secret:
        logging.warning("Review reminders are disabled because REVIEW_REMINDER_SECRET is missing")

    while not stopping:
        try:
            now = time.monotonic()
            if reminder_secret and now >= next_reminder_at:
                next_reminder_at = now + reminder_interval
                reminder_result = trigger_review_reminders(reminder_url, reminder_secret)
                logging.info(
                    "Review reminder dispatch checked=%s sent=%s failed=%s skipped=%s",
                    reminder_result.get("checked", 0),
                    reminder_result.get("sent", 0),
                    reminder_result.get("failed", 0),
                    reminder_result.get("skipped", "no"),
                )
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
        except (OSError, RuntimeError, ValueError, urllib.error.URLError) as error:
            if not stopping:
                logging.error("Telegram polling error: %s", error)
                time.sleep(2)

    logging.info("Lina bot stopped")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    main()
