// Импортируем библиотеки
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Токены и ключи (ЗАМЕНИ НА СВОИ!)
const token = 8366063716:AAFvXkN8HZCwdAomH1NqLmgGjUaasoKls6Q;
const supabaseUrl = https://awdwayxizduqprjeqyyb.supabase.co;
const supabaseKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3ZHdheXhpemR1cXByamVxeXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDEzODgsImV4cCI6MjA3MjU3NzM4OH0.jiqDdWHDlpabwD_ohNjfqHRmps-p-ds4T9a7Wbdst6Y;

// Инициализируем клиентов
const bot = new TelegramBot(token, { polling: true });
const supabase = createClient(supabaseUrl, supabaseKey);

// Простой объект для хранения состояний
let userStates = {};

// Обработчик команды /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  // Проверяем, есть ли цель у пользователя
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('current_goal')
    .eq('user_id', userId)
    .single();

  if (userError || !userData || !userData.current_goal) {
    // Если цели нет, просим установить
    bot.sendMessage(chatId, 'Привет! Я помогу тебе отслеживать, как твои ежедневные решения влияют на главную цель. Для начала напиши свою основную цель одной строкой (например, "Накопить на новый ноутбук").');
    userStates[userId] = { awaiting: 'goal' }; // Сохраняем состояние
  } else {
    // Если цель есть, показываем меню
    showMainMenu(chatId, userData.current_goal);
  }
});

// Функция показа главного меню
function showMainMenu(chatId, goal) {
  bot.sendMessage(chatId, `Приветствую! Твоя текущая цель: "${goal}". Чем займемся?`, {
    reply_markup: {
      keyboard: [['Добавить решение'], ['Мой вклад за сегодня']],
      resize_keyboard: true
    }
  });
}

// Обработчик текстовых сообщений
bot.on('message', async (msg) => {
  if (msg.text.startsWith('/')) return; // Игнорируем команды

  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const text = msg.text;

  // Ожидаем цель от пользователя
  if (userStates[userId] && userStates[userId].awaiting === 'goal') {
    const { error } = await supabase
      .from('users')
      .upsert({ user_id: userId, current_goal: text }, { onConflict: 'user_id' });

    if (error) {
      console.error(error);
      bot.sendMessage(chatId, 'Произошла ошибка. Попробуй еще раз.');
    } else {
      bot.sendMessage(chatId, `Отлично! Цель "${text}" сохранена. Теперь давай оценим твое первое решение. Напиши, какое решение ты принял сегодня и как оно повлияло на цель. Например: "Купил кофе с собой (-1)"`);
      userStates[userId] = { awaiting: 'first_decision' }; // Меняем состояние
    }
    return;
  }

  // Ожидаем первое решение
  if (userStates[userId] && userStates[userId].awaiting === 'first_decision') {
    // Пока просто парсим вручную. Позже заменим на кнопки.
    bot.sendMessage(chatId, `Супер! Твое решение "${text}" записано. Это твой первый шаг в аудите эффективности. Чтобы добавить следующее решение, используй команду /add.`);
    delete userStates[userId]; // Очищаем состояние
    return;
  }

  // Обработка кнопок главного меню
  switch (text) {
    case 'Добавить решение':
      bot.sendMessage(chatId, 'Введите решение и его оценку (пока в формате "Текст решения (+2)")');
      break;
    case 'Мой вклад за сегодня':
      bot.sendMessage(chatId, 'Функция в разработке. Скоро здесь будет статистика!');
      break;
  }
});

console.log('Бот запущен и работает в режиме polling...');
