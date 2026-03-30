const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = '8369748051:AAGybKzsGmkBZVvVy2gTDtikYsQK8jVHJIM';
const MINI_APP_URL = 'https://teztop-miniapp.vercel.app';
const SUPABASE_URL = 'https://kexttjudzoclhujqyovy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleHR0anVkem9jbGh1anF5b3Z5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyMjEzNiwiZXhwIjoyMDg5Njk4MTM2fQ.HBGEqOL-dtK5enysuNOuBcJPGQdRQVay7aRVXTR0CN4';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('✅ TezTop bot started');

// ── /start ────────────────────────────────────────────────────
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName = msg.from.first_name || 'Foydalanuvchi';
  const startParam = (match[1] || '').trim();

  // ── Deep link: someone shared a specific business ──────────
  if (startParam.startsWith('biz_')) {
    const bizId = startParam.replace('biz_', '');
    if (bizId && !isNaN(parseInt(bizId))) {
      await bot.sendMessage(chatId,
        `📍 TezTop orqali ulashilgan joy — ochish uchun pastdagi tugmani bosing:`,
        {
          reply_markup: {
            inline_keyboard: [[{
              text: '📍 TezTop da ochish',
              web_app: { url: `${MINI_APP_URL}?startapp=biz_${bizId}` }
            }]]
          }
        }
      );
      return;
    }
  }

  // ── Normal /start ──────────────────────────────────────────
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, phone')
      .eq('telegram_id', telegramId)
      .single();

    if (existingUser) {
      // ── Returning registered user ──────────────────────────
      await bot.sendMessage(chatId,
        `Xush kelibsiz, ${firstName}! 🎉\nQarshi shahridagi joylarni topish uchun quyidagi tugmani bosing:`,
        {
          reply_markup: {
            inline_keyboard: [[{
              text: '🗺 TezTop ni ochish',
              web_app: { url: MINI_APP_URL }
            }]]
          }
        }
      );
    } else {
      // ── New unregistered user — two options ────────────────
      await bot.sendMessage(chatId,
        `Salom, ${firstName}! 👋\n\n` +
        `TezTop — Qarshi shahridagi joylarni topish, sharh qoldirish va do'stlar bilan ulashish ilovasi.\n\n` +
        `Ilovani hoziroq ochishingiz mumkin — buning uchun ro'yxatdan o'tish shart emas.\n` +
        `Sharh qoldirish, sevimlilarni belgilash va yangi joy qo'shish uchun esa ro'yxatdan o'tish kerak — bu mutlaqo bepul va 30 soniyadan kam vaqt oladi.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{
                text: "🗺 TezTop ni ochish",
                web_app: { url: MINI_APP_URL }
              }],
              [{
                text: "📱 Ro'yxatdan o'tish — sharh qoldirish va yanada ko'proq imkoniyatlar uchun",
                callback_data: 'register'
              }]
            ]
          }
        }
      );
    }
  } catch (err) {
    console.error('Error in /start:', err.message);
    await bot.sendMessage(chatId, `Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`);
  }
});

// ── Register button tapped ────────────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const firstName = query.from.first_name || 'Foydalanuvchi';

  if (query.data === 'register') {
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId,
      `Ro'yxatdan o'tish uchun telefon raqamingizni yuboring, ${firstName}:`,
      {
        reply_markup: {
          keyboard: [[{
            text: "📱 Telefon raqamni yuborish",
            request_contact: true,
          }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        }
      }
    );
  }
});

// ── Phone number received ─────────────────────────────────────
bot.on('contact', async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName = msg.from.first_name || 'Foydalanuvchi';
  const contact = msg.contact;

  if (contact.user_id !== telegramId) {
    await bot.sendMessage(chatId, `Iltimos, o'z telefon raqamingizni yuboring.`);
    return;
  }

  try {
    const { error } = await supabase.from('users').upsert({
      telegram_id: telegramId,
      phone: contact.phone_number,
      first_name: firstName,
      last_name: msg.from.last_name || null,
      username: msg.from.username || null,
      is_admin: false,
    }, { onConflict: 'telegram_id' });

    if (error) throw error;

    await bot.sendMessage(chatId,
      `✅ Ro'yxatdan o'tdingiz!\n\nXush kelibsiz, ${firstName}! Endi barcha imkoniyatlardan foydalanishingiz mumkin:`,
      {
        reply_markup: {
          inline_keyboard: [[{
            text: "🗺 TezTop ni ochish",
            web_app: { url: MINI_APP_URL }
          }]]
        }
      }
    );
  } catch (err) {
    console.error('Error saving contact:', err.message);
    await bot.sendMessage(chatId, `Xatolik yuz berdi. Iltimos, /start ni qayta yuboring.`);
  }
});

// ── /help ─────────────────────────────────────────────────────
bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(msg.chat.id,
    `ℹ️ *TezTop yordami*\n\n/start — Botni ishga tushirish\n/help — Yordam`,
    { parse_mode: 'Markdown' }
  );
});

bot.on('polling_error', (err) => console.error('Polling error:', err.message));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err.message));
