const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require("../validators/authValidator");
const validate = require("../middleware/validateMiddleware");

router.post("/register", registerValidator, validate, controller.register);
router.post("/login", loginValidator, validate, controller.login);
router.post("/refresh-token", controller.refreshToken);
router.post("/forgot-password", forgotPasswordValidator, validate, controller.forgotPassword);
router.post("/reset-password/:token", resetPasswordValidator, validate, controller.resetPassword);
router.post("/logout", protect, controller.logout);
router.get("/me", protect, controller.getMe);
router.put("/profile", protect, controller.updateProfile);
router.put("/change-password", protect, changePasswordValidator, validate, controller.changePassword);

module.exports = router;
