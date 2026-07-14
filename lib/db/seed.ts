import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
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
        description: p.description,
        priceCents: p.priceCents,
        category: p.category,
        tag: p.tag,
      }))
    )
    .onConflictDoUpdate({
      target: products.slug,
      set: { description: sql`excluded.description`, priceCents: sql`excluded.price_cents` },
    });

  console.log(`Seeded ${catalog.length} products.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
