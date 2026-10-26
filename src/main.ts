import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { loadRandomMap } from "../maps/mapManager.js";
import { createRoom } from "./room/createRoom.js";
import { registerPlayerChat } from "./events/playerChat.js";
import { registerAutoAdmin } from "./events/autoAdmin.js";
import { registerShotPower } from "./events/shotPower.js";
import { registerRsEliteFieldRules } from "./events/fieldRules.js";

async function main() {
  const terminal = createInterface({
    input: stdin,
    output: stdout,
  });

  let token: string;

  try {
    token = (
      await terminal.question("Paste your fresh HaxBall token: ")
    ).trim();
  } finally {
    terminal.close();
  }

  if (!token) {
    throw new Error("HAXBALL_TOKEN is empty.");
  }

  const room = await createRoom(token);
  const selectedMap = await loadRandomMap(room);

  registerAutoAdmin(room);
  registerPlayerChat(room);
  registerShotPower(room);
  if (selectedMap.toLowerCase().includes("rs-elite")) {
    const recordShotTouch = registerRsEliteFieldRules(room);

    registerShotPower(room, recordShotTouch);

    console.log("[FIELD] Đã bật luật đá biên và phạt góc cho RS ELITE.");
  } else {
    registerShotPower(room);
  }

  room.onRoomLink = (link: string) => {
    console.log("Room Link:", link);
  };

  console.log("HaxBall room initialized!");
}

main().catch((error) => {
  console.error("Failed to start HaxBall room:", error);
});