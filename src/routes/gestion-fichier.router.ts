import { Router } from "express";
import {
  listerFichiers,
  supprimerFichier,
  telechargerFichier,
  televerserFichier,
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
} from "../services/gestion-fichier/gestion-fichier.validator";

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
  "/files",
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
  "/file/:id",
  checkLogs,
  isLoggedIn,
  suppressionFichierValidators,
  validator,
  supprimerFichier
);

export default gestionFichierRouter;
