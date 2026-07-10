import type { RoomType } from '../types';
import { ROOM_MODE_CONFIG } from '../constants';

export interface BidValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Bid Engine — validates individual bids and table bid totals.
 */
export class BidEngine {
  static getMaxBid(roomType: RoomType): number {
    return ROOM_MODE_CONFIG[roomType].cardsPerPlayer;
  }

  static getMinBid(): number {
    return 1;
  }

  static validateBid(bid: number, roomType: RoomType): BidValidationResult {
    if (!Number.isInteger(bid)) {
      return { ok: false, error: 'Bid must be an integer' };
    }
    const min = this.getMinBid();
    const max = this.getMaxBid(roomType);
    if (bid < min || bid > max) {
      return { ok: false, error: `Bid must be between ${min} and ${max}` };
    }
    return { ok: true };
  }

  static totalBids(bids: number[]): number {
    return bids.reduce((sum, b) => sum + b, 0);
  }

  static meetsMinimum(bids: number[], minTotal: number): boolean {
    return this.totalBids(bids) >= minTotal;
  }
}
