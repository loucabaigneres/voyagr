import "dotenv/config";
import { createClient } from "./index.js";
import { importedInspiration } from "./schema.js";

const db = createClient(process.env.DATABASE_URL!);

async function seed() {
  console.log("🌱 Début du seeding...");

  await db.insert(importedInspiration).values([
    {
      userId: "user1",
      platform: "tiktok",
      originalUrl: "https://www.tiktok.com/@user1/video/1234567890",
      extracted_location: "Paris, France",
      extracted_tags: ["travel", "paris", "europe"],
      status: "pending",
      createdAt: new Date(),
    },
    {
      userId: "user2",
      platform: "instagram",
      originalUrl: "https://www.instagram.com/p/ABCDEFGHIJ/",
      extracted_location: "New York, USA",
      extracted_tags: ["travel", "newyork", "usa"],
      status: "pending",
      createdAt: new Date(),
    },
  ]);

  console.log("✅ Seeding terminé !");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erreur pendant le seeding:", err);
  process.exit(1);
});
