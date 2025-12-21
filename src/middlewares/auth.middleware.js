import {User} from "../models/user.model.js"
import {ApiErrors} from "../utils/api-errors.js"
import {asyncHandler} from "../utils/async-handler.js"
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async(req ,res ,next) =>{
    const token = req.cookies?.accessToken||req.header("Authorization")?.replace("Bearer ","")
    
    if(!token){
        throw new ApiErrors(401,"Unauthorized request.")
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select(
          "-password -refreshToken -emailVerificationToken -dateVerificationToken",
        );

        if (!user) {
          throw new ApiErrors(401, "Invalid Access Token.");
        }
        req.user=user
        next()  //means hop to next middleware
    } catch (error) {
        throw new ApiErrors(401, "Invalided Access Token.");
    }
})
