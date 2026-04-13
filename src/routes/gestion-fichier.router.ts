import { Router } from "express";
import {
  deplacerFichier,
  getRecentFiles,
  GetSharedFiles,
  getStarredFiles,
  getStatistics,
  getTrashFiles,
  listerFichiers,
  restaurerFichier,
  setStarredFile,
  ShareFile,
  supprimerFichier,
  supprimerFichierDefinitivement,
  telechargerFichier,
  telechargerFichiersBulk,
  televerserFichier,
  televerserPlusieursFichiers,
  updateFileName,
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
  shareFileValidators,
  starredFileValidators,
  suppressionDefinitiveFichierValidators,
  suppressionFichierValidators,
  telechargementFichierValidators,
  uploadFichierValidators,
  updateFileNameValidators,
} from "../services/gestion-fichier/gestion-fichier.validator";
import upload from "../middleware/file";

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

gestionFichierRouter.post(
  "/upload-multiple",
  checkLogs,
  isLoggedIn,
  uploadFichierMiddleware.array("file"),
  normaliserNavigationStockage,
  uploadFichierValidators,
  validator,
  televerserPlusieursFichiers
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

gestionFichierRouter.post(
  "/download/bulk",
  checkLogs,
  isLoggedIn,
  validator,
  telechargerFichiersBulk
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

gestionFichierRouter.patch(
  "/:id/rename",
  checkLogs,
  isLoggedIn,
  updateFileNameValidators,
  validator,
  updateFileName
);

gestionFichierRouter
  .route("/:fileId/share")
  .post(checkLogs, isLoggedIn, shareFileValidators, validator, ShareFile);

  gestionFichierRouter
  .route("/shared")
  .get(checkLogs, isLoggedIn, GetSharedFiles);

export default gestionFichierRouter;