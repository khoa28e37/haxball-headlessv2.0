export const config = {
  roomName: "Khoa's Football",
  maxPlayers: 16,
  public: true,
  password: process.env.ROOM_PASSWORD || undefined,
  noPlayer: true,
};
