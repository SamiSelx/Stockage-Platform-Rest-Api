import { GetAllUsers, GetPublicKey } from "../controller/user.controller";
import { Router } from "express";
import { validator } from "../middleware/validator";
import { getPublicKeyValidators } from "../services/user/user.validator";
import { checkLogs, isLoggedIn } from "../middleware/auth";


const userRouter = Router()

userRouter
  .route("/:email/public-key")
  .get(checkLogs, isLoggedIn, getPublicKeyValidators, validator, GetPublicKey);

userRouter
  .route("/")
  .get(checkLogs, isLoggedIn, GetAllUsers);

export default userRouter;