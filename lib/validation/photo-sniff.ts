import { fileTypeFromBuffer } from "file-type";
import { ALLOWED_PHOTO_TYPES } from "@/lib/validation/photos";

/**
 * A `File`'s `.type` is whatever the browser attached from the submitted
 * filename or its own sniffing — attacker-controlled in a multipart POST, not
 * evidence of what the bytes actually are. This reads the file's magic bytes
 * instead, so an `.html` renamed to `.jpg` is rejected rather than stored
 * under the studio's own domain with a browser-guessable content type.
 *
 * Returns the sniffed MIME type and extension together — both come from the
 * same detection, so the stored key's extension can never disagree with the
 * `contentType` pinned on the Blob write.
 */
export async function sniffPhotoType(file: File): Promise<{ contentType: string; extension: string } | null> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_PHOTO_TYPES.includes(detected.mime)) return null;
  return { contentType: detected.mime, extension: detected.ext };
}
