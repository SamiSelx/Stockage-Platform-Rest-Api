import {
  loginValidators,
  registerValidators,
  changePasswordValidators,
} from "../services/auth/auth.validator";
import {
  SignIn,
  SignUp,
  AuthBack,
  Logout,
  GetCryptoMaterial,
  ChangePassword,
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

export default authRouter;
