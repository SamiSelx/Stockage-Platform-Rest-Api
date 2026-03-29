import fs from "fs/promises";
import { Types } from "mongoose";
import { HttpCodes } from "../../config/Errors";
import { DossierD, DossierModel } from "../../db/models/dossier";
import { FichierModel } from "../../db/models/fichier";
import { UserD, UserModel } from "../../db/models/user";
import { ErrorResponseC, SuccessResponseC } from "../services.response";
import {
  createFolderRelativePath,
  deleteDirectoryIfExists,
  ensureUserStorageRoot,
  resolveFolderAbsolutePath,
} from "../../utils/stockage";

export class GestionDossierService {
  private static async findOwnedFolderOrNull(userId: string, folderId?: string) {
    if (!folderId) return null;

    const folder = await DossierModel.aggregate([
  {
    $match: {
      _id: new Types.ObjectId(folderId),
      owner: new Types.ObjectId(userId),
    },
  },
  {
    $lookup: {
      from: "users", 
      localField: "owner",
      foreignField: "_id",
      as: "owner",
    },
  },
  {
    $unwind: "$owner",
  },
]);
console.log("folders ",folder);


    return folder[0];
  }

  private static async getBreadcrumbPath(folderId: string) {
  const path = [];
  let current = await DossierModel.findById(folderId);

  while (current) {
    path.unshift({
      id: current._id,
      label: current.name,
    });

    if (!current.parentFolder) break;

    current = await DossierModel.findById(current.parentFolder);
  }

  return path;
};

  private static serializeFolder(folder: DossierD) {
    return {
      id: folder._id,
      name: folder.name,
      owner: folder.owner,
      parentFolder: folder.parentFolder,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  private static async collectDescendantFolders(userId: string, rootFolderId: string) {
    const owner = new Types.ObjectId(userId);
    const collected: DossierD[] = [];
    let currentLevelIds = [new Types.ObjectId(rootFolderId)];

    while (currentLevelIds.length) {
      const currentFolders = await DossierModel.find({
        owner,
        parentFolder: { $in: currentLevelIds },
      });

      if (!currentFolders.length) break;

      collected.push(...currentFolders);
      currentLevelIds = currentFolders.map((folder) => new Types.ObjectId(folder._id.toString()));
    }

    return collected;
  }

  static async createFolder(user: UserD, name: string, parentFolderId?: string): Promise<ResponseT> {
    try {
      const userId = user._id!.toString();
      console.log("parent id ",parentFolderId);
      
      const parentFolder = await this.findOwnedFolderOrNull(userId, parentFolderId);

      if (parentFolderId && !parentFolder) {
        return new ErrorResponseC(
          "Le dossier parent est introuvable",
          HttpCodes.NotFound.code,
          null
        );
      }

      const existingFolder = await DossierModel.findOne({
        owner: user._id,
        parentFolder: parentFolder ? parentFolder._id : null,
        name,
      });

      if (existingFolder) {
        return new ErrorResponseC(
          "Un dossier avec ce nom existe déjà à cet emplacement",
          HttpCodes.Conflict.code,
          null
        );
      }

      await ensureUserStorageRoot(userId);

      const folderId = new Types.ObjectId();
      const storagePath = createFolderRelativePath(parentFolder?.storagePath, folderId.toString());
      const absolutePath = resolveFolderAbsolutePath(userId, storagePath);

      const folderCreated = await DossierModel.create({
        _id: folderId,
        name,
        owner: user._id,
        parentFolder: parentFolder ? parentFolder._id : null,
        storagePath,
      });

      console.log("absolute path, parentFolder, folderCreated",absolutePath, parentFolder,folderCreated)

      await ensureUserStorageRoot(userId);
      try {
        await fs.mkdir(absolutePath, { recursive: true });
      } catch (mkdirError) {
        await DossierModel.deleteOne({ _id: folderId, owner: user._id });
        throw mkdirError;
      }

      const createdFolder = await DossierModel.findById(folderId);

      return new SuccessResponseC(
        "success",
        this.serializeFolder(createdFolder as DossierD),
        "Dossier créé avec succès",
        HttpCodes.Created.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la création du dossier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async listFolders(user: UserD, parentFolderId?: string): Promise<ResponseT> {
    try {
      const userId = user._id!.toString();
      const parentFolder = await this.findOwnedFolderOrNull(userId, parentFolderId);

      if (parentFolderId && !parentFolder) {
        return new ErrorResponseC(
          "Le dossier parent demandé est introuvable",
          HttpCodes.NotFound.code,
          null
        );
      }

     const folders = await DossierModel.aggregate([
        {
          $match: {
            owner: user._id,
            parentFolder: parentFolder ? parentFolder._id : null,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        {
          $unwind: "$owner",
        },
        {
          $sort: { createdAt: -1 },
        },
      ]);

      return new SuccessResponseC(
        "success",
        {
          currentParent: parentFolder ? this.serializeFolder(parentFolder) : null,
          folders: folders.map((folder) => this.serializeFolder(folder)),
        },
        "Liste des dossiers récupérée avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la récupération des dossiers",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async executeGetFolderById(user: UserD, folderId: string): Promise<ResponseT> {
    try {
      const userId = user._id!.toString();
      const folder = await this.findOwnedFolderOrNull(userId, folderId);
      if (!folder) {
        return new ErrorResponseC("Dossier introuvable", HttpCodes.NotFound.code, null);
      }


      // get children folders
    const childFolders = await DossierModel.find({
      owner: userId,
      parentFolder: folder._id,
    }).sort({ createdAt: -1 });

    
      const breadcrumbPath = await this.getBreadcrumbPath(folderId);


      return new SuccessResponseC(
        "success",
        { ...this.serializeFolder(folder), children: childFolders.map((f) => this.serializeFolder(f)), breadcrumb: breadcrumbPath },
        "Dossier récupéré avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la récupération du dossier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }


  static async deleteFolder(user: UserD, folderId: string): Promise<ResponseT> {
    try {
      const userId = user._id!.toString();
      const rootFolder = await this.findOwnedFolderOrNull(userId, folderId);

      if (!rootFolder) {
        return new ErrorResponseC("Dossier introuvable", HttpCodes.NotFound.code, null);
      }

      const descendants = await this.collectDescendantFolders(userId, rootFolder._id.toString());
      const allFolderIds = [rootFolder, ...descendants].map((folder) => folder._id);

      const filesToDelete = await FichierModel.find({
        owner: user._id,
        folderId: { $in: allFolderIds },
      });

      const releasedSize = filesToDelete.reduce((total, file) => total + file.size, 0);
      const rootAbsolutePath = resolveFolderAbsolutePath(userId, rootFolder.storagePath);

      await deleteDirectoryIfExists(rootAbsolutePath);
      await FichierModel.deleteMany({ owner: user._id, folderId: { $in: allFolderIds } });
      await DossierModel.deleteMany({ owner: user._id, _id: { $in: allFolderIds } });
      await UserModel.updateOne(
        { _id: user._id },
        { $set: { storageUsed: Math.max(0, user.storageUsed - releasedSize) } }
      );

      return new SuccessResponseC(
        "success",
        {
          deletedFolderId: folderId,
          deletedFoldersCount: allFolderIds.length,
          deletedFilesCount: filesToDelete.length,
          releasedSize,
        },
        "Dossier supprimé avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la suppression du dossier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }
}
