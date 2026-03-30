import { Router } from "express";
import {
  deplacerFichier,
  getRecentFiles,
  getStarredFiles,
  getStatistics,
  getTrashFiles,
  listerFichiers,
  restaurerFichier,
  setStarredFile,
  supprimerFichier,
  supprimerFichierDefinitivement,
  telechargerFichier,
  televerserFichier,
} from "../controller/gestion-fichier.controller";
import { checkLogs, isLoggedIn } from "../middleware/auth";
import { uploadFichierMiddleware } from "../middleware/gestion-fichier.middleware";
import { normaliserNavigationStockage } from "../middleware/navigation-stockage.middleware";
import { validator } from "../middleware/validator";
import {
  deplacementFichierValidators,
  listeFichiersValidators,
  recentFilesValidators,
  restaurationFichierValidators,
  starredFileValidators,
  suppressionDefinitiveFichierValidators,
  suppressionFichierValidators,
  telechargementFichierValidators,
  uploadFichierValidators,
} from "../services/gestion-fichier/gestion-fichier.validator";

const gestionFichierRouter = Router();

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
  "/statistics",
  checkLogs,
  isLoggedIn,
  getStatistics
);

gestionFichierRouter.get(
  "/recent",
  checkLogs,
  isLoggedIn,
  recentFilesValidators,
  validator,
  getRecentFiles
);

gestionFichierRouter.get(
  "/trash",
  checkLogs,
  isLoggedIn,
  getTrashFiles
);

gestionFichierRouter.get(
  "/starred",
  checkLogs,
  isLoggedIn,
  getStarredFiles
);

gestionFichierRouter.get(
  "/download/:id",
  checkLogs,
  isLoggedIn,
  telechargementFichierValidators,
  validator,
  telechargerFichier
);

gestionFichierRouter.patch(
  "/:id/star",
  checkLogs,
  isLoggedIn,
  starredFileValidators,
  validator,
  setStarredFile
);

gestionFichierRouter.patch(
  "/:id/restore",
  checkLogs,
  isLoggedIn,
  restaurationFichierValidators,
  validator,
  restaurerFichier
);

gestionFichierRouter.patch(
  "/:id/move",
  checkLogs,
  isLoggedIn,
  deplacementFichierValidators,
  validator,
  deplacerFichier
);

gestionFichierRouter.delete(
  "/:id/permanent",
  checkLogs,
  isLoggedIn,
  suppressionDefinitiveFichierValidators,
  validator,
  supprimerFichierDefinitivement
);

gestionFichierRouter.delete(
  "/:id",
  checkLogs,
  isLoggedIn,
  suppressionFichierValidators,
  validator,
  supprimerFichier
);

export default gestionFichierRouter;