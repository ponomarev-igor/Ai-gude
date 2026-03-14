#!/usr/bin/env node
/**
 * update_guide.js — Автообновление гайда + пуш на GitHub
 *
 * Создай .env рядом со скриптом:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   GITHUB_REPO=ponomarev-igor/Ai-gude
 *
 * Запуск:
 *   node update_guide.js
 */

const fs    = require("fs");
const path  = require("path");
const https = require("https");
const { spawnSync } = require("child_process");

// .env загрузка
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf-8").split("\n").forEach((line) => {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  });
}

const GUIDE_FILE  = path.join(__dirname, "ai_guide.html");
const API_KEY     = process.env.ANTHROPIC_API_KEY;
const GITHUB_REPO = process.env.GITHUB_REPO;
const MODEL       = "claude-sonnet-4-6";
const COLORS      = ["c-purple","c-blue","c-green","c-orange","c-teal","c-pink","c-red"];

const log  = (m,e="→") => console.log(`${e}  ${m}`);
const ok   = (m) => log(m,"✅");
const warn = (m) => log(m,"⚠️");
const fail = (m) => log(m,"❌");
const info = (m) => log(m,"ℹ️");

function apiRequest(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: "api.anthropic.com", path: "/v1/messages", method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(data),
      },
    }, (res) => {
      let b = "";
      res.on("data", c => b += c);
      res.on("end", () => { try { resolve(JSON.parse(b)); } catch(e) { reject(new Error(b.slice(0,200))); } });
    });
    req.on("error", reject);
    req.write(data); req.end();
  });
}

function extractExisting(html) {
  const names = [], re = /class="card-name"[^>]*>([^<]+)</g;
  let m;
  while ((m = re.exec(html))) names.push(m[1].trim());
  return names;
}

async function findNew(existing) {
  log("Ищу новые инструменты через веб-поиск...","🔍");
  const since = new Date(); since.setDate(since.getDate()-30);
  const dateStr = since.toISOString().split("T")[0];

  const prompt = `Найди AI-инструменты вышедшие или обновлённые после ${dateStr}.
Категории: text, image, video, audio, auto, search, ide, deploy, openclaw.
Уже есть (не повторяй): ${existing.join(", ")}

Верни ТОЛЬКО JSON массив без markdown:
[{"name":"...","company":"...","category":"text|image|video|audio|auto|search|ide|deploy|openclaw","badge":"Бесплатно|Частично|Платно","description":"на русском 2-3 предложения","tags":["тег1","тег2","тег3"],"website":"https://...","free_plan":"описание или null","paid_plan":"цена и описание или null","best_for":"краткое"}]

Если ничего нового — верни []. Только значимые инструменты.`;

  const res = await apiRequest({
    model: MODEL, max_tokens: 4000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  });

  let text = "";
  for (const b of res.content || []) if (b.type === "text") text += b.text;
  try {
    const clean = text.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim();
    const s = clean.indexOf("["), e = clean.lastIndexOf("]")+1;
    if (s === -1) return [];
    return JSON.parse(clean.slice(s,e));
  } catch(e) { warn(`JSON parse: ${e.message}`); return []; }
}

