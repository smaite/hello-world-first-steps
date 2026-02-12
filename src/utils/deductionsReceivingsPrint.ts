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

const PRIMARY: [number, number, number] = [30, 41, 59];
const ACCENT: [number, number, number] = [37, 99, 235];
const GREEN: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];
const GRAY: [number, number, number] = [107, 114, 128];
const LIGHT_BG: [number, number, number] = [248, 250, 252];

export const generateDeductionsReceivingsPDF = (data: PrintData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  let y = 0;

  // === HEADER BAR ===
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pw, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MADANI MONEY EXCHANGE', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('NPR <-> INR Currency Exchange Services', 14, 24);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions & Receivings', pw - 14, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Period: ${data.dateLabel}`, pw - 14, 21, { align: 'right' });
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pw - 14, 27, { align: 'right' });

  // === Blue accent line ===
  doc.setFillColor(...ACCENT);
  doc.rect(0, 36, pw, 1.5, 'F');

  y = 46;

  // === SUMMARY CARDS ===
  const cardW = (pw - 42) / 3;
  const cardH = 28;
  const cards = [
    {
      title: 'TOTAL EXPENSES',
      npr: data.totals.expensesNPR,
      inr: data.totals.expensesINR,
      color: RED,
      borderColor: RED,
    },
    {
      title: 'TOTAL RECEIVED',
      npr: data.totals.receivedNPR,
      inr: data.totals.receivedINR,
      color: GREEN,
      borderColor: GREEN,
    },
    {
      title: 'REMAINING',
      npr: Math.abs(data.totals.remainingNPR),
      inr: Math.abs(data.totals.remainingINR),
      color: data.totals.remainingNPR > 0 ? RED : GREEN,
      borderColor: [217, 119, 6] as [number, number, number],
    },
  ];

  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 7);

    // Card background
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

    // Left border accent
    doc.setFillColor(...card.borderColor);
    doc.rect(x, y + 2, 1.5, cardH - 4, 'F');

    // Title
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(card.title, x + 6, y + 8);

    // NPR value
    doc.setTextColor(...card.color);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs ${card.npr.toLocaleString('en-IN')}`, x + 6, y + 17);

    // INR value
    if (card.inr > 0) {
      doc.setFontSize(9);
      doc.text(`₹ ${card.inr.toLocaleString('en-IN')}`, x + 6, y + 23);
    }
  });

  y += cardH + 12;

  // === DEDUCTIONS TABLE ===
  if (data.expenses.length > 0) {
    // Section header
    doc.setFillColor(...ACCENT);
    doc.roundedRect(14, y, pw - 28, 8, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`DEDUCTIONS  (${data.expenses.length} records)`, 18, y + 5.5);

    // Category totals on right
    const catTotals = data.expenses.reduce((acc, e) => {
      const key = e.category;
      if (!acc[key]) acc[key] = 0;
      acc[key] += e.amount;
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
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [55, 65, 81] },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [55, 65, 81],
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 18 },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 14, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        // Re-draw header on new pages
        doc.setFillColor(...PRIMARY);
        doc.rect(0, 0, pw, 10, 'F');
        doc.setTextColor(255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('MADANI MONEY EXCHANGE — Deductions & Receivings Report', 14, 7);
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

    doc.setFillColor(...GREEN);
    doc.roundedRect(14, y, pw - 28, 8, 1, 1, 'F');
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
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [55, 65, 81] },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [55, 65, 81],
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
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
          if (val === 'Confirmed') {
            hookData.cell.styles.textColor = GREEN;
            hookData.cell.styles.fontStyle = 'bold';
          } else {
            hookData.cell.styles.textColor = [146, 64, 14];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
  }

  // === FOOTER on all pages ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom line
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.5);
    doc.line(14, ph - 14, pw - 14, ph - 14);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('This is a computer-generated document. No signature required.', 14, ph - 9);
    doc.text(`Madani Money Exchange © ${format(new Date(), 'yyyy')}  •  Page ${i} of ${totalPages}`, pw - 14, ph - 9, { align: 'right' });
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
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; font-size: 10px; line-height: 1.5; background: #fff; }

        .header { background: #1e2937; color: #fff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0; }
        .header h1 { font-size: 18px; letter-spacing: -0.3px; }
        .header .sub { font-size: 8px; opacity: 0.7; margin-top: 2px; }
        .header .meta { text-align: right; font-size: 8px; }
        .header .meta .title { font-size: 11px; font-weight: 600; }

        .accent-bar { height: 3px; background: linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa); }

        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: 0; }
        .summary-card { background: #fff; border-radius: 8px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); position: relative; overflow: hidden; }
        .summary-card::before { content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 3px; border-radius: 2px; }
        .summary-card.expense::before { background: #dc2626; }
        .summary-card.received::before { background: #16a34a; }
        .summary-card.remaining::before { background: #d97706; }
        .summary-card .label { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 4px; }
        .summary-card .value { font-size: 16px; font-weight: 800; }
        .summary-card .value-inr { font-size: 11px; font-weight: 700; margin-top: 2px; }
        .expense .value, .expense .value-inr { color: #dc2626; }
        .received .value, .received .value-inr { color: #16a34a; }
        .remaining .value, .remaining .value-inr { color: #d97706; }

        .section { margin: 16px 0 0; }
        .section-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; border-radius: 6px; color: #fff; font-size: 9px; font-weight: 700; }
        .section-header.deductions { background: #2563eb; }
        .section-header.receivings { background: #16a34a; }
        .section-header .badge { font-size: 7px; font-weight: 400; opacity: 0.85; }

        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        thead th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 7px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1px solid #e2e8f0; }
        tbody td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 9px; }
        tbody tr:nth-child(even) { background: #fafbfc; }
        tbody tr:hover { background: #f1f5f9; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .text-muted { color: #94a3b8; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 7px; font-weight: 700; }
        .badge-confirmed { background: #dcfce7; color: #16a34a; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .category-tag { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 7px; font-weight: 600; background: #eff6ff; color: #2563eb; }

        .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #2563eb; display: flex; justify-content: space-between; font-size: 7px; color: #94a3b8; }

        @media print {
          body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header { border-radius: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>MADANI MONEY EXCHANGE</h1>
          <div class="sub">NPR ⇄ INR Currency Exchange Services</div>
        </div>
        <div class="meta">
          <div class="title">Deductions & Receivings</div>
          <div>Period: ${data.dateLabel}</div>
          <div>Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}</div>
        </div>
      </div>
      <div class="accent-bar"></div>

      <div class="summary">
        <div class="summary-card expense">
          <div class="label">Total Expenses</div>
          <div class="value">रू ${data.totals.expensesNPR.toLocaleString('en-IN')}</div>
          ${data.totals.expensesINR > 0 ? `<div class="value-inr">₹ ${data.totals.expensesINR.toLocaleString('en-IN')}</div>` : ''}
        </div>
        <div class="summary-card received">
          <div class="label">Total Received</div>
          <div class="value">रू ${data.totals.receivedNPR.toLocaleString('en-IN')}</div>
          ${data.totals.receivedINR > 0 ? `<div class="value-inr">₹ ${data.totals.receivedINR.toLocaleString('en-IN')}</div>` : ''}
        </div>
        <div class="summary-card remaining">
          <div class="label">Remaining Balance</div>
          <div class="value">रू ${Math.abs(data.totals.remainingNPR).toLocaleString('en-IN')}</div>
          ${data.totals.remainingINR !== 0 ? `<div class="value-inr">₹ ${Math.abs(data.totals.remainingINR).toLocaleString('en-IN')}</div>` : ''}
        </div>
      </div>

      ${data.expenses.length > 0 ? `
        <div class="section">
          <div class="section-header deductions">
            <span>DEDUCTIONS (${data.expenses.length} records)</span>
            <span class="badge">NPR: रू ${data.totals.expensesNPR.toLocaleString('en-IN')} ${data.totals.expensesINR > 0 ? `| INR: ₹ ${data.totals.expensesINR.toLocaleString('en-IN')}` : ''}</span>
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
          <div class="section-header receivings">
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
        <span>Madani Money Exchange © ${format(new Date(), 'yyyy')}</span>
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
