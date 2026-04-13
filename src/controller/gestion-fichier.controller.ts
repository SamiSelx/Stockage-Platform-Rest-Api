import { Response } from "express";
import { UserD } from "../db/models/user";
import { GestionFichierService } from "../services/gestion-fichier/gestion-fichier.service";
import { ErrorResponseC, SuccessResponseC } from "../services/services.response";
import { MyRequest } from "../types/Express";
import { ErrorResponse, SuccessResponse } from "../utils/Response";
import fsp from "fs/promises";
import fs from "fs"; 
import archiver from "archiver";


export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  encryptedData: Buffer;
  encryptedFK: Buffer | string;
  file_iv: Buffer | string;
  fk_iv: Buffer | string;
  path: string; // Path to the temporarily stored uploaded file
}

function handleServiceResponse(result: ResponseT, res: Response) {

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

export async function televerserFichier(req: MyRequest<UserD>, res: Response) {
  const { folderId, mimetype, size, originalName, encryptedFK, file_iv, fk_iv } = req.body;
    const uploadedFile = req.file;
    if (!uploadedFile) {
      return ErrorResponse(res, 400, "No file uploaded", "No file was uploaded in the request.");
    }

   // Read the encrypted file into buffer
  const encryptedData = await fsp.readFile(uploadedFile.path);

  const file: UploadedFile = {
    originalname: originalName || "unknown",
    mimetype: mimetype || "application/octet-stream",
    size: Number(size),
    encryptedData,
    encryptedFK,
    file_iv,
    fk_iv,
    path: uploadedFile.path,
  };


  const result = await GestionFichierService.uploadFile(req.user as UserD, file, folderId);

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

export async function televerserPlusieursFichiers(req: MyRequest<UserD>, res: Response) {
  const { folderId, mimetype, size, originalName, encryptedFK, file_iv, fk_iv } = req.body;
  const uploadedFiles = (req.files as Express.Multer.File[]) || [];

  if (!uploadedFiles.length) {
    return ErrorResponse(res, 400, "No files uploaded", "No files were uploaded in the request.");
  }

  const files: UploadedFile[] = uploadedFiles.map((uploadedFile, index) => {
    const normalizedOriginalName = Array.isArray(originalName)
      ? originalName[index] || uploadedFile.originalname
      : originalName || uploadedFile.originalname;

    const normalizedMimetype = Array.isArray(mimetype)
      ? mimetype[index] || uploadedFile.mimetype
      : mimetype || uploadedFile.mimetype;

    const normalizedSize = Array.isArray(size)
      ? Number(size[index] || uploadedFile.size)
      : Number(size || uploadedFile.size);

    const normalizedEncryptedFK = Array.isArray(encryptedFK)
  ? encryptedFK[index] ?? (() => { throw new Error(`Missing encryptedFK for file at index ${index}`) })()
  : encryptedFK;

    const normalizedFileIv = Array.isArray(file_iv)
      ? file_iv[index] || file_iv[0]
      : file_iv;

    const normalizedFkIv = Array.isArray(fk_iv)
      ? fk_iv[index] || fk_iv[0]
      : fk_iv;

    return {
      originalname: normalizedOriginalName,
      mimetype: normalizedMimetype,
      size: normalizedSize,
      encryptedData: Buffer.alloc(0),
      encryptedFK: normalizedEncryptedFK,
      file_iv: normalizedFileIv,
      fk_iv: normalizedFkIv,
      path: uploadedFile.path,
    };
  });

  const result = await GestionFichierService.uploadMultipleFiles(req.user as UserD, files, folderId);

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

export const ShareFile = async (req: MyRequest<UserD>, res: Response) => {
  const { fileId } = req.params;
  const { recipientId, encryptedFK } = req.body;

  const result = await GestionFichierService.executeShareFile(fileId, recipientId, encryptedFK);
  if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message, result.status);
  if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error);
};

export const GetSharedFiles = async (req: MyRequest<UserD>, res: Response) => {
  const recipientId = (req.user as UserD)._id!.toString();

  const result = await GestionFichierService.executeGetSharedFiles(recipientId);
  if (result instanceof SuccessResponseC) return SuccessResponse(res, result.code, result.data, result.message, result.status);
  if (result instanceof ErrorResponseC) return ErrorResponse(res, result.code, result.message, result.error);
};

// export async function televerserFichier(req: MyRequest<UserD>, res: Response) {
//   const { folderId } = req.body as { folderId?: string };
//   const result = await GestionFichierService.uploadFile(req.user as UserD, req.file, folderId);
//   return handleServiceResponse(result, res);
// }

export async function listerFichiers(req: MyRequest<UserD>, res: Response) {
  const { folderId } = req.query as { folderId?: string };
  const result = await GestionFichierService.listFiles(req.user as UserD, folderId);
  return handleServiceResponse(result, res);
}

export async function getStatistics(req: MyRequest<UserD>, res: Response) {
  const result = await GestionFichierService.getStatistics(req.user as UserD);
  return handleServiceResponse(result, res);
}

export async function getRecentFiles(req: MyRequest<UserD>, res: Response) {
  const { limit } = req.query as { limit?: string };
  const result = await GestionFichierService.getRecentFiles(req.user as UserD, Number(limit) || 10);
  return handleServiceResponse(result, res);
}

export async function getTrashFiles(req: MyRequest<UserD>, res: Response) {
  const result = await GestionFichierService.listTrashFiles(req.user as UserD);
  return handleServiceResponse(result, res);
}

export async function getStarredFiles(req: MyRequest<UserD>, res: Response) {
  const result = await GestionFichierService.listStarredFiles(req.user as UserD);
  return handleServiceResponse(result, res);
}

export async function setStarredFile(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const { starred } = req.body as { starred: boolean };
  const result = await GestionFichierService.setStarredFile(req.user as UserD, id, starred);
  return handleServiceResponse(result, res);
}

export async function telechargerFichier(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const result = await GestionFichierService.getDownloadableFile(req.user as UserD, id);
  

  if (result instanceof SuccessResponseC) {
    const payload = result.data as {
      file: { filename: string; mimetype?: string };
      filePath: string;
    };
    const { file, filePath } = payload;

    // Stream the encrypted file as raw bytes
    res.writeHead(200, {
      "Content-Type": file.mimetype || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);

    return; // streaming response, no JSON needed
    // return SuccessResponse(res, result.code, result.data, result.message, result.status);
    // return res.download(payload.absoluteFilePath, payload.file.filename);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

export async function telechargerFichiersBulk(req: MyRequest<UserD>, res: Response) {
  const { fileIds } = req.body;
  const result = await GestionFichierService.getBulkDownloadableFiles(req.user as UserD, fileIds);

  if (result instanceof SuccessResponseC) {
    const payload = result.data as {
      files: { file: { filename: string; mimetype?: string }; filePath: string }[];
    };

    const archive = archiver("zip", { zlib: { level: 9 } });

    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="fichiers.zip"`,
    });

    archive.pipe(res);

    for (const { file, filePath } of payload.files) {
      archive.file(filePath, { name: file.filename });
    }

    await archive.finalize();
    return;
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

export async function supprimerFichier(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const result = await GestionFichierService.archiveFile(req.user as UserD, id);
  return handleServiceResponse(result, res);
}

export async function restaurerFichier(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const result = await GestionFichierService.restoreFile(req.user as UserD, id);
  return handleServiceResponse(result, res);
}

export async function supprimerFichierDefinitivement(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const result = await GestionFichierService.deleteFilePermanently(req.user as UserD, id);
  return handleServiceResponse(result, res);
}

export async function deplacerFichier(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const { folderId } = req.body as { folderId?: string };
  const result = await GestionFichierService.moveFile(req.user as UserD, id, folderId);
  return handleServiceResponse(result, res);
}

export async function updateFileName(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const { name } = req.body as { name: string };
  const result = await GestionFichierService.updateFileName(req.user as UserD, id, name);
  return handleServiceResponse(result, res);
}