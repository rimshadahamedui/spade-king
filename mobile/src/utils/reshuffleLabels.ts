import type { ReshuffleReason } from '../models/types';

export function formatReshuffleReason(reason: ReshuffleReason | string): string {
  switch (reason) {
    case 'NO_SPADES':
      return 'Has No Spade';
    case 'ONLY_LOWEST_SPADE':
      return 'Only Lowest Spade';
    case 'NO_FACE_CARDS':
      return 'Has No Face Cards';
    case 'BID_TOTAL_BELOW_MIN':
      return 'Bid Total Too Low';
    default:
      return String(reason);
  }
}

export function formatReshuffleReasons(reasons: ReshuffleReason[]): string {
  return reasons.map(formatReshuffleReason).join(' · ');
}
