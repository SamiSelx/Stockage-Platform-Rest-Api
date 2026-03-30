import { Response } from "express";
import { UserD } from "../db/models/user";
import { GestionFichierService } from "../services/gestion-fichier/gestion-fichier.service";
import { ErrorResponseC, SuccessResponseC } from "../services/services.response";
import { MyRequest } from "../types/Express";
import { ErrorResponse, SuccessResponse } from "../utils/Response";

function handleServiceResponse(result: ResponseT, res: Response) {
  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

export async function televerserFichier(req: MyRequest<UserD>, res: Response) {
  const { folderId } = req.body as { folderId?: string };
  const result = await GestionFichierService.uploadFile(req.user as UserD, req.file, folderId);
  return handleServiceResponse(result, res);
}

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
      absoluteFilePath: string;
    };

    return res.download(payload.absoluteFilePath, payload.file.filename);
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