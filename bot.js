import TelegramBot from 'node-telegram-bot-api';
import { scheduleJob } from 'node-schedule';

const TELEGRAM_TOKEN = '6713977240:AAFvQ7m926udVxYDlfQimFXf2tSlX_vyEsU';
const WEATHER_API_KEY = '6a2fef38914b2f4a5f01f8dffc08acbc'; 
let chatIds = []; // массив для хранения chat_id пользователей
let userCities = {}; // объект для хранения городов пользователей

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: { interval: 3000, autoStart: true, params: { timeout: 200 } } });

async function getWeather(city) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric&lang=ru`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const temp = data.main.temp;
      const weatherDescription = data.weather[0].description;
      return `Сегодня температура в городе ${city}: ${temp}°C\nОписание погоды: ${weatherDescription}\nДавайте в эту прекрасную погоду напомним @Geraev1991, что eму пора жениться`;
    } else {
      return "Не удалось получить данные о погоде.";
    }
  } catch (error) {
    console.error('Error fetching weather:', error);
    return "Произошла ошибка при получении данных о погоде.";
  }
}

async function sendWeather(chatId, city) {
  const weather = await getWeather(city);
  bot.sendMessage(chatId, weather);
}

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

async function quotes() {
  try {
    const response = await fetch('https://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=ru');
    if (response.ok) {
      const data = await response.json()
      chatIds.forEach(chatId => { 
        bot.sendMessage(chatId, `${data.quoteText}
      
        автор: ${data.quoteAuthor}`);
       });

    } else {
      return "Не удалось получить данные о погоде.";
    }
  } catch (error) {
    console.error('Error fetching weather:', error);
    return "Произошла ошибка при получении цитаты.";
  }
}

setInterval(()=>{
    quotes()
}, 100000)

scheduleJob('0 7 * * *', async () => {
  try {
    chatIds.forEach(chatId => {
      const city = userCities[chatId] || 'Moscow'; // используем сохранённый город или по умолчанию 'Moscow'
      bot.sendMessage(chatId, "Отправка погоды...");
      sendWeather(chatId, city);
    });
  } catch (error) {
    console.error('Scheduled job error:', error);
  }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!chatIds.includes(chatId)) {
    chatIds.push(chatId); // сохраняем chat_id только если его нет в массиве
  }
  bot.sendMessage(chatId, `Добро пожаловать! Я буду присылать вам погоду каждое утро.\nУкажите ваш город`);
});

bot.onText(/\/weather (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!chatIds.includes(chatId)) {
    chatIds.push(chatId); // сохраняем chat_id только если его нет в массиве
  }
  const city = match[1].trim();
  if (city) {
    userCities[chatId] = city; // сохраняем город для пользователя
    sendWeather(chatId, city);
  } else {
    bot.sendMessage(chatId, "Пожалуйста, укажите город после команды /weather.");
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  
  if (!chatIds.includes(chatId)) {
    chatIds.push(chatId); // сохраняем chat_id только если его нет в массиве
  }

  if (text.match(/^\/\w+/)) {
    return; // если это команда, ничего не делаем
  }

  // предполагаем, что это город
  if (text) {
    userCities[chatId] = text; // сохраняем город для пользователя
    sendWeather(chatId, text);
  } else {
    bot.sendMessage(chatId, "Пожалуйста, укажите город для получения погоды.");
  }
});
