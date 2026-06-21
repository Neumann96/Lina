# Lina

Быстрое веб-приложение для изучения слов карточками. Главная особенность — массовая вставка: Lina сама распознаёт пары, разделённые пробелом, тире, двоеточием, точкой с запятой или запятой.

## Локальный запуск

```bash
npm ci
npm run db:migrate
npm run dev
```

Откройте `http://localhost:3000`.

Перед запуском скопируйте `.env.example` в `.env.local` и задайте подключение к PostgreSQL. Пользователи и счётчики ограничения запросов сохраняются в PostgreSQL. Все запросы авторизации параметризованы, а `users.email` защищён уникальным ограничением.

Для переноса прежнего `data/users.json` выполните `npm run db:import-legacy -- data/users.json`. Импорт идемпотентен: повторный запуск не создаёт дубликаты.

Для production обязательны `DATABASE_URL`, HTTPS и случайный `AUTH_SECRET` длиной не менее 32 символов. Production-cookie всегда получает флаги `HttpOnly`, `Secure` и `SameSite=Lax`.

## Проверки

```bash
npm run lint
npm run build
```

## Production

Каждый push в `main` запускает GitHub Actions: проект собирается на runner, компактный standalone-релиз отправляется на сервер и атомарно переключается через systemd. Сборка на VPS не выполняется.

Необходимые GitHub Secrets:

- `DEPLOY_HOST` — IP сервера;
- `DEPLOY_SSH_KEY` — приватный ключ деплоя.
- `AUTH_SECRET` — случайная строка длиной не менее 32 символов;
- `DATABASE_URL` — строка подключения к production PostgreSQL.

Nginx перенаправляет HTTP на `https://lina-lern.ru`, завершает TLS и проксирует приложение по `127.0.0.1:3000`. Сертификат Let’s Encrypt находится в `/etc/letsencrypt/live/lina-lern.ru/` и обновляется через webroot `/var/www/letsencrypt`.

## Figma

- страница для послойного импорта: `https://lina-lern.ru/figma-import`;
- готовый комплект: `https://lina-lern.ru/lina-figma-kit.zip`;
- исходники комплекта находятся в `figma-kit/`.
