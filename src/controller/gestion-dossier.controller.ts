import { Response } from "express";
import { UserD } from "../db/models/user";
import { GestionDossierService } from "../services/gestion-dossier/gestion-dossier.service";
import { ErrorResponseC, SuccessResponseC } from "../services/services.response";
import { MyRequest } from "../types/Express";
import { ErrorResponse, SuccessResponse } from "../utils/Response";

export async function creerDossier(req: MyRequest<UserD>, res: Response) {
  const { name, parentFolder } = req.body as { name: string; parentFolder?: string };
  const result = await GestionDossierService.createFolder(req.user as UserD, name, parentFolder);

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

export async function listerDossiers(req: MyRequest<UserD>, res: Response) {
  const { parentFolder } = req.query as { parentFolder?: string };
  const result = await GestionDossierService.listFolders(req.user as UserD, parentFolder);

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

export async function supprimerDossier(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const result = await GestionDossierService.deleteFolder(req.user as UserD, id);

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}
