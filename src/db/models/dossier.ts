import { Document, Model, Schema, Types, model } from "mongoose";

export interface DossierI {
  name: string;
  owner: Types.ObjectId;
  parentFolder?: Types.ObjectId | null;
  storagePath: string;
  isArchived?: boolean;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DossierD extends Document, DossierI {}
export interface DossierModelI extends Model<DossierD> {}

const dossierSchema = new Schema<DossierI>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: "Users", required: true, index: true },
    parentFolder: {
      type: Schema.Types.ObjectId,
      ref: "Folders",
      default: null,
      index: true,
    },
    storagePath: { type: String, required: true },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

dossierSchema.index({ owner: 1, parentFolder: 1, name: 1 }, { unique: true });
dossierSchema.index({ owner: 1, isArchived: 1, parentFolder: 1, createdAt: -1 });

export const DossierModel = model<DossierI, DossierModelI>("Folders", dossierSchema);