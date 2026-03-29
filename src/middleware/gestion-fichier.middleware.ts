import fs from "fs";
import path from "path";
import multer from "multer";
import { sizeLimit, StaticRoot } from "../config/Env";

const TEMP_UPLOAD_DIR = path.join(StaticRoot, "tmp-upload");

if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

// Upload temporaire : le service déplacera ensuite le fichier au bon endroit.
export const uploadFichierMiddleware = multer({
  dest: TEMP_UPLOAD_DIR,
  limits: { fileSize: sizeLimit },
});
