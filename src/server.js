import dotenv from "dotenv";
dotenv.config();

import app from "./app/app.js";
import { connectCloudinary } from "./config/cloudinary.js";
import { connectDB } from "./config/db.js";
import { MONGODB_URI, PORT } from "./config/env.js";

(async () => {
  try {
    await connectDB(MONGODB_URI);
    
    connectCloudinary();

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });


  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
})();