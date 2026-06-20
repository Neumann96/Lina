import importlib.util
import pathlib
import unittest

MODULE_PATH = pathlib.Path(__file__).parents[1] / "deploy" / "lina_telegram_bot.py"
SPEC = importlib.util.spec_from_file_location("lina_telegram_bot", MODULE_PATH)
BOT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BOT)


class LinaTelegramBotTest(unittest.TestCase):
    def test_recognizes_start_commands(self):
        self.assertEqual(BOT.start_chat_id({"message": {"chat": {"id": 42}, "text": "/start"}}), 42)
        self.assertEqual(BOT.start_chat_id({"message": {"chat": {"id": 42}, "text": "/start offer"}}), 42)
        self.assertEqual(BOT.start_chat_id({"message": {"chat": {"id": 42}, "text": "/help"}}), None)

    def test_opens_mini_app_from_inline_button(self):
        payload = BOT.start_payload(42)
        button = payload["reply_markup"]["inline_keyboard"][0][0]
        self.assertEqual(payload["text"], BOT.START_MESSAGE)
        self.assertEqual(button, {"text": "Спасти список →", "web_app": {"url": BOT.MINI_APP_URL}})


if __name__ == "__main__":
    unittest.main()
