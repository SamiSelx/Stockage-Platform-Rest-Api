import Logger from "../../utils/Logger";
export type IAuthLogs =
  | "LOGIN_SUCCESS"
  | "MOBILE_LOGIN_SUCCESS"
  | "LOGIN_ERROR_GENERIC"
  | "LOGIN_ERROR_INVALID_INPUT"
  | "LOGIN_ERROR_EMAIL_NOT_FOUND"
  | "LOGIN_ERROR_INCORRECT_PASSWORD_FOUND"
  | "LOGIN_ERROR_DISABLED_ACCOUNT"
  | "USER_ISN_T_LOGGED"
  | "USER_ISN_T_ADMIN"
  | "USER_ISN_T_USER"
  | "ADMIN_DOES_NOT_HAVE_ROLE"
  | "ERROR_SESSION_CREDENTIALS"
  | "ERROR_WHILE_CHECKING_CREDENTIALS"
  | "GENERIC_CREDENTIALS_ERROR"
  | "AUTH_BACK"
  | "USER_NOT_FOUND"
  | "LOGOUT_SUCCESS"
  | "RESET_SUCCESS"
  | "RESET_PASSWORD_SUCCESS"
  | "RESET_ERROR_GENERIC"
  | "REGISTER_SUCCESS"
  | "AUTH_ERROR_GENERIC"
  | "REGISTER_ERROR_GENERIC"
  | "REGISTER_ERROR_INVALID_INPUT"
  | "REGISTER_ERROR_EMAIL_EXIST"
  | "REGISTER_ERROR_PASSWORD"
  | "USER_ISN_T_ENABLED"
  | "LOGOUT_ERROR_GENERIC"
  | "GET_CRYPTO_MATERIAL_SUCCESS"
  | "CHANGE_PASSWORD_SUCCESS"
  | "CHANGE_PASSWORD_ERROR_WRONG_PASSWORD"
  | "CHANGE_PASSWORD_ERROR_GENERIC"
  | "CERTIFICATE_ENROLL_SUCCESS"
  | "CERTIFICATE_ENROLL_ERROR_GENERIC"
  | "IDENTITY_CHALLENGE_START_SUCCESS"
  | "IDENTITY_CHALLENGE_START_ERROR_GENERIC"
  | "IDENTITY_CHALLENGE_VERIFY_SUCCESS"
  | "IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC";

