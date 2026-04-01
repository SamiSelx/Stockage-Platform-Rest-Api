import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Types } from "mongoose";
import { HttpCodes } from "../../config/Errors";
import { DossierModel } from "../../db/models/dossier";
import { FichierD, FichierModel } from "../../db/models/fichier";
import { UserD, UserModel } from "../../db/models/user";
import { ErrorResponseC, SuccessResponseC } from "../services.response";
import {
  createStoredFileName,
  deleteFileIfExists,
  // deleteFileIfExists,
  ensureDirectoryExists,
  ensureUserStorageRoot,
  getUserStorageRoot,
  resolveFolderAbsolutePath,
} from "../../utils/stockage";
import { UploadedFile } from "../../controller/gestion-fichier.controller";

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
      encryptedFK: file.encryptedFK,
      file_iv: file.file_iv,
      fk_iv: file.fk_iv,
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


// static async uploadFile(
//   user: UserD,
//   file: UploadedFile,
//   folderId?: string
// ): Promise<ResponseT> {

//   if (!file || !file.encryptedData) {
//     return new ErrorResponseC(
//       "Aucun fichier chiffré n'a été envoyé",
//       HttpCodes.BadRequest.code,
//       null
//     );
//   }

//   let finalAbsolutePath: string | null = null;

//   try {

//     const userId = user._id!.toString();

//     const targetFolder = await this.findOwnedFolderOrNull(userId, folderId);

//     if (folderId && !targetFolder) {
//       // Si le dossier cible n'existe pas, on supprime le fichier temporaire (s'il existe) pour éviter les fuites de stockage
//        await deleteFileIfExists(file.path);
//       return new ErrorResponseC(
//         "Le dossier cible est introuvable",
//         HttpCodes.NotFound.code,
//         null
//       );
//     }

//     if (user.storageUsed + file.size > user.storageLimit) {
      
//       return new ErrorResponseC(
//         "Quota de stockage dépassé",
//         HttpCodes.PayloadTooLarge.code,
//         {
//           storageUsed: user.storageUsed,
//           storageLimit: user.storageLimit,
//           requestedSize: file.size,
//         }
//       );
//     }

//     // Ensure user storage root
//     await ensureUserStorageRoot(userId);

//     const targetDirectory = resolveFolderAbsolutePath(
//       userId,
//       targetFolder?.storagePath
//     );

//     await ensureDirectoryExists(targetDirectory);

//     // Generate secure filename
//     const randomId = crypto.randomBytes(16).toString("hex");

//     const storedFileName = `${randomId}.enc`;

//     finalAbsolutePath = path.join(targetDirectory, storedFileName);

//     // Write encrypted file
//     await fs.writeFile(finalAbsolutePath, file.encryptedData);

//     // Create relative path for DB
//     const relativePath = path.relative(
//       getUserStorageRoot(userId),
//       finalAbsolutePath
//     );

//     const createdFile = await FichierModel.create({
//       filename: file.originalname,
//       encryptedFK: file.encryptedFK,
//       file_iv: file.file_iv,
//       fk_iv: file.fk_iv,
//       encryptedFilename: storedFileName,
//       size: file.size,
//       path: relativePath,
//       owner: user._id,
//       folderId: targetFolder ? targetFolder._id : null,
//       mimetype: file.mimetype,
//     });

//     await UserModel.updateOne(
//       { _id: user._id },
//       { $inc: { storageUsed: file.size } }
//     );

//     return new SuccessResponseC(
//       "success",
//       {
//         file: this.serializeFile(createdFile),
//         storage: {
//           storageUsed: user.storageUsed + file.size,
//           storageLimit: user.storageLimit,
//         },
//       },
//       "Fichier téléversé avec succès",
//       HttpCodes.Created.code
//     );

//   } catch (error) {

//     // cleanup corrupted file
//     if (finalAbsolutePath) {
//       try {
//         await fs.unlink(finalAbsolutePath);
//       } catch {}
//     }

//     return new ErrorResponseC(
//       "Erreur lors du téléversement du fichier",
//       HttpCodes.InternalServerError.code,
//       error
//     );
//   }
// }

  static async uploadFile(
    user: UserD,
    file: UploadedFile,
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
        // Si le dossier cible n'existe pas, on supprime le fichier temporaire (s'il existe) pour éviter les fuites de stockage
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
        encryptedFK: file.encryptedFK,
        file_iv: file.file_iv,
        fk_iv: file.fk_iv,
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

      const files = await FichierModel.aggregate([
          {
            $match: {
              owner: user._id,
              folderId: targetFolder ? targetFolder._id : null,
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
      console.log("file path:", absoluteFilePath, file.path);

      // Read encrypted file from disk
      // const encryptedBuffer = await fs.readFile(absoluteFilePath);

      // Convert to base64 (can be decoded to Uint8Array on frontend)
      // const encryptedBase64 = encryptedBuffer.toString("base64");

      return new SuccessResponseC(
      "success",
      {
        file: this.serializeFile(file),
        filePath: absoluteFilePath, // not exposed publicly, used internally
      },
      "Fichier prêt pour le téléchargement",
      HttpCodes.OK.code
    );
      // return new SuccessResponseC(
      //   "success",
      //   {
      //     file: this.serializeFile(file),
      //     encryptedData: encryptedBase64,
      //   },
      //   "Fichier prêt pour le téléchargement",
      //   HttpCodes.OK.code
      // );
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
      // await deleteFileIfExists(absoluteFilePath);
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

  static async moveFile(
    user: UserD,
    fileId: string,
    newFolderId?: string
  ): Promise<ResponseT> {
    try {
      const userId = user._id!.toString();
      const file = await this.findOwnedFile(userId, fileId);

      if (!file) {
        return new ErrorResponseC("Fichier introuvable", HttpCodes.NotFound.code, null);
      }

      const targetFolder = await this.findOwnedFolderOrNull(userId, newFolderId);

      if (newFolderId && !targetFolder) {
        return new ErrorResponseC(
          "Le dossier cible est introuvable",
          HttpCodes.NotFound.code,
          null
        );
      }

      const oldAbsolutePath = path.join(getUserStorageRoot(userId), file.path);
      const targetDirectory = resolveFolderAbsolutePath(userId, targetFolder?.storagePath);
      await ensureDirectoryExists(targetDirectory);

      const newAbsolutePath = path.join(targetDirectory, path.basename(file.path));
      await fs.rename(oldAbsolutePath, newAbsolutePath);

      const newRelativePath = path.relative(getUserStorageRoot(userId), newAbsolutePath);

      const updatedFile = await FichierModel.findByIdAndUpdate(
        file._id,
        {
          folderId: targetFolder ? targetFolder._id : null,
          path: newRelativePath,
        },
        { new: true }
      );

      return new SuccessResponseC(
        "success",
        {
          file: this.serializeFile(updatedFile!),
        },
        "Fichier déplacé avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors du déplacement du fichier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }
}
