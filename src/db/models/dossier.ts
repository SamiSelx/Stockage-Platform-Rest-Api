import { Document, Model, Schema, Types, model } from "mongoose";

export interface DossierI {
  name: string;
  owner: Types.ObjectId;
  parentFolder?: Types.ObjectId | null;
  storagePath: string;
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
    // Chemin relatif sous le dossier de stockage de l'utilisateur.
    storagePath: { type: String, required: true },
  },
  { timestamps: true }
);

// Empêche deux dossiers du même nom dans le même niveau.
dossierSchema.index({ owner: 1, parentFolder: 1, name: 1 }, { unique: true });

export const DossierModel = model<DossierI, DossierModelI>("Folders", dossierSchema);
