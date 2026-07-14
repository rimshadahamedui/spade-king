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
import { Types } from 'mongoose';

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

  async getGlobalHistory(limit = 40) {
    const matches = await MatchModel.find({ status: 'completed' })
      .sort({ endedAt: -1 })
      .limit(limit)
      .lean();

    return matches.map((m) => {
      const winnerIds = new Set(m.winners.map((id) => id.toString()));
      const winnerPlayers = m.players.filter((p) => winnerIds.has(p.userId.toString()));
      const topScore =
        m.players.length > 0 ? Math.max(...m.players.map((p) => p.totalScore)) : 0;

      return {
        matchId: m._id.toString(),
        roomType: m.roomType,
        playedAt: m.endedAt ?? m.startedAt,
        playerCount: m.players.length,
        winnerNames: winnerPlayers.map((p) => p.username).join(', ') || '—',
        topScore,
      };
    });
  }

  async getPlayerMatchHistory(userId: string, limit = 40) {
    return MatchHistoryModel.find({ userId }).sort({ playedAt: -1 }).limit(limit).lean();
  }

  async getMatchDetail(matchId: string, viewerUserId?: string) {
    const match = await MatchModel.findById(matchId);
    if (!match || match.status !== 'completed') return null;

    let userPlacement: number | null = null;
    let userWon: boolean | null = null;
    if (viewerUserId) {
      const participated = await MatchHistoryModel.findOne({ matchId, userId: viewerUserId }).lean();
      if (participated) {
        userPlacement = participated.placement;
        userWon = participated.won;
      }
    }

    return {
      match,
      userPlacement,
      userWon,
      playedAt: match.endedAt ?? match.startedAt,
    };
  }

  async getMatchDetailForUser(matchId: string, userId: string) {
    return this.getMatchDetail(matchId, userId);
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

  async findUserName(userId: string): Promise<string | null> {
    const user = await UserModel.findById(userId).select('username').lean();
    return user?.username ?? null;
  }

  async propagateUsername(userId: string, username: string): Promise<void> {
    const oid = new Types.ObjectId(userId);
    await MatchModel.updateMany(
      { 'players.userId': oid },
      { $set: { 'players.$[p].username': username } },
      { arrayFilters: [{ 'p.userId': oid }] },
    );
  }

  async getLeaderboard(
    period: 'all' | 'monthly' | 'high' = 'all',
    limit = 50,
  ): Promise<
    Array<{
      userId: string;
      username: string;
      gamesWon: number;
      highScore?: number;
      avatarId?: number | null;
      rank: number;
    }>
  > {
    if (period === 'monthly') return this.getMonthlyLeaderboard(limit);
    if (period === 'high') return this.getHighScorersLeaderboard(limit);
    return this.getAllTimeLeaderboard(limit);
  }

  private async getAllTimeLeaderboard(limit = 50): Promise<
    Array<{ userId: string; username: string; gamesWon: number; avatarId?: number | null; rank: number }>
  > {
    const rows = await PlayerStatisticsModel.find({ gamesWon: { $gt: 0 } })
      .populate('userId', 'username avatarId')
      .lean();

    const winTimelines = await MatchHistoryModel.aggregate<{
      _id: Types.ObjectId;
      winDates: Date[];
    }>([
      { $match: { won: true } },
      { $sort: { playedAt: 1 } },
      { $group: { _id: '$userId', winDates: { $push: '$playedAt' } } },
    ]);

    const winDatesByUser = new Map(
      winTimelines.map((row) => [row._id.toString(), row.winDates] as const),
    );

    type Entry = {
      userId: string;
      username: string;
      gamesWon: number;
      avatarId?: number | null;
      reachedAt: number;
    };

    const entries: Entry[] = rows.map((row) => {
      const user = row.userId as unknown as {
        _id: { toString(): string };
        username?: string;
        avatarId?: number;
      };
      const userId = user._id.toString();
      const winDates = winDatesByUser.get(userId) ?? [];
      const milestoneIndex = Math.max(0, row.gamesWon - 1);
      const reachedAt = winDates[milestoneIndex]?.getTime() ?? winDates[0]?.getTime() ?? 0;

      return {
        userId,
        username: user.username ?? 'Player',
        gamesWon: row.gamesWon,
        avatarId: user.avatarId ?? null,
        reachedAt,
      };
    });

    entries.sort((a, b) => {
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      return a.reachedAt - b.reachedAt;
    });

    return this.assignWinRanks(entries, limit);
  }

  /** Wins counted only from matches played in the current calendar month (UTC). */
  private async getMonthlyLeaderboard(limit = 50): Promise<
    Array<{ userId: string; username: string; gamesWon: number; avatarId?: number | null; rank: number }>
  > {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const winTimelines = await MatchHistoryModel.aggregate<{
      _id: Types.ObjectId;
      winDates: Date[];
      gamesWon: number;
    }>([
      { $match: { won: true, playedAt: { $gte: monthStart, $lt: nextMonth } } },
      { $sort: { playedAt: 1 } },
      {
        $group: {
          _id: '$userId',
          winDates: { $push: '$playedAt' },
          gamesWon: { $sum: 1 },
        },
      },
      { $match: { gamesWon: { $gt: 0 } } },
    ]);

    if (winTimelines.length === 0) return [];

    const users = await UserModel.find({
      _id: { $in: winTimelines.map((e) => e._id) },
    }).select('username avatarId');
    const userById = new Map(
      users.map((u) => [
        u._id.toString(),
        { username: u.username, avatarId: u.avatarId ?? null },
      ]),
    );

    type Entry = {
      userId: string;
      username: string;
      gamesWon: number;
      avatarId?: number | null;
      reachedAt: number;
    };

    const entries: Entry[] = winTimelines.map((row) => {
      const userId = row._id.toString();
      const profile = userById.get(userId);
      const milestoneIndex = Math.max(0, row.gamesWon - 1);
      const reachedAt =
        row.winDates[milestoneIndex]?.getTime() ?? row.winDates[0]?.getTime() ?? 0;
      return {
        userId,
        username: profile?.username ?? 'Player',
        gamesWon: row.gamesWon,
        avatarId: profile?.avatarId ?? null,
        reachedAt,
      };
    });

    entries.sort((a, b) => {
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      return a.reachedAt - b.reachedAt;
    });

    return this.assignWinRanks(entries, limit);
  }

  /** Highest single-match score across all room types. */
  private async getHighScorersLeaderboard(limit = 50): Promise<
    Array<{
      userId: string;
      username: string;
      gamesWon: number;
      highScore: number;
      avatarId?: number | null;
      rank: number;
    }>
  > {
    const source = await MatchHistoryModel.aggregate<{
      _id: Types.ObjectId;
      highScore: number;
      reachedAt: Date;
    }>([
      {
        $group: {
          _id: '$userId',
          highScore: { $max: '$finalScore' },
        },
      },
      {
        $lookup: {
          from: 'matchhistories',
          let: { uid: '$_id', hs: '$highScore' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$userId', '$$uid'] }, { $eq: ['$finalScore', '$$hs'] }],
                },
              },
            },
            { $sort: { playedAt: 1 } },
            { $limit: 1 },
            { $project: { playedAt: 1 } },
          ],
          as: 'firstHit',
        },
      },
      {
        $project: {
          highScore: 1,
          reachedAt: { $arrayElemAt: ['$firstHit.playedAt', 0] },
        },
      },
      { $match: { highScore: { $gt: Number.NEGATIVE_INFINITY } } },
    ]);

    if (source.length === 0) return [];

    const users = await UserModel.find({
      _id: { $in: source.map((e) => e._id) },
    }).select('username avatarId');
    const userById = new Map(
      users.map((u) => [
        u._id.toString(),
        { username: u.username, avatarId: u.avatarId ?? null },
      ]),
    );

    type Entry = {
      userId: string;
      username: string;
      highScore: number;
      avatarId?: number | null;
      reachedAt: number;
    };

    const entries: Entry[] = source.map((row) => {
      const userId = row._id.toString();
      const profile = userById.get(userId);
      return {
        userId,
        username: profile?.username ?? 'Player',
        highScore: row.highScore,
        avatarId: profile?.avatarId ?? null,
        reachedAt: row.reachedAt ? new Date(row.reachedAt).getTime() : 0,
      };
    });

    entries.sort((a, b) => {
      if (b.highScore !== a.highScore) return b.highScore - a.highScore;
      return a.reachedAt - b.reachedAt;
    });

    let rank = 1;
    return entries.slice(0, limit).map((entry, index) => {
      if (index > 0 && entry.highScore < entries[index - 1]!.highScore) {
        rank = index + 1;
      }
      return {
        userId: entry.userId,
        username: entry.username,
        gamesWon: 0,
        highScore: entry.highScore,
        avatarId: entry.avatarId,
        rank,
      };
    });
  }

  private assignWinRanks(
    entries: Array<{
      userId: string;
      username: string;
      gamesWon: number;
      avatarId?: number | null;
      reachedAt: number;
    }>,
    limit: number,
  ): Array<{
    userId: string;
    username: string;
    gamesWon: number;
    avatarId?: number | null;
    rank: number;
  }> {
    let rank = 1;
    return entries.slice(0, limit).map((entry, index) => {
      if (index > 0 && entry.gamesWon < entries[index - 1]!.gamesWon) {
        rank = index + 1;
      }
      return {
        userId: entry.userId,
        username: entry.username,
        gamesWon: entry.gamesWon,
        avatarId: entry.avatarId,
        rank,
      };
    });
  }

  async clearAllStats(): Promise<{
    matchHistories: number;
    playerStatistics: number;
    matches: number;
    achievements: number;
  }> {
    const [matchHistories, playerStatistics, matches, achievements] = await Promise.all([
      MatchHistoryModel.deleteMany({}),
      PlayerStatisticsModel.deleteMany({}),
      MatchModel.deleteMany({}),
      UserAchievementModel.deleteMany({}),
    ]);

    return {
      matchHistories: matchHistories.deletedCount ?? 0,
      playerStatistics: playerStatistics.deletedCount ?? 0,
      matches: matches.deletedCount ?? 0,
      achievements: achievements.deletedCount ?? 0,
    };
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
