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
  private static async findOwnedFolderOrNull(
    userId: string,
    folderId?: string,
    options?: { includeArchived?: boolean }
  ) {
    if (!folderId) return null;

    const query: Record<string, unknown> = {
      _id: new Types.ObjectId(folderId),
      owner: new Types.ObjectId(userId),
    };

    if (!options?.includeArchived) {
      query.isArchived = false;
    }

    return DossierModel.findOne(query).populate("owner");
  }

  private static async getBreadcrumbPath(folderId: string) {
    const breadcrumb = [] as Array<{ id: string; label: string }>;
    let current = await DossierModel.findById(folderId);

    while (current) {
      breadcrumb.unshift({
        id: current._id.toString(),
        label: current.name,
      });

      if (!current.parentFolder) break;
      current = await DossierModel.findById(current.parentFolder);
    }

    return breadcrumb;
  }

  private static serializeFolder(folder: DossierD) {
    return {
      id: folder._id,
      name: folder.name,
      owner: folder.owner,
      parentFolder: folder.parentFolder,
      isArchived: folder.isArchived,
      archivedAt: folder.archivedAt,
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
      }).populate("owner");

      if (!currentFolders.length) break;

      collected.push(...(currentFolders as unknown as DossierD[]));
      currentLevelIds = currentFolders.map((folder) => new Types.ObjectId(folder._id.toString()));
    }

    return collected;
  }

  static async createFolder(user: UserD, name: string, parentFolderId?: string): Promise<ResponseT> {
    try {
      const userId = user._id!.toString();
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

      await DossierModel.create({
        _id: folderId,
        name,
        owner: user._id,
        parentFolder: parentFolder ? parentFolder._id : null,
        storagePath,
        isArchived: false,
      });

      try {
        await fs.mkdir(absolutePath, { recursive: true });
      } catch (mkdirError) {
        await DossierModel.deleteOne({ _id: folderId, owner: user._id });
        throw mkdirError;
      }

      const createdFolder = await DossierModel.findById(folderId).populate("owner");

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

      const folders = await DossierModel.find({
        owner: user._id,
        parentFolder: parentFolder ? parentFolder._id : null,
        isArchived: false,
      })
        .populate("owner")
        .sort({ createdAt: -1 });

      return new SuccessResponseC(
        "success",
        {
          currentParent: parentFolder ? this.serializeFolder(parentFolder as DossierD) : null,
          folders: folders.map((folder) => this.serializeFolder(folder as DossierD)),
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

      const childFolders = await DossierModel.find({
        owner: user._id,
        parentFolder: folder._id,
        isArchived: false,
      })
        .populate("owner")
        .sort({ createdAt: -1 });

      const breadcrumbPath = await this.getBreadcrumbPath(folderId);

      return new SuccessResponseC(
        "success",
        {
          ...this.serializeFolder(folder as DossierD),
          children: childFolders.map((child) => this.serializeFolder(child as DossierD)),
          breadcrumb: breadcrumbPath,
        },
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

  static async archiveFolder(user: UserD, folderId: string): Promise<ResponseT> {
    try {
      const userId = user._id!.toString();
      const rootFolder = await this.findOwnedFolderOrNull(userId, folderId);

      if (!rootFolder) {
        return new ErrorResponseC("Dossier introuvable", HttpCodes.NotFound.code, null);
      }

      const descendants = await this.collectDescendantFolders(userId, rootFolder._id.toString());
      const allFolderIds = [rootFolder, ...descendants].map((folder) => folder._id);
      const archivedAt = new Date();

      await DossierModel.updateMany(
        { owner: user._id, _id: { $in: allFolderIds } },
        { $set: { isArchived: true, archivedAt } }
      );

      await FichierModel.updateMany(
        { owner: user._id, folderId: { $in: allFolderIds } },
        { $set: { isArchived: true, archivedAt } }
      );

      const archivedFilesCount = await FichierModel.countDocuments({
        owner: user._id,
        folderId: { $in: allFolderIds },
        isArchived: true,
      });

      return new SuccessResponseC(
        "success",
        {
          archivedFolderId: folderId,
          archivedFoldersCount: allFolderIds.length,
          archivedFilesCount,
        },
        "Dossier déplacé vers la corbeille avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de l'archivage du dossier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async restoreFolder(user: UserD, folderId: string): Promise<ResponseT> {
    try {
      const userId = user._id!.toString();
      const rootFolder = await this.findOwnedFolderOrNull(userId, folderId, { includeArchived: true });

      if (!rootFolder || !rootFolder.isArchived) {
        return new ErrorResponseC("Dossier introuvable dans la corbeille", HttpCodes.NotFound.code, null);
      }

      if (rootFolder.parentFolder) {
        const parentFolder = await DossierModel.findOne({ _id: rootFolder.parentFolder, owner: user._id });
        if (parentFolder?.isArchived) {
          return new ErrorResponseC(
            "Impossible de restaurer ce dossier tant que son parent est dans la corbeille",
            HttpCodes.Conflict.code,
            null
          );
        }
      }

      const descendants = await this.collectDescendantFolders(userId, rootFolder._id.toString());
      const allFolderIds = [rootFolder, ...descendants].map((folder) => folder._id);

      await DossierModel.updateMany(
        { owner: user._id, _id: { $in: allFolderIds } },
        { $set: { isArchived: false, archivedAt: null } }
      );

      await FichierModel.updateMany(
        { owner: user._id, folderId: { $in: allFolderIds } },
        { $set: { isArchived: false, archivedAt: null } }
      );

      return new SuccessResponseC(
        "success",
        {
          restoredFolderId: folderId,
          restoredFoldersCount: allFolderIds.length,
        },
        "Dossier restauré avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la restauration du dossier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async listTrashFolders(user: UserD): Promise<ResponseT> {
    try {
      const archivedFolders = await DossierModel.find({ owner: user._id, isArchived: true })
        .populate("owner")
        .sort({ archivedAt: -1 });

      const parentIds = archivedFolders
        .map((folder) => folder.parentFolder?.toString())
        .filter((value): value is string => Boolean(value));

      const parents = parentIds.length
        ? await DossierModel.find({ _id: { $in: parentIds }, owner: user._id })
        : [];

      const archivedParentIds = new Set(
        parents.filter((parent) => parent.isArchived).map((parent) => parent._id.toString())
      );

      const visibleTrashFolders = archivedFolders.filter((folder) => {
        if (!folder.parentFolder) return true;
        return !archivedParentIds.has(folder.parentFolder.toString());
      });

      return new SuccessResponseC(
        "success",
        {
          folders: visibleTrashFolders.map((folder) => this.serializeFolder(folder as DossierD)),
        },
        "Corbeille des dossiers récupérée avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la récupération de la corbeille des dossiers",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async deleteFolderPermanently(user: UserD, folderId: string): Promise<ResponseT> {
    try {
      const userId = user._id!.toString();
      const rootFolder = await this.findOwnedFolderOrNull(userId, folderId, { includeArchived: true });

      if (!rootFolder || !rootFolder.isArchived) {
        return new ErrorResponseC("Dossier introuvable dans la corbeille", HttpCodes.NotFound.code, null);
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

      const nextStorageUsed = Math.max(0, user.storageUsed - releasedSize);
      await UserModel.updateOne(
        { _id: user._id },
        { $set: { storageUsed: nextStorageUsed } }
      );

      return new SuccessResponseC(
        "success",
        {
          deletedFolderId: folderId,
          deletedFoldersCount: allFolderIds.length,
          deletedFilesCount: filesToDelete.length,
          releasedSize,
          storage: {
            storageUsed: nextStorageUsed,
            storageLimit: user.storageLimit,
            storageRemaining: Math.max(0, user.storageLimit - nextStorageUsed),
          },
        },
        "Dossier supprimé définitivement avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la suppression définitive du dossier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }
}