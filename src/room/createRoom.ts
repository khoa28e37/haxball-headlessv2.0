import HaxballJS from "haxball.js";
import { config } from "../config/config.js";

export function createRoom(token: string) {
  console.log("Creating room...");

  return HaxballJS().then((HBInit) => {
    const room = HBInit({
      roomName: config.roomName,
      maxPlayers: config.maxPlayers,
      public: config.public,
      noPlayer: config.noPlayer,
      token,
    });

    return room;
  });
}