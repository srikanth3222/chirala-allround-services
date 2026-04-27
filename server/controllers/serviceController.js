const Service = require("../models/Service");
const User = require("../models/User");
const { generateKeywords } = require("../utils/autoKeywordGenerator");

// Helper: parse FormData fields (multer sends strings, need to parse JSON fields)
const parseField = (val) => {
  if (!val) return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
};

// Create Service
exports.createService = async (req, res) => {
  try {
    let { title, description, price, category, images, videos, details, faq, isFeatured, manualKeywords, seoTitle, seoDescription } = req.body;

    // Parse JSON strings from FormData
    title = parseField(title);
    description = parseField(description);
    details = parseField(details);
    faq = parseField(faq);
    images = parseField(images);
    videos = parseField(videos);
    seoTitle = parseField(seoTitle);
    seoDescription = parseField(seoDescription);
    
    isFeatured = isFeatured === 'true' || isFeatured === true;
    
    let parsedManualKeywords = [];
    if (manualKeywords) {
      if (typeof manualKeywords === 'string') {
        parsedManualKeywords = manualKeywords.split(',').map(k => k.trim()).filter(Boolean);
      } else if (Array.isArray(manualKeywords)) {
        parsedManualKeywords = manualKeywords;
      }
    }

    // Support both multilingual object and legacy flat string
    const titleObj = typeof title === "object" ? title : { en: title, te: "" };
    const descObj = typeof description === "object" ? description : { en: description || "", te: "" };
    const detailsObj = details
      ? (typeof details === "object" ? details : { en: details, te: "" })
      : { en: "", te: "" };
    
    const seoTitleObj = seoTitle ? (typeof seoTitle === "object" ? seoTitle : { en: seoTitle, te: "" }) : { en: "", te: "" };
    const seoDescObj = seoDescription ? (typeof seoDescription === "object" ? seoDescription : { en: seoDescription, te: "" }) : { en: "", te: "" };

    if (!titleObj.en || !price || !category) {
      return res.status(400).json({
        message: "Title (English), price and category are required",
      });
    }

    // Prevent duplicates (check English title)
    const existingService = await Service.findOne({
      "title.en": titleObj.en,
      category,
    });

    if (existingService) {
      return res.status(400).json({
        message: "Service already exists in this category",
      });
    }

    // find active provider in this category
    const provider = await User.findOne({
      role: "provider",
      category,
      status: "active",
    });

    // Handle uploaded file
    let backgroundImage = "";
    if (req.file) {
      backgroundImage = `/uploads/${req.file.filename}`;
    }

    // Auto-generate keywords
    const autoKeywords = generateKeywords({ 
      title: titleObj.en, 
      description: descObj.en, 
      category 
    });

    const finalKeywords = Array.from(new Set([...autoKeywords, ...parsedManualKeywords]));

    // Generate Slug with SEO friendly suffix
    let baseSlug = `${titleObj.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}-chirala`;
    let slug = baseSlug;
    let slugExists = await Service.findOne({ slug });
    let counter = 1;
    while (slugExists) {
      slug = `${baseSlug}-${counter}`;
      slugExists = await Service.findOne({ slug });
      counter++;
    }

    const service = await Service.create({
      title: titleObj,
      description: descObj,
      price,
      category,
      provider: provider ? provider._id : req.user._id,
      backgroundImage,
      images: Array.isArray(images) ? images : [],
      videos: Array.isArray(videos) ? videos : [],
      details: detailsObj,
      faq: Array.isArray(faq) ? faq : [],
      isFeatured,
      keywords: finalKeywords,
      seoTitle: seoTitleObj,
      seoDescription: seoDescObj,
      slug,
    });

    res.status(201).json({
      message: "Service created successfully",
      service,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get All Services with Search & Filter
exports.getAllServices = async (req, res) => {
  try {
    const { keyword, minPrice, maxPrice } = req.query;

    let query = {};

    // keyword search (both en and te title/description)
    if (keyword) {
      query.$or = [
        { "title.en": { $regex: keyword, $options: "i" } },
        { "title.te": { $regex: keyword, $options: "i" } },
        { "description.en": { $regex: keyword, $options: "i" } },
        { "description.te": { $regex: keyword, $options: "i" } },
      ];
    }

    // price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const services = await Service.find(query)
      .populate("provider", "name mobile role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: services.length,
      services,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};


// Get Single Service
exports.getSingleService = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };
    
    const service = await Service.findOne(query)
      .populate("provider", "name mobile role");

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    res.status(200).json(service);

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Update Service (Admin)
exports.updateService = async (req, res) => {
  try {
    let { title, description, price, category, images, videos, details, faq, isFeatured, manualKeywords, seoTitle, seoDescription } = req.body;

    // Parse JSON strings from FormData
    title = parseField(title);
    description = parseField(description);
    details = parseField(details);
    faq = parseField(faq);
    images = parseField(images);
    videos = parseField(videos);
    seoTitle = parseField(seoTitle);
    seoDescription = parseField(seoDescription);
    
    if (isFeatured !== undefined) {
      isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    let parsedManualKeywords = null;
    if (manualKeywords !== undefined) {
      if (typeof manualKeywords === 'string') {
        parsedManualKeywords = manualKeywords.split(',').map(k => k.trim()).filter(Boolean);
      } else if (Array.isArray(manualKeywords)) {
        parsedManualKeywords = manualKeywords;
      }
    }

    let service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    const titleObj = title
      ? (typeof title === "object" ? title : { en: title, te: "" })
      : service.title;
    const descObj = description !== undefined
      ? (typeof description === "object" ? description : { en: description || "", te: "" })
      : service.description;
    const detailsObj = details !== undefined
      ? (typeof details === "object" ? details : { en: details || "", te: "" })
      : service.details;
      
    const seoTitleObj = seoTitle !== undefined
      ? (typeof seoTitle === "object" ? seoTitle : { en: seoTitle || "", te: "" })
      : service.seoTitle;
    const seoDescObj = seoDescription !== undefined
      ? (typeof seoDescription === "object" ? seoDescription : { en: seoDescription || "", te: "" })
      : service.seoDescription;

    // Prevent duplicate update
    if (titleObj.en && category) {
      const existingService = await Service.findOne({
        "title.en": titleObj.en,
        category,
        _id: { $ne: req.params.id },
      });

      if (existingService) {
        return res.status(400).json({
          message: "Another service with same title and category exists",
        });
      }
    }
    // Check if title changed for slug regeneration BEFORE updating the model
    const titleChanged = titleObj.en !== service.title.en;

    service.title = titleObj;
    service.description = descObj;
    service.price = price || service.price;
    service.category = category || service.category;
    service.details = detailsObj;
    if (Array.isArray(images)) service.images = images;
    if (Array.isArray(videos)) service.videos = videos;
    if (Array.isArray(faq)) service.faq = faq;
    if (isFeatured !== undefined) service.isFeatured = isFeatured;
    if (seoTitle !== undefined) service.seoTitle = seoTitleObj;
    if (seoDescription !== undefined) service.seoDescription = seoDescObj;

    // Recalculate keywords if title, desc, category, or manualKeywords changed
    const autoKeywords = generateKeywords({ 
      title: service.title.en, 
      description: service.description.en, 
      category: service.category 
    });

    if (parsedManualKeywords !== null) {
      service.keywords = Array.from(new Set([...autoKeywords, ...parsedManualKeywords]));
    } else {
      // Keep existing manual keywords (they are anything in keywords that wasn't auto generated, or we can just union)
      // Actually, since we don't store manualKeywords separately, we just merge auto with existing keywords.
      service.keywords = Array.from(new Set([...autoKeywords, ...service.keywords]));
    }

    // Generate or update slug if not present or title changed
    if (!service.slug || titleChanged || !service.slug.endsWith('-chirala')) {
      let baseSlug = `${titleObj.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}-chirala`;
      let slug = baseSlug;
      let slugExists = await Service.findOne({ slug, _id: { $ne: service._id } });
      let counter = 1;
      while (slugExists) {
        slug = `${baseSlug}-${counter}`;
        slugExists = await Service.findOne({ slug, _id: { $ne: service._id } });
        counter++;
      }
      service.slug = slug;
    }

    // Handle uploaded file
    if (req.file) {
      service.backgroundImage = `/uploads/${req.file.filename}`;
    }

    await service.save();

    res.status(200).json({
      message: "Service updated successfully",
      service,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Delete Service (Admin)
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    await service.deleteOne();

    res.status(200).json({
      message: "Service deleted successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};