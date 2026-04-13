import { param } from "express-validator";

export const getPublicKeyValidators = [
  param("email").isEmail().withMessage("Invalid email"),
];