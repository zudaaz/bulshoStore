const rolePermissions = require("../constants/roles");

/* PERMISSION ALIASES */
const aliases = {
  /* Frontend names -> Backend names */
  "Dashboard Access": "view_dashboard",

  "Manage Products": "manage_products",
  "View Products": "view_products",

  "Manage Categories": "manage_categories",
  "Manage Stock": "manage_inventory",

  "POS Access": "manage_sales",
  "Create Bills": "create_sale",

  "Manage Purchases": "manage_purchases",
  "Manage Customers": "manage_customers",
  "Manage Suppliers": "manage_suppliers",
  "Manage Expenses": "manage_expenses",

  "View Reports": "view_reports",
  "Manage Settings": "manage_settings",
  "Manage Staff": "manage_staff",

  "Cashbook Access": "manage_accounts",
  "Account Access": "manage_accounts",

  /* Backend names */
  view_dashboard: "view_dashboard",

  manage_products: "manage_products",
  view_products: "view_products",
  create_product: "create_product",
  edit_product: "edit_product",
  delete_product: "delete_product",

  manage_inventory: "manage_inventory",
  adjust_stock: "adjust_stock",
  view_low_stock: "view_low_stock",
  view_stock_report: "view_stock_report",

  manage_sales: "manage_sales",
  create_sale: "create_sale",
  view_sales: "view_sales",
  delete_sale: "delete_sale",
  print_receipt: "print_receipt",

  manage_purchases: "manage_purchases",
  create_purchase: "create_purchase",
  view_purchases: "view_purchases",
  delete_purchase: "delete_purchase",

  manage_customers: "manage_customers",
  create_customer: "create_customer",
  edit_customer: "edit_customer",
  view_customers: "view_customers",
  delete_customer: "delete_customer",

  manage_suppliers: "manage_suppliers",
  create_supplier: "create_supplier",
  edit_supplier: "edit_supplier",
  view_suppliers: "view_suppliers",
  delete_supplier: "delete_supplier",

  manage_expenses: "manage_expenses",
  create_expense: "create_expense",
  edit_expense: "edit_expense",
  view_expenses: "view_expenses",
  delete_expense: "delete_expense",

  view_reports: "view_reports",
  export_reports: "export_reports",
  manage_settings: "manage_settings",
  manage_staff: "manage_staff",
  manage_attendance: "manage_attendance",
  manage_payroll: "manage_payroll",
  manage_accounts: "manage_accounts",
  manage_categories: "manage_categories",
  view_categories: "view_categories",
  create_category: "create_category",
  edit_category: "edit_category",
  delete_category: "delete_category",
  view_audit_logs: "view_audit_logs"
};

function normalizePermission(permission) {
  return aliases[permission] || permission;
}

exports.authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      /* Only the store owner/admin bypasses granular permissions. */
      if (user.role === "admin") {
        return next();
      }

      const roleBasedPermissions = rolePermissions[user.role] || [];

      const customPermissions = Array.isArray(user.permissions)
        ? user.permissions
        : [];

      const userPermissions = [
        ...new Set([
          ...roleBasedPermissions.map(normalizePermission),
          ...customPermissions.map(normalizePermission)
        ])
      ];

      const required = requiredPermissions.map(normalizePermission);

      const allowed = required.some((permission) =>
        userPermissions.includes(permission)
      );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not have permission.",
          required
        });
      }

      next();
    } catch (error) {
      console.log("PERMISSION ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Permission middleware error"
      });
    }
  };
};