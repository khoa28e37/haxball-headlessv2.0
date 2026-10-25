const PASS_SPEED_RATIO = 0.4;
const BALL_DISC_ID = 0;

// Khoảng đệm giữa hai đĩa khi chuyền
const PASS_MARGIN = 5;

export function passBall(room: any, playerId: number) {
  const playerDisc = room.getPlayerDiscProperties(playerId);
  const ball = room.getDiscProperties(BALL_DISC_ID);

  if (!playerDisc || !ball) return;

  const dx = ball.x - playerDisc.x;
  const dy = ball.y - playerDisc.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const playerRadius = playerDisc.radius ?? 15;
  const ballRadius = ball.radius ?? 6.25;

  const maxDistance = playerRadius + ballRadius + PASS_MARGIN;

  // Chỉ chuyền khi bóng ở sát người chơi
  if (distance > maxDistance) return;

  room.setDiscProperties(BALL_DISC_ID, {
    xspeed: ball.xspeed * PASS_SPEED_RATIO,
    yspeed: ball.yspeed * PASS_SPEED_RATIO,
  });
}