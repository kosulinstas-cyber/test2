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
  // Парсим текст сообщения. Ожидаем формат "Текст решения (+1)"
  const match = text.match(/(.+)\s\(([+-]?\d)\)/); // Ищет текст и цифру в скобках
  
  if (!match) {
    bot.sendMessage(chatId, 'Неверный формат. Пожалуйста, напиши в формате: "Текст решения (+1)"');
    return;
  }
  
  const decisionText = match[1].trim();
  const impactScore = parseInt(match[2]);
  
  // Сохраняем решение в базу данных
  const { error } = await supabase
    .from('decisions')
    .insert([
      { 
        user_id: userId, 
        decision_text: decisionText, 
        impact_score: impactScore 
      }
    ]);
if (error) {
  console.error(error);
  bot.sendMessage(chatId, Произошла ошибка. Попробуй еще раз.);
} else {
  // Сохраняем не только состояние, но и цель
  userStates[userId] = { awaiting: 'first_decision', goal: text };
  bot.sendMessage(chatId, Отлично! Цель ${text} сохранена. Теперь давай оценим твое первое решение. Напиши, какое решение ты принял сегодня и как оно повлияло на цель. Например: Купил кофе с собой (-1)`);
}
  // Очищаем состояние
  delete userStates[userId];
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
