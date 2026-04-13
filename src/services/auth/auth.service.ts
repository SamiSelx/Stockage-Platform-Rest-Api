import { UserD, UserModel } from "../../db/models/user";
import authLogs, { IAuthLogs, authLogger } from "./auth.logs";
import { formatString } from "../../utils/Strings";
import { Sign } from "../../utils/jwt";
import { HttpCodes } from "../../config/Errors";
import { ErrorResponseC, SuccessResponseC } from "./../services.response";
import {Response } from "express";
import { getCookiesSettings } from "../../utils/Function";
import { emailQueue } from "../../queues/email.queue";
import { createHmac, createPublicKey, randomBytes, verify as verifySignature } from "crypto";

type MiniCertificate = {
  certId: string;
  serialNumber: string;
  subject: { userId: string; email: string };
  issuer: string;
  signPublicKeySpkiB64: string;
  keyUsage: string[];
  sigAlg: string;
  notBefore: string;
  notAfter: string;
};

type ChallengeRecord = {
  challengeId: string;
  nonceB64: string;
  userId: string;
  email: string;
  expiresAt: number;
  used: boolean;
};

const identityChallenges = new Map<string, ChallengeRecord>();
const MINI_CA_ISSUER = process.env.MINI_CA_ISSUER || "MiniCA-Stockage";
const MINI_CA_SECRET = process.env.MINI_CA_SECRET || "dev-mini-ca-secret";
const CHALLENGE_TTL_MS = Number(process.env.IDENTITY_CHALLENGE_TTL_MS || 120000);
const CHALLENGE_SKEW_MS = Number(process.env.IDENTITY_CHALLENGE_SKEW_MS || 120000);

function serializeCertificate(certificate: MiniCertificate): string {
  return JSON.stringify(certificate);
}

function signCertificate(certificate: MiniCertificate): string {
  return createHmac("sha256", MINI_CA_SECRET)
    .update(serializeCertificate(certificate))
    .digest("base64");
}

function verifyCertificateSignature(certificate: MiniCertificate, caSignatureB64: string): boolean {
  return signCertificate(certificate) === caSignatureB64;
}

function buildCertificate(user: UserD, signPublicKeySpkiB64: string): MiniCertificate {
  const now = Date.now();
  const notBefore = new Date(now).toISOString();
  const notAfter = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
  return {
    certId: `cert_${randomBytes(8).toString("hex")}`,
    serialNumber: randomBytes(12).toString("hex"),
    subject: {
      userId: user.id.toString(),
      email: user.email,
    },
    issuer: MINI_CA_ISSUER,
    signPublicKeySpkiB64,
    keyUsage: ["digitalSignature"],
    sigAlg: "ECDSA-P256-SHA256",
    notBefore,
    notAfter,
  };
}

function parseBase64Json<T>(base64Value: string): T {
  const json = Buffer.from(base64Value, "base64").toString("utf8");
  return JSON.parse(json) as T;
}

function verifyChallengePayloadSignature(payloadB64: string, signatureB64: string, signPublicKeySpkiB64: string): boolean {
  const publicKey = createPublicKey({
    key: Buffer.from(signPublicKeySpkiB64, "base64"),
    format: "der",
    type: "spki",
  });

  return verifySignature(
    "sha256",
    Buffer.from(payloadB64, "base64"),
    publicKey,
    Buffer.from(signatureB64, "base64"),
  );
}

function getChallengeOrNull(challengeId: string): ChallengeRecord | null {
  const challenge = identityChallenges.get(challengeId);
  if (!challenge) return null;
  if (challenge.used) return null;
  if (Date.now() > challenge.expiresAt) {
    identityChallenges.delete(challengeId);
    return null;
  }
  return challenge;
}

export class AuthServices {
  /**
   * @description  Login a user
   * @param email  - String
   * @param password - String
   * @returns  ResponseT
   */

