const BALL_DISC_ID = 0;

const MIN_SHOT_SPEED = 2.8;
const MAX_SHOT_SPEED = 14;
const MAX_HOLD_TIME = 2000;
const EXTRA_RANGE = 10;

const HUD_MARKER_COLOR = 0x01FEAD;
const HUD_DOTS_PER_PLAYER = 10;
const HUD_MAX_PLAYERS = 10;
const HUD_DISC_COUNT = HUD_DOTS_PER_PLAYER * HUD_MAX_PLAYERS;

const DOT_SPACING = 7;
const DOT_RADIUS = 3.2;
const DOT_IDLE_COLOR = 0x4B5563;
const DOT_GREEN = 0x22C55E;
const DOT_YELLOW = 0xEAB308;
const DOT_RED = 0xEF4444;

export function registerShotPower(
  room: any,
  onShot?: (player: any) => void,
) {
  const holdStart = new Map<number, number>();
  const playerSlots = new Map<number, number>();
  let hudDiscIds: number[] = [];

  const kickFlag = room.InputFlags.kick;
  const collisionKickFlag = room.CollisionFlags.kick;
  const flags = room.CollisionFlags;

  function disableDefaultKick() {
    const ball = room.getDiscProperties(BALL_DISC_ID);

    if (!ball) {
      console.log("[SHOT] Bóng chưa sẵn sàng; sẽ thử lại khi trận đấu bắt đầu.");
      return;
    }

    room.setDiscProperties(BALL_DISC_ID, {
      cGroup: ball.cGroup & ~collisionKickFlag,
    });

    console.log("[SHOT] Đã tắt Kick mặc định.");
  }

  function normalizeColor(color: any): number | null {
    if (typeof color === "number") return color >>> 0;

    if (typeof color === "string") {
      const parsed = Number.parseInt(color.replace(/^#/, ""), 16);
      return Number.isFinite(parsed) ? parsed >>> 0 : null;
    }

    return null;
  }

  function findHudDiscs(): boolean {
    if (hudDiscIds.length === HUD_DISC_COUNT) return true;

    const found: number[] = [];

    for (let i = 0; i < room.getDiscCount(); i++) {
      const disc = room.getDiscProperties(i);

      if (
        disc &&
        normalizeColor(disc.color) === HUD_MARKER_COLOR
      ) {
        found.push(i);
      }
    }

    if (found.length < HUD_DISC_COUNT) return false;

    hudDiscIds = found.slice(0, HUD_DISC_COUNT);

    console.log(
      `[SHOT] Đã tìm thấy ${hudDiscIds.length} đĩa hiển thị thanh lực.`,
    );

    return true;
  }

  function hideSlot(slot: number) {
    if (!findHudDiscs()) return;

    const start = slot * HUD_DOTS_PER_PLAYER;

    for (let i = 0; i < HUD_DOTS_PER_PLAYER; i++) {
      room.setDiscProperties(hudDiscIds[start + i], {
        x: 0,
        y: 0,
        radius: 0,
        color: HUD_MARKER_COLOR,
        invMass: 0,
        bCoef: 0,
        cGroup: flags.wall,
        cMask: 0,
      });
    }
  }

  function allocateSlot(playerId: number): number | null {
    const existing = playerSlots.get(playerId);
    if (existing !== undefined) return existing;

    const occupied = new Set(playerSlots.values());

    for (let slot = 0; slot < HUD_MAX_PLAYERS; slot++) {
      if (!occupied.has(slot)) {
        playerSlots.set(playerId, slot);
        return slot;
      }
    }

    console.log("[SHOT] Không còn chỗ cho thanh lực của người chơi mới.");
    return null;
  }

  function releaseSlot(playerId: number) {
    const slot = playerSlots.get(playerId);
    if (slot === undefined) return;

    hideSlot(slot);
    playerSlots.delete(playerId);
  }

  function resetHud() {
    holdStart.clear();

    for (const slot of playerSlots.values()) {
      hideSlot(slot);
    }

    playerSlots.clear();
  }

  function updateChargeHud() {
    if (!findHudDiscs()) return;

    const players = room.getPlayerList();

    for (const [playerId, startedAt] of holdStart) {
      const player = players.find(
        (item: any) => item.id === playerId,
      );

      if (!player || (player.team !== 1 && player.team !== 2)) {
        continue;
      }

      const slot = allocateSlot(playerId);
      if (slot === null) continue;

      const playerDisc = room.getPlayerDiscProperties(playerId);
      if (!playerDisc) continue;

      const elapsed = Math.max(0, Date.now() - startedAt);
      const progress = Math.min(elapsed / MAX_HOLD_TIME, 1);
      const filled = Math.ceil(progress * HUD_DOTS_PER_PLAYER);

      const activeColor =
        progress >= 0.8
          ? DOT_RED
          : progress >= 0.5
            ? DOT_YELLOW
            : DOT_GREEN;

      const startX =
        playerDisc.x - ((HUD_DOTS_PER_PLAYER - 1) * DOT_SPACING) / 2;

      const y =
        playerDisc.y - (playerDisc.radius ?? 15) - 12;

      const firstDisc = slot * HUD_DOTS_PER_PLAYER;

      for (let i = 0; i < HUD_DOTS_PER_PLAYER; i++) {
        room.setDiscProperties(hudDiscIds[firstDisc + i], {
          x: startX + i * DOT_SPACING,
          y,
          radius: DOT_RADIUS,
          color: i < filled ? activeColor : DOT_IDLE_COLOR,
          invMass: 0,
          bCoef: 0,
          damping: 1,
          cGroup: flags.wall,
          cMask: 0,
        });
      }
    }
  }

  disableDefaultKick();

  const previousGameStart = room.onGameStart;
  room.onGameStart = (...args: any[]) => {
    previousGameStart?.(...args);
    resetHud();
    disableDefaultKick();
  };

  // Giữ callback luật sân nếu đã được đăng ký trước đó.
  const previousPositionsReset = room.onPositionsReset;
  room.onPositionsReset = (...args: any[]) => {
    previousPositionsReset?.(...args);
    resetHud();
    disableDefaultKick();
  };

  // Giữ callback GameTick của fieldRules, không ghi đè luật sân.
  const previousGameTick = room.onGameTick;
  room.onGameTick = (...args: any[]) => {
    previousGameTick?.(...args);
    updateChargeHud();
  };

  room.onPlayerInput = (player: any, prevInput: number) => {
    const isPressed = (player.input & kickFlag) !== 0;
    const wasPressed = (prevInput & kickFlag) !== 0;

    // Bắt đầu tích lực khi nhấn Kick.
    if (isPressed && !wasPressed) {
      holdStart.set(player.id, Date.now());
      allocateSlot(player.id);
      return;
    }

    // Thả Kick: ẩn thanh lực và thực hiện cú sút.
    if (!isPressed && wasPressed) {
      const startedAt = holdStart.get(player.id);

      holdStart.delete(player.id);
      releaseSlot(player.id);

      if (startedAt === undefined) return;

      const heldMs = Math.max(0, Date.now() - startedAt);
      const charge = Math.min(heldMs / MAX_HOLD_TIME, 1);

      const playerDisc = room.getPlayerDiscProperties(player.id);
      const ball = room.getDiscProperties(BALL_DISC_ID);

      if (!playerDisc || !ball) return;

      const dx = ball.x - playerDisc.x;
      const dy = ball.y - playerDisc.y;
      const distance = Math.hypot(dx, dy);

      const playerRadius = playerDisc.radius ?? 15;
      const ballRadius = ball.radius ?? 6.25;
      const maxDistance =
        playerRadius + ballRadius + EXTRA_RANGE;

      if (distance > maxDistance || distance < 0.001) {
        return;
      }

      const shotSpeed =
        MIN_SHOT_SPEED +
        (MAX_SHOT_SPEED - MIN_SHOT_SPEED) * charge;

      room.setDiscProperties(BALL_DISC_ID, {
        xspeed: (dx / distance) * shotSpeed,
        yspeed: (dy / distance) * shotSpeed,
      });

      console.log(
        `[SHOT] Held: ${Math.min(heldMs, MAX_HOLD_TIME)}ms | ` +
        `Multiplier: ${(shotSpeed / MIN_SHOT_SPEED).toFixed(2)}x | ` +
        `Speed: ${shotSpeed.toFixed(2)}`,
      );

      onShot?.(player);
    }
  };

  const previousPlayerLeave = room.onPlayerLeave;
  room.onPlayerLeave = (player: any) => {
    previousPlayerLeave?.(player);
    holdStart.delete(player.id);
    releaseSlot(player.id);
  };

  console.log("[SHOT] Charge Shot + thanh lực đã đăng ký.");
}
