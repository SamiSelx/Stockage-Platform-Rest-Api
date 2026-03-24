import fs from "fs/promises";
import path from "path";
import { Types } from "mongoose";
import { HttpCodes } from "../../config/Errors";
import { DossierModel } from "../../db/models/dossier";
import { FichierD, FichierModel } from "../../db/models/fichier";
import { UserD, UserModel } from "../../db/models/user";
import { ErrorResponseC, SuccessResponseC } from "../services.response";
import {
  createStoredFileName,
  deleteFileIfExists,
  ensureDirectoryExists,
  ensureUserStorageRoot,
  getUserStorageRoot,
  resolveFolderAbsolutePath,
} from "../../utils/stockage";

export class GestionFichierService {
  private static serializeFile(file: FichierD) {
    return {
      id: file._id,
      filename: file.filename,
      encryptedFilename: file.encryptedFilename,
      size: file.size,
      path: file.path,
      owner: file.owner,
      folderId: file.folderId,
      mimetype: file.mimetype,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      downloadUrl: `/download/${file._id}`,
    };
  }

  private static async findOwnedFolderOrNull(userId: string, folderId?: string) {
    if (!folderId) return null;

    return DossierModel.findOne({
      _id: folderId,
      owner: new Types.ObjectId(userId),
    });
  }

  private static async findOwnedFile(userId: string, fileId: string) {
    return FichierModel.findOne({
      _id: fileId,
      owner: new Types.ObjectId(userId),
    });
  }

  static async uploadFile(
    user: UserD,
    file: Express.Multer.File | undefined,
    folderId?: string
  ): Promise<ResponseT> {
    if (!file) {
      return new ErrorResponseC("Aucun fichier n'a été envoyé", HttpCodes.BadRequest.code, null);
    }

    let finalAbsolutePath: string | null = null;

    try {
      const userId = user._id!.toString();
      const targetFolder = await this.findOwnedFolderOrNull(userId, folderId);

      if (folderId && !targetFolder) {
        await deleteFileIfExists(file.path);
        return new ErrorResponseC(
          "Le dossier cible est introuvable",
          HttpCodes.NotFound.code,
          null
        );
      }

      if (user.storageUsed + file.size > user.storageLimit) {
        await deleteFileIfExists(file.path);
        return new ErrorResponseC(
          "Quota de stockage dépassé",
          HttpCodes.PayloadTooLarge.code,
          {
            storageUsed: user.storageUsed,
            storageLimit: user.storageLimit,
            requestedSize: file.size,
          }
        );
      }

      await ensureUserStorageRoot(userId);

      const targetDirectory = resolveFolderAbsolutePath(userId, targetFolder?.storagePath);
      await ensureDirectoryExists(targetDirectory);

      const storedFileName = createStoredFileName(file.originalname);
      finalAbsolutePath = path.join(targetDirectory, storedFileName);
      await fs.rename(file.path, finalAbsolutePath);

      const relativePath = path.relative(getUserStorageRoot(userId), finalAbsolutePath);
      const createdFile = await FichierModel.create({
        filename: file.originalname,
        // Pas encore de chiffrement 
        encryptedFilename: storedFileName,
        size: file.size,
        path: relativePath,
        owner: user._id,
        folderId: targetFolder ? targetFolder._id : null,
        mimetype: file.mimetype,
      });

      await UserModel.updateOne({ _id: user._id }, { $inc: { storageUsed: file.size } });

      return new SuccessResponseC(
        "success",
        {
          file: this.serializeFile(createdFile),
          storage: {
            storageUsed: user.storageUsed + file.size,
            storageLimit: user.storageLimit,
          },
        },
        "Fichier téléversé avec succès",
        HttpCodes.Created.code
      );
    } catch (error) {
      if (finalAbsolutePath) {
        await deleteFileIfExists(finalAbsolutePath);
      } else {
        await deleteFileIfExists(file.path);
      }

      return new ErrorResponseC(
        "Erreur lors du téléversement du fichier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async listFiles(user: UserD, folderId?: string): Promise<ResponseT> {
    try {
      const userId = user._id!.toString();
      const targetFolder = await this.findOwnedFolderOrNull(userId, folderId);

      if (folderId && !targetFolder) {
        return new ErrorResponseC(
          "Le dossier demandé est introuvable",
          HttpCodes.NotFound.code,
          null
        );
      }

      const files = await FichierModel.find({
        owner: user._id,
        folderId: targetFolder ? targetFolder._id : null,
      }).sort({ createdAt: -1 });

      return new SuccessResponseC(
        "success",
        {
          currentFolder: targetFolder
            ? {
                id: targetFolder._id,
                name: targetFolder.name,
                parentFolder: targetFolder.parentFolder,
              }
            : null,
          files: files.map((file) => this.serializeFile(file)),
          storage: {
            storageUsed: user.storageUsed,
            storageLimit: user.storageLimit,
          },
        },
        "Liste des fichiers récupérée avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la récupération des fichiers",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async getDownloadableFile(user: UserD, fileId: string): Promise<ResponseT> {
    try {
      const file = await this.findOwnedFile(user._id!.toString(), fileId);

      if (!file) {
        return new ErrorResponseC("Fichier introuvable", HttpCodes.NotFound.code, null);
      }

      const absoluteFilePath = path.join(getUserStorageRoot(user._id!.toString()), file.path);
      await fs.access(absoluteFilePath);

      return new SuccessResponseC(
        "success",
        {
          file: this.serializeFile(file),
          absoluteFilePath,
        },
        "Fichier prêt pour le téléchargement",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Impossible de préparer le téléchargement",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async deleteFile(user: UserD, fileId: string): Promise<ResponseT> {
    try {
      const file = await this.findOwnedFile(user._id!.toString(), fileId);

      if (!file) {
        return new ErrorResponseC("Fichier introuvable", HttpCodes.NotFound.code, null);
      }

      const absoluteFilePath = path.join(getUserStorageRoot(user._id!.toString()), file.path);
      await deleteFileIfExists(absoluteFilePath);
      await FichierModel.deleteOne({ _id: file._id, owner: user._id });
      await UserModel.updateOne(
        { _id: user._id },
        { $set: { storageUsed: Math.max(0, user.storageUsed - file.size) } }
      );

      return new SuccessResponseC(
        "success",
        {
          deletedFileId: fileId,
          releasedSize: file.size,
        },
        "Fichier supprimé avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la suppression du fichier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }
}
