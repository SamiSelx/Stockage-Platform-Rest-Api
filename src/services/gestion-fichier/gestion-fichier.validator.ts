import { body, param, query } from "express-validator";

const maybeMongoId = (field: string, from: "body" | "query") =>
  (from === "body" ? body(field) : query(field))
    .optional()
    .isMongoId()
    .withMessage(`${field} doit être un identifiant Mongo valide`);

export const uploadFichierValidators = [maybeMongoId("folderId", "body")];

export const listeFichiersValidators = [maybeMongoId("folderId", "query")];

export const telechargementFichierValidators = [
  param("id").isMongoId().withMessage("L'identifiant du fichier est invalide"),
];

export const suppressionFichierValidators = [
  param("id").isMongoId().withMessage("L'identifiant du fichier est invalide"),
];

export const deplacementFichierValidators = [
  param("id").isMongoId().withMessage("L'identifiant du fichier est invalide"),
  maybeMongoId("folderId", "body"),
];
