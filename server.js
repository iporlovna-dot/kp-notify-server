const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const TOKEN = process.env.TG_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;

app.post("/notify", async (req, res) => {
  try {
    const { tasks, warehouse, deliveries } = req.body;

    let msg = "📊 *Сводка с сайта*\n\n";

    // Задачи
    const overdue = tasks.filter(t => !t.done && t.deadline && new Date(t.deadline) < new Date().setHours(0,0,0,0));
    const soon = tasks.filter(t => {
      if (t.done || !t.deadline) return false;
      const d = Math.ceil((new Date(t.deadline) - new Date().setHours(0,0,0,0)) / 86400000);
      return d >= 0 && d <= 3;
    });

    msg += `📋 *Задачи*\n`;
    msg += `• Активных: ${tasks.filter(t => !t.done).length}\n`;
    if (overdue.length) {
      msg += `• ❗ Просрочено: ${overdue.length}\n`;
      overdue.slice(0, 3).forEach(t => { msg += `  — ${t.title}\n`; });
    }
    if (soon.length) {
      msg += `• ⚠️ Скоро дедлайн: ${soon.length}\n`;
      soon.slice(0, 3).forEach(t => { msg += `  — ${t.title}\n`; });
    }
    msg += "\n";

    // Склад
    const outOfStock = warehouse.filter(w => w.qty === 0);
    const lowStock = warehouse.filter(w => w.min && w.qty <= w.min && w.qty > 0);
    msg += `📦 *Склад*\n`;
    msg += `• Позиций: ${warehouse.length}\n`;
    if (outOfStock.length) {
      msg += `• ❗ Нет в наличии: ${outOfStock.length}\n`;
      outOfStock.slice(0, 3).forEach(w => { msg += `  — ${w.name}\n`; });
    }
    if (lowStock.length) {
      msg += `• ⚠️ Заканчивается: ${lowStock.length}\n`;
      lowStock.slice(0, 3).forEach(w => { msg += `  — ${w.name} (${w.qty} ${w.unit})\n`; });
    }
    msg += "\n";

    // Доставки
    const total = deliveries.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
    msg += `🚚 *Доставки*\n`;
    msg += `• Всего записей: ${deliveries.length}\n`;
    msg += `• Общая сумма: ${total.toLocaleString("ru-RU")} руб.\n`;
    if (deliveries.length) {
      const last = deliveries[0];
      msg += `• Последняя: ${last.supplier} — ${parseFloat(last.amount).toLocaleString("ru-RU")} руб.\n`;
    }

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: "Markdown" })
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/", (req, res) => res.send("OK"));

app.listen(process.env.PORT || 3001, () => console.log("Server running"));
