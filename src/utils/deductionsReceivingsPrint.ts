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

interface PrintData {
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
}

export const generateDeductionsReceivingsPDF = (data: PrintData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MADANI MONEY EXCHANGE', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Deductions & Receivings Report', pageWidth / 2, 27, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Period: ${data.dateLabel} | Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth / 2, 33, { align: 'center' });

  // Summary
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(14, 38, pageWidth - 14, 38);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, 45);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const summaryY = 52;
  const col1 = 14, col2 = 75, col3 = 136;

  doc.setFont('helvetica', 'bold');
  doc.text('', col1, summaryY);
  doc.text('NPR', col2, summaryY);
  doc.text('INR', col3, summaryY);

  doc.setFont('helvetica', 'normal');
  doc.text('Total Expenses:', col1, summaryY + 7);
  doc.text(`Rs ${data.totals.expensesNPR.toLocaleString()}`, col2, summaryY + 7);
  doc.text(`Rs ${data.totals.expensesINR.toLocaleString()}`, col3, summaryY + 7);

  doc.text('Total Received:', col1, summaryY + 14);
  doc.text(`Rs ${data.totals.receivedNPR.toLocaleString()}`, col2, summaryY + 14);
  doc.text(`Rs ${data.totals.receivedINR.toLocaleString()}`, col3, summaryY + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Remaining:', col1, summaryY + 21);
  doc.text(`Rs ${Math.abs(data.totals.remainingNPR).toLocaleString()}`, col2, summaryY + 21);
  doc.text(`Rs ${Math.abs(data.totals.remainingINR).toLocaleString()}`, col3, summaryY + 21);

  let currentY = summaryY + 30;

  // Deductions Table
  if (data.expenses.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Deductions (${data.expenses.length})`, 14, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Description', 'Category', 'Amount', 'Currency', 'Staff', 'Notes']],
      body: data.expenses.map(e => [
        format(new Date(e.expense_date), 'dd/MM/yy'),
        e.description,
        e.category,
        e.amount.toLocaleString(),
        e.currency,
        e.staff_name || '-',
        e.notes || '-',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Receivings Table
  if (data.receivings.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receivings (${data.receivings.length})`, 14, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Amount', 'Currency', 'Method', 'Status', 'Staff', 'Notes']],
      body: data.receivings.map(r => [
        format(new Date(r.created_at), 'dd/MM/yy HH:mm'),
        Number(r.amount).toLocaleString(),
        r.currency,
        r.method,
        r.is_confirmed ? 'Confirmed' : 'Pending',
        data.getStaffName ? data.getStaffName(r.staff_id) : '-',
        r.notes || '-',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Computer-generated document. No signature required.', 14, doc.internal.pageSize.getHeight() - 10);
    doc.text(`Madani Money Exchange • ${format(new Date(), 'yyyy')} • Page ${i}/${totalPages}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    doc.setTextColor(0);
  }

  doc.save(`deductions_receivings_${data.dateLabel.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const printDeductionsReceivings = (data: PrintData) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Deductions & Receivings - ${data.dateLabel}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; font-size: 11px; color: #1a1a1a; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { font-size: 20px; color: #1e40af; }
        .header p { color: #6b7280; font-size: 10px; margin-top: 2px; }
        .summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
        .summary h3 { font-size: 12px; margin-bottom: 10px; color: #374151; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; text-align: center; }
        .summary-item { background: #fff; padding: 10px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .summary-item .label { font-size: 9px; color: #6b7280; text-transform: uppercase; }
        .summary-item .value { font-size: 16px; font-weight: 700; margin-top: 4px; }
        .value.expense { color: #dc2626; }
        .value.received { color: #059669; }
        .value.remaining { color: #d97706; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f9fafb; padding: 8px; text-align: left; font-size: 9px; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
        td { padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 10px; }
        tr:hover { background: #f9fafb; }
        .section-title { font-size: 13px; font-weight: 600; margin: 16px 0 8px; color: #374151; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 600; }
        .badge-confirmed { background: #dcfce7; color: #16a34a; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
        @media print { body { padding: 0; } .summary-item .value { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; } th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MADANI MONEY EXCHANGE</h1>
        <p>Deductions & Receivings Report • ${data.dateLabel}</p>
        <p>Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
      </div>

      <div class="summary">
        <h3>Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">Total Expenses</div>
            <div class="value expense">रू ${data.totals.expensesNPR.toLocaleString()}</div>
            ${data.totals.expensesINR > 0 ? `<div class="value expense" style="font-size:12px;">₹ ${data.totals.expensesINR.toLocaleString()}</div>` : ''}
          </div>
          <div class="summary-item">
            <div class="label">Received</div>
            <div class="value received">रू ${data.totals.receivedNPR.toLocaleString()}</div>
            ${data.totals.receivedINR > 0 ? `<div class="value received" style="font-size:12px;">₹ ${data.totals.receivedINR.toLocaleString()}</div>` : ''}
          </div>
          <div class="summary-item">
            <div class="label">Remaining</div>
            <div class="value remaining">रू ${Math.abs(data.totals.remainingNPR).toLocaleString()}</div>
            ${data.totals.remainingINR !== 0 ? `<div class="value remaining" style="font-size:12px;">₹ ${Math.abs(data.totals.remainingINR).toLocaleString()}</div>` : ''}
          </div>
        </div>
      </div>

      ${data.expenses.length > 0 ? `
        <div class="section-title">Deductions (${data.expenses.length})</div>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Currency</th><th>Staff</th><th>Notes</th></tr></thead>
          <tbody>
            ${data.expenses.map(e => `<tr>
              <td>${format(new Date(e.expense_date), 'dd/MM/yy')}</td>
              <td>${e.description}</td>
              <td>${e.category}</td>
              <td>${e.amount.toLocaleString()}</td>
              <td>${e.currency}</td>
              <td>${e.staff_name || '-'}</td>
              <td>${e.notes || '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      ` : ''}

      ${data.receivings.length > 0 ? `
        <div class="section-title">Receivings (${data.receivings.length})</div>
        <table>
          <thead><tr><th>Date</th><th>Amount</th><th>Currency</th><th>Method</th><th>Status</th><th>Staff</th><th>Notes</th></tr></thead>
          <tbody>
            ${data.receivings.map(r => `<tr>
              <td>${format(new Date(r.created_at), 'dd/MM/yy HH:mm')}</td>
              <td>${Number(r.amount).toLocaleString()}</td>
              <td>${r.currency}</td>
              <td>${r.method}</td>
              <td><span class="badge ${r.is_confirmed ? 'badge-confirmed' : 'badge-pending'}">${r.is_confirmed ? 'Confirmed' : 'Pending'}</span></td>
              <td>${data.getStaffName ? data.getStaffName(r.staff_id) : '-'}</td>
              <td>${r.notes || '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="footer">
        <span>Computer-generated document. No signature required.</span>
        <span>Madani Money Exchange • ${format(new Date(), 'yyyy')}</span>
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
