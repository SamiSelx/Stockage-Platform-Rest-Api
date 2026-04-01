import { Router } from "express";
import {
  listerFichiers,
  supprimerFichier,
  telechargerFichier,
  televerserFichier,
  deplacerFichier,
} from "../controller/gestion-fichier.controller";
import { checkLogs, isLoggedIn } from "../middleware/auth";
import { uploadFichierMiddleware } from "../middleware/gestion-fichier.middleware";
import { normaliserNavigationStockage } from "../middleware/navigation-stockage.middleware";
import { validator } from "../middleware/validator";
import {
  listeFichiersValidators,
  suppressionFichierValidators,
  telechargementFichierValidators,
  uploadFichierValidators,
  deplacementFichierValidators,
} from "../services/gestion-fichier/gestion-fichier.validator";
import upload from "../middleware/file";

const gestionFichierRouter = Router();

// Gestion des fichiers 
gestionFichierRouter.post(
  "/upload",
  checkLogs,
  isLoggedIn,
  uploadFichierMiddleware.single("file"),
  normaliserNavigationStockage,
  uploadFichierValidators,
  validator,
  televerserFichier
);

gestionFichierRouter.get(
  "/",
  checkLogs,
  isLoggedIn,
  normaliserNavigationStockage,
  listeFichiersValidators,
  validator,
  listerFichiers
);

gestionFichierRouter.get(
  "/download/:id",
  checkLogs,
  isLoggedIn,
  telechargementFichierValidators,
  validator,
  telechargerFichier
);

gestionFichierRouter.delete(
  "/:id",
  checkLogs,
  isLoggedIn,
  suppressionFichierValidators,
  validator,
  supprimerFichier
);

gestionFichierRouter.patch(
  "/:id/move",
  checkLogs,
  isLoggedIn,
  deplacementFichierValidators,
  validator,
  deplacerFichier
);

// Add delete file

export default gestionFichierRouter;
