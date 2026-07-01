module.exports = {
  admin: [
    "view_dashboard", "manage_users", "view_users", "create_user", "edit_user", "delete_user",
    "manage_products", "view_products", "create_product", "edit_product", "delete_product",
    "manage_categories", "view_categories", "create_category", "edit_category", "delete_category",
    "manage_inventory", "adjust_stock", "view_low_stock", "view_stock_report",
    "manage_sales", "create_sale", "view_sales", "delete_sale", "print_receipt",
    "manage_purchases", "create_purchase", "view_purchases", "delete_purchase",
    "manage_customers", "create_customer", "edit_customer", "view_customers", "delete_customer",
    "manage_suppliers", "create_supplier", "edit_supplier", "view_suppliers", "delete_supplier",
    "manage_expenses", "create_expense", "edit_expense", "view_expenses", "delete_expense",
    "view_reports", "export_reports", "manage_settings", "view_audit_logs",
    "manage_staff", "manage_attendance", "manage_payroll", "manage_accounts"
  ],
  manager: [
    "view_dashboard",
    "manage_products", "view_products", "create_product", "edit_product",
    "manage_categories", "view_categories", "create_category", "edit_category",
    "manage_inventory", "adjust_stock", "view_low_stock", "view_stock_report",
    "manage_sales", "create_sale", "view_sales", "print_receipt",
    "manage_purchases", "create_purchase", "view_purchases",
    "manage_customers", "create_customer", "edit_customer", "view_customers",
    "manage_suppliers", "create_supplier", "edit_supplier", "view_suppliers",
    "manage_expenses", "create_expense", "edit_expense", "view_expenses",
    "view_reports", "export_reports", "manage_staff", "manage_attendance",
    "manage_payroll", "manage_accounts"
  ],
  cashier: [
    "view_dashboard", "manage_sales", "view_sales", "create_sale", "print_receipt",
    "view_products", "manage_customers", "view_customers", "create_customer"
  ],
  accountant: [
    "view_dashboard", "view_reports", "export_reports", "manage_expenses",
    "view_expenses", "create_expense", "edit_expense", "manage_accounts", "manage_payroll"
  ],
  store_keeper: [
    "view_dashboard", "view_products", "manage_categories", "view_categories",
    "create_category", "manage_inventory", "adjust_stock", "view_low_stock",
    "view_stock_report", "manage_purchases", "view_purchases", "create_purchase"
  ],
  sales_officer: [
    "view_dashboard", "manage_sales", "view_sales", "create_sale", "print_receipt",
    "manage_customers", "view_customers", "create_customer", "view_products", "view_reports"
  ],
  inventory_officer: [
    "view_dashboard", "manage_products", "view_products", "create_product", "edit_product",
    "manage_categories", "view_categories", "create_category", "edit_category",
    "manage_inventory", "adjust_stock", "view_low_stock", "view_stock_report"
  ],
  staff: ["view_dashboard"]
};
