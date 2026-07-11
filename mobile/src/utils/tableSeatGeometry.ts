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

function isPortrait(bounds: Bounds): boolean {
  return bounds.height > bounds.width * 1.05;
}

/**
 * Arc layout scaled to table size — portrait uses a taller upper arc.
 */
function layoutFor(playerCount: number, bounds: Bounds): Layout {
  const { width, height } = bounds;
  const halfH = SEAT.height / 2;
  const topCenterMin = (SEAT.padding + halfH) / height;
  const portrait = isPortrait(bounds);

  if (playerCount === 4) {
    if (portrait) {
      const cy = 0.28;
      const ry = Math.min(0.22, Math.max(0.16, cy - topCenterMin - 0.01));
      const rx = Math.min(0.44, Math.max(0.38, 0.42));
      return { cx: 0.5, cy, rx, ry };
    }
    const cy = 0.34;
    const ry = Math.min(0.28, Math.max(0.22, cy - topCenterMin - 0.006));
    const rx = Math.min(0.4, Math.max(0.35, 0.38 * (width / Math.max(height, 1))));
    return { cx: 0.5, cy, rx, ry };
  }

  if (playerCount === 5) {
    if (portrait) {
      const cy = 0.3;
      const ry = Math.min(0.2, Math.max(0.15, cy - topCenterMin - 0.01));
      const rx = Math.min(0.46, Math.max(0.4, 0.44));
      return { cx: 0.5, cy, rx, ry };
    }
    const cy = 0.36;
    const ry = Math.min(0.26, Math.max(0.2, cy - topCenterMin - 0.008));
    const rx = Math.min(0.42, Math.max(0.36, 0.4 * (width / Math.max(height, 1))));
    return { cx: 0.5, cy, rx, ry };
  }

  if (portrait) {
    const cy = 0.32;
    const ry = Math.min(0.18, Math.max(0.14, cy - topCenterMin));
    const rx = Math.min(0.4, Math.max(0.34, 0.38));
    return { cx: 0.5, cy, rx, ry };
  }

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

function bottomReserve(bounds: Bounds): number {
  return isPortrait(bounds) ? 72 : SEAT.bottomReserve;
}

function clampSeatPosition(
  bounds: Bounds,
  left: number,
  top: number,
): { left: number; top: number } {
  const maxTop = bounds.height - SEAT.height - bottomReserve(bounds);
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
    const meBottom = isPortrait(bounds) ? 8 : GEOMETRY.meBottom;
    const meCenterAboveBottom = isPortrait(bounds) ? 28 : GEOMETRY.meCenterAboveBottom;
    const meCenterY = height - meBottom - meCenterAboveBottom;
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
