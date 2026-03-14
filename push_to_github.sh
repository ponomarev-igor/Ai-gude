#!/bin/bash
# Скрипт первого пуша AI Guide на GitHub
# Репозиторий: https://github.com/ponomarev-igor/Ai-gude

cd /Users/mrgarmix/Documents/ai-guide

echo "📂 Инициализирую git..."
git init

echo "🔗 Подключаю удалённый репозиторий..."
git remote add origin https://github.com/ponomarev-igor/Ai-gude.git

echo "📋 Создаю README.md..."
cat > README.md << 'EOF'
# 🧠 AI Guide — Нейросети мира

Полный интерактивный гайд по 50+ AI-инструментам для вайб-кодинга.

## Что внутри
- **50+ инструментов** по 9 категориям с уровнями освоения и тарифами
- IDE и редакторы (Cursor, Windsurf, Antigravity, Bolt.new...)
- Деплой и хостинг (Netlify, Vercel, Railway, Supabase...)
- Open Claw агенты (Cline, OpenHands, CrewAI, LangChain...)
- VPS серверы — зарубежные и российские

## Использование
Открой `ai_guide.html` в браузере.

## Автообновление
```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
echo "GITHUB_REPO=ponomarev-igor/Ai-gude" >> .env
node update_guide.js
```

*Актуально на март 2026. Создано для курса по вайб-кодингу.*
EOF

echo "🚫 Создаю .gitignore..."
cat > .gitignore << 'EOF'
.env
*.log
*_backup_*.html
.DS_Store
node_modules/
EOF

echo "➕ Добавляю файлы..."
git add .

echo "💾 Создаю коммит..."
git commit -m "🚀 init: AI Guide — полный гид по нейросетям мира (50+ инструментов)"

echo "📤 Пушу на GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Готово! Открой: https://github.com/ponomarev-igor/Ai-gude"
