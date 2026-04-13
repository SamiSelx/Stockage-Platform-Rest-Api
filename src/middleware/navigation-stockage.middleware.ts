import { NextFunction, Response } from "express";
import { MyRequest } from "../types/Express";

const ROOT_VALUES = ["", "null", "root", "racine", "undefined"];

function normalizeId(value: unknown) {
  if (typeof value !== "string") return value;
  return ROOT_VALUES.includes(value.trim().toLowerCase()) ? undefined : value.trim();
}

// Normalise les identifiants de navigation pour faciliter l'usage côté frontend.
export function normaliserNavigationStockage(req: MyRequest<null>, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body.folderId = normalizeId(req.body.folderId);
    req.body.parentFolder = normalizeId(req.body.parentFolder);
  }

  if (req.query && typeof req.query === "object") {
    req.query.folderId = normalizeId(req.query.folderId) as string | undefined;
    req.query.parentFolder = normalizeId(req.query.parentFolder) as string | undefined;
  }

  next();
}
