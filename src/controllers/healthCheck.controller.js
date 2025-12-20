import {ApiResponse} from "../utils/api-response.js"
import { asyncHandler } from "../utils/async-handler.js"
/*
This a standard boilerplate code that can be used.
We will use the improved one below.

const healthCheck=(req,res) =>{
    try {
        res
            .status(200)
            .json(new ApiResponse(200,{mesaage:"Server is running."}))
    } catch (error) {
        
    }
}
*/

//this below is improved version of above and the improved version of this is in async-handler.js file
// const healthCheck = async(req, res, next) => {
//   try {
//     const user= await getUserFromDB
//     res
//       .status(200)
//       .json(new ApiResponse(200, { mesaage: "Server is running." }));
//   } catch (error) {
//     next(error)
//   }
// };


//you can use the below as a template in every project.
const healthCheck=asyncHandler(async(req,res) =>{
  res
    .status(200)
    .json(new ApiResponse(200,{message:"✅Server is running excellently."}))
})

export {healthCheck}