import { Application } from "express";
import indexRouter from "./index.router";
import authRouter from "./auth.router";
import gestionFichierRouter from "./gestion-fichier.router";
import gestionDossierRouter from "./gestion-dossier.router";

export default function SetRouters(app: Application) {
  app.use("/", indexRouter);
  app.use("/auth", authRouter);
  app.use("/file", gestionFichierRouter);
  app.use("/folder", gestionDossierRouter);
}
