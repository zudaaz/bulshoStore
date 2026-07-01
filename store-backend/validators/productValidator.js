const { body } = require("express-validator");

exports.createProductValidator = [
  body("name").notEmpty().withMessage("Product name is required"),
  body("category").notEmpty().withMessage("Category is required"),
  // body("sku").notEmpty().withMessage("SKU is required"),

  body("buyingPrice")
    .isFloat({ min: 0 })
    .withMessage("Buying price must be valid"),

  body("sellingPrice")
    .isFloat({ min: 0 })
    .withMessage("Selling price must be valid"),

  body("quantityInStock")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Stock cannot be negative")
];

exports.stockAdjustmentValidator = [
  body("adjustmentType")
    .isIn(["increase", "decrease"])
    .withMessage("Invalid adjustment type"),

  body("quantity")
    .isFloat({ min: 1 })
    .withMessage("Quantity must be greater than zero"),

  body("reason")
    .notEmpty()
    .withMessage("Reason is required")
];