  static executeLogin = async (
    email: string,
    password: string,
    stay: boolean,
    res: Response
  ): Promise<ResponseT> => {
    try {
      const user = await UserModel.findOne({ email });
      if (user) {
        const isPasswordMatch = await user.comparePasswords(password);
        if (isPasswordMatch) {
          const token = Sign({ _id: user._id.toString(), role: user.role });
          const resp: ICode<IAuthLogs> = authLogs.LOGIN_SUCCESS;
          const msg = formatString(resp.message, user.toObject());
          authLogger.info(msg, { type: resp.type });
          
          res.cookie("token", token, getCookiesSettings(stay));

          return new SuccessResponseC(
            resp.type,
            { ...user.Optimize() , token: token},
            msg,
            HttpCodes.Accepted.code
          );
          
        }
        const msg = formatString(
          authLogs.LOGIN_ERROR_INCORRECT_PASSWORD_FOUND.message,
          { email }
        );
        authLogger.error(msg);
        return new ErrorResponseC(
          authLogs.LOGIN_ERROR_INCORRECT_PASSWORD_FOUND.type,
          HttpCodes.Unauthorized.code,
          msg
        );
      }
      const msg = formatString(authLogs.LOGIN_ERROR_EMAIL_NOT_FOUND.message, {
        email,
      });
      authLogger.error(msg);
      return new ErrorResponseC(
        authLogs.LOGIN_ERROR_EMAIL_NOT_FOUND.type,
        HttpCodes.NotFound.code,
        msg
      );
    } catch (err) {
      const msg = formatString(authLogs.LOGIN_ERROR_GENERIC.message, {
        error: (err as Error)?.message || "",
        email,
      });
      authLogger.error(msg, err as Error);
      return new ErrorResponseC(
        authLogs.LOGIN_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg
      );
    }
  };

  /**
   * @description Register a user
   * @param email  - String
   * @param password  - String
   * @param firstName  - String
   * @param lastName  - String
   * @returns {ResponseT}
   */

  static executeRegister = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    salt: string,
    encryptedRMK: string,
    rmk_iv: string,
    encryptedPrivateKey: string,
    privateKey_iv: string,
    publicKey: string,
    stay: boolean,
    
