import { body } from "express-validator";

//Validation for user registration.
const userRegisterValidator= () => {
    return [
      body("email")
        .trim()
        .notEmpty()
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

//Validation for user login.
const userLoginValidator = () =>{
  return [
    body("email")
          .optional()
          .isEmail()
          .withMessage("Email is invalid."),
     body("password")
     .trim()
     .notEmpty()
     .withMessage("Password is required.")
  ]
}


export { userRegisterValidator , userLoginValidator }