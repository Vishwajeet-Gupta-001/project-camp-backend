import { body } from "express-validator";

const userRegisterValidator= () => {
    return [
      body("email")
        .trim()
        .notEmptyEmpty()
        .withMessage("Email is required.")
        .isEmail()
        .withMessage("Email is invalid"),
      body("username")
        .trim()
        .notEmpty()
        .withMessage("Username is required.")
        .isLowercase()
        .withMessage("Username must be in lower case.")
        .isLength({ min: 3 })
        .withMessage("Username must be atleast 3 char long"),
      body("password").trim().notEmpty().withMessage("Password is required."),
      body("fullName")
            .optional()
            .trim(),
    ];
}

export {userRegisterValidator}