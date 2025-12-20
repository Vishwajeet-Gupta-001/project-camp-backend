import express from "express"
import cors from "cors"

const app=express()

//basic configuration
app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended: true , limit: "16kb"}))
app.use(express.static("public"))

//cors configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5713",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

//import the routes
import healthCheckRouter from "./routes/healthCheck.routes.js"

app.use("/api/v1/healthCheck",healthCheckRouter)

app.get("/",(req,res) =>{
    res.send("😀😁This is my basecamp project.\n Let's go!!")
})

export default app