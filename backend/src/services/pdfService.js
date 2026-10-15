const path = require("path");
const PdfPrinter = require("pdfmake/js/Printer").default;

const fonts = {
  Roboto: {
    normal: path.join(__dirname, "../../node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "../../node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "../../node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
    bolditalics: path.join(
      __dirname,
      "../../node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf"
    ),
  },
};

const urlResolver = {
  resolve: () => {},
  resolved: () => Promise.resolve(),
};

const printer = new PdfPrinter(fonts, null, urlResolver);

function currency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function generatePayslipPDF(payslipData) {
  const {
    full_name,
    employee_code,
    department_name,
    position,
    pay_period_start,
    pay_period_end,
    generated_at,
    base_salary,
    overtime_pay,
    bonus,
    tax_deducted,
    other_deductions,
    net_pay,
  } = payslipData;

  const docDefinition = {
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: "Roboto", color: "#0F172A" },
    content: [
      {
        text: "SENTINEL PAY ROLL",
        fontSize: 22,
        bold: true,
        color: "#0F172A",
        margin: [0, 0, 0, 4],
      },
      {
        text: "Reliable payroll intelligence for modern teams",
        fontSize: 10,
        color: "#3B82F6",
        margin: [0, 0, 0, 20],
      },
      {
        style: "sectionHeader",
        text: "Employee Details",
      },
      {
        table: {
          widths: ["30%", "70%"],
          body: [
            ["Name", full_name || "-"],
            ["Employee Code", employee_code || "-"],
            ["Department", department_name || "-"],
            ["Position", position || "-"],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
      },
      {
        columns: [
          { text: `Pay Period: ${pay_period_start} to ${pay_period_end}`, fontSize: 10 },
          { text: `Pay Date: ${String(generated_at || "").slice(0, 10)}`, fontSize: 10 },
        ],
        margin: [0, 0, 0, 12],
      },
      {
        style: "sectionHeader",
        text: "Earnings",
      },
      {
        table: {
          widths: ["70%", "30%"],
          body: [
            ["Base Salary", currency(base_salary)],
            ["Overtime Pay", currency(overtime_pay)],
            ["Bonus", currency(bonus)],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
      },
      {
        style: "sectionHeader",
        text: "Deductions",
      },
      {
        table: {
          widths: ["70%", "30%"],
          body: [
            ["Tax", currency(tax_deducted)],
            ["Other Deductions", currency(other_deductions)],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 16],
      },
      {
        text: `Net Pay: ${currency(net_pay)}`,
        fontSize: 20,
        bold: true,
        color: "#3B82F6",
        margin: [0, 0, 0, 24],
      },
      {
        text: "This is a computer-generated payslip",
        fontSize: 9,
        italics: true,
        color: "#64748B",
      },
    ],
    styles: {
      sectionHeader: {
        bold: true,
        color: "#0F172A",
        fontSize: 12,
        margin: [0, 0, 0, 6],
      },
    },
  };

  const pdfDoc = await printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

module.exports = { generatePayslipPDF };
