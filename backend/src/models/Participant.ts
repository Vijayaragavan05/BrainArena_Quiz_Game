import { Schema, model, Types } from 'mongoose';

export interface IParticipant {
  session: Types.ObjectId;
  student: Types.ObjectId;
  name: string;
  joinedAt: Date;
  score: number;
  correct: number;
  wrong: number;
  unanswered: number;
  avgResponseTimeMs: number;
  rank: number;
  lastSeenAt: Date;
  disconnected: boolean;
  teamId?: string;
  teamName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<IParticipant>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'QuizSession', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    joinedAt: { type: Date, required: true, default: Date.now },
    score: { type: Number, required: true, default: 0 },
    correct: { type: Number, required: true, default: 0 },
    wrong: { type: Number, required: true, default: 0 },
    unanswered: { type: Number, required: true, default: 0 },
    avgResponseTimeMs: { type: Number, required: true, default: 0 },
    rank: { type: Number, required: true, default: 0 },
    lastSeenAt: { type: Date, required: true, default: Date.now },
    disconnected: { type: Boolean, required: true, default: false },
    teamId: { type: String, required: false, index: true },
    teamName: { type: String, required: false },
  },
  { timestamps: true },
);

participantSchema.index({ session: 1, student: 1 }, { unique: true });

export const Participant = model<IParticipant>('Participant', participantSchema);
