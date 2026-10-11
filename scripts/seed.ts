import { loadEnvLocal } from "./env";
loadEnvLocal();

import { getDb } from "../src/lib/db/client";
import { domains } from "../src/lib/db/schema";
import { SEED_DOMAINS } from "../src/config/seed-domains";

async function main() {
  const db = getDb();
  const existing = await db.select({ name: domains.name }).from(domains);
  const existingNames = new Set(existing.map((d) => d.name));

  const toInsert = SEED_DOMAINS.filter((d) => !existingNames.has(d.name));
  if (toInsert.length === 0) {
    console.log("All seed domains already present. Nothing to insert.");
    return;
  }

  const inserted = await db
    .insert(domains)
    .values(
      toInsert.map((d) => ({
        name: d.name,
        description: d.description,
        arxivCategories: d.arxivCategories,
        includeKeywords: d.includeKeywords,
        excludeKeywords: d.excludeKeywords,
        significanceNote: d.significanceNote,
        weightOverrides: d.weightOverrides ?? null,
        active: d.active,
        sortOrder: d.sortOrder,
      })),
    )
    .returning({ id: domains.id, name: domains.name });

  console.log(`Inserted ${inserted.length} domain(s):`);
  for (const d of inserted) console.log(`  - ${d.name} (${d.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
