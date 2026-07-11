/**
 * One-off script: wipe match history, player stats, matches, and achievements.
 * Usage: node scripts/clear-stats.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function main() {
  if (!MONGO_URI) {
    console.error('Set MONGODB_URI or MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const collections = ['matchhistories', 'playerstatistics', 'matches', 'achievements'];
  const results = {};

  for (const name of collections) {
    const res = await db.collection(name).deleteMany({});
    results[name] = res.deletedCount ?? 0;
  }

  console.log('Cleared:', results);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
