
export function registerAutoAdmin(room: any) {
  let adminAssigned = false;

  room.onPlayerJoin = (player: any) => {
    if (adminAssigned) return;

    room.setPlayerAdmin(player.id, true);
    adminAssigned = true;

    room.sendAnnouncement(
      `👑 ${player.name} đã được cấp quyền Admin!`
    );

    console.log(`[ADMIN] Đã cấp Admin cho ${player.name}`);
  };
}
