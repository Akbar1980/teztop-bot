// ============================================================
// TezTop Telegram Bot - bot.js
// Deploy this on Railway (Node.js service)
// ============================================================

const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// ── Config ────────────────────────────────────────────────────
const BOT_TOKEN = '8369748051:AAGybKzsGmkBZVvVy2gTDtikYsQK8jVHJIM';
const MINI_APP_URL = 'https://teztop-miniapp.vercel.app';
const SUPABASE_URL = 'https://kexttjudzoclhujqyovy.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleHR0anVkem9jbGh1anF5b3Z5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyMjEzNiwiZXhwIjoyMDg5Njk4MTM2fQ.HBGEqOL-dtK5enysuNOuBcJPGQdRQVay7aRVXTR0CN4';

// ── Init ──────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('✅ TezTop bot started');

// ── /start ────────────────────────────────────────────────────
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName = msg.from.first_name || 'Foydalanuvchi';
  const startParam = (match[1] || '').trim(); // e.g. " biz_123"

  // ── Deep link: someone shared a specific business ──────────
  if (startParam.startsWith('biz_')) {
    const bizId = startParam.replace('biz_', '');
    if (bizId && !isNaN(parseInt(bizId))) {
      await bot.sendMessage(
        chatId,
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
      // Already registered — open the app
      await bot.sendMessage(
        chatId,
        `Xush kelibsiz, ${firstName}! 🎉\nQarshi shahridagi joylarni topish uchun quyidagi tugmani bosing:`,
        {
          reply_markup: {
            keyboard: [[{
              text: '🗺 TezTop ni ochish',
              web_app: { url: MINI_APP_URL }
            }]],
            resize_keyboard: true,
          }
        }
      );
    } else {
      // New user — ask for phone number
      await bot.sendMessage(
        chatId,
        `Salom, ${firstName}! 👋\n\nTezTop — Qarshi shahridagi joylarni topish ilovasi.\n\nRo'yxatdan o'tish uchun telefon raqamingizni yuboring:`,
        {
          reply_markup: {
            keyboard: [[{
              text: '📱 Telefon raqamni yuborish',
              request_contact: true,
            }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          }
        }
      );
    }
  } catch (err) {
    console.error('Error in /start:', err.message);
    await bot.sendMessage(chatId, `Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`);
  }
});

// ── Phone number received (contact share) ────────────────────
bot.on('contact', async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const firstName = msg.from.first_name || 'Foydalanuvchi';
  const contact = msg.contact;

  // Only accept the user's own contact
  if (contact.user_id !== telegramId) {
    await bot.sendMessage(chatId, `Iltimos, o'z telefon raqamingizni yuboring.`);
    return;
  }

  try {
    // Upsert user into Supabase
    const { error } = await supabase
      .from('users')
      .upsert({
        telegram_id: telegramId,
        phone: contact.phone_number,
        first_name: firstName,
        last_name: msg.from.last_name || null,
        username: msg.from.username || null,
        is_admin: false,
      }, { onConflict: 'telegram_id' });

    if (error) throw error;

    await bot.sendMessage(
      chatId,
      `✅ Ro'yxatdan o'tdingiz!\n\nXush kelibsiz, ${firstName}! Quyidagi tugma orqali TezTop ni oching:`,
      {
        reply_markup: {
          keyboard: [[{
            text: '🗺 TezTop ni ochish',
            web_app: { url: MINI_APP_URL }
          }]],
          resize_keyboard: true,
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
  await bot.sendMessage(
    msg.chat.id,
    `ℹ️ *TezTop yordami*\n\n` +
    `/start — Botni ishga tushirish\n` +
    `/help — Yordam\n\n` +
    `Savollar uchun: @teztop_support`,
    { parse_mode: 'Markdown' }
  );
});

// ── Error handling ────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message);
});
