import type { GalleryItem } from "@/lib/data/gallery";

export function GalleryTile({ item }: { item: GalleryItem }) {
  return (
    <div
      style={{
        height: "100%",
        borderRadius: 18,
        overflow: "hidden",
        background: item.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 11,
          color: "oklch(0.35 0.03 60)",
          background: "oklch(1 0 0 / 0.6)",
          padding: "5px 10px",
          borderRadius: 6,
          textAlign: "center",
        }}
      >
        {item.placeholder}
      </span>
    </div>
  );
}
