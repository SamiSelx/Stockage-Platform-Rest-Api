import { Document, Model, Schema, Types, model } from "mongoose";

export interface FileShareI {
  fileId: Types.ObjectId;
  recipientId: Types.ObjectId;
  encryptedFK: string;
  isArchived?: boolean;
  archivedAt?: Date | null;
  isStarred?: boolean;
  lastOpenedAt?: Date | null;
  openedCount?: number;
//   fk_iv: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FileShareD extends Document, FileShareI {}
export interface FileShareModelI extends Model<FileShareD> {}

const fileShareSchema = new Schema<FileShareI>(
  {
    fileId: { type: Schema.Types.ObjectId, ref: "Files", required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "Users", required: true, index: true },
    encryptedFK: { type: String, required: true },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
    isStarred: { type: Boolean, default: false, index: true },
    lastOpenedAt: { type: Date, default: null, index: true },
    openedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

fileShareSchema.index({ recipientId: 1, isArchived: 1, isStarred: 1 });

export const FileShareModel = model<FileShareI, FileShareModelI>("FileShares", fileShareSchema);