import { executeCommand } from "../CommandManager.js";

export function registerPlayerChat(room: any) {
  room.onPlayerChat = (player: any, message: string) => {
    console.log(`[CHAT] ${player.name}: ${message}`);

    if (executeCommand(room, player, message)) {
      return false;
    }
  };
}