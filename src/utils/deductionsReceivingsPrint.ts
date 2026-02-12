import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ExpenseItem {
  description: string;
  amount: number;
  currency: string;
  category: string;
  expense_date: string;
  staff_name?: string;
  notes: string | null;
}

interface ReceivingItem {
  amount: number;
  currency: string;
  method: string;
  is_confirmed: boolean;
  created_at: string;
  staff_id: string;
  notes: string | null;
}

export interface PrintData {
  expenses: ExpenseItem[];
  receivings: ReceivingItem[];
  dateLabel: string;
  getStaffName?: (id: string) => string;
  totals: {
    expensesNPR: number;
    expensesINR: number;
    receivedNPR: number;
    receivedINR: number;
    remainingNPR: number;
    remainingINR: number;
  };
  includeReceivings: boolean;
}

const BLACK: [number, number, number] = [0, 0, 0];
const DARK: [number, number, number] = [51, 51, 51];
const GREEN: [number, number, number] = [45, 90, 39];
const GREEN_LIGHT: [number, number, number] = [61, 122, 55];
const GRAY: [number, number, number] = [120, 120, 120];
const TABLE_HEAD_BG: [number, number, number] = [245, 245, 245];
const ALT_ROW: [number, number, number] = [250, 250, 250];

export const generateDeductionsReceivingsPDF = (data: PrintData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  let y = 0;

  // === HEADER BAR (Green) ===
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pw, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MADANI MONEY EXCHANGE', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('NPR <-> INR Currency Exchange Services', 14, 21);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions & Receivings', pw - 14, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Period: ${data.dateLabel}`, pw - 14, 19, { align: 'right' });
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pw - 14, 25, { align: 'right' });

  // Thin black line under header
  doc.setFillColor(...BLACK);
  doc.rect(0, 32, pw, 1, 'F');

  y = 42;

  // === SUMMARY SECTION ===
  const cardW = (pw - 42) / 3;
  const cardH = 26;
  const cards = [
    { title: 'TOTAL EXPENSES', npr: data.totals.expensesNPR, inr: data.totals.expensesINR },
    { title: 'TOTAL RECEIVED', npr: data.totals.receivedNPR, inr: data.totals.receivedINR },
    { title: 'REMAINING', npr: Math.abs(data.totals.remainingNPR), inr: Math.abs(data.totals.remainingINR) },
  ];

  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 7);

    // Card border
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.rect(x, y, cardW, cardH);

    // Left green accent
    doc.setFillColor(...GREEN);
    doc.rect(x, y, 2, cardH, 'F');

    // Title
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(card.title, x + 6, y + 8);

    // NPR value
    doc.setTextColor(...BLACK);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs ${card.npr.toLocaleString('en-IN')}`, x + 6, y + 16);

    // INR value
    if (card.inr > 0) {
      doc.setTextColor(...GRAY);
      doc.setFontSize(9);
      doc.text(`INR ${card.inr.toLocaleString('en-IN')}`, x + 6, y + 22);
    }
  });

  y += cardH + 12;

  // === DEDUCTIONS TABLE ===
  if (data.expenses.length > 0) {
    // Section header (green bar)
    doc.setFillColor(...GREEN);
    doc.rect(14, y, pw - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`DEDUCTIONS  (${data.expenses.length} records)`, 18, y + 5.5);

    // Category totals on right
    const catTotals = data.expenses.reduce((acc, e) => {
      if (!acc[e.category]) acc[e.category] = 0;
      acc[e.category] += e.amount;
      return acc;
    }, {} as Record<string, number>);
    const catSummary = Object.entries(catTotals).map(([k, v]) => `${k}: Rs ${v.toLocaleString('en-IN')}`).join('  |  ');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(catSummary, pw - 18, y + 5.5, { align: 'right' });

    y += 10;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Date', 'Description', 'Category', 'Amount', 'Currency', 'Staff', 'Notes']],
      body: data.expenses.map((e, i) => [
        (i + 1).toString(),
        format(new Date(e.expense_date), 'dd/MM/yy'),
        e.description,
        e.category.charAt(0).toUpperCase() + e.category.slice(1),
        e.amount.toLocaleString('en-IN'),
        e.currency,
        e.staff_name || '-',
        e.notes || '-',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: DARK },
      headStyles: {
        fillColor: TABLE_HEAD_BG,
        textColor: DARK,
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: ALT_ROW },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 18 },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 14, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        doc.setFillColor(...GREEN);
        doc.rect(0, 0, pw, 10, 'F');
        doc.setTextColor(255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('MADANI MONEY EXCHANGE -- Deductions & Receivings Report', 14, 7);
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // === RECEIVINGS TABLE ===
  if (data.includeReceivings && data.receivings.length > 0) {
    if (y > ph - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(...GREEN_LIGHT);
    doc.rect(14, y, pw - 28, 8, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`RECEIVINGS  (${data.receivings.length} records)`, 18, y + 5.5);

    const confirmedCount = data.receivings.filter(r => r.is_confirmed).length;
    const pendingCount = data.receivings.length - confirmedCount;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Confirmed: ${confirmedCount}  |  Pending: ${pendingCount}`, pw - 18, y + 5.5, { align: 'right' });

    y += 10;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Date & Time', 'Amount', 'Currency', 'Method', 'Status', 'Staff', 'Notes']],
      body: data.receivings.map((r, i) => [
        (i + 1).toString(),
        format(new Date(r.created_at), 'dd/MM/yy HH:mm'),
        Number(r.amount).toLocaleString('en-IN'),
        r.currency,
        r.method.charAt(0).toUpperCase() + r.method.slice(1),
        r.is_confirmed ? 'Confirmed' : 'Pending',
        data.getStaffName ? data.getStaffName(r.staff_id) : '-',
        r.notes || '-',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: DARK },
      headStyles: {
        fillColor: TABLE_HEAD_BG,
        textColor: DARK,
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: ALT_ROW },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 5) {
          const val = hookData.cell.raw as string;
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.textColor = val === 'Confirmed' ? GREEN : DARK;
        }
      },
    });
  }

  // === FOOTER ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.5);
    doc.line(14, ph - 14, pw - 14, ph - 14);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('This is a computer-generated document. No signature required.', 14, ph - 9);
    doc.text(`Madani Money Exchange  |  Page ${i} of ${totalPages}`, pw - 14, ph - 9, { align: 'right' });
  }

  doc.save(`deductions_receivings_${data.dateLabel.replace(/[\s,]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const printDeductionsReceivings = (data: PrintData) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Deductions & Receivings - ${data.dateLabel}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 12mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; font-size: 10px; line-height: 1.5; background: #fff; }

        .header { background: #2d5a27; color: #fff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 18px; letter-spacing: -0.3px; }
        .header .sub { font-size: 8px; opacity: 0.8; margin-top: 2px; }
        .header .meta { text-align: right; font-size: 8px; }
        .header .meta .title { font-size: 11px; font-weight: 600; }

        .accent-bar { height: 2px; background: #000; }

        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 16px; }
        .summary-card { background: #fff; border: 1px solid #ddd; padding: 12px 14px; position: relative; }
        .summary-card::before { content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 3px; background: #2d5a27; }
        .summary-card .label { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
        .summary-card .value { font-size: 16px; font-weight: 800; color: #000; }
        .summary-card .value-inr { font-size: 11px; font-weight: 700; margin-top: 2px; color: #666; }

        .section { margin: 16px 0 0; }
        .section-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: #2d5a27; color: #fff; font-size: 9px; font-weight: 700; }
        .section-header .badge { font-size: 7px; font-weight: 400; opacity: 0.85; }

        table { width: 100%; border-collapse: collapse; margin-top: 0; }
        thead th { background: #f5f5f5; padding: 6px 8px; text-align: left; font-size: 7px; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1px solid #ddd; }
        tbody td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 9px; color: #333; }
        tbody tr:nth-child(even) { background: #fafafa; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .text-muted { color: #999; }
        .badge { display: inline-block; padding: 1px 6px; font-size: 7px; font-weight: 700; }
        .badge-confirmed { background: #e8f5e9; color: #2d5a27; }
        .badge-pending { background: #f5f5f5; color: #333; }
        .category-tag { display: inline-block; padding: 1px 6px; font-size: 7px; font-weight: 600; background: #f0f0f0; color: #333; }

        .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #2d5a27; display: flex; justify-content: space-between; font-size: 7px; color: #999; }

        @media print {
          body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>MADANI MONEY EXCHANGE</h1>
          <div class="sub">NPR <-> INR Currency Exchange Services</div>
        </div>
        <div class="meta">
          <div class="title">Deductions & Receivings</div>
          <div>Period: ${data.dateLabel}</div>
          <div>Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}</div>
        </div>
      </div>
      <div class="accent-bar"></div>

      <div class="summary">
        <div class="summary-card">
          <div class="label">Total Expenses</div>
          <div class="value">Rs ${data.totals.expensesNPR.toLocaleString('en-IN')}</div>
          ${data.totals.expensesINR > 0 ? `<div class="value-inr">INR ${data.totals.expensesINR.toLocaleString('en-IN')}</div>` : ''}
        </div>
        <div class="summary-card">
          <div class="label">Total Received</div>
          <div class="value">Rs ${data.totals.receivedNPR.toLocaleString('en-IN')}</div>
          ${data.totals.receivedINR > 0 ? `<div class="value-inr">INR ${data.totals.receivedINR.toLocaleString('en-IN')}</div>` : ''}
        </div>
        <div class="summary-card">
          <div class="label">Remaining Balance</div>
          <div class="value">Rs ${Math.abs(data.totals.remainingNPR).toLocaleString('en-IN')}</div>
          ${data.totals.remainingINR !== 0 ? `<div class="value-inr">INR ${Math.abs(data.totals.remainingINR).toLocaleString('en-IN')}</div>` : ''}
        </div>
      </div>

      ${data.expenses.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <span>DEDUCTIONS (${data.expenses.length} records)</span>
            <span class="badge">NPR: Rs ${data.totals.expensesNPR.toLocaleString('en-IN')} ${data.totals.expensesINR > 0 ? `| INR: ${data.totals.expensesINR.toLocaleString('en-IN')}` : ''}</span>
          </div>
          <table>
            <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th class="text-right">Amount</th><th class="text-center">Currency</th><th>Staff</th><th>Notes</th></tr></thead>
            <tbody>
              ${data.expenses.map((e, i) => `<tr>
                <td class="text-center text-muted">${i + 1}</td>
                <td>${format(new Date(e.expense_date), 'dd/MM/yy')}</td>
                <td>${e.description}</td>
                <td><span class="category-tag">${e.category}</span></td>
                <td class="text-right font-bold">${e.amount.toLocaleString('en-IN')}</td>
                <td class="text-center">${e.currency}</td>
                <td>${e.staff_name || '-'}</td>
                <td class="text-muted">${e.notes || '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${data.includeReceivings && data.receivings.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <span>RECEIVINGS (${data.receivings.length} records)</span>
            <span class="badge">Confirmed: ${data.receivings.filter(r => r.is_confirmed).length} | Pending: ${data.receivings.filter(r => !r.is_confirmed).length}</span>
          </div>
          <table>
            <thead><tr><th>#</th><th>Date & Time</th><th class="text-right">Amount</th><th class="text-center">Currency</th><th>Method</th><th class="text-center">Status</th><th>Staff</th><th>Notes</th></tr></thead>
            <tbody>
              ${data.receivings.map((r, i) => `<tr>
                <td class="text-center text-muted">${i + 1}</td>
                <td>${format(new Date(r.created_at), 'dd/MM/yy HH:mm')}</td>
                <td class="text-right font-bold">${Number(r.amount).toLocaleString('en-IN')}</td>
                <td class="text-center">${r.currency}</td>
                <td>${r.method}</td>
                <td class="text-center"><span class="badge ${r.is_confirmed ? 'badge-confirmed' : 'badge-pending'}">${r.is_confirmed ? 'Confirmed' : 'Pending'}</span></td>
                <td>${data.getStaffName ? data.getStaffName(r.staff_id) : '-'}</td>
                <td class="text-muted">${r.notes || '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="footer">
        <span>This is a computer-generated document. No signature required.</span>
        <span>Madani Money Exchange</span>
      </div>

      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};
