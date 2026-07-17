import express from "express";
import {
    createOrder,
    verifyPayment,
    createBalanceOrder,
    verifyBalancePayment,
} from "../controllers/paymentController.js";

const paymentRouter = express.Router();

paymentRouter.post("/create-order", createOrder);
paymentRouter.post("/verify", verifyPayment);
paymentRouter.post("/create-balance-order", createBalanceOrder);
paymentRouter.post("/verify-balance", verifyBalancePayment);

export default paymentRouter;
