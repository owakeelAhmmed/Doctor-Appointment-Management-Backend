import { fileTypeFromBuffer } from "file-type";

export async function detectMedia(buffer) {
  const detected = await fileTypeFromBuffer(buffer);

  // fallback: if cannot detect, treat as raw
  const mime = detected?.mime || "application/octet-stream";
  const ext = detected?.ext || "";

  let resourceType = "raw";
  let baseFolder = "docs";

  if (mime.startsWith("image/")) {
    resourceType = "image";
    baseFolder = "images";
  } else if (mime.startsWith("video/") || mime.startsWith("audio/")) {
    resourceType = "video";
    baseFolder = mime.startsWith("audio/") ? "audios" : "videos";
  } else if (mime === "application/pdf") {
    resourceType = "raw";
    baseFolder = "docs";
  } else {
    resourceType = "raw";
    baseFolder = "files";
  }

  return { mime, ext, resourceType, baseFolder };
}

export function safeFolder(input = "") {
  return String(input)
    .replace(/(\.\.)+/g, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
}