"use client";

import { deleteProduct } from "@/app/admin/products/actions";

export function DeleteProductButton({ id, slug, name }: { id: string; slug: string; name: string }) {
  return (
    <form
      action={deleteProduct.bind(null, id, slug)}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${name}"? This can't be undone.`)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        style={{
          border: "none",
          background: "none",
          color: "oklch(0.5 0.18 25)",
          fontSize: 13.5,
          cursor: "pointer",
          fontFamily: "inherit",
          padding: 0,
        }}
      >
        Delete
      </button>
    </form>
  );
}
