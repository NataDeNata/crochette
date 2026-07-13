import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./index";
import { products } from "./schema";
import { getSeedProducts } from "../data/products-seed";

async function main() {
  const catalog = getSeedProducts();

  await db
    .insert(products)
    .values(
      catalog.map((p) => ({
        slug: p.slug,
        name: p.name,
        priceCents: p.priceCents,
        category: p.category,
        tag: p.tag,
      }))
    )
    .onConflictDoNothing({ target: products.slug });

  console.log(`Seeded ${catalog.length} products.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
