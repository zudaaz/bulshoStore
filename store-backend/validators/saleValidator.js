const { body } = require("express-validator");

exports.createSaleValidator = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Sale must contain at least one item"),

  body("items.*.product")
    .notEmpty()
    .withMessage("Product is required"),

  body("items.*.quantity")
    .isFloat({ min: 1 })
    .withMessage("Quantity must be greater than zero"),

  body("discount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount must be a valid number"),

  body("tax")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tax must be a valid number"),

  body("paidAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Paid amount must be valid"),

  body("paymentMethod")
    .optional()
    .isIn([
      "cash",
      "mobile_money",
      "bank",
      "credit"
    ])
    .withMessage("Invalid payment method")
];