import { Document, Model, Schema, Types, model } from "mongoose";

export interface FichierI {
  filename: string;
  encryptedFilename: string;
  // encryptedData: Buffer;
  encryptedFK: string;
  file_iv: string;
  fk_iv: string;
  size: number;
  path: string;
  owner: Types.ObjectId;
  folderId?: Types.ObjectId | null;
  mimetype?: string;
  isArchived?: boolean;
  archivedAt?: Date | null;
  isStarred?: boolean;
  lastOpenedAt?: Date | null;
  openedCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FichierD extends Document, FichierI {}
export interface FichierModelI extends Model<FichierD> {}

const fichierSchema = new Schema<FichierI>(
  {
    filename: { type: String, required: true, trim: true },
    encryptedFilename: { type: String, required: true, trim: true },
    encryptedFK: { type: String, required: true },
    file_iv: { type: String, required: true },
    fk_iv: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    path: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "Users", required: true, index: true },
    folderId: { type: Schema.Types.ObjectId, ref: "Folders", default: null, index: true },
    mimetype: { type: String, default: "application/octet-stream" },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
    isStarred: { type: Boolean, default: false, index: true },
    lastOpenedAt: { type: Date, default: null, index: true },
    openedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

fichierSchema.index({ owner: 1, folderId: 1, filename: 1, createdAt: -1 });
fichierSchema.index({ owner: 1, isArchived: 1, isStarred: 1 });

export const FichierModel = model<FichierI, FichierModelI>("Files", fichierSchema);