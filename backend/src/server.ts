import express, { Request, Response } from "express";
import dotenv from "dotenv";
import authRouter from "./routes/auth.route.js";
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.use("/api/auth", authRouter);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).send("Server is healthy");
});

app.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
});
