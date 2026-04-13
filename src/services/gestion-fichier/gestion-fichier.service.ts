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
  // deleteFileIfExists,
  ensureDirectoryExists,
  ensureUserStorageRoot,
  getUserStorageRoot,
  resolveFolderAbsolutePath,
} from "../../utils/stockage";
import { UploadedFile } from "../../controller/gestion-fichier.controller";
import fileLogs, { fileLogger } from "./file.logs";
import { formatString } from "../../utils/Strings";
import { FileShareModel } from "../../db/models/fileShare";

export class GestionFichierService {
  private static detectFileType(file: Pick<FichierD, "filename" | "mimetype">) {
    const mimetype = file.mimetype || "";
    const extension = path.extname(file.filename || "").toLowerCase();

    if (mimetype.includes("pdf") || extension === ".pdf") return "pdf";
    if (mimetype.startsWith("image/") || [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(extension)) return "image";
    if (mimetype.startsWith("video/") || [".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(extension)) return "video";
    if (mimetype.startsWith("audio/") || [".mp3", ".wav", ".aac", ".ogg"].includes(extension)) return "audio";
    if (
      mimetype.includes("sheet") ||
      mimetype.includes("excel") ||
      [".xls", ".xlsx", ".csv"].includes(extension)
    ) {
      return "spreadsheet";
    }

    return "document";
  }

  private static serializeFile(file: FichierD) {
    return {
      _id: file._id,
      id: file._id,
      name: file.filename,
      filename: file.filename,
      encryptedFilename: file.encryptedFilename,
      size: file.size,
      path: file.path,
      owner: file.owner,
      folderId: file.folderId,
      mimetype: file.mimetype,
      type: this.detectFileType(file),
      isArchived: file.isArchived,
      archivedAt: file.archivedAt,
      isStarred: file.isStarred,
      lastOpenedAt: file.lastOpenedAt,
      openedCount: file.openedCount,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      downloadUrl: `/file/download/${file._id}`,
//       downloadUrl: `/download/${file._id}`,
      encryptedFK: file.encryptedFK,
      file_iv: file.file_iv,
      fk_iv: file.fk_iv,
    };
  }

  private static async findOwnedFolderOrNull(
    userId: string,
    folderId?: string,
    options?: { includeArchived?: boolean }
  ) {
    if (!folderId) return null;

    const query: Record<string, unknown> = {
      _id: folderId,
      owner: new Types.ObjectId(userId),
    };

    if (!options?.includeArchived) {
      query.isArchived = false;
    }

    return DossierModel.findOne(query);
  }

  private static async findOwnedFile(
    userId: string,
    fileId: string,
    options?: { includeArchived?: boolean }
  ) {
    const query: Record<string, unknown> = {
      _id: fileId,
      owner: new Types.ObjectId(userId),
    };

    if (!options?.includeArchived) {
      query.isArchived = false;
    }

    return FichierModel.findOne(query);
  }


  private static async findAccessibleFile(
  userId: string,
  fileId: string,
  options?: { includeArchived?: boolean }
): Promise<FichierD | null> {
  const objectUserId = new Types.ObjectId(userId);
  const objectFileId = new Types.ObjectId(fileId);

  const query: Record<string, unknown> = {
    _id: objectFileId,
  };

  if (!options?.includeArchived) {
    query.isArchived = false;
  }

  let file = await FichierModel.findOne({
    ...query,
    owner: objectUserId,
  });

  if (file) {
    return file;
  }

  const share = await FileShareModel.findOne({
    recipientId: objectUserId,
    fileId: objectFileId,
  }).populate("fileId");

  if (!share || !share.fileId) {
    return null;
  }

  const sharedFile = share.fileId as unknown as FichierD;

  if (!options?.includeArchived && sharedFile.isArchived) {
    return null;
  }

  return sharedFile;
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
        isArchived: false,
        isStarred: false,
      });

      const updatedStorageUsed = user.storageUsed + file.size;
      await UserModel.updateOne({ _id: user._id }, { $set: { storageUsed: updatedStorageUsed } });

      return new SuccessResponseC(
        "success",
        {
          file: this.serializeFile(createdFile),
          storage: {
            storageUsed: updatedStorageUsed,
            storageLimit: user.storageLimit,
            storageRemaining: Math.max(0, user.storageLimit - updatedStorageUsed),
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

  static async uploadMultipleFiles(
    user: UserD,
    files: UploadedFile[],
    folderId?: string
  ): Promise<ResponseT> {
    if (!files?.length) {
      return new ErrorResponseC("Aucun fichier n'a été envoyé", HttpCodes.BadRequest.code, null);
    }

    const createdFileIds: Types.ObjectId[] = [];
    const movedFilePaths: string[] = [];

    try {
      const userId = user._id!.toString();
      const targetFolder = await this.findOwnedFolderOrNull(userId, folderId);

      if (folderId && !targetFolder) {
        await Promise.all(files.map((file) => deleteFileIfExists(file.path)));
        return new ErrorResponseC(
          "Le dossier cible est introuvable",
          HttpCodes.NotFound.code,
          null
        );
      }

      const totalSize = files.reduce((acc, file) => acc + Number(file.size || 0), 0);

      if (user.storageUsed + totalSize > user.storageLimit) {
        await Promise.all(files.map((file) => deleteFileIfExists(file.path)));
        return new ErrorResponseC(
          "Quota de stockage dépassé",
          HttpCodes.PayloadTooLarge.code,
          {
            storageUsed: user.storageUsed,
            storageLimit: user.storageLimit,
            requestedSize: totalSize,
          }
        );
      }

      await ensureUserStorageRoot(userId);

      const targetDirectory = resolveFolderAbsolutePath(userId, targetFolder?.storagePath);
      await ensureDirectoryExists(targetDirectory);

      const createdFiles: FichierD[] = [];

      for (const file of files) {
        const storedFileName = createStoredFileName(file.originalname);
        const finalAbsolutePath = path.join(targetDirectory, storedFileName);

        await fs.rename(file.path, finalAbsolutePath);
        movedFilePaths.push(finalAbsolutePath);

        const relativePath = path.relative(getUserStorageRoot(userId), finalAbsolutePath);

        const createdFile = await FichierModel.create({
          filename: file.originalname,
          encryptedFK: file.encryptedFK,
          file_iv: file.file_iv,
          fk_iv: file.fk_iv,
          encryptedFilename: storedFileName,
          size: file.size,
          path: relativePath,
          owner: user._id,
          folderId: targetFolder ? targetFolder._id : null,
          mimetype: file.mimetype,
          isArchived: false,
          isStarred: false,
        });

        createdFileIds.push(createdFile._id as Types.ObjectId);
        createdFiles.push(createdFile);
      }

      const updatedStorageUsed = user.storageUsed + totalSize;
      await UserModel.updateOne({ _id: user._id }, { $set: { storageUsed: updatedStorageUsed } });

      return new SuccessResponseC(
        "success",
        {
          files: createdFiles.map((createdFile) => this.serializeFile(createdFile)),
          storage: {
            storageUsed: updatedStorageUsed,
            storageLimit: user.storageLimit,
            storageRemaining: Math.max(0, user.storageLimit - updatedStorageUsed),
          },
        },
        "Fichiers téléversés avec succès",
        HttpCodes.Created.code
      );
    } catch (error) {
      if (createdFileIds.length) {
        await FichierModel.deleteMany({ _id: { $in: createdFileIds } });
      }

      await Promise.all(movedFilePaths.map((filePath) => deleteFileIfExists(filePath)));
      await Promise.all(files.map((file) => deleteFileIfExists(file.path)));

      return new ErrorResponseC(
        "Erreur lors du téléversement des fichiers",
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
      
       const freshUser = await UserModel.findById(user._id);


      const files = await FichierModel.aggregate([
          {
            $match: {
              owner: user._id,
              folderId: targetFolder ? targetFolder._id : null,
              isArchived: false,
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
            storageUsed: freshUser?.storageUsed ?? user.storageUsed,
            storageLimit: freshUser?.storageLimit ?? user.storageLimit,
            storageRemaining: Math.max(
              0,
              (freshUser?.storageLimit ?? user.storageLimit) - (freshUser?.storageUsed ?? user.storageUsed)
            ),
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
      const file = await this.findAccessibleFile(user._id!.toString(), fileId);

      if (!file) {
        return new ErrorResponseC("Fichier introuvable", HttpCodes.NotFound.code, null);
      }
      

      const absoluteFilePath = path.join(getUserStorageRoot(file.owner.toString()), file.path);
      await fs.access(absoluteFilePath);
      console.log("file path:", absoluteFilePath, file.path);

      // Read encrypted file from disk
      // const encryptedBuffer = await fs.readFile(absoluteFilePath);

      // Convert to base64 (can be decoded to Uint8Array on frontend)
      // const encryptedBase64 = encryptedBuffer.toString("base64");

      const openedAt = new Date();
      await FichierModel.updateOne(
        { _id: file._id, owner: user._id },
        { $set: { lastOpenedAt: openedAt }, $inc: { openedCount: 1 } }
      );

      file.lastOpenedAt = openedAt;
      file.openedCount = (file.openedCount || 0) + 1;

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

  static async archiveFile(user: UserD, fileId: string): Promise<ResponseT> {
    try {
      const file = await this.findOwnedFile(user._id!.toString(), fileId);

      if (!file) {
        return new ErrorResponseC("Fichier introuvable", HttpCodes.NotFound.code, null);
      }

      const archivedAt = new Date();
      const updatedFile = await FichierModel.findByIdAndUpdate(
        file._id,
        { $set: { isArchived: true, archivedAt } },
        { new: true }
      );

      return new SuccessResponseC(
        "success",
        {
          file: this.serializeFile(updatedFile as FichierD),
        },
        "Fichier déplacé vers la corbeille avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de l'archivage du fichier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async restoreFile(user: UserD, fileId: string): Promise<ResponseT> {
    try {
      const file = await this.findOwnedFile(user._id!.toString(), fileId, { includeArchived: true });

      if (!file || !file.isArchived) {
        return new ErrorResponseC("Fichier introuvable dans la corbeille", HttpCodes.NotFound.code, null);
      }

      if (file.folderId) {
        const parentFolder = await DossierModel.findOne({ _id: file.folderId, owner: user._id });
        if (parentFolder?.isArchived) {
          return new ErrorResponseC(
            "Impossible de restaurer ce fichier tant que son dossier parent est dans la corbeille",
            HttpCodes.Conflict.code,
            null
          );
        }
      }

      const updatedFile = await FichierModel.findByIdAndUpdate(
        file._id,
        { $set: { isArchived: false, archivedAt: null } },
        { new: true }
      );

      return new SuccessResponseC(
        "success",
        {
          file: this.serializeFile(updatedFile as FichierD),
        },
        "Fichier restauré avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la restauration du fichier",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async deleteFilePermanently(user: UserD, fileId: string): Promise<ResponseT> {
    try {
      const file = await this.findOwnedFile(user._id!.toString(), fileId, { includeArchived: true });

      if (!file || !file.isArchived) {
        return new ErrorResponseC(
          "Fichier introuvable dans la corbeille",
          HttpCodes.NotFound.code,
          null
        );
      }

      const absoluteFilePath = path.join(getUserStorageRoot(user._id!.toString()), file.path);
      // await deleteFileIfExists(absoluteFilePath);
      await FichierModel.deleteOne({ _id: file._id, owner: user._id });

      const nextStorageUsed = Math.max(0, user.storageUsed - file.size);
      await UserModel.updateOne(
        { _id: user._id },
        { $set: { storageUsed: nextStorageUsed } }
      );

      return new SuccessResponseC(
        "success",
        {
          deletedFileId: fileId,
          releasedSize: file.size,
          storage: {
            storageUsed: nextStorageUsed,
            storageLimit: user.storageLimit,
            storageRemaining: Math.max(0, user.storageLimit - nextStorageUsed),
          },
        },
        "Fichier supprimé définitivement avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la suppression définitive du fichier",
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
          file: this.serializeFile(updatedFile as FichierD),
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

  static async getStatistics(user: UserD): Promise<ResponseT> {
    try {
      const freshUser = await UserModel.findById(user._id);
      const owner = new Types.ObjectId(user._id!.toString());

      const [
        totalFiles,
        totalFolders,
        archivedFiles,
        archivedFolders,
        starredFiles,
        openedFiles,
        totalSharedFiles,
        sharedWithMe,
      ] = await Promise.all([
        FichierModel.countDocuments({ owner, isArchived: false }),
        DossierModel.countDocuments({ owner, isArchived: false }),
        FichierModel.countDocuments({ owner, isArchived: true }),
        DossierModel.countDocuments({ owner, isArchived: true }),
        FichierModel.countDocuments({ owner, isArchived: false, isStarred: true }),
        FichierModel.countDocuments({ owner, isArchived: false, lastOpenedAt: { $ne: null } }),
        FileShareModel.countDocuments({ fileId: { $in: await FichierModel.find({ owner }).distinct("_id") } }),
        // FileShareModel.countDocuments({ recipientId: owner }),
        FileShareModel.distinct("fileId", { recipientId: owner }).then(ids => ids.length),
      ]);

      const storageUsed = freshUser?.storageUsed ?? user.storageUsed;
      const storageLimit = freshUser?.storageLimit ?? user.storageLimit;

      return new SuccessResponseC(
        "success",
        {
          totalFiles,
          totalFolders,
          archivedFiles,
          archivedFolders,
          starredFiles,
          openedFiles,
          totalSharedFiles,
          sharedWithMe,
          storage: {
            used: storageUsed,
            total: storageLimit,
            remaining: Math.max(0, storageLimit - storageUsed),
          },
        },
        "Statistiques du dashboard récupérées avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la récupération des statistiques",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async getRecentFiles(user: UserD, limit = 10): Promise<ResponseT> {
    try {
      const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
      let files = await FichierModel.find({ owner: user._id, isArchived: false })
        .sort({ lastOpenedAt: -1, updatedAt: -1 })
        .limit(normalizedLimit);

      if (files.every((file) => !file.lastOpenedAt)) {
        files = await FichierModel.find({ owner: user._id, isArchived: false })
          .sort({ updatedAt: -1 })
          .limit(normalizedLimit);
      }

      return new SuccessResponseC(
        "success",
        {
          files: files.map((file) => this.serializeFile(file)),
        },
        "Fichiers récents récupérés avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la récupération des fichiers récents",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async listTrashFiles(user: UserD): Promise<ResponseT> {
    try {
      const archivedFiles = await FichierModel.find({ owner: user._id, isArchived: true }).sort({ archivedAt: -1 });
      const folderIds = archivedFiles
        .map((file) => file.folderId?.toString())
        .filter((value): value is string => Boolean(value));

      const folders = folderIds.length
        ? await DossierModel.find({ _id: { $in: folderIds }, owner: user._id })
        : [];
      const archivedFolderIds = new Set(
        folders.filter((folder) => folder.isArchived).map((folder) => folder._id.toString())
      );

      const visibleTrashFiles = archivedFiles.filter((file) => {
        if (!file.folderId) return true;
        return !archivedFolderIds.has(file.folderId.toString());
      });

      return new SuccessResponseC(
        "success",
        {
          files: visibleTrashFiles.map((file) => this.serializeFile(file)),
        },
        "Corbeille des fichiers récupérée avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la récupération de la corbeille des fichiers",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async setStarredFile(user: UserD, fileId: string, starred: boolean): Promise<ResponseT> {
    try {
      const file = await this.findOwnedFile(user._id!.toString(), fileId);

      if (!file) {
        return new ErrorResponseC("Fichier introuvable", HttpCodes.NotFound.code, null);
      }

      const updatedFile = await FichierModel.findByIdAndUpdate(
        file._id,
        { $set: { isStarred: Boolean(starred) } },
        { new: true }
      );

      return new SuccessResponseC(
        "success",
        {
          file: this.serializeFile(updatedFile as FichierD),
        },
        starred ? "Fichier ajouté aux favoris" : "Fichier retiré des favoris",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la mise à jour du favori",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

  static async listStarredFiles(user: UserD): Promise<ResponseT> {
    try {
      const files = await FichierModel.find({
        owner: user._id,
        isArchived: false,
        isStarred: true,
      }).sort({ updatedAt: -1 });

      return new SuccessResponseC(
        "success",
        {
          files: files.map((file) => this.serializeFile(file)),
        },
        "Fichiers favoris récupérés avec succès",
        HttpCodes.OK.code
      );
    } catch (error) {
      return new ErrorResponseC(
        "Erreur lors de la récupération des favoris",
        HttpCodes.InternalServerError.code,
        error
      );
    }
  }

   static executeShareFile = async (
    fileId: string,
    recipientId: string,
    encryptedFK: string,
    // fk_iv: string
  ): Promise<ResponseT> => {
    try {
      const file = await FichierModel.findById(fileId);
      if (!file) {
        const msg = formatString(fileLogs.SHARE_FILE_ERROR_FILE_NOT_FOUND.message, { fileId });
        fileLogger.error(msg);
        return new ErrorResponseC(
          fileLogs.SHARE_FILE_ERROR_FILE_NOT_FOUND.type,
          HttpCodes.NotFound.code,
          msg
        );
      }

      const alreadyShared = await FileShareModel.findOne({ fileId, recipientId });
      if (alreadyShared) {
        const msg = formatString(fileLogs.SHARE_FILE_ERROR_ALREADY_SHARED.message, { fileId, recipientId });
        fileLogger.error(msg);
        return new ErrorResponseC(
          fileLogs.SHARE_FILE_ERROR_ALREADY_SHARED.type,
          HttpCodes.BadRequest.code,
          msg
        );
      }

      const share = new FileShareModel({ fileId, recipientId, encryptedFK });
      await share.save();

      const msg = formatString(fileLogs.SHARE_FILE_SUCCESS.message, { fileId, recipientId });
      fileLogger.info(msg, { type: fileLogs.SHARE_FILE_SUCCESS.type });

      return new SuccessResponseC(
        fileLogs.SHARE_FILE_SUCCESS.type,
        share.toObject(),
        msg,
        HttpCodes.Created.code
      );
    } catch (err) {
      const msg = formatString(fileLogs.SHARE_FILE_ERROR_GENERIC.message, {
        error: (err as Error)?.message || "",
        fileId,
      });
      fileLogger.error(msg, err as Error);
      return new ErrorResponseC(
        fileLogs.SHARE_FILE_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg
      );
    }
  };

  static executeGetSharedFiles = async (recipientId: string): Promise<ResponseT> => {
  try {
    const shares = await FileShareModel.find({ recipientId })
      .populate({
        path: "fileId",
        populate: { path: "owner" }
      })
      .sort({ createdAt: -1 }); 

    const msg = formatString(fileLogs.GET_SHARED_FILES_SUCCESS.message, { recipientId });
    fileLogger.info(msg, { type: fileLogs.GET_SHARED_FILES_SUCCESS.type });

    return new SuccessResponseC(
      fileLogs.GET_SHARED_FILES_SUCCESS.type,
      shares.map((share) => ({
    ...share.toObject(),
    fileId: this.serializeFile(((share.fileId as unknown) as FichierD).toObject()),
  })),
      msg,
      HttpCodes.OK.code
    );
  } catch (err) {
    const msg = formatString(fileLogs.GET_SHARED_FILES_ERROR_GENERIC.message, {
      error: (err as Error)?.message || "",
      recipientId,
    });
    fileLogger.error(msg, err as Error);
    return new ErrorResponseC(
      fileLogs.GET_SHARED_FILES_ERROR_GENERIC.type,
      HttpCodes.InternalServerError.code,
      msg
    );
  }
};

}