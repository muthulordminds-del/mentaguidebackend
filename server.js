import "./config/env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/mongodb.js";
import authRoute from "./routes/authRoutes.js";
import userRoute from "./routes/userRoutes.js";
import contactRoute from "./routes/contactRoutes.js";
import { isAuthenticated } from "./controllers/authController.js";


const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://mentaguide.com',
    'https://mentaguide.vercel.app',
    'https://www.mentaguide.com',
    ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(origin => origin.trim()) : [])
];

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://mentaa.netlify.app",
        "https://mentaguide.vercel.app",
        "https://mentaguide.com",
        "https://www.mentaguide.com"
    ],
    credentials: true
}));

// Api Endpoints
app.get('/', (req, res) => {
    res.send('Say My Name - Heisenburg You goddamn right');
});

app.get('/api/auth/is-auth', isAuthenticated);
app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);
app.use('/api/contact', contactRoute);

app.listen(PORT, () => {
    console.log(`You goddamn right http://localhost:${PORT}`);
    console.log(`SMTP user: ${process.env.SMTP_USER || "not configured"}`);
});
