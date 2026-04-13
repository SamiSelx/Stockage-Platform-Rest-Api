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

export const restaurationFichierValidators = [
  param("id").isMongoId().withMessage("L'identifiant du fichier est invalide"),
];

export const suppressionDefinitiveFichierValidators = [
  param("id").isMongoId().withMessage("L'identifiant du fichier est invalide"),
];

export const deplacementFichierValidators = [
  param("id").isMongoId().withMessage("L'identifiant du fichier est invalide"),
  maybeMongoId("folderId", "body"),
];

export const recentFilesValidators = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("limit doit être un entier entre 1 et 50"),
];

export const starredFileValidators = [
  param("id").isMongoId().withMessage("L'identifiant du fichier est invalide"),
  body("starred").isBoolean().withMessage("starred doit être un booléen"),
];

export const shareFileValidators = [
  param("fileId").notEmpty().isMongoId().withMessage("Invalid file ID"),
  body("recipientId").notEmpty().isMongoId().withMessage("Invalid recipient ID"),
  body("encryptedFK").notEmpty().isString().withMessage("Encrypted file key is required"),
  // body("fk_iv").notEmpty().isString().withMessage("IV is required"),
];

export const updateFileNameValidators = [
  param("id").isMongoId().withMessage("L'identifiant du fichier est invalide"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Le nom du fichier est obligatoire")
    .isLength({ min: 1, max: 255 })
    .withMessage("Le nom du fichier doit contenir entre 1 et 255 caractères"),
];