const PDFDocument = require("pdfkit");

exports.generateSalesReportPDF = (res, report) => {
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=sales-report.pdf"
  );

  doc.pipe(res);

  doc.fontSize(20).text("Sales Report", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Total Sales: ${report.summary.totalSales}`);
  doc.text(`Total Paid: ${report.summary.totalPaid}`);
  doc.text(`Total Balance: ${report.summary.totalBalance}`);
  doc.text(`Total Invoices: ${report.summary.totalInvoices}`);

  doc.moveDown();

  report.sales.forEach((sale, index) => {
    doc
      .fontSize(10)
      .text(
        `${index + 1}. ${sale.invoiceNumber} | ${sale.customerName} | Total: ${sale.total} | Paid: ${sale.paidAmount}`
      );
  });

  doc.end();
};