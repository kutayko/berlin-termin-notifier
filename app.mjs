import { parse } from 'node-html-parser';
import fetch from 'node-fetch';
import TelegramBot from 'node-telegram-bot-api';

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const AMT_URL = process.env.AMT_URL;
const AMT_NAME = process.env.AMT_NAME;
const SERVICE_BERLIN_URL = process.env.SERVICE_BERLIN_URL;

const app = async () => {
    // Fetch Page
    const availableDays = await fetchPage(AMT_URL);

    if(availableDays.length){
        console.log("available days found:");
        console.log(availableDays);

        console.log(serialize(availableDays));

        // Notify through Telegram
        const bot = new TelegramBot(BOT_TOKEN);
        const botResponse = await bot.sendMessage(
            CHAT_ID,
            `${AMT_NAME}\n` + serialize(availableDays),
            { parse_mode: "MarkdownV2", disable_web_page_preview: true }
        ).catch((error) => {
            console.log(error.code);  // => 'ETELEGRAM'
            console.log(error.response.body); // => { ok: false, error_code: 400, description: 'Bad Request: chat not found' }
        });

        console.log(botResponse);
        return botResponse;
    }

    const noResult = 'no days found';
    console.log(noResult);
    return noResult;
};

const fetchPage = async (url, depth=0) => {
    console.log('depth', depth);
    if(depth == 3) {
        return [];
    }

    const response = await fetch(url);
    const raw = await response.text();
    const html = parse(raw);

    const availableDays = parse(html)
        .querySelectorAll('.calendar-month-table')
        .map(getAvailableDays)
        .flat();

    if(availableDays.length) {
        return availableDays;
    }

    console.log('no available days.. fetching next page');
    const a = html.querySelector('.next a');
    if (a) {
        const nextUrl = `${SERVICE_BERLIN_URL}${a.getAttribute('href')}`;
        return fetchPage(nextUrl, depth + 1);
    }

    console.log('no next url');
    return [];
}

const getAvailableDays = (monthTable) => {
    const monthName = monthTable.querySelector('.month').innerHTML;
    return monthTable
        .querySelectorAll('.buchbar')
        .map(day => {
            const a = day.querySelector('a');
            return {
                date: `${a.innerHTML} ${monthName}`,
                url: `${SERVICE_BERLIN_URL}${a.getAttribute('href')}`
            };
        });
};

const serialize = (availableDays) => availableDays
    .map(day => `[${day.date}](${day.url})`)
    .join('\n');

export { app };