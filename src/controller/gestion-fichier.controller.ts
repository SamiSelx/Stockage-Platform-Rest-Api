import { Response } from "express";
import { UserD } from "../db/models/user";
import { GestionFichierService } from "../services/gestion-fichier/gestion-fichier.service";
import { ErrorResponseC, SuccessResponseC } from "../services/services.response";
import { MyRequest } from "../types/Express";
import { ErrorResponse, SuccessResponse } from "../utils/Response";
import fsp from "fs/promises";
import fs from "fs"; 


export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  encryptedData: Buffer;
  encryptedFK: Buffer;
  file_iv: Buffer;
  fk_iv: Buffer;
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
  // const { folderId } = req.body as { folderId?: string };
  // The uploaded encrypted file
    const uploadedFile = req.file;
    if (!uploadedFile) {
      return ErrorResponse(res, 400, "No file uploaded", "No file was uploaded in the request.");
    }
  // const encryptedData = Buffer.from(req.body.encryptedData, "base64");
  // const encryptedFK = Buffer.from(req.body.encryptedFK, "base64");
  // const file_iv = Buffer.from(req.body.file_iv, "base64");
  // const fk_iv = Buffer.from(req.body.fk_iv, "base64");

  console.log("Received file upload request:", uploadedFile.path, uploadedFile.originalname, uploadedFile.mimetype, uploadedFile.size);
   // Read the encrypted file into buffer
    const encryptedData = await fsp.readFile(uploadedFile.path);

    // Convert the FK and IVs from base64 to buffers
    // const fkBuffer = encryptedFK
    // const fileIVBuffer = file_iv
    // const fkIVBuffer = fk_iv

  const file: UploadedFile = {
    originalname: originalName || "unknown",
    mimetype: mimetype || "application/octet-stream",
    size: Number(size),
    encryptedData,
    encryptedFK,
    file_iv,
    fk_iv,
    path: uploadedFile.path, // Add the path to the uploaded file for later cleanup
  };


  const result = await GestionFichierService.uploadFile(req.user as UserD, file, folderId);

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

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
  console.log("Download request for file ID:", id);
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