function makeCard(tool, color) {
  const bc = tool.badge==="Бесплатно"?"badge-free":tool.badge==="Частично"?"badge-partial":"badge-paid";
  const icons = {text:"🧠",image:"🎨",video:"🎬",audio:"🎵",auto:"⚙️",search:"🔍",ide:"💻",deploy:"🚀",openclaw:"🤖"};
  const icon = icons[tool.category]||"✨";
  const tags = (tool.tags||[]).slice(0,4).map(t=>`<span class="tag">${t}</span>`).join("");
  const freeRow = tool.free_plan ? `<div class="price-row"><span class="price-plan">Бесплатно</span><span class="price-amount">0 ₽</span><span class="price-desc">${tool.free_plan}</span></div>` : "";
  const paidRow = tool.paid_plan ? `<div class="price-row"><span class="price-plan">Платный</span><span class="price-amount"></span><span class="price-desc">${tool.paid_plan}</span></div>` : "";
  const price = (freeRow||paidRow) ? `<div class="price-block"><div class="price-block-title">💰 Тарифы</div>${freeRow}${paidRow}</div>` : "";

  return `
  <div class="card ${color}" data-new="true">
    <div class="card-header">
      <div class="card-left"><div class="card-icon">${icon}</div><div><div class="card-name">${tool.name}</div><div class="card-company">${tool.company}</div></div></div>
      <div class="card-badges"><span class="badge ${bc}">${tool.badge}</span><span class="badge" style="background:rgba(67,233,123,0.15);color:#43e97b;border:1px solid rgba(67,233,123,0.3);">🆕 Новый</span></div>
    </div>
    <p class="card-desc">${tool.description}</p>
    <div class="card-tags">${tags}</div>
    <div class="levels-block">
      <div class="levels-title">Уровни освоения</div>
      <div class="level-row"><span class="level-badge lb-b">Начальный</span><div class="level-bar-wrap"><div class="level-bar bar-b" style="width:15%"></div></div><span class="level-time">1–3 дня</span></div>
      <div class="level-desc-row">Базовое знакомство с интерфейсом</div>
      <div class="level-row"><span class="level-badge lb-m">Средний</span><div class="level-bar-wrap"><div class="level-bar bar-m" style="width:40%"></div></div><span class="level-time">1–2 недели</span></div>
      <div class="level-desc-row">Основные функции и интеграции</div>
      <div class="level-row"><span class="level-badge lb-p">Профи</span><div class="level-bar-wrap"><div class="level-bar bar-p" style="width:70%"></div></div><span class="level-time">1–2 месяца</span></div>
      <div class="level-desc-row">Продвинутые сценарии и API</div>
    </div>
    ${price}
    <div class="card-footer"><span class="card-use">Лучший для: ${tool.best_for}</span><a class="card-link" href="${tool.website}" target="_blank">${tool.website.replace("https://","")} →</a></div>
  </div>`;
}

function insertCards(html, tools) {
  let out = html, count = 0;
  for (const [i, tool] of tools.entries()) {
    const cat = tool.category||"text";
    const card = makeCard(tool, COLORS[i%COLORS.length]);
    const re = new RegExp(`(class="cards-grid"[^>]*data-cat="${cat}"[\\s\\S]*?)(\\n<\\/div>\\n)`, "m");
    if (re.test(out)) {
      out = out.replace(re, `$1${card}\n</div>\n`);
      ok(`Добавлен: ${tool.name} (${cat})`);
    } else {
      const fb = /(class="cards-grid"[^>]*data-cat="text"[\s\S]*?)(\n<\/div>\n)/m;
      out = out.replace(fb, `$1${card}\n</div>\n`);
      warn(`Секция '${cat}' не найдена → добавлен в 'text': ${tool.name}`);
    }
    count++;
  }
  return { html: out, count };
}

function updateDate(html) {
  const d = new Date();
  const mo = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  return html.replace(/id="last-updated">[^<]+</, `id="last-updated">Обновлено ${d.getDate()} ${mo[d.getMonth()]} ${d.getFullYear()}<`);
}

function gitPush(tools) {
  console.log("");
  log("Пушу на GitHub...","📤");
  const run = cmd => {
    const r = spawnSync(cmd, { shell:true, cwd:__dirname, encoding:"utf-8", timeout:30000 });
    if (r.error) throw r.error;
    if (r.status !== 0) throw new Error(r.stderr||r.stdout||cmd);
    return (r.stdout||"").trim();
  };
  try { run("git rev-parse --is-inside-work-tree"); } catch {
    fail("Не git-репозиторий. Сначала запусти: bash push_to_github.sh");
    return false;
  }
  try {
    run("git add ai_guide.html update_guide.js 2>/dev/null || git add ai_guide.html");
    const status = run("git status --porcelain");
    if (!status) { info("Нет изменений для коммита."); return true; }
    const d = new Date().toLocaleDateString("ru-RU");
    const names = tools.map(t=>t.name).join(", ");
    const msg = tools.length > 0
      ? `🤖 Автообновление ${d}: +${tools.length} инструментов (${names})`
      : `🔄 Обновление даты ${d}`;
    run(`git commit -m "${msg}"`);
    ok(`Коммит: "${msg}"`);
    run("git push");
    ok("Запушено в GitHub! 🚀");
    if (GITHUB_REPO) info(`https://github.com/${GITHUB_REPO}`);
    return true;
  } catch(e) { fail(`Git: ${e.message}`); return false; }
}

