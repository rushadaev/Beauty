import LaravelService from "../../services/laravelService";
import logger from "../../utils/logger/loggerTelegram";
import {MyContext} from "../types/MyContext";
import {Scenes} from "telegraf";
import {SceneSession} from "telegraf/typings/scenes";

export const cabinetGate = async (ctx: MyContext, scene: string) => {
    let user = null;
    try{
        user = await LaravelService.getUserByTelegramId(ctx.from.id, 10);
    } catch (error) {
        logger.error('Error getting user:', error);
        await ctx.reply('Произошла ошибка при получении данных пользователя. Попробуйте позже');
    }

    if (!user) {
        await ctx.reply('Пользователь не найден. Пожалуйста, зарегистрируйтесь');
        return;
    }

    // if no phone then auth
    if (!user.phone_number) {
        await ctx.scene.enter('login_wizard');
        return;
    }

    ctx.session.user = user;

    console.log('user', user);


    await ctx.scene.enter(scene, {user});
}