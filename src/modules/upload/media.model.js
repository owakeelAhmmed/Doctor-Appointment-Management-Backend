import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    resource_type: { type: String, required: true },
    format: String,
    bytes: Number,
    duration: Number,
    width: Number,
    height: Number,
    ownerType: String,
    ownerId: String,
    folder: String,
    tags: [String],
  },
  { timestamps: true }
);

export const Media = mongoose.model("Media", mediaSchema);