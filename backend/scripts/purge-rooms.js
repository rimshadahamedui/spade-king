require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection.db
    .collection('rooms')
    .updateMany({ isActive: true }, { $set: { isActive: false, phase: 'finished' } });
  console.log('Deactivated rooms:', result.modifiedCount);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
