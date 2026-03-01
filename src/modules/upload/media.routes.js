import express from "express";
import uploadMemory from "../../middlewares/uploadMemory.js";
import { list, remove, replace, upload } from "./media.controller.js";

const router = express.Router();

router.get("/", list);
router.post("/upload", uploadMemory.single("file"), upload);
router.delete("/", express.json(), remove);
router.put("/replace", uploadMemory.single("file"), replace);

export default router;