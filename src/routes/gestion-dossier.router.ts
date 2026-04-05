import { Router } from "express";
import {
  creerDossier,
  getFolderById,
  getTrashFolders,
  listerDossiers,
  restaurerDossier,
  supprimerDossier,
  supprimerDossierDefinitivement,
} from "../controller/gestion-dossier.controller";
import { checkLogs, isLoggedIn } from "../middleware/auth";
import { normaliserNavigationStockage } from "../middleware/navigation-stockage.middleware";
import { validator } from "../middleware/validator";
import {
  creationDossierValidators,
  getFolderByIdValidators,
  listeDossiersValidators,
  restaurationDossierValidators,
  suppressionDefinitiveDossierValidators,
  suppressionDossierValidators,
} from "../services/gestion-dossier/gestion-dossier.validator";

const gestionDossierRouter = Router();

gestionDossierRouter.post(
  "/",
  checkLogs,
  isLoggedIn,
  normaliserNavigationStockage,
  creationDossierValidators,
  validator,
  creerDossier
);

gestionDossierRouter.get(
  "/",
  checkLogs,
  isLoggedIn,
  normaliserNavigationStockage,
  listeDossiersValidators,
  validator,
  listerDossiers
);

gestionDossierRouter.get(
  "/trash",
  checkLogs,
  isLoggedIn,
  getTrashFolders
);

gestionDossierRouter.get(
  "/:id",
  checkLogs,
  isLoggedIn,
  normaliserNavigationStockage,
  getFolderByIdValidators,
  validator,
  getFolderById
);

gestionDossierRouter.patch(
  "/:id/restore",
  checkLogs,
  isLoggedIn,
  restaurationDossierValidators,
  validator,
  restaurerDossier
);

gestionDossierRouter.delete(
  "/:id/permanent",
  checkLogs,
  isLoggedIn,
  suppressionDefinitiveDossierValidators,
  validator,
  supprimerDossierDefinitivement
);

gestionDossierRouter.delete(
  "/:id",
  checkLogs,
  isLoggedIn,
  suppressionDossierValidators,
  validator,
  supprimerDossier
);

export default gestionDossierRouter;