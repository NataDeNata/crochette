/** Shared between the client-side PhotoAttach picker and the server-side
 * submitCustomOrder action, so client-side validation and the server's
 * authoritative check never drift apart. Kept out of any "use client" file
 * so it's a plain shared module on both sides of the RSC boundary. */
export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
