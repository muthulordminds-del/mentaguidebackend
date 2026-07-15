import mongoose from "mongoose";

const connectDB = async ()=>{

    mongoose.connection.on("connected", ()=>{
        console.log("Database connected");
    })

    mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err.message);
    })

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        })
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err.message);
        console.error("Server will continue running, but DB-dependent routes will fail until this is fixed.");
    }
}

export default connectDB