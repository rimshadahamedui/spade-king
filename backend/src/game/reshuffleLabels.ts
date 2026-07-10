import type { ReshuffleReason } from './RuleEngine';

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

export function buildReshuffleDisplay(username: string, reason: ReshuffleReason | string): string {
  return `${username} — ${formatReshuffleReason(reason)} !`;
}

export function buildBidTotalReshuffleDisplay(total: number, minTotal: number): string {
  return `Bids too low — ${total} / ${minTotal} required !`;
}
