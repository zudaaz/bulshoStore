const Notification = require("../models/Notification");

function stockKey(productId) {
  return `STOCK:${String(productId)}`;
}

function expiryKey(productId) {
  return `EXPIRY:${String(productId)}`;
}

async function removeByKey(owner, sourceKey) {
  await Notification.deleteOne({ owner, sourceKey });
}

exports.syncProductStockAlert = async ({ owner, product }) => {
  if (!owner || !product?._id) return null;
  const key = stockKey(product._id);
  const quantity = Number(product.quantityInStock || 0);
  const minimum = Number(product.minimumStockLevel || 0);

  if (product.isDeleted || product.status === "inactive" || quantity > minimum) {
    await removeByKey(owner, key);
    return null;
  }

  const outOfStock = quantity <= 0;
  return Notification.findOneAndUpdate(
    { owner, sourceKey: key },
    {
      $set: {
        title: outOfStock ? `Out of stock: ${product.name}` : `Low stock: ${product.name}`,
        message: outOfStock
          ? `${product.name} has no stock remaining.`
          : `${product.name} has ${quantity} ${product.unit || "units"} remaining; reorder level is ${minimum}.`,
        type: outOfStock ? "error" : "warning",
        module: "inventory",
        actionUrl: "/products",
        sourceKey: key,
        isRead: false,
        readAt: null
      },
      $setOnInsert: { owner }
    },
    { new: true, upsert: true, runValidators: true }
  );
};

exports.syncProductExpiryAlert = async ({ owner, product }) => {
  if (!owner || !product?._id) return null;
  const key = expiryKey(product._id);
  if (!product.expiryDate || product.isDeleted || product.status === "inactive") {
    await removeByKey(owner, key);
    return null;
  }

  const expiry = new Date(product.expiryDate);
  const days = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
  if (!Number.isFinite(days) || days > 30) {
    await removeByKey(owner, key);
    return null;
  }

  const expired = days < 0;
  return Notification.findOneAndUpdate(
    { owner, sourceKey: key },
    {
      $set: {
        title: expired ? `Expired product: ${product.name}` : `Product expiring soon: ${product.name}`,
        message: expired
          ? `${product.name} expired on ${expiry.toLocaleDateString("en-CA")}.`
          : `${product.name} expires in ${days} day${days === 1 ? "" : "s"} on ${expiry.toLocaleDateString("en-CA")}.`,
        type: expired ? "error" : "warning",
        module: "inventory",
        actionUrl: "/products",
        sourceKey: key,
        isRead: false,
        readAt: null
      },
      $setOnInsert: { owner }
    },
    { new: true, upsert: true, runValidators: true }
  );
};

exports.syncProductAlerts = async ({ owner, product }) => {
  await Promise.all([
    exports.syncProductStockAlert({ owner, product }),
    exports.syncProductExpiryAlert({ owner, product })
  ]);
};
