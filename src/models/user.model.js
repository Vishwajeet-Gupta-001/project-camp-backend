import mongoose,{ Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"

const userSchema = new Schema({
  avatar: {
    type: {
      url: String,
      localPath: String,
    },
    default: {
      url: `https://placehold.co/200x200`,
      localPath: "",
    },
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  fullName: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Password is required."],
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  refreshToken: {
    type: String,
  },
  forgotPasswordToken: {
    type: String,
  },
  forgotPasswordExpiry: {
    type: Date,
  },
  emailVerificationToken: {
    type: String,
  },
  dateVerificationToken: {
    type: Date,
  },
    },{
        timestamps:true,
    }
);

//using prehooks to hash the password before saving the data to DB

userSchema.pre("save",async function(){
    //"next" here means go to next hook&"10" means number of hashing rounds
    if(!this.isModified("password")) {
        return
        //this is to check if the password field is modified or not
    }
    else{
        this.password=await bcrypt.hash(this.password , 10)
    }
})

//to check if enters the password for login , is it the same hashed password stored in the DB or not

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password , this.password)
}

//to generate the access token

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
      {
        _id: this._id, //it will create an id automatically
        email: this.email,
        username: this.username,
      }, //this is the payload part of token
      process.env.ACCESS_TOKEN_SECRET, //this is the secret part
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );  //this is generation of access token
}

//to generate the refresh token

userSchema.methods.generateRefreshToken=function(){
  return jwt.sign(
    {
      _id: this._id,    //it will create an id automatically
    },  //this is the payload part of token
    process.env.REFRESH_TOKEN_SECRET, //this is the secret part
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );    //this is generation of refresh token
}

//generating without data token(General/Temporary).Usually for verifying user or for password reseting.

userSchema.methods.generateTemporaryToken=function(){
    const unHashedToken = crypto.randomBytes(20).toString("hex")

    //hashing the above token

    const hashedToken = crypto
                            .createHash("sha256")
                            .update(unHashedToken)
                            .digest("hex")

    const tokenExpiry = Date.now() + (20*60*100)    //20 mins
    return { unHashedToken , hashedToken , tokenExpiry }
}

export const User=mongoose.model("User",userSchema)