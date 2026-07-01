const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const { syncProductStockAlert } = require("./notificationService");

exports.preparePurchaseItems = async (items, ownerId) => {
  const preparedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const quantity = Number(item.quantity);
    const buyingPrice = Number(item.buyingPrice);
    if (!item.product) throw new Error("Product is required for every purchase item");
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Purchase quantity must be greater than zero");
    if (!Number.isFinite(buyingPrice) || buyingPrice < 0) throw new Error("Buying price cannot be negative");

    const product = await Product.findOne({ _id: item.product, owner: ownerId, isDeleted: false });
    if (!product) throw new Error("One or more purchase products were not found");

    const total = quantity * buyingPrice;
    preparedItems.push({
      product: product._id,
      productName: product.name,
      quantity,
      buyingPrice,
      total
    });
    subtotal += total;
  }

  return { preparedItems, subtotal };
};

exports.increaseStockFromPurchase = async (items, purchaseId, ownerId, createdBy) => {
  const applied = [];
  try {
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, owner: ownerId, isDeleted: false });
      if (!product) throw new Error(`Product not found while increasing stock: ${item.product}`);

      const previousStock = Number(product.quantityInStock || 0);
      const newStock = previousStock + Number(item.quantity);
      const previousBuyingPrice = Number(product.buyingPrice || 0);
      product.quantityInStock = newStock;
      product.buyingPrice = Number(item.buyingPrice);
      await product.save();

      const movement = await StockMovement.create({
        owner: ownerId,
        product: product._id,
        type: "PURCHASE",
        quantity: Number(item.quantity),
        previousStock,
        newStock,
        reason: "Purchase stock added",
        reference: String(purchaseId),
        createdBy
      });
      await syncProductStockAlert({ owner: ownerId, product }).catch(() => undefined);
      applied.push({ product, previousStock, previousBuyingPrice, movementId: movement._id });
    }
  } catch (error) {
    for (const item of applied.reverse()) {
      await Product.updateOne(
        { _id: item.product._id, owner: ownerId },
        { $set: { quantityInStock: item.previousStock, buyingPrice: item.previousBuyingPrice } }
      ).catch(() => {});
      await StockMovement.deleteOne({ _id: item.movementId }).catch(() => {});
    }
    throw error;
  }

  return applied.map((item) => ({
    productId: item.product._id,
    previousStock: item.previousStock,
    previousBuyingPrice: item.previousBuyingPrice,
    movementId: item.movementId
  }));
};

exports.rollbackPurchaseIncrease = async (applied, ownerId) => {
  for (const item of [...applied].reverse()) {
    await Product.updateOne(
      { _id: item.productId, owner: ownerId },
      { $set: { quantityInStock: item.previousStock, buyingPrice: item.previousBuyingPrice } }
    ).catch(() => undefined);
    await StockMovement.deleteOne({ _id: item.movementId, owner: ownerId }).catch(() => undefined);
  }
};

exports.reversePurchaseStock = async (items, purchaseId, ownerId, createdBy, reason = "Purchase returned") => {
  const products = [];
  for (const item of items) {
    const product = await Product.findOne({ _id: item.product, owner: ownerId, isDeleted: false });
    if (!product) throw new Error(`Cannot return purchase because product no longer exists: ${item.productName}`);
    if (Number(product.quantityInStock || 0) < Number(item.quantity)) {
      throw new Error(`Cannot return ${item.productName}; current stock is lower than purchased quantity`);
    }
    products.push({ product, item });
  }

  const applied = [];
  try {
    for (const { product, item } of products) {
      const previousStock = Number(product.quantityInStock || 0);
      const newStock = previousStock - Number(item.quantity);
      product.quantityInStock = newStock;
      await product.save();

      const movement = await StockMovement.create({
        owner: ownerId,
        product: product._id,
        type: "PURCHASE_RETURN",
        quantity: Number(item.quantity),
        previousStock,
        newStock,
        reason,
        reference: String(purchaseId),
        createdBy
      });
      await syncProductStockAlert({ owner: ownerId, product }).catch(() => undefined);
      applied.push({ product, previousStock, movementId: movement._id });
    }
  } catch (error) {
    for (const item of applied.reverse()) {
      await Product.updateOne({ _id: item.product._id, owner: ownerId }, { $set: { quantityInStock: item.previousStock } }).catch(() => {});
      await StockMovement.deleteOne({ _id: item.movementId }).catch(() => {});
    }
    throw error;
  }

  return applied.map((entry) => ({
    productId: entry.product._id,
    previousStock: entry.previousStock,
    movementId: entry.movementId
  }));
};

exports.rollbackPurchaseReturn = async (applied, ownerId) => {
  for (const item of [...applied].reverse()) {
    await Product.updateOne(
      { _id: item.productId, owner: ownerId },
      { $set: { quantityInStock: item.previousStock } }
    ).catch(() => undefined);
    await StockMovement.deleteOne({ _id: item.movementId, owner: ownerId }).catch(() => undefined);
  }
};
