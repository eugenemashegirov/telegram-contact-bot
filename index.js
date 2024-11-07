const { Telegraf, Composer, Markup } = require("telegraf");
const { message } = require("telegraf/filters");
const rateLimit = require("telegraf-ratelimit");
const dotenv = require("dotenv");
dotenv.config();

const adminId = +process.env.ADMIN_ID;
const token = process.env.BOT_TOKEN;
if (!adminId) throw new Error(`"ADMIN_ID" env var is required!`);
if (!token) throw new Error(`"BOT_TOKEN" env var is required!`);

const limitConfig = {
    window: 10000,
    limit: 1,
    onLimitExceeded: async (ctx, next) => await ctx.reply("Rate limit exceeded! Try again later.")
}

const bot = new Telegraf(token);

const adminBot = new Composer();
adminBot.start(async ctx => {
    const startMessage = "👋 Hello! Please wait while users start reaching out to you...\n\n" +
        "✨ *Quick Tip:*\n" +
        "You can message the user through the bot using the command:\n" +
        "`/reply user_id your_message`";

    await ctx.reply(startMessage, {parse_mode: "Markdown"});
});
adminBot.on(message("text"), async ctx => {
    const [command, userIdToReply, ...replyText] = ctx.message.text.split(" ");

    if (command === "/reply" && userIdToReply && replyText.length > 0) {
        try {
            await ctx.telegram.sendMessage(userIdToReply, replyText.join(" "));
            await ctx.reply("A reply has been sent to the user.");
        } catch (error) {
            await ctx.reply("Error sending reply.")
        }
    } else {
        await ctx.reply("To reply to a user, use: `/reply user_id your_message`", {parse_mode: "Markdown"});
    }
});

const userBot = new Composer();
userBot.use(rateLimit(limitConfig));
userBot.start(async ctx => {
    await ctx.reply("Greetings! Write your question or message and I will forward it to the admin.");
});
userBot.on(message("text"), async ctx => {
    const name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.first_name}!`;
    const message = `New message from ${name} (ID: ${ctx.from.id}).\n\n${ctx.message.text}`;

    try {
        await ctx.telegram.sendMessage(adminId, message);
        await ctx.reply("Your message has been sent.");
    } catch (error) {
        await ctx.reply("An error occurred when sending a message.")
    }
});

bot.use(Composer.acl([adminId], adminBot));
bot.use(userBot);

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
