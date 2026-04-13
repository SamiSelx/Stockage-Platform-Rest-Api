import Logger from "../../utils/Logger";


export type IUserLogs =
| "GET_PUBLIC_KEY_SUCCESS"
| "GET_PUBLIC_KEY_ERROR_NOT_FOUND"
| "GET_PUBLIC_KEY_ERROR_GENERIC"
| "GET_ALL_USERS_SUCCESS"
| "GET_ALL_USERS_ERROR_GENERIC";

export const userLogs: IErrors<IUserLogs> = { GET_PUBLIC_KEY_SUCCESS: {
  code: 35,
  message: "Clé publique récupérée avec succès pour {email}.",
  type: "GET_PUBLIC_KEY_SUCCESS",
},
GET_PUBLIC_KEY_ERROR_NOT_FOUND: {
  code: 36,
  message: "Clé publique introuvable, utilisateur {email} non trouvé.",
  type: "GET_PUBLIC_KEY_ERROR_NOT_FOUND",
},
GET_PUBLIC_KEY_ERROR_GENERIC: {
  code: 37,
  message: "Une erreur s'est produite lors de la récupération de la clé publique pour '{email}': {error}",
  type: "GET_PUBLIC_KEY_ERROR_GENERIC",
},
GET_ALL_USERS_SUCCESS: {
  code: 38,
  message: "La liste des utilisateurs a été récupérée avec succès.",
  type: "GET_ALL_USERS_SUCCESS",
},
GET_ALL_USERS_ERROR_GENERIC: {
  code: 39,
  message: "Une erreur s'est produite lors de la récupération des utilisateurs: {error}",
  type: "GET_ALL_USERS_ERROR_GENERIC",
},
} as const

export default userLogs;
export const userLogger = new Logger("user");
