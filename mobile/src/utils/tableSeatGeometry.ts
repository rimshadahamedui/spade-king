interface Bounds {
  width: number;
  height: number;
}

/** Compact seat block size (avatar + stats + name). */
const SEAT = {
  width: 110,
  height: 58,
  padding: 6,
  /** Keep opponents above the local player dock at the bottom. */
  bottomReserve: 54,
} as const;

type Layout = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

const GEOMETRY = {
  meBottom: 4,
  meCenterAboveBottom: 32,
} as const;

/**
 * Arc layout scaled to table size — uses upper felt area without clipping the top seat.
 */
function layoutFor(playerCount: number, bounds: Bounds): Layout {
  const { width, height } = bounds;
  const halfH = SEAT.height / 2;
  const topCenterMin = (SEAT.padding + halfH) / height;

  if (playerCount === 4) {
    // Wide arc: top opponent high, sides on upper-left / upper-right.
    const cy = 0.34;
    const ry = Math.min(0.28, Math.max(0.22, cy - topCenterMin - 0.006));
    const rx = Math.min(0.4, Math.max(0.35, 0.38 * (width / Math.max(height, 1))));
    return { cx: 0.5, cy, rx, ry };
  }

  if (playerCount === 5) {
    const cy = 0.36;
    const ry = Math.min(0.26, Math.max(0.2, cy - topCenterMin - 0.008));
    const rx = Math.min(0.42, Math.max(0.36, 0.4 * (width / Math.max(height, 1))));
    return { cx: 0.5, cy, rx, ry };
  }

  // 3 players — two opponents left / right on the upper arc.
  const cy = 0.38;
  const ry = Math.min(0.24, Math.max(0.18, cy - topCenterMin));
  const rx = Math.min(0.36, Math.max(0.3, 0.34 * (width / Math.max(height, 1))));
  return { cx: 0.5, cy, rx, ry };
}

function seatAngle(seatIndex: number, mySeat: number, playerCount: number): number | null {
  const rel = (seatIndex - mySeat + playerCount) % playerCount;
  if (rel === 0) return null;

  const opponents = playerCount - 1;
  if (opponents === 1) return Math.PI * 1.5;

  const angle = Math.PI + ((rel - 1) * Math.PI) / (opponents - 1);
  return angle;
}

function clampSeatPosition(
  bounds: Bounds,
  left: number,
  top: number,
): { left: number; top: number } {
  const maxTop = bounds.height - SEAT.height - SEAT.bottomReserve;
  return {
    left: Math.max(SEAT.padding, Math.min(left, bounds.width - SEAT.width - SEAT.padding)),
    top: Math.max(SEAT.padding, Math.min(top, maxTop)),
  };
}

/** Avatar center relative to the table center (trick-pile coordinate system). */
export function getSeatCenterOffset(
  bounds: Bounds,
  seatIndex: number,
  mySeat: number,
  playerCount: number,
): { x: number; y: number } {
  const { width, height } = bounds;
  const tableCx = width / 2;
  const tableCy = height / 2;
  const angle = seatAngle(seatIndex, mySeat, playerCount);

  if (angle === null) {
    const meCenterY = height - GEOMETRY.meBottom - GEOMETRY.meCenterAboveBottom;
    return { x: 0, y: meCenterY - tableCy };
  }

  const layout = layoutFor(playerCount, bounds);
  const cx = width * layout.cx;
  const cy = height * layout.cy;
  const rx = width * layout.rx;
  const ry = height * layout.ry;

  const avatarCenterX = cx + rx * Math.cos(angle);
  const avatarCenterY = cy + ry * Math.sin(angle);

  return {
    x: avatarCenterX - tableCx,
    y: avatarCenterY - tableCy,
  };
}

/**
 * Seat offset from table center. scale 1 = avatar, 0.3 = trick landing ring toward center.
 */
export function seatOffset(
  seatIndex: number,
  mySeat: number,
  playerCount: number,
  bounds: Bounds,
  scale = 1,
): { x: number; y: number } {
  const center = getSeatCenterOffset(bounds, seatIndex, mySeat, playerCount);
  return { x: center.x * scale, y: center.y * scale };
}

/** Absolute top-left for an opponent avatar container. */
export function getOpponentAvatarPosition(
  bounds: Bounds,
  seatIndex: number,
  mySeat: number,
  playerCount: number,
): { left: number; top: number } {
  const offset = getSeatCenterOffset(bounds, seatIndex, mySeat, playerCount);
  const tableCx = bounds.width / 2;
  const tableCy = bounds.height / 2;
  const halfW = SEAT.width / 2;
  const halfH = SEAT.height / 2;

  const left = tableCx + offset.x - halfW;
  const top = tableCy + offset.y - halfH;

  return clampSeatPosition(bounds, left, top);
}

export const TABLE_SEAT_WIDTH = SEAT.width;
