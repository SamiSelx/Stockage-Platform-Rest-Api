import {
  createHmac,
  createPublicKey,
  randomBytes,
  verify as verifySignature,
} from "crypto";
import { UserD } from "../db/models/user";

export const identityChallenges = new Map<string, ChallengeRecord>();
export const MINI_CA_ISSUER = process.env.MINI_CA_ISSUER || "MiniCA-Stockage";
export const MINI_CA_SECRET =
  process.env.MINI_CA_SECRET || "dev-mini-ca-secret";

export function serializeCertificate(certificate: MiniCertificate): string {
  return JSON.stringify(certificate);
}

export function signCertificate(certificate: MiniCertificate): string {
  return createHmac("sha256", MINI_CA_SECRET)
    .update(serializeCertificate(certificate))
    .digest("base64");
}

export function verifyCertificateSignature(
  certificate: MiniCertificate,
  caSignatureB64: string,
): boolean {
  return signCertificate(certificate) === caSignatureB64;
}

export function buildCertificate(
  user: UserD,
  signPublicKeySpkiB64: string,
): MiniCertificate {
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

export function parseBase64Json<T>(base64Value: string): T {
  const json = Buffer.from(base64Value, "base64").toString("utf8");
  return JSON.parse(json) as T;
}

export function verifyChallengePayloadSignature(
  payloadB64: string,
  signatureB64: string,
  signPublicKeySpkiB64: string,
): boolean {
  try {
    const publicKey = createPublicKey({
      key: Buffer.from(signPublicKeySpkiB64, "base64"),
      format: "der",
      type: "spki",
    });

    const signature = Buffer.from(signatureB64, "base64");

    console.log("[CERT_VERIFY_DEBUG] Starting signature verification", {
      payloadB64Length: payloadB64.length,
      signatureLength: signature.length,
      publicKeyType: publicKey.type,
      publicKeyAsymmetricKeyType: publicKey.asymmetricKeyType,
    });

    // Some clients produce ECDSA signature as DER, others as IEEE-P1363 (raw r||s).
    // Also, some sign decoded payload bytes while others sign the base64 text itself.
    const payloadCandidates = [
      { buffer: Buffer.from(payloadB64, "base64"), type: "base64-decoded" },
      { buffer: Buffer.from(payloadB64, "utf8"), type: "base64-as-utf8" },
    ];

    for (const { buffer: payload, type: payloadType } of payloadCandidates) {
      console.log(
        `[CERT_VERIFY_DEBUG] Trying ${payloadType} with payload length: ${payload.length}`,
      );

      const derOk = verifySignature(
        "sha256",
        payload,
        { key: publicKey, dsaEncoding: "der" },
        signature,
      );
      if (derOk) {
        console.log(
          `[CERT_VERIFY_DEBUG] ✓ Success with ${payloadType} + DER encoding`,
        );
        return true;
      }

      const p1363Ok = verifySignature(
        "sha256",
        payload,
        { key: publicKey, dsaEncoding: "ieee-p1363" },
        signature,
      );
      if (p1363Ok) {
        console.log(
          `[CERT_VERIFY_DEBUG] ✓ Success with ${payloadType} + IEEE-P1363 encoding`,
        );
        return true;
      }

      console.log(`[CERT_VERIFY_DEBUG] ✗ Failed with ${payloadType}`);
    }

    console.log(
      "[CERT_VERIFY_DEBUG] ✗ All signature verification attempts failed",
    );
    return false;
  } catch (err) {
    console.error("[CERT_VERIFY_DEBUG] Signature verification exception", err);
    return false;
  }
}

export function getChallengeOrNull(
  challengeId: string,
): ChallengeRecord | null {
  const challenge = identityChallenges.get(challengeId);
  if (!challenge) return null;
  if (challenge.used) return null;
  if (Date.now() > challenge.expiresAt) {
    identityChallenges.delete(challengeId);
    return null;
  }
  return challenge;
}
