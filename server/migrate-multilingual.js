/**
 * Migration script: Convert flat string fields to multilingual {en, te} format
 * Run once: node migrate-multilingual.js
 */
const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/servex";

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  // ── Migrate Services ──
  const servicesCol = db.collection("services");
  const services = await servicesCol.find({}).toArray();
  let sCount = 0;

  for (const svc of services) {
    // Skip if already migrated (title is an object)
    if (typeof svc.title === "object" && svc.title !== null && svc.title.en) {
      continue;
    }

    const update = {};

    // Migrate title
    if (typeof svc.title === "string") {
      update.title = { en: svc.title, te: "" };
    }

    // Migrate description
    if (typeof svc.description === "string") {
      update.description = { en: svc.description, te: "" };
    } else if (!svc.description) {
      update.description = { en: "", te: "" };
    }

    if (Object.keys(update).length > 0) {
      await servicesCol.updateOne({ _id: svc._id }, { $set: update });
      sCount++;
    }
  }
  console.log(`Migrated ${sCount} services`);

  // ── Migrate Categories ──
  const categoriesCol = db.collection("categories");
  const categories = await categoriesCol.find({}).toArray();
  let cCount = 0;

  for (const cat of categories) {
    // Skip if already migrated
    if (typeof cat.name === "object" && cat.name !== null && cat.name.en) {
      continue;
    }

    if (typeof cat.name === "string") {
      await categoriesCol.updateOne(
        { _id: cat._id },
        { $set: { name: { en: cat.name, te: "" } } }
      );
      cCount++;
    }
  }
  console.log(`Migrated ${cCount} categories`);

  // ── Drop old unique index on categories if exists ──
  try {
    await categoriesCol.dropIndex("name_1_mainCategory_1");
    console.log("Dropped old category index");
  } catch (e) {
    // Index may not exist, that's fine
    console.log("Old index not found (OK)");
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
