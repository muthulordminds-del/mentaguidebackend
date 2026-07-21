import express from "express";
// import { createAdvertiser } from "../controllers/advertiserController.js";
import { createAdvertiser, getAdvertiserById } from "../controllers/advertiserController.js";

const advertiserRouter = express.Router();

advertiserRouter.post("/submit", createAdvertiser);
advertiserRouter.get("/:id", getAdvertiserById);

export default advertiserRouter;
