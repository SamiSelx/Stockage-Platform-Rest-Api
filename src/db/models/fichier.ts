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
  },
  { timestamps: true }
);

fichierSchema.index({ owner: 1, folderId: 1, filename: 1, createdAt: -1 });

export const FichierModel = model<FichierI, FichierModelI>("Files", fichierSchema);
