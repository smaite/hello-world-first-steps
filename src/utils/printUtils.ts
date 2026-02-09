import { format } from 'date-fns';

interface TransactionReceiptData {
  id: string;
  date: Date;
  transactionType: 'buy' | 'sell';
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  customerName?: string;
  paymentMethod: string;
  isCredit: boolean;
  staffName?: string;
  notes?: string;
}

interface DailyReportData {
  date: Date;
  staffName: string;
  openingNpr: number;
  openingInr: number;
  closingNpr: number;
  closingInr: number;
  totalNprIn: number;
  totalNprOut: number;
  totalInrIn: number;
  totalInrOut: number;
  totalTransactions: number;
  transactions: Array<{
    time: string;
    type: string;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    customer?: string;
    paymentMethod: string;
  }>;
}

const formatCurrency = (amount: number, currency: string = 'NPR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency === 'INR' ? 'INR' : 'NPR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const printTransactionReceipt = (data: TransactionReceiptData): void => {
  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Transaction Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Courier New', monospace; 
          padding: 20px;
          max-width: 300px;
          margin: 0 auto;
        }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
        .header h1 { font-size: 18px; font-weight: bold; }
        .header p { font-size: 12px; color: #666; }
        .receipt-id { font-size: 10px; margin-top: 5px; }
        .section { margin: 15px 0; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
        .row.highlight { font-weight: bold; font-size: 14px; background: #f0f0f0; padding: 5px; }
        .divider { border-top: 1px dashed #000; margin: 15px 0; }
        .exchange-box { 
          text-align: center; 
          padding: 15px; 
          background: #f5f5f5; 
          border-radius: 8px;
          margin: 15px 0;
        }
        .exchange-box .amount { font-size: 20px; font-weight: bold; }
        .exchange-box .arrow { font-size: 24px; margin: 5px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
        .credit-badge { 
          background: #fef3c7; 
          color: #92400e; 
          padding: 5px 10px; 
          border-radius: 4px; 
          text-align: center;
          font-weight: bold;
          margin: 10px 0;
        }
        @media print {
          body { padding: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MADANI MONEY EXCHANGE</h1>
        <p>NPR ⇄ INR Currency Exchange</p>
        <div class="receipt-id">Receipt #${data.id.slice(0, 8).toUpperCase()}</div>
      </div>

      <div class="section">
        <div class="row">
          <span>Date:</span>
          <span>${format(data.date, 'dd/MM/yyyy')}</span>
        </div>
        <div class="row">
          <span>Time:</span>
          <span>${format(data.date, 'HH:mm:ss')}</span>
        </div>
        <div class="row">
          <span>Type:</span>
          <span>${data.transactionType.toUpperCase()}</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="exchange-box">
        <div class="amount">${formatCurrency(data.fromAmount, data.fromCurrency)}</div>
        <div class="arrow">↓</div>
        <div class="amount">${formatCurrency(data.toAmount, data.toCurrency)}</div>
        <div style="font-size: 11px; margin-top: 5px; color: #666;">
          Rate: 1 ${data.fromCurrency} = ${data.exchangeRate} ${data.toCurrency}
        </div>
      </div>

      ${data.isCredit ? '<div class="credit-badge">⚠️ CREDIT TRANSACTION</div>' : ''}

      <div class="divider"></div>

      <div class="section">
        ${data.customerName ? `<div class="row"><span>Customer:</span><span>${data.customerName}</span></div>` : ''}
        <div class="row">
          <span>Payment:</span>
          <span>${data.paymentMethod.toUpperCase()}</span>
        </div>
        ${data.staffName ? `<div class="row"><span>Staff:</span><span>${data.staffName}</span></div>` : ''}
      </div>

      ${data.notes ? `
        <div class="divider"></div>
        <div class="section">
          <div style="font-size: 11px; color: #666;">Notes: ${data.notes}</div>
        </div>
      ` : ''}

      <div class="divider"></div>

      <div class="footer">
        <p>Thank you for your business!</p>
        <p style="margin-top: 5px;">Keep this receipt for your records</p>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(receiptHtml);
};

export const printDailyReport = (data: DailyReportData): void => {
  const reportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Daily Report - ${format(data.date, 'dd/MM/yyyy')}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { color: #666; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
        .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
        .summary-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .summary-card h3 { font-size: 12px; color: #666; margin-bottom: 5px; }
        .summary-card .value { font-size: 20px; font-weight: bold; }
        .summary-card .value.positive { color: #16a34a; }
        .summary-card .value.negative { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; font-size: 12px; }
        th { background: #f5f5f5; font-weight: bold; }
        .text-right { text-align: right; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print {
          body { padding: 15px; }
          .summary-grid { grid-template-columns: repeat(4, 1fr); }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MADANI MONEY EXCHANGE</h1>
        <p>Daily Cash Report</p>
      </div>

      <div class="meta">
        <div><strong>Date:</strong> ${format(data.date, 'EEEE, dd MMMM yyyy')}</div>
        <div><strong>Staff:</strong> ${data.staffName}</div>
      </div>

      <h2 style="margin-bottom: 15px; font-size: 16px;">Cash Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Opening NPR</h3>
          <div class="value">${formatCurrency(data.openingNpr, 'NPR')}</div>
        </div>
        <div class="summary-card">
          <h3>Opening INR</h3>
          <div class="value">${formatCurrency(data.openingInr, 'INR')}</div>
        </div>
        <div class="summary-card">
          <h3>Closing NPR</h3>
          <div class="value">${formatCurrency(data.closingNpr, 'NPR')}</div>
        </div>
        <div class="summary-card">
          <h3>Closing INR</h3>
          <div class="value">${formatCurrency(data.closingInr, 'INR')}</div>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <h3>NPR In</h3>
          <div class="value positive">+${formatCurrency(data.totalNprIn, 'NPR')}</div>
        </div>
        <div class="summary-card">
          <h3>NPR Out</h3>
          <div class="value negative">-${formatCurrency(data.totalNprOut, 'NPR')}</div>
        </div>
        <div class="summary-card">
          <h3>INR In</h3>
          <div class="value positive">+${formatCurrency(data.totalInrIn, 'INR')}</div>
        </div>
        <div class="summary-card">
          <h3>INR Out</h3>
          <div class="value negative">-${formatCurrency(data.totalInrOut, 'INR')}</div>
        </div>
      </div>

      <h2 style="margin-bottom: 15px; font-size: 16px;">Transactions (${data.totalTransactions})</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th>Customer</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          ${data.transactions.map(tx => `
            <tr>
              <td>${tx.time}</td>
              <td>${tx.type.toUpperCase()}</td>
              <td class="text-right">${formatCurrency(tx.fromAmount, tx.fromCurrency)}</td>
              <td class="text-right">${formatCurrency(tx.toAmount, tx.toCurrency)}</td>
              <td>${tx.customer || '-'}</td>
              <td>${tx.paymentMethod}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
        <p>Madani Money Exchange - NPR ⇄ INR</p>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(reportHtml);
};

export const printCreditStatement = (
  customerName: string,
  creditLimit: number,
  currentBalance: number,
  transactions: Array<{
    date: Date;
    type: string;
    amount: number;
    notes?: string;
  }>
): void => {
  const statementHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Credit Statement - ${customerName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .header h1 { font-size: 24px; }
        .customer-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .customer-info h2 { font-size: 20px; margin-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .info-item h4 { font-size: 12px; color: #666; }
        .info-item .value { font-size: 18px; font-weight: bold; }
        .info-item .value.danger { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; }
        .credit { color: #dc2626; }
        .payment { color: #16a34a; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MADANI MONEY EXCHANGE</h1>
        <p>Credit Statement</p>
      </div>

      <div class="customer-info">
        <h2>${customerName}</h2>
        <div class="info-grid">
          <div class="info-item">
            <h4>Credit Limit</h4>
            <div class="value">${creditLimit > 0 ? formatCurrency(creditLimit, 'NPR') : 'Unlimited'}</div>
          </div>
          <div class="info-item">
            <h4>Current Balance</h4>
            <div class="value ${currentBalance > 0 ? 'danger' : ''}">${formatCurrency(currentBalance, 'NPR')}</div>
          </div>
          <div class="info-item">
            <h4>Available Credit</h4>
            <div class="value">${creditLimit > 0 ? formatCurrency(Math.max(0, creditLimit - currentBalance), 'NPR') : 'Unlimited'}</div>
          </div>
        </div>
      </div>

      <h3>Transaction History</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(tx => `
            <tr>
              <td>${format(tx.date, 'dd/MM/yyyy HH:mm')}</td>
              <td>${tx.type === 'credit_given' ? 'Credit Given' : 'Payment Received'}</td>
              <td class="${tx.type === 'credit_given' ? 'credit' : 'payment'}">
                ${tx.type === 'credit_given' ? '-' : '+'}${formatCurrency(tx.amount, 'NPR')}
              </td>
              <td>${tx.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(statementHtml);
};

interface DenominationSheetData {
  date: Date;
  staffName: string;
  openingNpr: {
    denominations: Record<string, number>;
    total: number;
  };
  openingInr: {
    denominations: Record<string, number>;
    total: number;
  };
  closingNpr?: {
    denominations: Record<string, number>;
    total: number;
  };
  closingInr?: {
    denominations: Record<string, number>;
    total: number;
  };
}

const NPR_DENOM_ORDER = ['1000', '500', '100', '50', '20', '10', '5'];
const INR_DENOM_ORDER = ['500', '200', '100', '50', '20', '10', 'coins'];

const formatNum = (num: number) => new Intl.NumberFormat('en-IN').format(Math.round(num));

export const printDenominationSheet = (data: DenominationSheetData): void => {
  const generateDenomRows = (
    nprDenoms: Record<string, number>,
    inrDenoms: Record<string, number>
  ) => {
    const maxRows = Math.max(NPR_DENOM_ORDER.length, INR_DENOM_ORDER.length);
    let rows = '';
    
    for (let i = 0; i < maxRows; i++) {
      const nprKey = NPR_DENOM_ORDER[i];
      const inrKey = INR_DENOM_ORDER[i];
      
      const nprCount = nprKey ? (nprDenoms[nprKey] || 0) : 0;
      const nprValue = nprKey ? parseInt(nprKey) : 0;
      const nprTotal = nprCount * nprValue;
      
      const inrCount = inrKey ? (inrDenoms[inrKey] || 0) : 0;
      const inrValue = inrKey === 'coins' ? 1 : (inrKey ? parseInt(inrKey) : 0);
      const inrTotal = inrCount * inrValue;
      
      rows += `
        <tr>
          <td class="note">${nprKey || ''}</td>
          <td class="count">${nprKey && nprCount > 0 ? nprCount : ''}</td>
          <td class="total">${nprKey && nprTotal > 0 ? formatNum(nprTotal) : ''}</td>
          <td class="separator"></td>
          <td class="note">${inrKey === 'coins' ? 'Coins' : (inrKey || '')}</td>
          <td class="count">${inrKey && inrCount > 0 ? inrCount : ''}</td>
          <td class="total">${inrKey && inrTotal > 0 ? formatNum(inrTotal) : ''}</td>
        </tr>
      `;
    }
    return rows;
  };

  const sheetHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Denomination Sheet - ${format(data.date, 'dd/MM/yyyy')}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          padding: 20px; 
          font-size: 12px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header { 
          text-align: center; 
          margin-bottom: 20px; 
          border-bottom: 2px solid #333; 
          padding-bottom: 15px; 
        }
        .header h1 { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
        .header p { font-size: 12px; color: #666; margin-top: 4px; }
        .meta { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 20px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .section { margin-bottom: 25px; }
        .section-title { 
          font-size: 14px; 
          font-weight: bold; 
          margin-bottom: 10px;
          padding: 8px 12px;
          background: linear-gradient(135deg, #2d5a27 0%, #3d7a37 100%);
          color: white;
          border-radius: 4px;
        }
        .denom-table { 
          width: 100%; 
          border-collapse: collapse; 
          border: 1px solid #ddd;
        }
        .denom-table th { 
          background: #f8f9fa; 
          padding: 10px; 
          text-align: center;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }
        .denom-table td { 
          padding: 8px 12px; 
          border-bottom: 1px solid #eee; 
        }
        .denom-table .note { 
          font-weight: 600; 
          text-align: center;
          width: 60px;
        }
        .denom-table .count { 
          text-align: center; 
          width: 60px;
        }
        .denom-table .total { 
          text-align: right; 
          font-family: 'Consolas', monospace;
          width: 100px;
        }
        .denom-table .separator {
          width: 30px;
          background: #f0f0f0;
        }
        .denom-table tfoot td {
          font-weight: bold;
          background: #e8f5e9;
          border-top: 2px solid #4caf50;
        }
        .currency-header {
          background: #e3f2fd !important;
          font-weight: bold;
        }
        .date-footer {
          text-align: center;
          margin-top: 30px;
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        .footer { 
          margin-top: 20px; 
          text-align: center; 
          font-size: 10px; 
          color: #999; 
          border-top: 1px solid #ddd; 
          padding-top: 15px; 
        }
        @media print {
          body { padding: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MADANI MONEY EXCHANGE</h1>
        <p>Cash Denomination Sheet</p>
      </div>
      
      <div class="meta">
        <div><strong>Date:</strong> ${format(data.date, 'dd MMMM yyyy, EEEE')}</div>
        <div><strong>Staff:</strong> ${data.staffName}</div>
      </div>

      <div class="section">
        <div class="section-title">Opening Balance</div>
        <table class="denom-table">
          <thead>
            <tr>
              <th colspan="3" class="currency-header">NPR (NC)</th>
              <th class="separator"></th>
              <th colspan="3" class="currency-header">INR (IC)</th>
            </tr>
            <tr>
              <th>Note</th>
              <th>Count</th>
              <th>Total</th>
              <th class="separator"></th>
              <th>Note</th>
              <th>Count</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${generateDenomRows(data.openingNpr.denominations, data.openingInr.denominations)}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="note">Total</td>
              <td class="total">${formatNum(data.openingNpr.total)}</td>
              <td class="separator"></td>
              <td colspan="2" class="note">Total</td>
              <td class="total">${formatNum(data.openingInr.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${data.closingNpr && data.closingInr ? `
      <div class="section">
        <div class="section-title">Closing Balance</div>
        <table class="denom-table">
          <thead>
            <tr>
              <th colspan="3" class="currency-header">NPR (NC)</th>
              <th class="separator"></th>
              <th colspan="3" class="currency-header">INR (IC)</th>
            </tr>
            <tr>
              <th>Note</th>
              <th>Count</th>
              <th>Total</th>
              <th class="separator"></th>
              <th>Note</th>
              <th>Count</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${generateDenomRows(data.closingNpr.denominations, data.closingInr.denominations)}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="note">Total</td>
              <td class="total">${formatNum(data.closingNpr.total)}</td>
              <td class="separator"></td>
              <td colspan="2" class="note">Total</td>
              <td class="total">${formatNum(data.closingInr.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      ` : ''}

      <div class="date-footer">${format(data.date, 'd/M/yy')}</div>

      <div class="footer">
        Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')} • Madani Money Exchange
      </div>
    </body>
    </html>
  `;

  openPrintWindow(sheetHtml);
};

const openPrintWindow = (html: string): void => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
