import LaravelService from "../../services/laravelService";
import logger from "../../utils/logger/loggerTelegram";
import {MyContext} from "../types/MyContext";
import {Scenes} from "telegraf";
import {SceneSession} from "telegraf/typings/scenes";

export const cabinetGate = async (ctx: MyContext, scene: string) => {
    let user = null;
    try{
        user = await LaravelService.getUserByTelegramId(ctx.from.id);
    } catch (error) {
        logger.error('Error getting user:', error);
        await ctx.reply('Произошла ошибка при получении данных пользователя. Попробуйте позже');
    }

    if(user && user.cabinets.length === 0) {
        await ctx.scene.enter('createCabinetWizzard');
    } else {
        await ctx.scene.enter(scene, {user});
    }
}