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
