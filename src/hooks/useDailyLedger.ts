import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface LedgerData {
  openingNpr: number;
  ncToIc: number;
  takeNpr: number;
  esewaInNpr: number;
  nastaKharcha: number;
  icToNc: number;
  hunuParneNpr: number;
  chaNpr: number;
  farakNpr: number;
  
  openingInr: number;
  icToNc_inr: number;
  takeInr: number;
  esewaInInr: number;
  nastaKharchaInr: number;
  ncToIc_inr: number;
  hunuParneInr: number;
  chaInr: number;
  farakInr: number;
  
  // Staff owes (personal eSewa received)
  staffOwesNpr: number;
  staffOwesInr: number;
}

export const useDailyLedger = () => {
  const [loading, setLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);

  const fetchLedgerData = useCallback(async (
    date: Date,
    openingNpr: number,
    openingInr: number,
    closingNpr?: number,
    closingInr?: number
  ) => {
    setLoading(true);
    try {
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();
      const dateStr = format(date, 'yyyy-MM-dd');

      // Get all transactions for the day
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      // Get credit transactions
      const { data: creditTx } = await supabase
        .from('credit_transactions')
        .select('*')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      // Get expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('expense_date', dateStr);

      // Calculate NPR side
      let ncToIc = 0; // NPR received when selling INR
      let icToNc = 0; // NPR paid out when buying INR
      let takeNpr = 0; // Cash NPR received
      let esewaInNpr = 0; // Online NPR received
      
      // Calculate INR side  
      let icToNc_inr = 0; // INR received when buying INR
      let ncToIc_inr = 0; // INR paid out when selling INR
      let takeInr = 0; // Cash INR received
      let esewaInInr = 0; // Online INR received

      // Staff owes (personal account eSewa)
      let staffOwesNpr = 0;
      let staffOwesInr = 0;

      transactions?.forEach(t => {
        const isPersonal = (t as any).is_personal_account === true;
        
        // Sell: Customer gives NPR, takes INR (we sell INR)
        if (t.transaction_type === 'sell') {
          ncToIc += Number(t.from_amount); // NPR coming in
          ncToIc_inr += Number(t.to_amount); // INR going out
          
          if (t.payment_method === 'online') {
            esewaInNpr += Number(t.from_amount);
            // Track personal account payments
            if (isPersonal) {
              staffOwesNpr += Number(t.from_amount);
            }
          } else {
            takeNpr += Number(t.from_amount);
          }
        }
        // Buy: Customer gives INR, takes NPR (we buy INR)
        if (t.transaction_type === 'buy') {
          icToNc += Number(t.to_amount); // NPR going out
          icToNc_inr += Number(t.from_amount); // INR coming in
          
          if (t.payment_method === 'online') {
            esewaInInr += Number(t.from_amount);
            // Track personal account payments
            if (isPersonal) {
              staffOwesInr += Number(t.from_amount);
            }
          } else {
            takeInr += Number(t.from_amount);
          }
        }
      });

      // Credit transactions
      let creditGivenNpr = 0;
      let creditReceivedNpr = 0;

      creditTx?.forEach(ct => {
        if (ct.transaction_type === 'credit_given') {
          creditGivenNpr += Number(ct.amount);
        } else if (ct.transaction_type === 'payment_received') {
          creditReceivedNpr += Number(ct.amount);
        }
      });

      // Expenses
      let nastaKharcha = 0;
      let nastaKharchaInr = 0;
      expenses?.forEach(e => {
        if (e.currency === 'NPR') {
          nastaKharcha += Number(e.amount);
        } else {
          nastaKharchaInr += Number(e.amount);
        }
      });

      // Calculate HUNU PARNE (Expected Balance)
      // NPR: Opening + All Inflows - All Outflows
      const hunuParneNpr = openingNpr + ncToIc + creditReceivedNpr - icToNc - nastaKharcha - creditGivenNpr;
      
      // INR: Opening + All Inflows - All Outflows
      const hunuParneInr = openingInr + icToNc_inr - ncToIc_inr - nastaKharchaInr;

      // CHA (Actual) and FARAK (Difference)
      const chaNpr = closingNpr ?? 0;
      const chaInr = closingInr ?? 0;
      const farakNpr = hunuParneNpr - chaNpr;
      const farakInr = hunuParneInr - chaInr;

      const data: LedgerData = {
        openingNpr,
        ncToIc,
        takeNpr,
        esewaInNpr,
        nastaKharcha,
        icToNc,
        hunuParneNpr,
        chaNpr,
        farakNpr,
        
        openingInr,
        icToNc_inr,
        takeInr,
        esewaInInr,
        nastaKharchaInr,
        ncToIc_inr,
        hunuParneInr,
        chaInr,
        farakInr,
        
        staffOwesNpr,
        staffOwesInr,
      };

      setLedgerData(data);
      return data;
    } catch (error) {
      console.error('Error fetching ledger data:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { ledgerData, loading, fetchLedgerData };
};