export const authLogs: IErrors<IAuthLogs> = {
  LOGIN_SUCCESS: {
    code: 0,
    message:
      'L\'utilisateur "{email} : {lastName} {firstName}" s\'est connecté avec succès.',
    type: "LOGIN_SUCCESS",
  },
  MOBILE_LOGIN_SUCCESS: {
    code: 1,
    message:
      'L\'utilisateur "{email} : {lastName} {firstName}" s\'est connecté avec succès depuis mobile.',
    type: "MOBILE_LOGIN_SUCCESS",
  },
  LOGIN_ERROR_GENERIC: {
    code: 2,
    message: "Une erreur s'est produite lors de la connexion de l'utilisateur '{email}': {error}",
    type: "LOGIN_ERROR_GENERIC",
  },
  LOGIN_ERROR_INVALID_INPUT: {
    code: 3,
    message: "Entrée invalide pour la connexion : {input}",
    type: "LOGIN_ERROR_INVALID_INPUT",
  },
  LOGIN_ERROR_EMAIL_NOT_FOUND: {
    code: 4,
    message: "Échec de la connexion l'email n'existe pas {email}.",
    type: "LOGIN_ERROR_EMAIL_NOT_FOUND",
  },
  LOGIN_ERROR_INCORRECT_PASSWORD_FOUND: {
    code: 5,
    message: "Échec de la connexion mot de passe incorrect {email}.",
    type: "LOGIN_ERROR_INCORRECT_PASSWORD_FOUND",
  },
  LOGIN_ERROR_DISABLED_ACCOUNT: {
    code: 6,
    message: "Échec de la connexion à un compte désactivé {email}.",
    type: "LOGIN_ERROR_DISABLED_ACCOUNT",
  },
  USER_ISN_T_LOGGED: {
    code: 7,
    message: "Vous n'êtes pas connecté pour effectuer cette action.",
    type: "USER_ISN_T_LOGGED",
  },
  USER_ISN_T_ADMIN: {
    code: 10,
    message: "L'utilisateur connecté n'est pas un administrateur.",
    type: "USER_ISN_T_ADMIN",
  },
  USER_ISN_T_USER: {
    code: 20,
    message: "L'utilisateur connecté n'est pas un utilisateur.",
    type: "USER_ISN_T_USER",
  },
  ADMIN_DOES_NOT_HAVE_ROLE: {
    code: 11,
    message: "L'administrateur connecté n'a pas encore de rôle.",
    type: "ADMIN_DOES_NOT_HAVE_ROLE",
  },
  ERROR_SESSION_CREDENTIALS: {
    code: 13,
    message: "La session ne semble pas correcte il n'y a pas de token.",
    type: "ERROR_SESSION_CREDENTIALS",
  },
  ERROR_WHILE_CHECKING_CREDENTIALS: {
    code: 14,
    message: "Impossible de créer une session correcte.",
    type: "ERROR_WHILE_CHECKING_CREDENTIALS",
  },
  GENERIC_CREDENTIALS_ERROR: {
    code: 15,
    message: "Une erreur générique s'est produite lors du chargement des identifiants.",
    type: "GENERIC_CREDENTIALS_ERROR",
  },
  AUTH_BACK: {
    code: 16,
    message:
      'L\'utilisateur "{email} : {lastName} {firstName}" s\'est reconnecté avec succès.',
    type: "AUTH_BACK",
  },
  LOGOUT_SUCCESS: {
    code: 17,
    message:
      'L\'utilisateur "{email} : {lastName} {firstName}" s\'est déconnecté avec succès.',
    type: "LOGOUT_SUCCESS",
  },
  USER_NOT_FOUND: {
    code: 18,
    message: "Utilisateur {userId} non trouvé",
    type: "USER_NOT_FOUND",
  },
  RESET_SUCCESS: {
    code: 23,
    message: "Email de réinitialisation de mot de passe envoyé avec succès pour {email}",
    type: "RESET_SUCCESS",
  },
  RESET_ERROR_GENERIC: {
    code: 24,
    message:
      "Email de réinitialisation de mot de passe envoyé avec erreur {error} pour {email}",
    type: "RESET_ERROR_GENERIC",
  },
  RESET_PASSWORD_SUCCESS: {
    code: 25,
    message: "Le mot de passe a été modifié avec succès pour {user}",
    type: "RESET_PASSWORD_SUCCESS",
  },

  REGISTER_SUCCESS: {
    code: 26,
    message:
      'L\'utilisateur "{email} : {lastName} {firstName}" s\'est inscrit avec succès.',
    type: "REGISTER_SUCCESS",
  },
  REGISTER_ERROR_GENERIC: {
    code: 27,
    message: "Une erreur s'est produite lors de l'inscription de l'utilisateur '{email}': {error}",
    type: "REGISTER_ERROR_GENERIC",
  },
  REGISTER_ERROR_INVALID_INPUT: {
    code: 28,
    message: "Entrée invalide pour l'inscription : {input}",
    type: "REGISTER_ERROR_INVALID_INPUT",
  },
  REGISTER_ERROR_EMAIL_EXIST: {
    code: 29,
    message: "Échec de l'inscription l'email existe déjà {email}.",
    type: "REGISTER_ERROR_EMAIL_EXIST",
  },
  REGISTER_ERROR_PASSWORD: {
    code: 31,
    message: "Le mot de passe ne respecte pas les exigences.",
    type: "REGISTER_ERROR_PASSWORD",
  },
  USER_ISN_T_ENABLED: {
    code: 32,
    message: "L'utilisateur n'est pas autorisé à effectuer cette action.",
    type: "USER_ISN_T_ENABLED",
  },
  AUTH_ERROR_GENERIC: {
    code: 33,
    message: "Une erreur s'est produite lors de l'authentification de l'utilisateur '{email}': {error}",
    type: "AUTH_ERROR_GENERIC",
  },
  LOGOUT_ERROR_GENERIC:{
    code: 34,
    message: "Une erreur s'est produite lors de la déconnexion de l'utilisateur '{email}': {error}",
    type: "LOGOUT_ERROR_GENERIC",
  },
  GET_CRYPTO_MATERIAL_SUCCESS: {
    code: 35,
    message: "Les informations cryptographiques ont été récupérées avec succès pour {email}",
    type: "GET_CRYPTO_MATERIAL_SUCCESS",
  },
  CHANGE_PASSWORD_SUCCESS: {
    code: 36,
    message: "Le mot de passe et les informations cryptographiques ont été mis à jour avec succès pour {email}",
    type: "CHANGE_PASSWORD_SUCCESS",
  },
  CHANGE_PASSWORD_ERROR_WRONG_PASSWORD: {
    code: 37,
    message: "Échec de la mise à jour du mot de passe, ancien mot de passe incorrect pour {email}",
    type: "CHANGE_PASSWORD_ERROR_WRONG_PASSWORD",
  },
  CHANGE_PASSWORD_ERROR_GENERIC: {
    code: 38,
    message: "Une erreur s'est produite lors de la mise à jour du mot de passe pour {email}: {error}",
    type: "CHANGE_PASSWORD_ERROR_GENERIC",
  },
  CERTIFICATE_ENROLL_SUCCESS: {
    code: 39,
    message: "Le certificat d'identité a été émis avec succès pour {email}",
    type: "CERTIFICATE_ENROLL_SUCCESS",
  },
  CERTIFICATE_ENROLL_ERROR_GENERIC: {
    code: 40,
    message: "Une erreur s'est produite lors de l'émission du certificat pour {email}: {error}",
    type: "CERTIFICATE_ENROLL_ERROR_GENERIC",
  },
  IDENTITY_CHALLENGE_START_SUCCESS: {
    code: 41,
    message: "Le challenge d'identité a été généré avec succès pour {email}",
    type: "IDENTITY_CHALLENGE_START_SUCCESS",
  },
  IDENTITY_CHALLENGE_START_ERROR_GENERIC: {
    code: 42,
    message: "Une erreur s'est produite lors de la génération du challenge pour {email}: {error}",
    type: "IDENTITY_CHALLENGE_START_ERROR_GENERIC",
  },
  IDENTITY_CHALLENGE_VERIFY_SUCCESS: {
    code: 43,
    message: "Le challenge d'identité a été vérifié avec succès pour {email}",
    type: "IDENTITY_CHALLENGE_VERIFY_SUCCESS",
  },
  IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC: {
    code: 44,
    message: "Une erreur s'est produite lors de la vérification du challenge pour {email}: {error}",
    type: "IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC",
  },
} as const;

export default authLogs;
export const authLogger = new Logger("auth");
