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
const GRAY: [number, number, number] = [120, 120, 120];
const WHITE: [number, number, number] = [255, 255, 255];
const TABLE_HEAD_BG: [number, number, number] = [240, 240, 240];
const ALT_ROW: [number, number, number] = [248, 248, 248];

export const generateDeductionsReceivingsPDF = (data: PrintData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  let y = 0;

  // === HEADER (no fill, just text) ===
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.line(14, 8, pw - 14, 8);

  doc.setTextColor(...BLACK);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MADANI MONEY EXCHANGE', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('NPR <-> INR Currency Exchange Services', 14, 24);

  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions & Receivings', pw - 14, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`Period: ${data.dateLabel}`, pw - 14, 20, { align: 'right' });
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pw - 14, 25, { align: 'right' });

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.line(14, 28, pw - 14, 28);

  y = 38;

  // === SUMMARY CARDS (bordered, no fill) ===
  const cardW = (pw - 42) / 3;
  const cardH = 24;
  const cards = [
    { title: 'TOTAL DEDUCTIONS', npr: data.totals.expensesNPR, inr: data.totals.expensesINR },
    { title: 'TOTAL RECEIVED', npr: data.totals.receivedNPR, inr: data.totals.receivedINR },
    { title: 'REMAINING', npr: Math.abs(data.totals.remainingNPR), inr: Math.abs(data.totals.remainingINR) },
  ];

  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 7);

    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.rect(x, y, cardW, cardH);

    // Title
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(card.title, x + 4, y + 7);

    // NPR value
    doc.setTextColor(...BLACK);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs ${card.npr.toLocaleString('en-IN')}`, x + 4, y + 16);

    // INR value
    if (card.inr > 0) {
      doc.setTextColor(...GRAY);
      doc.setFontSize(9);
      doc.text(`INR ${card.inr.toLocaleString('en-IN')}`, x + 4, y + 21);
    }
  });

  y += cardH + 10;

  // === DEDUCTIONS TABLE ===
  if (data.expenses.length > 0) {
    // Section header (text only with underline)
    doc.setTextColor(...BLACK);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Deductions (${data.expenses.length} records)`, 14, y + 5);

    // Category totals on right
    const catTotals = data.expenses.reduce((acc, e) => {
      if (!acc[e.category]) acc[e.category] = 0;
      acc[e.category] += e.amount;
      return acc;
    }, {} as Record<string, number>);
    const catSummary = Object.entries(catTotals).map(([k, v]) => `${k}: Rs ${v.toLocaleString('en-IN')}`).join('  |  ');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(catSummary, pw - 14, y + 5, { align: 'right' });

    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.line(14, y + 7, pw - 14, y + 7);

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
        textColor: BLACK,
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
        doc.setTextColor(...BLACK);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('MADANI MONEY EXCHANGE -- Deductions & Receivings Report', 14, 7);
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.3);
        doc.line(14, 9, pw - 14, 9);
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

    doc.setTextColor(...BLACK);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receivings (${data.receivings.length} records)`, 14, y + 5);

    const confirmedCount = data.receivings.filter(r => r.is_confirmed).length;
    const pendingCount = data.receivings.length - confirmedCount;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`Confirmed: ${confirmedCount}  |  Pending: ${pendingCount}`, pw - 14, y + 5, { align: 'right' });

    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.line(14, y + 7, pw - 14, y + 7);

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
        textColor: BLACK,
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
    });
  }

  // === FOOTER ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
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

        .header { padding: 12px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: flex-end; }
        .header h1 { font-size: 18px; color: #000; }
        .header .sub { font-size: 8px; color: #888; margin-top: 2px; }
        .header .meta { text-align: right; font-size: 8px; color: #888; }
        .header .meta .title { font-size: 11px; font-weight: 600; color: #000; }

        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 16px 0; }
        .summary-card { border: 1px solid #333; padding: 10px 12px; }
        .summary-card .label { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
        .summary-card .value { font-size: 16px; font-weight: 800; color: #000; }
        .summary-card .value-inr { font-size: 11px; font-weight: 700; margin-top: 2px; color: #666; }

        .section { margin: 12px 0 0; }
        .section-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 4px; border-bottom: 1px solid #333; margin-bottom: 4px; }
        .section-header .title { font-size: 11px; font-weight: 700; color: #000; }
        .section-header .badge { font-size: 7px; color: #888; }

        table { width: 100%; border-collapse: collapse; margin-top: 0; }
        thead th { background: #f0f0f0; padding: 6px 8px; text-align: left; font-size: 7px; font-weight: 700; color: #333; text-transform: uppercase; border-bottom: 1px solid #ccc; }
        tbody td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 9px; color: #333; }
        tbody tr:nth-child(even) { background: #f8f8f8; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .text-muted { color: #999; }

        .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #333; display: flex; justify-content: space-between; font-size: 7px; color: #999; }

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

      <div class="summary">
        <div class="summary-card">
          <div class="label">Total Deductions</div>
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
            <span class="title">Deductions (${data.expenses.length} records)</span>
            <span class="badge">NPR: Rs ${data.totals.expensesNPR.toLocaleString('en-IN')} ${data.totals.expensesINR > 0 ? `| INR: ${data.totals.expensesINR.toLocaleString('en-IN')}` : ''}</span>
          </div>
          <table>
            <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th class="text-right">Amount</th><th class="text-center">Currency</th><th>Staff</th><th>Notes</th></tr></thead>
            <tbody>
              ${data.expenses.map((e, i) => `<tr>
                <td class="text-center text-muted">${i + 1}</td>
                <td>${format(new Date(e.expense_date), 'dd/MM/yy')}</td>
                <td>${e.description}</td>
                <td>${e.category}</td>
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
            <span class="title">Receivings (${data.receivings.length} records)</span>
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
                <td class="text-center">${r.is_confirmed ? 'Confirmed' : 'Pending'}</td>
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
