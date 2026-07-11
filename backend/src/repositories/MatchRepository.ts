import {
  MatchModel,
  MatchHistoryModel,
  PlayerStatisticsModel,
  UserAchievementModel,
  UserModel,
  ACHIEVEMENT_CATALOG,
  type IMatch,
} from '../models';
import type { RoomType } from '../types';
import type { Types } from 'mongoose';

export class MatchRepository {
  async create(data: {
    roomId: string | Types.ObjectId;
    roomType: RoomType;
    players: IMatch['players'];
  }): Promise<IMatch> {
    return MatchModel.create({
      ...data,
      rounds: [],
      winners: [],
      status: 'in_progress',
      startedAt: new Date(),
    });
  }

  async findById(id: string): Promise<IMatch | null> {
    return MatchModel.findById(id);
  }

  async save(match: IMatch): Promise<IMatch> {
    return match.save();
  }

  async complete(
    matchId: string,
    winners: string[],
    players: IMatch['players'],
    rounds: IMatch['rounds'],
  ): Promise<IMatch | null> {
    return MatchModel.findByIdAndUpdate(
      matchId,
      {
        status: 'completed',
        winners,
        players,
        rounds,
        endedAt: new Date(),
      },
      { new: true },
    );
  }

  async abort(matchId: string): Promise<void> {
    await MatchModel.findByIdAndUpdate(matchId, {
      status: 'aborted',
      endedAt: new Date(),
    });
  }

  async addHistoryEntries(
    entries: Array<{
      matchId: string;
      userId: string;
      roomType: RoomType;
      finalScore: number;
      placement: number;
      won: boolean;
      averageBid: number;
      averageTricks: number;
    }>,
  ): Promise<void> {
    await MatchHistoryModel.insertMany(entries);
  }

  async getHistoryForUser(userId: string, limit = 20) {
    return MatchHistoryModel.find({ userId }).sort({ playedAt: -1 }).limit(limit);
  }

  async getMatchDetailForUser(matchId: string, userId: string) {
    const participated = await MatchHistoryModel.findOne({ matchId, userId });
    if (!participated) return null;

    const match = await MatchModel.findById(matchId);
    if (!match || match.status !== 'completed') return null;

    return {
      match,
      userPlacement: participated.placement,
      userWon: participated.won,
      playedAt: participated.playedAt,
    };
  }

  async upsertStats(
    userId: string,
    update: {
      won: boolean;
      finalScore: number;
      bids: number[];
      tricks: number[];
    },
  ): Promise<void> {
    let stats = await PlayerStatisticsModel.findOne({ userId });
    if (!stats) {
      stats = await PlayerStatisticsModel.create({ userId });
    }

    stats.gamesPlayed += 1;
    if (update.won) {
      stats.gamesWon += 1;
      stats.currentWinStreak += 1;
      stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentWinStreak);
    } else {
      stats.currentWinStreak = 0;
    }

    stats.winPercentage =
      stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 1000) / 10 : 0;

    for (const bid of update.bids) {
      stats.totalBids += bid;
      stats.bidCount += 1;
    }
    stats.averageBid =
      stats.bidCount > 0 ? Math.round((stats.totalBids / stats.bidCount) * 100) / 100 : 0;

    for (const tricks of update.tricks) {
      stats.totalTricks += tricks;
      stats.trickCount += 1;
    }
    stats.averageTricks =
      stats.trickCount > 0 ? Math.round((stats.totalTricks / stats.trickCount) * 100) / 100 : 0;

    stats.highestScore = Math.max(stats.highestScore, update.finalScore);
    await stats.save();

    await this.checkAchievements(userId, stats.gamesWon, stats.gamesPlayed, stats.longestWinStreak, update.finalScore);
  }

  private async checkAchievements(
    userId: string,
    gamesWon: number,
    gamesPlayed: number,
    streak: number,
    finalScore: number,
  ): Promise<void> {
    const unlock: string[] = [];
    if (gamesWon >= 1) unlock.push('FIRST_WIN');
    if (streak >= 5) unlock.push('WIN_STREAK_5');
    if (finalScore >= 100) unlock.push('HIGH_SCORE_100');
    if (gamesPlayed >= 50) unlock.push('GAMES_50');

    for (const code of unlock) {
      const def = ACHIEVEMENT_CATALOG.find((a) => a.code === code);
      if (!def) continue;
      await UserAchievementModel.updateOne(
        { userId, code },
        {
          $setOnInsert: {
            userId,
            code: def.code,
            title: def.title,
            description: def.description,
            unlockedAt: new Date(),
          },
        },
        { upsert: true },
      );
    }
  }

  async getStats(userId: string) {
    return PlayerStatisticsModel.findOne({ userId });
  }

  async getAchievements(userId: string) {
    return UserAchievementModel.find({ userId }).sort({ unlockedAt: -1 });
  }

  async getLeaderboard(limit = 50) {
    return PlayerStatisticsModel.find()
      .sort({ gamesWon: -1, winPercentage: -1 })
      .limit(limit)
      .populate('userId', 'username');
  }

  async getLeaderboardByRoomTypes(limit = 30): Promise<
    Record<RoomType, Array<{ userId: string; username: string; gamesWon: number }>>
  > {
    const result = { 3: [], 4: [], 5: [] } as Record<
      RoomType,
      Array<{ userId: string; username: string; gamesWon: number }>
    >;

    for (const roomType of [3, 4, 5] as RoomType[]) {
      const entries = await MatchHistoryModel.aggregate<{
        _id: Types.ObjectId;
        gamesWon: number;
      }>([
        { $match: { won: true, roomType } },
        { $group: { _id: '$userId', gamesWon: { $sum: 1 } } },
        { $sort: { gamesWon: -1 } },
        { $limit: limit },
      ]);

      if (entries.length === 0) {
        result[roomType] = [];
        continue;
      }

      const users = await UserModel.find({ _id: { $in: entries.map((e) => e._id) } }).select(
        'username',
      );
      const nameById = new Map(users.map((u) => [u._id.toString(), u.username]));

      result[roomType] = entries.map((e) => ({
        userId: e._id.toString(),
        username: nameById.get(e._id.toString()) ?? 'Player',
        gamesWon: e.gamesWon,
      }));
    }

    return result;
  }
}