function ensureFiles() {
  const readme = path.join(__dirname,"README.md");
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(readme, `# 🧠 AI Guide — Нейросети мира\n\nПолный интерактивный гайд по 50+ AI-инструментам.\nОткрой \`ai_guide.html\` в браузере.\n\n## Автообновление\n\`\`\`bash\necho "ANTHROPIC_API_KEY=sk-ant-..." > .env\necho "GITHUB_REPO=ponomarev-igor/Ai-gude" >> .env\nnode update_guide.js\n\`\`\`\n\n## Cron (каждый понедельник в 9:00)\n\`\`\`\n0 9 * * 1 cd ~/Documents/ai-guide && node update_guide.js >> update.log 2>&1\n\`\`\`\n`,"utf-8");
    ok("README.md создан");
  }
  const gi = path.join(__dirname,".gitignore");
  if (!fs.existsSync(gi)) {
    fs.writeFileSync(gi, ".env\n*.log\n*_backup_*.html\n.DS_Store\nnode_modules/\n","utf-8");
    ok(".gitignore создан");
  }
}

async function main() {
  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║  🤖 AI Guide — Автообновление + GitHub     ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  if (!API_KEY) {
    fail("Нет ANTHROPIC_API_KEY");
    console.log("\n  Создай .env файл:\n  ANTHROPIC_API_KEY=sk-ant-...\n  GITHUB_REPO=ponomarev-igor/Ai-gude\n");
    process.exit(1);
  }
  if (!fs.existsSync(GUIDE_FILE)) { fail(`Файл не найден: ${GUIDE_FILE}`); process.exit(1); }

  ensureFiles();

  log(`Читаю: ai_guide.html`,"📂");
  const html = fs.readFileSync(GUIDE_FILE,"utf-8");
  const existing = extractExisting(html);
  info(`Уже в гайде: ${existing.length} инструментов`);

  let newTools = [];
  try { newTools = await findNew(existing); }
  catch(e) { fail(`API: ${e.message}`); process.exit(1); }

  if (newTools.length === 0) {
    ok("Новых инструментов не найдено — гайд актуален!");
    if (GITHUB_REPO) { fs.writeFileSync(GUIDE_FILE, updateDate(html),"utf-8"); gitPush([]); }
    process.exit(0);
  }

  log(`Найдено новых: ${newTools.length}`,"🆕");
  newTools.forEach(t => info(`  • ${t.name} (${t.company})`));
  console.log("");

  log("Вставляю карточки...","🔧");
  const { html: updated, count } = insertCards(html, newTools);
  const final = updateDate(updated);

  const backup = GUIDE_FILE.replace(".html",`_backup_${Date.now()}.html`);
  fs.copyFileSync(GUIDE_FILE, backup);
  info(`Бэкап: ${path.basename(backup)}`);
  fs.writeFileSync(GUIDE_FILE, final,"utf-8");

  console.log(`\n╔══════════════════════════╗\n║  ✅ Добавлено: ${String(count).padEnd(2)} карточки ║\n╚══════════════════════════╝`);

  if (GITHUB_REPO) gitPush(newTools.slice(0,count));
  else { warn("GITHUB_REPO не задан → пуш пропущен"); info("Добавь в .env: GITHUB_REPO=ponomarev-igor/Ai-gude"); }

  console.log("");
  log("Готово! Открой ai_guide.html в браузере","🌐");
}

main().catch(e => { fail(e.message); process.exit(1); });
