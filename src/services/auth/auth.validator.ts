import { body } from "express-validator";

export const loginValidators = [
  body("email").isEmail().withMessage("Invalid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const registerValidators = [
  body("email").isEmail().withMessage("Invalid email"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("firstName")
    .isLength({ min: 3 })
    .withMessage("First name must be at least 3 characters long"),
  body("lastName")
    .isLength({ min: 3 })
    .withMessage("Last name must be at least 3 characters long"),
    body("salt").notEmpty().isString().withMessage("Salt is required"),
    body("encryptedRMK").notEmpty().isString().withMessage("Encrypted RMK is required"),
    body("rmk_iv").notEmpty().isString().withMessage("RMK IV is required"),
];

export const changePasswordValidators = [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters long"),
  body("salt").notEmpty().isString().withMessage("Salt is required"),
  body("encryptedRMK")
    .notEmpty()
    .isString()
    .withMessage("Encrypted RMK is required"),
  body("rmk_iv").notEmpty().isString().withMessage("RMK IV is required"),
];

export const enrollCertificateValidators = [
  body("userId").notEmpty().isMongoId().withMessage("User ID is required"),
  body("email").isEmail().withMessage("Invalid email"),
  body("signPublicKeySpkiB64").notEmpty().isString().withMessage("Signing public key is required"),
];

export const startIdentityChallengeValidators = [
  body("email").isEmail().withMessage("Invalid email"),
];

export const verifyIdentityChallengeValidators = [
  body("challengeId").notEmpty().isString().withMessage("Challenge ID is required"),
  body("certificate").notEmpty().isObject().withMessage("Certificate is required"),
  body("certificate.certId").notEmpty().isString().withMessage("Certificate ID is required"),
  body("certificate.serialNumber").notEmpty().isString().withMessage("Serial number is required"),
  body("certificate.subject.userId").notEmpty().isMongoId().withMessage("Certificate subject userId is required"),
  body("certificate.subject.email").isEmail().withMessage("Certificate subject email is invalid"),
  body("certificate.issuer").notEmpty().isString().withMessage("Certificate issuer is required"),
  body("certificate.signPublicKeySpkiB64").notEmpty().isString().withMessage("Certificate public key is required"),
  body("certificate.keyUsage").notEmpty().isArray().withMessage("Certificate key usage is required"),
  body("certificate.sigAlg").notEmpty().isString().withMessage("Certificate signature algorithm is required"),
  body("certificate.notBefore").notEmpty().isString().withMessage("Certificate notBefore is required"),
  body("certificate.notAfter").notEmpty().isString().withMessage("Certificate notAfter is required"),
  body("caSignatureB64").notEmpty().isString().withMessage("CA signature is required"),
  body("clientTimestamp").notEmpty().isISO8601().withMessage("Client timestamp is required"),
  body("signedPayloadB64").notEmpty().isString().withMessage("Signed payload is required"),
  body("signatureB64").notEmpty().isString().withMessage("Signature is required"),
];
