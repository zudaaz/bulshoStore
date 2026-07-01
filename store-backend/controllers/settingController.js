const Setting = require("../models/Setting");

function getOwnerId(req) {
  return req.storeOwner || req.user.owner || req.user._id;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === "true";
}

/* GET SETTINGS */
exports.getSettings = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);

    let settings = await Setting.findOne({
      owner: ownerId
    });

    if (!settings) {
      settings = await Setting.create({
        owner: ownerId
      });
    }

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.log("GET SETTINGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load settings",
      error: error.message
    });
  }
};

/* UPDATE SETTINGS */
exports.updateSettings = async (req, res) => {
  try {
    const ownerId = getOwnerId(req);

    let settings = await Setting.findOne({
      owner: ownerId
    });

    if (!settings) {
      settings = await Setting.create({
        owner: ownerId
      });
    }

    const updateData = {
      storeName: req.body.storeName ?? settings.storeName,

      storeEmail:
        req.body.storeEmail ??
        req.body.email ??
        settings.storeEmail,

      storePhone:
        req.body.storePhone ??
        req.body.phone ??
        settings.storePhone,

      storeAddress:
        req.body.storeAddress ??
        req.body.address ??
        settings.storeAddress,

      currency: req.body.currency ?? settings.currency,

      taxRate: Number(
        req.body.taxRate ?? settings.taxRate ?? 0
      ),

      language: req.body.language ?? settings.language,

      darkMode: toBool(
        req.body.darkMode,
        settings.darkMode
      ),

      maintenanceMode: toBool(
        req.body.maintenanceMode,
        settings.maintenanceMode
      ),

      receiptFooter:
        req.body.receiptFooter ??
        settings.receiptFooter,

      backupEnabled: toBool(
        req.body.backupEnabled,
        settings.backupEnabled
      )
    };

    if (req.file) {
      updateData.storeLogo = "/uploads/" + req.file.filename;
    } else if (req.body.storeLogo || req.body.logo) {
      updateData.storeLogo =
        req.body.storeLogo || req.body.logo;
    }

    settings = await Setting.findOneAndUpdate(
      { owner: ownerId },
      updateData,
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: settings
    });
  } catch (error) {
    console.log("UPDATE SETTINGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update settings",
      error: error.message
    });
  }
};