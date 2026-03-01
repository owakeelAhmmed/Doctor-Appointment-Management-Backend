import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";

import v1Routes from "./routes.js";
import { notFound, errorHandler } from "../middlewares/error.middleware.js";

const app = express();

// basic
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use(mongoSanitize());

app.use(hpp());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);

// health check
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// routes (ONLY ONE mount)
app.use("/api/v1", v1Routes);

// error handlers
app.use(notFound);
app.use(errorHandler);

export default app;