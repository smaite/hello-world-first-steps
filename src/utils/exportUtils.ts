import { format } from 'date-fns';

interface TransactionExportData {
  id: string;
  created_at: string;
  transaction_type: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  payment_method: string;
  is_credit: boolean;
  notes: string | null;
  customers: { name: string } | null;
}

interface ExportTotals {
  nprIn: number;
  nprOut: number;
  inrIn: number;
  inrOut: number;
}

export const exportTransactionsToCSV = (
  transactions: TransactionExportData[],
  dateLabel: string
): void => {
  const headers = [
    'Transaction ID',
    'Date',
    'Time',
    'Type',
    'From Currency',
    'From Amount',
    'To Currency',
    'To Amount',
    'Exchange Rate',
    'Customer',
    'Payment Method',
    'Credit',
    'Notes'
  ];

  const rows = transactions.map(t => [
    t.id.slice(0, 8).toUpperCase(),
    format(new Date(t.created_at), 'yyyy-MM-dd'),
    format(new Date(t.created_at), 'HH:mm:ss'),
    t.transaction_type.toUpperCase(),
    t.from_currency,
    t.from_amount.toString(),
    t.to_currency,
    t.to_amount.toString(),
    t.exchange_rate.toString(),
    t.customers?.name || 'Walk-in',
    t.payment_method.toUpperCase(),
    t.is_credit ? 'Yes' : 'No',
    t.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `transactions_${dateLabel.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printTransactionsCompact = (
  transactions: TransactionExportData[],
  totals: ExportTotals,
  dateLabel: string
): void => {
  const rows = transactions.map(t => `
    <tr>
      <td>${t.from_amount.toLocaleString()}</td>
      <td>${t.exchange_rate}</td>
      <td>${t.from_currency === 'NPR' ? t.from_amount.toLocaleString() : ''}</td>
      <td>${t.from_currency === 'INR' ? t.from_amount.toLocaleString() : ''}</td>
      <td>${t.exchange_rate}</td>
      <td>${t.to_currency === 'NPR' ? t.to_amount.toLocaleString() : ''}</td>
      <td>${t.to_currency === 'INR' ? t.to_amount.toLocaleString() : ''}</td>
      <td>${t.exchange_rate}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html><html><head><title>Transactions - ${dateLabel}</title>
<style>
*{margin:0;padding:0}
@page{size:A4 portrait;margin:8mm}
body{font-family:monospace;font-size:10px}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #000;padding:2px 4px;text-align:right;white-space:nowrap}
th{font-weight:bold;background:#f0f0f0}
.title{text-align:center;font-size:12px;font-weight:bold;margin-bottom:4px}
.sub{text-align:center;font-size:9px;margin-bottom:6px}
.totals td{font-weight:bold;border-top:2px solid #000}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="title">${dateLabel} - ${transactions.length} Txns</div>
<div class="sub">Generated: ${format(new Date(), 'dd/MM/yy HH:mm')}</div>
<table>
<thead><tr>
<th>From Amt</th><th>Rate</th><th>NPR In</th><th>INR In</th><th>Rate</th><th>NPR Out</th><th>INR Out</th><th>Rate</th>
</tr></thead>
<tbody>${rows}</tbody>
<tfoot>
<tr class="totals">
<td></td><td></td>
<td>${totals.nprIn.toLocaleString()}</td>
<td>${totals.inrIn.toLocaleString()}</td>
<td></td>
<td>${totals.nprOut.toLocaleString()}</td>
<td>${totals.inrOut.toLocaleString()}</td>
<td></td>
</tr>
<tr class="totals">
<td colspan="2" style="text-align:left">TOTAL IC</td>
<td colspan="2">${(totals.nprIn + totals.inrIn).toLocaleString()}</td>
<td colspan="2" style="text-align:left">TOTAL OC</td>
<td colspan="2">${(totals.nprOut + totals.inrOut).toLocaleString()}</td>
</tr>
</tfoot>
</table>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
};

export const printTransactionsSheet = (
  transactions: TransactionExportData[],
  totals: ExportTotals,
  dateLabel: string
): void => {
  const formatCurrency = (amount: number, currency: string = 'NPR') => {
    const symbol = currency === 'INR' ? '₹' : 'रू';
    return `${symbol} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const sheetHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Transaction Report - ${dateLabel}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @page {
          size: A4 landscape;
          margin: 15mm;
        }
        
        body { 
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
          padding: 24px;
          background: #fff;
          color: #1a1a1a;
          font-size: 11px;
          line-height: 1.4;
        }
        
        .document {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 16px;
          border-bottom: 2px solid #2563eb;
          margin-bottom: 20px;
        }
        
        .company-info h1 {
          font-size: 22px;
          font-weight: 700;
          color: #1e40af;
          letter-spacing: -0.5px;
        }
        
        .company-info p {
          color: #6b7280;
          font-size: 11px;
          margin-top: 2px;
        }
        
        .report-meta {
          text-align: right;
        }
        
        .report-meta h2 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }
        
        .report-meta p {
          color: #6b7280;
          font-size: 10px;
        }
        
        .summary-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }
        
        .summary-title {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        
        .summary-card {
          background: #fff;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        
        .summary-card .label {
          font-size: 10px;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .summary-card .value {
          font-size: 18px;
          font-weight: 700;
          margin-top: 4px;
        }
        
        .summary-card .value.inflow {
          color: #059669;
        }
        
        .summary-card .value.outflow {
          color: #dc2626;
        }
        
        .table-container {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        
        .table-header {
          padding: 12px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .table-header h3 {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }
        
        .table-header .count {
          font-size: 10px;
          color: #6b7280;
          background: #e5e7eb;
          padding: 4px 8px;
          border-radius: 4px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        thead th {
          background: #f9fafb;
          padding: 10px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 10px;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        tbody td {
          padding: 10px 12px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 11px;
          color: #374151;
        }
        
        tbody tr:hover {
          background: #f9fafb;
        }
        
        tbody tr:last-child td {
          border-bottom: none;
        }
        
        .type-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .type-buy {
          background: #dbeafe;
          color: #1d4ed8;
        }
        
        .type-sell {
          background: #dcfce7;
          color: #16a34a;
        }
        
        .credit-badge {
          background: #fef3c7;
          color: #92400e;
          font-size: 8px;
          padding: 2px 6px;
          border-radius: 3px;
          margin-left: 4px;
        }
        
        .amount {
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-weight: 500;
        }
        
        .amount-from {
          color: #6b7280;
        }
        
        .amount-to {
          color: #1e40af;
          font-weight: 600;
        }
        
        .text-muted {
          color: #9ca3af;
        }
        
        .text-right {
          text-align: right;
        }
        
        .footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .footer-left {
          font-size: 9px;
          color: #9ca3af;
        }
        
        .footer-right {
          font-size: 9px;
          color: #6b7280;
        }
        
        @media print {
          body { 
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .summary-card .value.inflow { color: #059669 !important; }
          .summary-card .value.outflow { color: #dc2626 !important; }
          .type-buy { background: #dbeafe !important; color: #1d4ed8 !important; }
          .type-sell { background: #dcfce7 !important; color: #16a34a !important; }
        }
      </style>
    </head>
    <body>
      <div class="document">
        <div class="header">
          <div class="company-info">
            <h1>MADANI MONEY EXCHANGE</h1>
            <p>NPR ⇄ INR Currency Exchange Services</p>
          </div>
          <div class="report-meta">
            <h2>Transaction Report</h2>
            <p>${dateLabel}</p>
            <p>Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
          </div>
        </div>
        
        <div class="summary-section">
          <div class="summary-title">Summary</div>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">NPR Received</div>
              <div class="value inflow">${formatCurrency(totals.nprIn, 'NPR')}</div>
            </div>
            <div class="summary-card">
              <div class="label">NPR Given</div>
              <div class="value outflow">${formatCurrency(totals.nprOut, 'NPR')}</div>
            </div>
            <div class="summary-card">
              <div class="label">INR Received</div>
              <div class="value inflow">${formatCurrency(totals.inrIn, 'INR')}</div>
            </div>
            <div class="summary-card">
              <div class="label">INR Given</div>
              <div class="value outflow">${formatCurrency(totals.inrOut, 'INR')}</div>
            </div>
          </div>
        </div>
        
        <div class="table-container">
          <div class="table-header">
            <h3>Transaction Details</h3>
            <span class="count">${transactions.length} transactions</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 70px">ID</th>
                <th style="width: 100px">Date & Time</th>
                <th style="width: 60px">Type</th>
                <th class="text-right" style="width: 120px">From</th>
                <th class="text-right" style="width: 120px">To</th>
                <th class="text-right" style="width: 70px">Rate</th>
                <th>Customer</th>
                <th style="width: 90px">Payment</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td style="font-family: monospace; font-size: 10px;">${t.id.slice(0, 8).toUpperCase()}</td>
                  <td>
                    <div>${format(new Date(t.created_at), 'dd/MM/yy')}</div>
                    <div class="text-muted" style="font-size: 9px;">${format(new Date(t.created_at), 'HH:mm')}</div>
                  </td>
                  <td>
                    <span class="type-badge type-${t.transaction_type}">${t.transaction_type}</span>
                  </td>
                  <td class="text-right amount amount-from">${t.from_amount.toLocaleString()} ${t.from_currency}</td>
                  <td class="text-right amount amount-to">${t.to_amount.toLocaleString()} ${t.to_currency}</td>
                  <td class="text-right">${t.exchange_rate}</td>
                  <td>${t.customers?.name || '<span class="text-muted">Walk-in</span>'}</td>
                  <td>
                    ${t.payment_method.toUpperCase()}
                    ${t.is_credit ? '<span class="credit-badge">CREDIT</span>' : ''}
                  </td>
                  <td class="text-muted" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${t.notes || '-'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <div class="footer-left">
            This is a computer-generated document. No signature required.
          </div>
          <div class="footer-right">
            Madani Money Exchange • ${format(new Date(), 'yyyy')}
          </div>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(sheetHtml);
    printWindow.document.close();
  }
};
