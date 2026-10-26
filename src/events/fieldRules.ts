
type Team = 1 | 2;
type BarrierType = "throw-in" | "corner" | "goal-kick" | "none";

const BALL_ID = 0;
const HALF_LENGTH = 1150;
const HALF_WIDTH = 550;
const GOAL_HALF_WIDTH = 115;

const TOUCHLINE_BARRIER_Y = 500;
const CORNER_HALF_SIZE = 55;
const CORNER_OFFSET = 55;

export function registerRsEliteFieldRules(room: any) {
  let lastTouchTeam: Team | null = null;
  let restartActive = false;
  let restartTeam: Team | null = null;
  let previousPosition: { x: number; y: number } | null = null;
  let originalBallCGroup: number | null = null;

  // Lưu nhóm va chạm gốc của người chơi để khôi phục chính xác.
  const originalGroups = new Map<number, number>();

  const flags = room.CollisionFlags;

  function teamName(team: Team): string {
    return team === 1 ? "ĐỎ" : "XANH";
  }

  function otherTeam(team: Team): Team {
    return team === 1 ? 2 : 1;
  }

  function restoreBlockedTeam() {
    for (const [playerId, originalGroup] of originalGroups) {
      room.setPlayerDiscProperties(playerId, {
        cGroup: originalGroup,
      });
    }

    originalGroups.clear();
  }

  function disableGoalScoring() {
    const ball = room.getDiscProperties(BALL_ID);
    if (!ball) return;

    if (originalBallCGroup === null) {
      originalBallCGroup = ball.cGroup;
    }

    room.setDiscProperties(BALL_ID, {
      cGroup: ball.cGroup & ~flags.score,
    });

    console.log("[FIELD] Đã khóa ghi bàn trong lúc phát bóng lên.");
  }

  function restoreGoalScoring() {
    if (originalBallCGroup === null) return;

    room.setDiscProperties(BALL_ID, {
      cGroup: originalBallCGroup,
    });

    originalBallCGroup = null;
    console.log("[FIELD] Đã mở lại khả năng ghi bàn.");
  }

  function blockTeam(team: Team, customFlag: number) {
    restoreBlockedTeam();

    for (const player of room.getPlayerList()) {
      if (player.team !== team) continue;

      const disc = room.getPlayerDiscProperties(player.id);
      if (!disc) continue;

      originalGroups.set(player.id, disc.cGroup);

      room.setPlayerDiscProperties(player.id, {
        cGroup: disc.cGroup | customFlag,
      });
    }

    console.log(
      `[FIELD] Đội ${teamName(team)} bị chặn bằng cờ va chạm ${customFlag}.`,
    );
  }

  function pushPlayersInsideTouchline(side: number, blockedTeam: Team) {
    for (const player of room.getPlayerList()) {
      if (player.team !== blockedTeam) continue;

      const disc = room.getPlayerDiscProperties(player.id);
      if (!disc) continue;

      const radius = disc.radius ?? 15;

      if (side * disc.y >= TOUCHLINE_BARRIER_Y - radius) {
        room.setPlayerDiscProperties(player.id, {
          y: side * (TOUCHLINE_BARRIER_Y - radius - 5),
          xspeed: 0,
          yspeed: 0,
        });
      }
    }
  }

  function pushPlayersOutsideCornerSquare(
    xSide: number,
    ySide: number,
    blockedTeam: Team,
  ) {
    const centerX = xSide * (HALF_LENGTH - CORNER_OFFSET);
    const centerY = ySide * (HALF_WIDTH - CORNER_OFFSET);

    for (const player of room.getPlayerList()) {
      if (player.team !== blockedTeam) continue;

      const disc = room.getPlayerDiscProperties(player.id);
      if (!disc) continue;

      const radius = disc.radius ?? 15;

      if (
        Math.abs(disc.x - centerX) <= CORNER_HALF_SIZE + radius &&
        Math.abs(disc.y - centerY) <= CORNER_HALF_SIZE + radius
      ) {
        room.setPlayerDiscProperties(player.id, {
          x: centerX - xSide * (CORNER_HALF_SIZE + radius + 5),
          y: centerY - ySide * (CORNER_HALF_SIZE + radius + 5),
          xspeed: 0,
          yspeed: 0,
        });
      }
    }
  }

  function restartBall(
    x: number,
    y: number,
    awardedTeam: Team,
    message: string,
    barrierType: BarrierType = "none",
  ) {
    restoreBlockedTeam();
    restoreGoalScoring();

    room.setDiscProperties(BALL_ID, {
      x,
      y,
      xspeed: 0,
      yspeed: 0,
    });

    restartActive = true;
    restartTeam = awardedTeam;
    lastTouchTeam = null;
    previousPosition = { x, y };

    const blockedTeam = otherTeam(awardedTeam);

    if (barrierType === "throw-in") {
      blockTeam(blockedTeam, flags.c0);
      pushPlayersInsideTouchline(Math.sign(y) || 1, blockedTeam);
    } else if (barrierType === "corner") {
      blockTeam(blockedTeam, flags.c1);
      pushPlayersOutsideCornerSquare(
        Math.sign(x) || 1,
        Math.sign(y) || 1,
        blockedTeam,
      );
    } else if (barrierType === "goal-kick") {
      // Không bật vạch chắn trong tình huống phát bóng lên.
      // Khóa ghi bàn của cả hai đội cho đến khi đội được hưởng chạm bóng.
      disableGoalScoring();
    }

    room.sendAnnouncement(message);
    console.log(`[FIELD] ${message}`);
  }

  function recordTouch(player: any) {
    if (player.team !== 1 && player.team !== 2) return;

    lastTouchTeam = player.team;

    if (restartActive && restartTeam === player.team) {
      restoreBlockedTeam();
      restoreGoalScoring();

      restartActive = false;
      restartTeam = null;

      console.log(
        "[FIELD] Đội được hưởng đã chạm bóng; vạch chắn và khóa ghi bàn đã được gỡ.",
      );
    }
  }

  const previousPositionsReset = room.onPositionsReset;

  room.onPositionsReset = () => {
    previousPositionsReset?.();

    restoreBlockedTeam();
    restoreGoalScoring();

    lastTouchTeam = null;
    restartActive = false;
    restartTeam = null;
    previousPosition = null;
  };

  room.onGameTick = () => {
    const ball = room.getDiscProperties(BALL_ID);
    if (!ball) return;

    const current = { x: ball.x, y: ball.y };
    const radius = ball.radius ?? 8;

    if (!previousPosition) {
      previousPosition = current;
      return;
    }

    // Trong tình huống cố định, ưu tiên xác nhận đội được hưởng
    // thực sự đã chạm bóng trước khi mở lại ghi bàn và va chạm.
    if (restartActive) {
      previousPosition = current;

      for (const player of room.getPlayerList()) {
        if (player.team !== restartTeam) continue;

        const disc = room.getPlayerDiscProperties(player.id);
        if (!disc) continue;

        const distance = Math.hypot(
          ball.x - disc.x,
          ball.y - disc.y,
        );

        const contactDistance =
          (disc.radius ?? 15) + radius + 2;

        if (distance <= contactDistance) {
          recordTouch(player);
          break;
        }
      }

      return;
    }

    // Ước lượng đội chạm bóng cuối dựa vào khoảng cách tới bóng.
    let closestTeam: Team | null = null;
    let closestDistance = Infinity;

    for (const player of room.getPlayerList()) {
      if (player.team !== 1 && player.team !== 2) continue;

      const disc = room.getPlayerDiscProperties(player.id);
      if (!disc) continue;

      const distance = Math.hypot(
        ball.x - disc.x,
        ball.y - disc.y,
      );

      const contactDistance =
        (disc.radius ?? 15) + radius + 3;

      if (
        distance <= contactDistance &&
        distance < closestDistance
      ) {
        closestDistance = distance;
        closestTeam = player.team;
      }
    }

    if (closestTeam !== null) {
      lastTouchTeam = closestTeam;
    }

    const previous = previousPosition;
    previousPosition = current;

    const tx = crossingTime(previous.x, current.x, HALF_LENGTH);
    const ty = crossingTime(previous.y, current.y, HALF_WIDTH);

    // Bóng ra đường cầu môn trước đường biên dọc.
    if (tx !== null && (ty === null || tx < ty)) {
      const yAtEndline =
        previous.y + (current.y - previous.y) * tx;

      // Bóng đi qua vùng khung thành: để HaxBall xử lý bàn thắng.
      if (Math.abs(yAtEndline) <= GOAL_HALF_WIDTH + radius) {
        return;
      }

      if (lastTouchTeam === null) {
        console.log("[FIELD] Chưa xác định được đội chạm bóng cuối.");
        return;
      }

      const defendingTeam: Team = current.x < 0 ? 1 : 2;

      if (lastTouchTeam === defendingTeam) {
        const attackingTeam = otherTeam(defendingTeam);

        restartBall(
          Math.sign(current.x) * (HALF_LENGTH - 10),
          Math.sign(yAtEndline) * (HALF_WIDTH - 10),
          attackingTeam,
          `⚽ Phạt góc cho đội ${teamName(attackingTeam)}!`,
          "corner",
        );
      } else {
        // Đội tấn công chạm cuối: phát bóng lên cho phòng thủ.
        restartBall(
          Math.sign(current.x) * (HALF_LENGTH - 200),
          0,
          defendingTeam,
          `🧤 Phát bóng lên cho đội ${teamName(defendingTeam)}!`,
          "goal-kick",
        );
      }

      return;
    }

    // Bóng ra biên dọc: đội đối phương được hưởng đá biên.
    if (ty !== null) {
      const xAtTouchline =
        previous.x + (current.x - previous.x) * ty;

      if (Math.abs(xAtTouchline) >= HALF_LENGTH) return;

      if (lastTouchTeam === null) {
        console.log("[FIELD] Chưa xác định được đội chạm bóng cuối.");
        return;
      }

      const awardedTeam = otherTeam(lastTouchTeam);

      restartBall(
        Math.max(
          -HALF_LENGTH + 10,
          Math.min(HALF_LENGTH - 10, xAtTouchline),
        ),
        Math.sign(current.y) * (HALF_WIDTH - 10),
        awardedTeam,
        `📣 Đá biên cho đội ${teamName(awardedTeam)}!`,
        "throw-in",
      );
    }
  };

  function crossingTime(
    previous: number,
    current: number,
    limit: number,
  ): number | null {
    const before = Math.abs(previous);
    const after = Math.abs(current);

    if (before >= limit || after < limit || after <= before) {
      return null;
    }

    return (limit - before) / (after - before);
  }

  console.log("[FIELD] Đã đăng ký luật biên/phạt góc cho RS ELITE.");
  return recordTouch;
}
