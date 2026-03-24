import { Router } from "express";
import { creerDossier, listerDossiers, supprimerDossier } from "../controller/gestion-dossier.controller";
import { checkLogs, isLoggedIn } from "../middleware/auth";
import { normaliserNavigationStockage } from "../middleware/navigation-stockage.middleware";
import { validator } from "../middleware/validator";
import {
  creationDossierValidators,
  listeDossiersValidators,
  suppressionDossierValidators,
} from "../services/gestion-dossier/gestion-dossier.validator";

const gestionDossierRouter = Router();

// Gestion des dossiers
gestionDossierRouter.post(
  "/folder",
  checkLogs,
  isLoggedIn,
  normaliserNavigationStockage,
  creationDossierValidators,
  validator,
  creerDossier
);

gestionDossierRouter.get(
  "/folders",
  checkLogs,
  isLoggedIn,
  normaliserNavigationStockage,
  listeDossiersValidators,
  validator,
  listerDossiers
);

gestionDossierRouter.delete(
  "/folder/:id",
  checkLogs,
  isLoggedIn,
  suppressionDossierValidators,
  validator,
  supprimerDossier
);

export default gestionDossierRouter;
