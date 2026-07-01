const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const { syncProductStockAlert } = require("./notificationService");

function asPositiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be greater than zero`);
  }
  return number;
}

exports.prepareSaleItems = async (items, ownerId) => {
  let subtotal = 0;
  let totalProfit = 0;
  const preparedItems = [];

  for (const item of items) {
    const product = await Product.findOne({
      _id: item.product,
      owner: ownerId,
      isDeleted: false,
      status: "active"
    }).lean();

    if (!product) {
      throw new Error("Product not found or inactive");
    }

    const quantity = asPositiveNumber(item.quantity, "Quantity");
    const availableStock = Number(product.quantityInStock || 0);

    if (availableStock < quantity) {
      throw new Error(`Not enough stock for ${product.name}`);
    }

    const sellingPrice = Number(product.sellingPrice || 0);
    const buyingPrice = Number(product.buyingPrice || 0);
    const lineTotal = sellingPrice * quantity;
    const lineProfit = (sellingPrice - buyingPrice) * quantity;

    preparedItems.push({
      product: product._id,
      productName: product.name,
      sku: product.sku || product.barcode || "",
      quantity,
      buyingPrice,
      sellingPrice,
      total: lineTotal,
      profit: lineProfit
    });

    subtotal += lineTotal;
    totalProfit += lineProfit;
  }

  return { preparedItems, subtotal, totalProfit };
};

exports.reduceStockAfterSale = async (items, saleId, ownerId, createdBy) => {
  const processed = [];

  try {
    for (const item of items) {
      const quantity = asPositiveNumber(item.quantity, "Quantity");

      // The stock guard is part of the update, preventing concurrent sales from
      // taking the product below zero.
      const product = await Product.findOneAndUpdate(
        {
          _id: item.product,
          owner: ownerId,
          isDeleted: false,
          status: "active",
          quantityInStock: { $gte: quantity }
        },
        { $inc: { quantityInStock: -quantity } },
        { new: false }
      );

      if (!product) {
        throw new Error(`Not enough stock for ${item.productName || "product"}`);
      }

      const oldStock = Number(product.quantityInStock || 0);
      const newStock = oldStock - quantity;
      processed.push({ productId: product._id, quantity });

      await StockMovement.create({
        owner: ownerId,
        product: product._id,
        type: "SALE",
        quantity,
        previousStock: oldStock,
        newStock,
        reason: "Product sold",
        reference: String(saleId),
        createdBy
      });
      await syncProductStockAlert({
        owner: ownerId,
        product: { ...product.toObject(), quantityInStock: newStock }
      }).catch(() => undefined);
    }
  } catch (error) {
    // Compensating rollback for deployments that do not run database transaction coordinator
    // transactions. This keeps stock consistent if a later line fails.
    await Promise.allSettled(
      processed.map(({ productId, quantity }) =>
        Product.updateOne(
          { _id: productId, owner: ownerId },
          { $inc: { quantityInStock: quantity } }
        )
      )
    );

    await StockMovement.deleteMany({
      owner: ownerId,
      reference: String(saleId),
      type: "SALE"
    });

    throw error;
  }
};

exports.restoreStockFromSale = async (
  items,
  saleId,
  ownerId,
  createdBy,
  reason = "Sale void/return"
) => {
  const processed = [];

  try {
    for (const item of items) {
      const quantity = asPositiveNumber(item.quantity, "Quantity");
      const product = await Product.findOneAndUpdate(
        {
          _id: item.product,
          owner: ownerId
        },
        { $inc: { quantityInStock: quantity } },
        { new: false }
      );

      if (!product) {
        throw new Error(`Product ${item.productName || item.product} was not found`);
      }

      const oldStock = Number(product.quantityInStock || 0);
      const newStock = oldStock + quantity;
      processed.push({ productId: product._id, quantity });

      await StockMovement.create({
        owner: ownerId,
        product: product._id,
        type: "RETURN",
        quantity,
        previousStock: oldStock,
        newStock,
        reason,
        reference: String(saleId),
        createdBy
      });
      await syncProductStockAlert({
        owner: ownerId,
        product: { ...product.toObject(), quantityInStock: newStock }
      }).catch(() => undefined);
    }
  } catch (error) {
    await Promise.allSettled(
      processed.map(({ productId, quantity }) =>
        Product.updateOne(
          { _id: productId, owner: ownerId, quantityInStock: { $gte: quantity } },
          { $inc: { quantityInStock: -quantity } }
        )
      )
    );

    await StockMovement.deleteMany({
      owner: ownerId,
      reference: String(saleId),
      type: "RETURN",
      reason
    });

    throw error;
  }
};
