import { Media } from "./media.model.js";
import { deleteMedia, replaceMedia, uploadMedia } from "./media.service.js";

export const upload = async (req, res) => {
  try {
    if (!req.file?.buffer)
      return res.status(400).json({ success: false, message: "File is required" });

    const { ownerType, ownerId, folder, tag } = req.body;
    const tags = tag ? [String(tag)] : [];

    const mediaData = await uploadMedia({
      buffer: req.file.buffer,
      originalFilename: req.file.originalname,
      ownerType,
      ownerId,
      folder,
      tags,
    });

    const saved = await Media.create({
      ...mediaData,
      ownerType,
      ownerId,
      folder,
      tags,
    });

    res.json({ success: true, media: saved });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const list = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      Media.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Media.countDocuments(),
    ]);

    res.json({
      success: true,
      count: total,
      page,
      totalPages: Math.ceil(total / limit),
      files,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { public_id, resource_type } = req.body;

    if (!public_id)
      return res.status(400).json({ success: false, message: "public_id is required" });

    await deleteMedia({ public_id, resource_type });

    await Media.findOneAndDelete({ public_id });

    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const replace = async (req, res) => {
  try {
    if (!req.file?.buffer)
      return res.status(400).json({ success: false, message: "File is required" });

    const { old_public_id, old_resource_type, ownerType, ownerId, folder, tag } = req.body;
    const tags = tag ? [String(tag)] : [];

    const updated = await replaceMedia({
      old_public_id,
      old_resource_type,
      buffer: req.file.buffer,
      originalFilename: req.file.originalname,
      ownerType,
      ownerId,
      folder,
      tags,
    });

    await Media.findOneAndDelete({ public_id: old_public_id });

    const saved = await Media.create({
      ...updated,
      ownerType,
      ownerId,
      folder,
      tags,
    });

    res.json({ success: true, media: saved });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};