import { Router } from "express";
import { creerDossier, getFolderById, listerDossiers, supprimerDossier } from "../controller/gestion-dossier.controller";
import { checkLogs, isLoggedIn } from "../middleware/auth";
import { normaliserNavigationStockage } from "../middleware/navigation-stockage.middleware";
import { validator } from "../middleware/validator";
import {
  creationDossierValidators,
  getFolderByIdValidators,
  listeDossiersValidators,
  suppressionDossierValidators,
} from "../services/gestion-dossier/gestion-dossier.validator";

const gestionDossierRouter = Router();

// Gestion des dossiers
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
  "/:id",
  checkLogs,
  isLoggedIn,
  normaliserNavigationStockage,
  getFolderByIdValidators,
  validator,
  getFolderById,
)

gestionDossierRouter.delete(
  "/:id",
  checkLogs,
  isLoggedIn,
  suppressionDossierValidators,
  validator,
  supprimerDossier
);

export default gestionDossierRouter;
