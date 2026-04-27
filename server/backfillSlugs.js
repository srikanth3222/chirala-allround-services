const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Service = require("./models/Service");

dotenv.config();

const backfillSlugs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for backfill...");

    const services = await Service.find({});
    console.log(`Found ${services.length} services to process.`);

    for (const service of services) {
      if (!service.title || !service.title.en) {
        console.log(`Skipping service ${service._id} (No English title)`);
        continue;
      }

      let baseSlug = `${service.title.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}-chirala`;
      let slug = baseSlug;
      let slugExists = await Service.findOne({ slug, _id: { $ne: service._id } });
      let counter = 1;

      while (slugExists) {
        slug = `${baseSlug}-${counter}`;
        slugExists = await Service.findOne({ slug, _id: { $ne: service._id } });
        counter++;
      }

      // Update the service
      service.slug = slug;
      await service.save();
      console.log(`Updated service: ${service.title.en} -> ${slug}`);
    }

    console.log("Backfill completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  }
};

backfillSlugs();
