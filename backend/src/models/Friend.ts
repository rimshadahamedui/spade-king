import mongoose, { Schema, Document, Types } from 'mongoose';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface IFriend extends Document {
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FriendSchema = new Schema<IFriend>(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'blocked'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

FriendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export const FriendModel = mongoose.model<IFriend>('Friend', FriendSchema);
