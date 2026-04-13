import { body, param, query } from "express-validator";

const maybeMongoId = (field: string, from: "body" | "query") =>
  (from === "body" ? body(field) : query(field))
    .optional()
    .isMongoId()
    .withMessage(`${field} doit être un identifiant Mongo valide`);

export const creationDossierValidators = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Le nom du dossier est obligatoire")
    .isLength({ min: 2, max: 120 })
    .withMessage("Le nom du dossier doit contenir entre 2 et 120 caractères")
    .matches(/^[^<>:"/\\|?*\x00-\x1F]+$/)
    .withMessage("Le nom du dossier contient des caractères non autorisés"),
  maybeMongoId("parentFolder", "body"),
];

export const listeDossiersValidators = [maybeMongoId("parentFolder", "query")];

export const suppressionDossierValidators = [
  param("id").isMongoId().withMessage("L'identifiant du dossier est invalide"),
];

export const restaurationDossierValidators = [
  param("id").isMongoId().withMessage("L'identifiant du dossier est invalide"),
];

export const suppressionDefinitiveDossierValidators = [
  param("id").isMongoId().withMessage("L'identifiant du dossier est invalide"),
];

export const getFolderByIdValidators = [
  param("id").isMongoId().withMessage("L'identifiant du dossier est invalide"),
];

export const updateFolderNameValidators = [
  param("id").isMongoId().withMessage("L'identifiant du dossier est invalide"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Le nom du dossier est obligatoire")
    .isLength({ min: 2, max: 120 })
    .withMessage("Le nom du dossier doit contenir entre 2 et 120 caractères")
    .matches(/^[^<>:"/\\|?*\x00-\x1F]+$/)
    .withMessage("Le nom du dossier contient des caractères non autorisés"),
];