import { Response } from "express";
import { UserD } from "../db/models/user";
import { GestionFichierService } from "../services/gestion-fichier/gestion-fichier.service";
import { ErrorResponseC, SuccessResponseC } from "../services/services.response";
import { MyRequest } from "../types/Express";
import { ErrorResponse, SuccessResponse } from "../utils/Response";

export async function televerserFichier(req: MyRequest<UserD>, res: Response) {
  const { folderId } = req.body as { folderId?: string };
  const result = await GestionFichierService.uploadFile(req.user as UserD, req.file, folderId);

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

export async function listerFichiers(req: MyRequest<UserD>, res: Response) {
  const { folderId } = req.query as { folderId?: string };
  const result = await GestionFichierService.listFiles(req.user as UserD, folderId);

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
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
  const result = await GestionFichierService.deleteFile(req.user as UserD, id);

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}

export async function deplacerFichier(req: MyRequest<UserD>, res: Response) {
  const { id } = req.params;
  const { folderId } = req.body as { folderId?: string };
  const result = await GestionFichierService.moveFile(req.user as UserD, id, folderId);

  if (result instanceof SuccessResponseC) {
    return SuccessResponse(res, result.code, result.data, result.message, result.status);
  }

  if (result instanceof ErrorResponseC) {
    return ErrorResponse(res, result.code, result.message, result.error);
  }
}
