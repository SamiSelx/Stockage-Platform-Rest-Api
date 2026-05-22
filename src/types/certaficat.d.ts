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
