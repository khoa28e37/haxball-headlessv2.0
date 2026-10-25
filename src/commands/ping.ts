export const pingCommand = {
  name: "!ping",
  description: "Kiểm tra bot có hoạt động không",

  execute(room: any, player: any) {
    room.sendAnnouncement("🏓 Pong!", player.id);
  },
};