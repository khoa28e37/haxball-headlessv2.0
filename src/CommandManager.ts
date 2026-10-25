import { pingCommand } from "./commands/ping.js";

const commands = [pingCommand];

export function executeCommand(
  room: any,
  player: any,
  message: string
): boolean {
  const command = commands.find((cmd) => cmd.name === message);

  if (!command) {
    return false;
  }

  command.execute(room, player);
  return true;
}