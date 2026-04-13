import {
  loginValidators,
  registerValidators,
  changePasswordValidators,
  enrollCertificateValidators,
  startIdentityChallengeValidators,
  verifyIdentityChallengeValidators,
} from "../services/auth/auth.validator";
import {
  SignIn,
  SignUp,
  AuthBack,
  Logout,
  GetCryptoMaterial,
  ChangePassword,
  EnrollCertificate,
  StartIdentityChallenge,
  VerifyIdentityChallenge,
  getPublicAuthData,
  resetPasswordWithRecovery,
} from "../controller/auth.controller";
import { Router } from "express";
import { validator } from "../middleware/validator";
import { checkLogs, isLoggedIn, isAdmin, isUser } from "../middleware/auth";

const authRouter = Router();

authRouter.route("/login").post(loginValidators, validator, SignIn);
authRouter.route("/register").post(registerValidators, validator, SignUp);
authRouter.route("/").get(checkLogs, isLoggedIn, AuthBack);
authRouter.route("/logout").get(checkLogs, isLoggedIn, Logout);
authRouter
  .route("/crypto-material")
  .get(checkLogs, isLoggedIn, GetCryptoMaterial);
authRouter
  .route("/change-password")
  .post(
    checkLogs,
    isLoggedIn,
    changePasswordValidators,
    validator,
    ChangePassword,
  );

authRouter
  .route("/cert/enroll")
  .post(
    checkLogs,
    isLoggedIn,
    enrollCertificateValidators,
    validator,
    EnrollCertificate,
  );

authRouter
  .route("/challenge/start")
  .post(
    checkLogs,
    isLoggedIn,
    startIdentityChallengeValidators,
    validator,
    StartIdentityChallenge,
  );

authRouter
  .route("/challenge/verify")
  .post(
    checkLogs,
    isLoggedIn,
    verifyIdentityChallengeValidators,
    validator,
    VerifyIdentityChallenge,
  );

authRouter.get("/public-data", getPublicAuthData);
authRouter.post("/reset-password/recovery", resetPasswordWithRecovery);

export default authRouter;
