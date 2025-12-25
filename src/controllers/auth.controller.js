import {User} from "../models/user.model.js"
import {ApiResponse} from "../utils/api-response.js"
import {ApiErrors} from "../utils/api-errors.js"
import { asyncHandler } from "../utils/async-handler.js"
import { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail } from "../utils/mails.js"
import jwt from "jsonwebtoken"

//generating Access Token(AT) and Refresh Token(RT)
const generateAccessAndRefreshToken = async (userID) => {
    try {
        const user = await User.findById(userID) 
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken , refreshToken}
    } catch (error) {
        throw new ApiErrors(
            500,
            "Somehting went wrong while generating access token."
        )
    }
}

//for user registration
const registerUser=asyncHandler(async(req , res) =>{

    //taking the data
    const {email , username , password , role } = req.body

    //checking in the DB if user exists
    const existedUser =await User.findOne({
        $or:[{username},{email}]    //check if username or email already exists
    })

    if(existedUser){
        throw new ApiErrors(409,"User with email or username already exists.",[])
    }

    //if user doesn't exist then do this

    const user = await User.create({
        username,
        email,
        password,
        existedUser:false
    })

    const { unHashedToken, hashedToken, tokenExpiry } =
      user.generateTemporaryToken();

      user.emailVerificationToken=hashedToken
      user.emailVerificationExpiry=tokenExpiry

      await user.save({validateBeforeSave:false})

      await sendEmail({
        email:user?.email,
        subject:"Please verify your email.",
        mailgenContent:emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`   //generating dynamic link
        )
      })
    
    const createdUser = await User
      .findById(user._id)
      .select(
        "-password -refreshToken -emailVerificationToken -dateVerificationToken",
      );

    if(!createdUser){
        throw new ApiErrors(500 , "Something went wrong while registering the user.")
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                    200,
                    {user:createdUser},
                    "User registered successfully and verification email has been sent on yuor email."
            )
        )
})

//for user login
const login = asyncHandler(async(req , res) =>{
    const {email , password , username}=req.body

    if(!email){
        throw new ApiErrors(400 , " Email is required.")
    }

    const user = await User.findOne({email})

    if(!user){
        throw new ApiErrors(400 , "User doesn't exist.")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiErrors(400, "Invalid credentials.");
    }

    const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggenInUser = await User.findById(user._id).select(
      "-password -refreshToken -emailVerificationToken -dateVerificationToken",
    );

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
            200,
            {
                user : loggenInUser,
                AccessToken : accessToken,
                RefreshToken : refreshToken
            },
            "User logged in successfully."
        )
      )
})

//for loging user out
const logoutUser = asyncHandler(async(req , res) =>{
    await User.findByIdAndUpdate(
        req.user._id,//search user by id
        {
            $set:{
                refreshToken: ""
            }
        },//change value of refreshtoken to ""
        {
            new:true
        }//give me the newer or updated object
    );

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
            .status(200)
            .clearCookie("accessToken",options)
            .clearCookie("refreshToken",options)
            .json(
                new ApiResponse(200,{},"User logged out.")
            )
})

//the below is just controller and routes part.Easy easy.

//for getting current user information
const getCurrentUser = asyncHandler(async(req , res) =>{
    return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    req.user,
                    "Current User fetched successfully."
                )
            )
})

//for email verification
const verifyEmail = asyncHandler(async(req , res) =>{
    const {verificationToken} = req.params

    if(!verificationToken){
        throw new ApiErrors(400,"Email Verification Token is missing.")
    }

    let hashedToken = crypto
                        .createHash("sha256")
                        .update(verificationToken)
                        .digest("hex")
    
    const user = await User.findOne({
        emailVerificationToken : hashedToken,
        emailVerificationExpiry:{$gt: Date.now()}//it's(emailVeriExpy) value should be greater than Date.now()
    })

    if(!user){
        throw new ApiErrors(400, "Token is invalid or expired.");
    }

    //cleaning up DB
    user.emailVerificationToken=undefined
    user.emailVerificationExpiry=undefined

    //updating data
    user.isEmailVerified=true
    await user.save({validateBeforeSave: false})//saving the data

    return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        isEmailVerified:true
                    },
                    "Email is verified."
                )
            )
})

const resendEmailVerification = asyncHandler(async(req , res) =>{
    //it will only work if user is already logged in
    const user = await User.findById(req.user?._id)

    if (!user) {
      throw new ApiErrors(404, "Useer doesn't exist.");
    }

    if (user.isEmailVerified) {
      throw new ApiErrors(409, "User is already verified.");
    }

    //the same process done in user registration(copied from above)

    const { unHashedToken, hashedToken, tokenExpiry } =
      user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    await sendEmail({
      email: user?.email,
      subject: "Please verify your email.",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`, //generating dynamic link
      ),
    });

    return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Email has been sent to yuor email id."
                )
            )
})


const refreshAccessToken = asyncHandler(async(req , res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
      throw new ApiErrors(401, "Unauthorized access.");
    }

    //decoding the token
    try {
        const decodedToken= jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id)

        if (!user) {
          throw new ApiErrors(401, "Invalid refresh token.");
        }

        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiErrors(401, "Refresh token is expired.");
        }

        const options ={
            httpOnly : true,
            secure : true
        }

        const {accessToken , refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id)

        //updating the DB
        user.refreshToken=newRefreshToken
        await user.save()

        return res
          .status(200)
          .cookie("accesToken", accessToken, options)
          .cookie("refreshToken", newRefreshToken, options)
          .json(
            new ApiResponse(
                200,
                {accessToken:accessToken , refreshToken :newRefreshToken},
                "Access Token refreshed."
            )
          )

    } catch (error) {
        throw new ApiErrors(401, "Invalid Refresh Token.");
    }
})


const forgotPasswordRequest = asyncHandler(async(req , res) =>{
    const {email} = req.body

    const user = await User.findOne({email})
    if (!user) {
      throw new ApiErrors(404, "User doesn't exist.");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
      user.generateTemporaryToken();

    user.forgotPasswordToken=hashedToken
    user.forgotPasswordExpiry=tokenExpiry

    await user.save({validateBeforeSave:false})

    //sending the email(copied from registerUSer)
    await sendEmail({
      email: user?.email,
      subject: "Password reset request..",
      mailgenContent: forgotPasswordMailgenContent(
        user.username,
        `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`, 
      ),
    });

    return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Password reset mail has been sent to your email."
                )
            )

})


const resetForgotPassword = asyncHandler(async(req , res) =>{
    const {resetToken} = req.params
    const {newPassword} = req.body

    let hashedToken=crypto
                    .createHash("sha256")
                    .update(resetToken)
                    .digest("hex")
    
    const user = await User.findOne({
        forgotPasswordToken:hashedToken,
        forgotPasswordExpiry:{$gt : Date.now()}
    })

    if (!user) {
      throw new ApiErrors(489, "Token is invalid or expired.");
    }

    user.forgotPasswordExpiry=undefined
    user.forgotPasswordExpiry=undefined

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password reset successfull."));
})


const changeCurrentPassword = asyncHandler(async(req , res) =>{
    const {oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid){
        throw new ApiErrors(400, "Invalid old password.");
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Password changed successfully."
                )
            )
})

export { registerUser , login , logoutUser , getCurrentUser , verifyEmail , resendEmailVerification , refreshAccessToken , forgotPasswordRequest , resetForgotPassword , changeCurrentPassword }
