import { describe, expect, it } from "vitest";
import { sniffPhotoType } from "@/lib/validation/photo-sniff";

/** Real magic bytes, not full valid images — file-type only reads the header
 * to identify a format, and that's all the function under test looks at. */
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
// file-type's PNG detector walks real chunks looking for IDAT, so the bare
// 8-byte signature isn't enough — this is the smallest valid PNG (1x1,
// transparent) rather than a hand-rolled chunk stream.
const PNG_HEADER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const WEBP_HEADER = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP"),
]);
const PDF_HEADER = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3", "binary");

function fileFrom(bytes: Buffer, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("sniffPhotoType", () => {
  it("accepts a real JPEG regardless of its claimed type", async () => {
    const file = fileFrom(JPEG_HEADER, "photo.jpg", "image/jpeg");
    expect(await sniffPhotoType(file)).toEqual({ contentType: "image/jpeg", extension: "jpg" });
  });

  it("accepts a real PNG", async () => {
    const file = fileFrom(PNG_HEADER, "photo.png", "image/png");
    expect(await sniffPhotoType(file)).toEqual({ contentType: "image/png", extension: "png" });
  });

  it("accepts a real WebP", async () => {
    const file = fileFrom(WEBP_HEADER, "photo.webp", "image/webp");
    expect(await sniffPhotoType(file)).toEqual({ contentType: "image/webp", extension: "webp" });
  });

  it("rejects a file whose bytes don't match its claimed image type", async () => {
    // The attack this exists to stop: a browser trusts whatever Content-Type
    // the uploader's own client attached, which is exactly what `file.type` is.
    const file = fileFrom(PDF_HEADER, "photo.jpg", "image/jpeg");
    expect(await sniffPhotoType(file)).toBeNull();
  });

  it("rejects bytes that don't match any known file signature", async () => {
    const file = fileFrom(Buffer.from("just some plain text, not a file at all"), "photo.png", "image/png");
    expect(await sniffPhotoType(file)).toBeNull();
  });
});
