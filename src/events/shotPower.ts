
const BALL_DISC_ID = 0;
const MIN_SHOT_SPEED = 3.5;
const MAX_SHOT_SPEED = 13;
const MAX_HOLD_TIME = 2000;
const EXTRA_RANGE = 10;

export function registerShotPower(
  room: any,
  onShot?: (player: any) => void
) {
  const holdStart = new Map<number, number>();
  const kickFlag = room.InputFlags.kick;
  const collisionKickFlag = room.CollisionFlags.kick;

  function disableDefaultKick() {
    const ball = room.getDiscProperties(BALL_DISC_ID);

    if (!ball) {
      console.error("[SHOT] Không tìm thấy bóng disc 0.");
      return;
    }

    const newGroup = ball.cGroup & ~collisionKickFlag;

    room.setDiscProperties(BALL_DISC_ID, {
      cGroup: newGroup,
    });

    console.log(
      `[SHOT] Tắt kick mặc định: cGroup ${ball.cGroup} -> ${newGroup}`
    );
  }

  // Cài ngay và áp dụng lại khi bắt đầu trận đấu.
  // Cài khi khởi tạo phòng và khi trận đấu bắt đầu.
disableDefaultKick();

room.onGameStart = () => {
  holdStart.clear();
  disableDefaultKick();
};

// Áp dụng lại sau khi ghi bàn và đặt lại vị trí.
room.onPositionsReset = () => {
  holdStart.clear();
  disableDefaultKick();

  console.log("[SHOT] Đã khôi phục Charge Shot sau bàn thắng.");
};

  room.onPlayerInput = (player: any, prevInput: number) => {
    const isPressed = (player.input & kickFlag) !== 0;
    const wasPressed = (prevInput & kickFlag) !== 0;

    if (isPressed && !wasPressed) {
      holdStart.set(player.id, Date.now());
      console.log(`[SHOT] ${player.name} nhấn Kick.`);
      return;
    }

    if (!isPressed && wasPressed) {
      const startedAt = holdStart.get(player.id);

      console.log(`[SHOT] ${player.name} thả Kick.`);

      if (startedAt === undefined) {
        console.log("[SHOT] Không tìm thấy thời điểm bắt đầu giữ.");
        return;
      }

      holdStart.delete(player.id);

      const heldMs = Math.min(Date.now() - startedAt, MAX_HOLD_TIME);
      const charge = heldMs / MAX_HOLD_TIME;
      const shotSpeed =
        MIN_SHOT_SPEED + (MAX_SHOT_SPEED - MIN_SHOT_SPEED) * charge;

      const playerDisc = room.getPlayerDiscProperties(player.id);
      const ball = room.getDiscProperties(BALL_DISC_ID);

      if (!playerDisc || !ball) {
        console.log("[SHOT] Không lấy được dữ liệu người chơi hoặc bóng.");
        return;
      }

      const dx = ball.x - playerDisc.x;
      const dy = ball.y - playerDisc.y;
      const distance = Math.hypot(dx, dy);
      const maxDistance =
        (playerDisc.radius ?? 15) + (ball.radius ?? 6.25) + EXTRA_RANGE;

      console.log(
        `[SHOT] Giữ ${heldMs}ms; khoảng cách ${distance.toFixed(1)}; giới hạn ${maxDistance.toFixed(1)}`
      );

      if (distance > maxDistance || distance < 0.001) {
        console.log("[SHOT] Bỏ qua: bóng ở quá xa hoặc trùng tâm.");
        return;
      }

      room.setDiscProperties(BALL_DISC_ID, {
        xspeed: (dx / distance) * shotSpeed,
        yspeed: (dy / distance) * shotSpeed,
      });
      onShot?.(player);

      console.log(`[SHOT] Áp dụng vận tốc: ${shotSpeed.toFixed(2)}`);
    }
  };

  room.onPlayerLeave = (player: any) => {
    holdStart.delete(player.id);
  };

  console.log("[SHOT] Bộ xử lý lực sút đã đăng ký.");
}
