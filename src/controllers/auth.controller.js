import {User} from "../models/user.model.js"
import {ApiResponse} from "../utils/api-response.js"
import {ApiErrors} from "../utils/api-errors.js"
import { asyncHandler } from "../utils/async-handler.js"
import { emailVerificationMailgenContent, sendEmail } from "../utils/mails.js"

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

export { registerUser , login , logoutUser}
