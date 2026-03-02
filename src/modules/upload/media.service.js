import { cloudinary } from "../../config/cloudinary.js";
import { detectMedia, safeFolder } from "../../utils/media.js";

function uploadStream(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

export async function uploadMedia({
  buffer,
  originalFilename = "file",
  ownerType,
  ownerId,
  folder,
  tags = [],
}) {
  const { resourceType, baseFolder } = await detectMedia(buffer);

  const root = "doctor-appointment-system";
  const ownerPart =
    ownerType && ownerId ? `${safeFolder(ownerType)}/${safeFolder(ownerId)}` : "common";

  const customFolder = folder ? safeFolder(folder) : "";
  const finalFolder = [root, baseFolder, ownerPart, customFolder].filter(Boolean).join("/");

  const result = await uploadStream(buffer, {
    folder: finalFolder,
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    tags: tags?.length ? tags : undefined,
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
    resource_type: result.resource_type,
    format: result.format,
    bytes: result.bytes,
    original_filename: result.original_filename || originalFilename,
    duration: result.duration,
    width: result.width,
    height: result.height,
  };
}

export async function deleteMedia({ public_id, resource_type }) {
  if (!public_id) throw new Error("public_id is required");
  const rt = resource_type || "raw";

  const res = await cloudinary.uploader.destroy(public_id, {
    resource_type: rt,
    invalidate: true,
  });

  return res;
}

export async function replaceMedia({
  old_public_id,
  old_resource_type,
  buffer,
  originalFilename,
  ownerType,
  ownerId,
  folder,
  tags,
}) {
  // 1) upload new first (safe)
  const uploaded = await uploadMedia({
    buffer,
    originalFilename,
    ownerType,
    ownerId,
    folder,
    tags,
  });

  if (old_public_id) {
    try {
      await deleteMedia({ public_id: old_public_id, resource_type: old_resource_type });
    } catch (e) {
      // ignore delete failure but log it
      console.error("⚠️ Old media delete failed:", e.message);
    }
  }

  return uploaded;
}