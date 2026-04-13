import Logger from "../../utils/Logger";

export type IFileLogs =
  | "SHARE_FILE_SUCCESS"
  | "SHARE_FILE_ERROR_FILE_NOT_FOUND"
  | "SHARE_FILE_ERROR_ALREADY_SHARED"
  | "SHARE_FILE_ERROR_GENERIC"
  | "GET_SHARED_FILES_SUCCESS"
| "GET_SHARED_FILES_ERROR_GENERIC";

export const fileLogs: IErrors<IFileLogs> = {
  SHARE_FILE_SUCCESS: {
    code: 0,
    message: "Le fichier {fileId} a été partagé avec succès avec l'utilisateur {recipientId}.",
    type: "SHARE_FILE_SUCCESS",
  },
  SHARE_FILE_ERROR_FILE_NOT_FOUND: {
    code: 1,
    message: "Fichier {fileId} introuvable.",
    type: "SHARE_FILE_ERROR_FILE_NOT_FOUND",
  },
  SHARE_FILE_ERROR_ALREADY_SHARED: {
    code: 2,
    message: "Le fichier {fileId} est déjà partagé avec l'utilisateur {recipientId}.",
    type: "SHARE_FILE_ERROR_ALREADY_SHARED",
  },
  SHARE_FILE_ERROR_GENERIC: {
    code: 3,
    message: "Une erreur s'est produite lors du partage du fichier {fileId}: {error}",
    type: "SHARE_FILE_ERROR_GENERIC",
  },
  GET_SHARED_FILES_SUCCESS: {
  code: 4,
  message: "Les fichiers partagés avec l'utilisateur {recipientId} ont été récupérés avec succès.",
  type: "GET_SHARED_FILES_SUCCESS",
},
GET_SHARED_FILES_ERROR_GENERIC: {
  code: 5,
  message: "Une erreur s'est produite lors de la récupération des fichiers partagés pour '{recipientId}': {error}",
  type: "GET_SHARED_FILES_ERROR_GENERIC",
},
} as const;

export default fileLogs;
export const fileLogger = new Logger("file");