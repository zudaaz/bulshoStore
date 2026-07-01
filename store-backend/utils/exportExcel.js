const ExcelJS = require("exceljs");

exports.exportSalesReportExcel = async (res, report) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sales Report");

  sheet.columns = [
    { header: "Invoice", key: "invoice", width: 20 },
    { header: "Customer", key: "customer", width: 25 },
    { header: "Total", key: "total", width: 15 },
    { header: "Paid", key: "paid", width: 15 },
    { header: "Balance", key: "balance", width: 15 },
    { header: "Payment Method", key: "paymentMethod", width: 20 },
    { header: "Date", key: "date", width: 25 }
  ];

  report.sales.forEach((sale) => {
    sheet.addRow({
      invoice: sale.invoiceNumber,
      customer: sale.customerName,
      total: sale.total,
      paid: sale.paidAmount,
      balance: sale.balance,
      paymentMethod: sale.paymentMethod,
      date: sale.createdAt
    });
  });

  sheet.addRow({});
  sheet.addRow({ invoice: "Total Sales", total: report.summary.totalSales });
  sheet.addRow({ invoice: "Total Paid", total: report.summary.totalPaid });
  sheet.addRow({ invoice: "Total Balance", total: report.summary.totalBalance });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=sales-report.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
};