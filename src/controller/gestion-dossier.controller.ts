import { Response } from "express";
import { UserD } from "../db/models/user";
import { GestionDossierService } from "../services/gestion-dossier/gestion-dossier.service";
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

export async function creerDossier(req: MyRequest<UserD>, res: Response) {
  const { name, parentFolder } = req.body as { name: string; parentFolder?: string };
  const result = await GestionDossierService.createFolder(req.user as UserD, name, parentFolder);
  return handleServiceResponse(result, res);
}

export async function listerDossiers(req: MyRequest<UserD>, res: Response) {
  const { parentFolder } = req.query as { parentFolder?: string };
  const result = await GestionDossierService.listFolders(req.user as UserD, parentFolder);
  return handleServiceResponse(result, res);
}

export async function getFolderById(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const result = await GestionDossierService.executeGetFolderById(req.user as UserD, id);
  return handleServiceResponse(result, res);
}

export async function getTrashFolders(req: MyRequest<UserD>, res: Response) {
  const result = await GestionDossierService.listTrashFolders(req.user as UserD);
  return handleServiceResponse(result, res);
}

export async function supprimerDossier(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const result = await GestionDossierService.archiveFolder(req.user as UserD, id);
  return handleServiceResponse(result, res);
}

export async function restaurerDossier(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const result = await GestionDossierService.restoreFolder(req.user as UserD, id);
  return handleServiceResponse(result, res);
}

export async function supprimerDossierDefinitivement(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const result = await GestionDossierService.deleteFolderPermanently(req.user as UserD, id);
  return handleServiceResponse(result, res);
}

export async function updateFolderName(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const { name } = req.body as { name: string };
  const result = await GestionDossierService.updateFolderName(req.user as UserD, id, name);
  return handleServiceResponse(result, res);
}