     res : Response,

  ): Promise<ResponseT> => {
    try {
      const userExist = await UserModel.findOne({
        email,
      });
      if (userExist) {
        const msg = formatString(authLogs.REGISTER_ERROR_EMAIL_EXIST.message, {
          email,
        });
        authLogger.error(msg);
        return new ErrorResponseC(
          authLogs.REGISTER_ERROR_EMAIL_EXIST.type,
          HttpCodes.BadRequest.code,
          msg
        );
      }
      console.log("inside register - salt ",salt, " encryptedRMK ", encryptedRMK, " rmk_iv ", rmk_iv);
      const user = new UserModel({ email, password, firstName, lastName, salt, encryptedRMK, rmk_iv, encryptedPrivateKey, privateKey_iv, publicKey });
      await user.save();
      console.log("user ",user)
      const token = Sign({ _id: user._id.toString(), role: user.role });
      res.cookie("token", token, getCookiesSettings(stay));
      const resp: ICode<IAuthLogs> = authLogs.REGISTER_SUCCESS;
      const msg = formatString(resp.message, user.toObject());
      authLogger.info(msg, { type: resp.type });
      // res.cookie("token", token, getCookiesSettings(stay));
      //     const job = {
      //       to: email,
      //       subject:"Account Created",
      //       text:"Your account has been created successfully"
      //     }
      //     emailQueue.add(job,{attempts:3})
      return new SuccessResponseC(
        resp.type,
        { ...user.Optimize(), token: token },
        msg,
        HttpCodes.Created.code
      );
    } catch (err) {
      const msg = formatString(authLogs.REGISTER_ERROR_GENERIC.message, {
        error: (err as Error)?.message || "",
        email,
      });
      authLogger.error(msg, err as Error);
      return new ErrorResponseC(
        authLogs.REGISTER_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg
      );
    }
  };
  static executeAuthBack = async (user: UserD , stay : boolean , res : Response) => {
    try {
      let msg = formatString(authLogs.AUTH_BACK.message, {
        email: user.email,
        username: user.firstName + " " + user.lastName,
      });
      authLogger.info(msg, { type: authLogs.AUTH_BACK.type });
      const token = Sign({ _id: user.id.toString(), role: user.role });
      res.cookie("token", token, getCookiesSettings(stay));
      return new SuccessResponseC(
        authLogs.AUTH_BACK.type,
        user.Optimize(),
        msg,
        HttpCodes.Accepted.code
      );
    } catch (err) {
      const msg = formatString(authLogs.AUTH_ERROR_GENERIC.message, {
        error: (err as Error)?.message || "",
        email: user.email,
      });
      authLogger.error(msg, err as Error);
      return new ErrorResponseC(
        authLogs.AUTH_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg
      );
    }
  };

  static executeLogout = async (user: UserD , res : Response) => {
    try {
      let msg = formatString(authLogs.LOGOUT_SUCCESS.message, {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
      authLogger.info(msg, { type: authLogs.LOGOUT_SUCCESS.type });
      res.clearCookie("token");
      return new SuccessResponseC(
        authLogs.LOGOUT_SUCCESS.type,
        null,
        msg,
        HttpCodes.Accepted.code
      );
    } catch (err) {
      const msg = formatString(authLogs.LOGOUT_ERROR_GENERIC.message, {
        error: (err as Error)?.message || "",
        email: user.email,
      });
      authLogger.error(msg, err as Error);
      return new ErrorResponseC(
        authLogs.LOGOUT_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg
      );
    }
  };

  static executeGetCryptoMaterial = async (user: UserD): Promise<ResponseT> => {
    console.log(user);
    try {
      const msg = formatString(authLogs.GET_CRYPTO_MATERIAL_SUCCESS.message, {
        email: user.email,
      });
      authLogger.info(msg, { type: authLogs.GET_CRYPTO_MATERIAL_SUCCESS.type });
      return new SuccessResponseC(
        authLogs.GET_CRYPTO_MATERIAL_SUCCESS.type,
        {
          salt: user.salt,
          encryptedRMK: user.encryptedRMK,
          rmk_iv: user.rmk_iv,
        },
        msg,
        HttpCodes.OK.code
      );
    } catch (err) {
      const msg = formatString(authLogs.CHANGE_PASSWORD_ERROR_GENERIC.message, {
        email: user.email,
        error: (err as Error)?.message || "",
      });
      authLogger.error(msg, err as Error);
      return new ErrorResponseC(
        authLogs.CHANGE_PASSWORD_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg
      );
    }
  };

  static executeChangePassword = async (
    user: UserD,
    oldPassword: string,
    newPassword: string,
    salt: string,
    encryptedRMK: string,
    rmk_iv: string
  ): Promise<ResponseT> => {
    try {
      const isPasswordMatch = await user.comparePasswords(oldPassword);
      if (!isPasswordMatch) {
        const msg = formatString(
          authLogs.CHANGE_PASSWORD_ERROR_WRONG_PASSWORD.message,
          { email: user.email }
        );
        authLogger.error(msg, {
          type: authLogs.CHANGE_PASSWORD_ERROR_WRONG_PASSWORD.type,
        });
        return new ErrorResponseC(
          authLogs.CHANGE_PASSWORD_ERROR_WRONG_PASSWORD.type,
          HttpCodes.Unauthorized.code,
          msg
        );
      }

      user.password = newPassword;
      user.salt = salt;
      user.encryptedRMK = encryptedRMK;
      user.rmk_iv = rmk_iv;
      await user.save();

      const msg = formatString(authLogs.CHANGE_PASSWORD_SUCCESS.message, {
        email: user.email,
      });
      authLogger.info(msg, { type: authLogs.CHANGE_PASSWORD_SUCCESS.type });
      return new SuccessResponseC(
        authLogs.CHANGE_PASSWORD_SUCCESS.type,
        null,
        msg,
        HttpCodes.OK.code
      );
    } catch (err) {
      const msg = formatString(authLogs.CHANGE_PASSWORD_ERROR_GENERIC.message, {
        email: user.email,
        error: (err as Error)?.message || "",
      });
      authLogger.error(msg, err as Error);
      return new ErrorResponseC(
        authLogs.CHANGE_PASSWORD_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg
      );
    }
  };

  static executeEnrollCertificate = async (
    user: UserD,
    signPublicKeySpkiB64: string,
  ): Promise<ResponseT> => {
    try {
      const certificate = buildCertificate(user, signPublicKeySpkiB64);
      const caSignatureB64 = signCertificate(certificate);

      await UserModel.updateOne(
        { _id: user._id },
        {
          $set: {
            identityCertificate: JSON.stringify(certificate),
            identityCertSignature: caSignatureB64,
          },
        },
      );

      const msg = formatString(authLogs.CERTIFICATE_ENROLL_SUCCESS.message, {
        email: user.email,
      });
      authLogger.info(msg, { type: authLogs.CERTIFICATE_ENROLL_SUCCESS.type });

      return new SuccessResponseC(
        authLogs.CERTIFICATE_ENROLL_SUCCESS.type,
        { certificate, caSignatureB64, caCertFingerprint: createHmac("sha256", MINI_CA_SECRET).update("mini-ca").digest("hex") },
        msg,
        HttpCodes.Created.code,
      );
    } catch (err) {
      const msg = formatString(authLogs.CERTIFICATE_ENROLL_ERROR_GENERIC.message, {
        email: user.email,
        error: (err as Error)?.message || "",
      });
      authLogger.error(msg, err as Error);
      return new ErrorResponseC(
        authLogs.CERTIFICATE_ENROLL_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg,
      );
    }
  };

  static executeStartIdentityChallenge = async (
    user: UserD,
  ): Promise<ResponseT> => {
    try {
      const challengeId = `ch_${randomBytes(12).toString("hex")}`;
      const nonceB64 = randomBytes(32).toString("base64");
      const record: ChallengeRecord = {
        challengeId,
        nonceB64,
        userId: user.id.toString(),
        email: user.email,
        expiresAt: Date.now() + CHALLENGE_TTL_MS,
        used: false,
      };
      identityChallenges.set(challengeId, record);

      const msg = formatString(authLogs.IDENTITY_CHALLENGE_START_SUCCESS.message, {
        email: user.email,
      });
      authLogger.info(msg, { type: authLogs.IDENTITY_CHALLENGE_START_SUCCESS.type });

      return new SuccessResponseC(
        authLogs.IDENTITY_CHALLENGE_START_SUCCESS.type,
        {
          challengeId,
          nonceB64,
          expiresAt: new Date(record.expiresAt).toISOString(),
          serverTime: new Date().toISOString(),
          sigAlgRequired: "ECDSA-P256-SHA256",
        },
        msg,
        HttpCodes.OK.code,
      );
    } catch (err) {
      const msg = formatString(authLogs.IDENTITY_CHALLENGE_START_ERROR_GENERIC.message, {
        email: user.email,
        error: (err as Error)?.message || "",
      });
      authLogger.error(msg, err as Error);
      return new ErrorResponseC(
        authLogs.IDENTITY_CHALLENGE_START_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg,
      );
    }
  };

  static executeVerifyIdentityChallenge = async (
    user: UserD,
    challengeId: string,
    certificate: MiniCertificate,
    caSignatureB64: string,
    clientTimestamp: string,
    signedPayloadB64: string,
    signatureB64: string,
    res: Response,
  ): Promise<ResponseT> => {
    try {
      const challenge = getChallengeOrNull(challengeId);
      if (!challenge) {
        return new ErrorResponseC(
          authLogs.IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC.type,
          HttpCodes.Unauthorized.code,
          "Challenge invalide ou expiré",
        );
      }

      if (challenge.userId !== user.id.toString() || challenge.email !== user.email) {
        return new ErrorResponseC(
          authLogs.IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC.type,
          HttpCodes.Unauthorized.code,
          "Challenge non associé à cet utilisateur",
        );
      }

      if (certificate.subject.userId !== user.id.toString() || certificate.subject.email !== user.email) {
        return new ErrorResponseC(
          authLogs.IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC.type,
          HttpCodes.Unauthorized.code,
          "Le certificat ne correspond pas à l'utilisateur connecté",
        );
      }

      const notBefore = new Date(certificate.notBefore).getTime();
      const notAfter = new Date(certificate.notAfter).getTime();
      const now = Date.now();
      if (!Number.isFinite(notBefore) || !Number.isFinite(notAfter) || now < notBefore || now > notAfter) {
        return new ErrorResponseC(
          authLogs.IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC.type,
          HttpCodes.Unauthorized.code,
          "Le certificat est expiré ou invalide",
        );
      }

      const issuedSignature = await UserModel.findById(user._id).then((doc) => doc?.identityCertSignature || null);
      if (issuedSignature !== caSignatureB64 || !verifyCertificateSignature(certificate, caSignatureB64)) {
        return new ErrorResponseC(
          authLogs.IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC.type,
          HttpCodes.Unauthorized.code,
          "La signature du certificat est invalide",
        );
      }

      const payload = parseBase64Json<{
        challengeId: string;
        nonceB64: string;
        userId: string;
        email: string;
        clientTimestamp: string;
        aud?: string;
        purpose?: string;
      }>(signedPayloadB64);

      if (
        payload.challengeId !== challenge.challengeId ||
        payload.nonceB64 !== challenge.nonceB64 ||
        payload.userId !== user.id.toString() ||
        payload.email !== user.email ||
        payload.purpose !== "auth-login-proof"
      ) {
        return new ErrorResponseC(
          authLogs.IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC.type,
          HttpCodes.Unauthorized.code,
          "Le payload du challenge est invalide",
        );
      }

      const timestamp = Date.parse(clientTimestamp);
      if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > CHALLENGE_SKEW_MS) {
        return new ErrorResponseC(
          authLogs.IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC.type,
          HttpCodes.Unauthorized.code,
          "Le timestamp du challenge est invalide",
        );
      }

      const signatureValid = verifyChallengePayloadSignature(
        signedPayloadB64,
        signatureB64,
        certificate.signPublicKeySpkiB64,
      );

      if (!signatureValid) {
        return new ErrorResponseC(
          authLogs.IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC.type,
          HttpCodes.Unauthorized.code,
          "La signature du challenge est invalide",
        );
      }

      challenge.used = true;
      identityChallenges.set(challenge.challengeId, challenge);
      res.cookie("identity_verified", "true", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: Math.min(CHALLENGE_TTL_MS, 15 * 60 * 1000),
      });

      const msg = formatString(authLogs.IDENTITY_CHALLENGE_VERIFY_SUCCESS.message, {
        email: user.email,
      });
      authLogger.info(msg, { type: authLogs.IDENTITY_CHALLENGE_VERIFY_SUCCESS.type });

      return new SuccessResponseC(
        authLogs.IDENTITY_CHALLENGE_VERIFY_SUCCESS.type,
        { verified: true },
        msg,
        HttpCodes.OK.code,
      );
    } catch (err) {
      const msg = formatString(authLogs.IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC.message, {
        email: user.email,
        error: (err as Error)?.message || "",
      });
      authLogger.error(msg, err as Error);
      return new ErrorResponseC(
        authLogs.IDENTITY_CHALLENGE_VERIFY_ERROR_GENERIC.type,
        HttpCodes.InternalServerError.code,
        msg,
      );
    }
  };
}
