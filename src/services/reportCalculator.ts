
import { Transaction, LedgerEntry, HistoricalRecord, ExpiredDamagedLoss, OpeningCash, Entity, EmployeeAttendance, CustomerDebt, Loan } from '../db';
import { startOfDay, endOfDay, isWithinInterval, isValid } from 'date-fns';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  branchId: string | null;
}

export interface ReportResult {
  totalRevenue: number;
  totalProfit: number;
  totalPurchases: number;
  totalExpenses: number;
  totalPayments: number;
  supplierDebt: number;
  customerDebt: number;
  remainingCash: number;
  cashInflow: number;
  cashOutflow: number;
  netResult: number;
  openingCash: number;
  absoluteOpeningCash: number;
  totalSalaries: number;
  totalLosses: number;
  totalLoansOutgoing: number;
  totalLoansReturned: number;
  remainingLoansPending: number;
  totalNonOperatingRevenue: number;
  totalLoansDueToMe: number;
  openLoansInAmount: number;
  openLoansInCount: number;
  counts: {
     revenue: number;
     expenses: number;
     purchases: number;
     payments: number;
     salaries: number;
     losses: number;
     openLoans: number;
  };
  cashDetails?: {
    inflows: any[];
    outflows: any[];
  };
  profitDetails?: {
    salesProfits: any[];
    deductions: any[];
  };
  debug?: {
    rawInvoicesCount: number;
    uniqueInvoicesCount: number;
    duplicatesDetected: number;
    duplicateNumbers: string[];
    invoiceKeys: string[];
    filterRange: string;
  };
}

function getEmptyReportResult(): ReportResult {
  return {
    totalRevenue: 0,
    totalProfit: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    totalPayments: 0,
    supplierDebt: 0,
    customerDebt: 0,
    remainingCash: 0,
    cashInflow: 0,
    cashOutflow: 0,
    netResult: 0,
    openingCash: 0,
    absoluteOpeningCash: 0,
    totalSalaries: 0,
    totalLosses: 0,
    totalLoansOutgoing: 0,
    totalLoansReturned: 0,
    remainingLoansPending: 0,
    totalLoansDueToMe: 0,
    totalNonOperatingRevenue: 0,
    openLoansInAmount: 0,
    openLoansInCount: 0,
    counts: {
      revenue: 0,
      expenses: 0,
      purchases: 0,
      payments: 0,
      salaries: 0,
      losses: 0,
      openLoans: 0
    },
    cashDetails: {
      inflows: [],
      outflows: []
    },
    profitDetails: {
      salesProfits: [],
      deductions: []
    }
  };
}

export interface FinanceAnalysisInput {
  allRecords: any[];
  historicalRecords: any[];
  attendance: any[];
  loans: any[];
  openingCash: any[];
  expiredLosses: any[];
  entities: any[];
  filters: ReportFilters;
}

export function calculateReportsFromRecords(input: FinanceAnalysisInput): ReportResult {
  if (!input) {
    console.error('[Finance] calculateReportsFromRecords called with null/undefined input');
    return getEmptyReportResult();
  }

  const { 
    allRecords = [], 
    historicalRecords = [], 
    attendance = [], 
    loans = [], 
    openingCash = [], 
    expiredLosses = [],
    entities = [],
    filters = { startDate: new Date(), endDate: new Date(), branchId: 'all' }
  } = input;
  
  const safeParseDate = (d: any): Date | null => {
    if (!d) return null;
    try {
      if (d instanceof Date) return d;
      if (d && typeof d.toDate === 'function') return d.toDate();
      if (typeof d === 'number') return new Date(d);
      const s = String(d).trim();
      if (!s) return null;
      const parsed = new Date(s);
      return !isNaN(parsed.getTime()) ? parsed : null;
    } catch { return null; }
  };

  const startValueRaw = safeParseDate(filters?.startDate);
  const endValueRaw = safeParseDate(filters?.endDate);
  const start = startOfDay(startValueRaw || new Date(2000, 0, 1));
  const end = endOfDay(endValueRaw || new Date(2099, 11, 31));

  const checkBranch = (id?: string | null) => {
    const bId = filters?.branchId;
    return !bId || bId === 'all' || id === bId;
  };

  // --- STRICT LOGICAL DEDUPLICATION ---
  const unifiedMap = new Map<string, any>();
  const stream = [...allRecords, ...historicalRecords];
  
  stream.forEach(rec => {
    if (!rec || rec.isDeleted || rec.deletedAt) return;
    
    const type = (rec.type || rec.operationType || rec.sourceType || 'other').toString();
    const amount = Number(rec.amount || rec.netAmount || (rec.debit > 0 ? rec.debit : rec.credit) || 0);
    const d = safeParseDate(rec.date || rec.invoiceDate || rec.createdAt);
    const dateStr = d ? d.toISOString().split('T')[0] : 'no-dt';
    const entId = rec.entityId || rec.accountId || rec.supplierId || 'none';
    const invNum = (rec.invoiceNumber || '').toString().trim();
    
    // Logic Key: Combines key features to ensure uniqueness even across collections
    const logicKey = `${type}_${amount}_${dateStr}_${entId}_${invNum}`;
    
    if (unifiedMap.has(logicKey)) {
      const existing = unifiedMap.get(logicKey);
      const existingTime = safeParseDate(existing.updatedAt || existing.createdAt)?.getTime() || 0;
      const currentTime = safeParseDate(rec.updatedAt || rec.createdAt)?.getTime() || 0;
      if (currentTime > existingTime) unifiedMap.set(logicKey, rec);
      return;
    }
    unifiedMap.set(logicKey, rec);
  });

  let totalRevenue = 0, totalProfit = 0, totalPurchases = 0, totalExpenses = 0, totalPayments = 0, totalSalaries = 0, totalLosses = 0;
  let totalNonOperatingRevenue = 0, openLoansInAmount = 0, openLoansInCount = 0;
  let totalLoansDueToMe = 0;
  let revenueCount = 0, expenseCount = 0, purchaseCount = 0, paymentCount = 0, salaryCount = 0, lossCount = 0;

  const salesProfitsItems: any[] = [];
  const deductionItems: any[] = [];

  unifiedMap.forEach(rec => {
    const d = safeParseDate(rec.date || rec.invoiceDate || rec.createdAt);
    if (!d || !checkBranch(rec.branchId)) return;
    
    const amount = Number(rec.amount || rec.netAmount || (rec.debit > 0 ? rec.debit : rec.credit) || 0);
    const inRange = d >= start && d <= end;
    const type = rec.operationType || rec.type || rec.sourceType;

    if (inRange) {
      if (type === 'revenue' || type === 'income') {
        const p = Number(rec.profitAmount || rec.saleProfit || 0);
        const classification = rec.revenueClassification || 'operating';
        
        if (classification === 'operating') {
          totalRevenue += amount;
          totalProfit += p;
          revenueCount++;
          if (p !== 0) {
            salesProfitsItems.push({ ...rec, _label: `ربح مبيعات (${rec.incomeTypeCustom || 'مبيعات'})`, _amount: p, date: d });
          }
        } else if (classification === 'receive_loan') {
           totalLoansDueToMe -= amount;
        } else {
          // Non-operating
          totalNonOperatingRevenue += amount;
          if (rec.nonOperatingType === 'loan_in' && rec.loanInStatus === 'open') {
             openLoansInAmount += amount;
             openLoansInCount++;
          }
        }
      } else if (type === 'expense') {
        if (rec.expenseClassification === 'pay_loan') {
           totalLoansDueToMe += amount;
        } else if (rec.expenseClassification !== 'loan_in_payment') {
          totalExpenses += amount;
          expenseCount++;
          deductionItems.push({ ...rec, _label: `مصروف: ${rec.category || ''}`, _amount: -amount, type: 'expense', date: d });
        }
      } else if (type === 'invoice' || type === 'purchase_invoice') {
        totalPurchases += amount;
        purchaseCount++;
      } else if (type === 'payment') {
        totalPayments += amount;
        paymentCount++;
      } else if (type === 'salary' || type === 'salary_payment') {
        totalSalaries += amount;
        salaryCount++;
        deductionItems.push({ ...rec, _label: `راتب: ${rec.employeeName || ''}`, _amount: -amount, type: 'salary', date: d });
      }
    }
  });

  // Additional losses
  expiredLosses.forEach(l => {
    const d = safeParseDate(l.date || l.createdAt);
    if (d && d >= start && d <= end && checkBranch(l.branchId)) {
      const val = Number(l.totalLoss || l.amount || 0);
      totalLosses += val;
      lossCount++;
      deductionItems.push({ ...l, _label: `تالف واكسباير: ${l.medicineName || ''}`, _amount: -val, type: 'loss', date: d });
    }
  });

  // Cash Remaining Logic (All time up to end date)
  const applicableOpening = filters?.branchId === 'all' || !filters?.branchId ? 
                            openingCash.reduce((sum, item) => sum + (item.amount || 0), 0) :
                            (openingCash.find(o => o.branchId === filters.branchId)?.amount || 0);
  const baseOpening = Number(applicableOpening || 0);
  
  let cashInUntilEnd = 0, cashOutUntilEnd = 0;
  let cashInBeforeStart = 0, cashOutBeforeStart = 0;
  let cashInPeriod = 0, cashOutPeriod = 0;
  
  const cashInflowItems: any[] = [];
  const cashOutflowItems: any[] = [];

  unifiedMap.forEach(rec => {
    const d = safeParseDate(rec.date || rec.invoiceDate || rec.createdAt);
    if (!d || !checkBranch(rec.branchId)) return;
    
    const amount = Number(rec.amount || rec.netAmount || (rec.debit > 0 ? rec.debit : rec.credit) || 0);
    const paidAmount = Number(rec.paidAmount || 0);
    const type = rec.operationType || rec.type || rec.sourceType;

    const isBefore = d < start;
    const isInside = d >= start && d <= end;
    const isRelevant = d <= end;

    if (!isRelevant) return;

    if (type === 'revenue' || type === 'income') {
      const isCash = rec.incomeType === 'cash' || paidAmount > 0 || rec.revenueClassification === 'non-operating' || rec.revenueClassification === 'receive_loan';
      if (isCash) {
        const val = paidAmount > 0 ? paidAmount : (rec.incomeType === 'cash' || rec.revenueClassification === 'non-operating' || rec.revenueClassification === 'receive_loan' ? amount : 0);
        if (val > 0) {
          cashInUntilEnd += val;
          if (isBefore) cashInBeforeStart += val;
          if (isInside) {
            cashInPeriod += val;
            let label = `وارد مبيعات (${rec.incomeTypeCustom || 'مبيعات'})`;
            if (rec.revenueClassification === 'non-operating') {
               label = `وارد غير تشغيلي: ${rec.nonOperatingType || ''}`;
            } else if (rec.revenueClassification === 'receive_loan') {
               label = `استلام سلفة / جمعية: ${rec.entityName || ''}`;
            }
            cashInflowItems.push({ ...rec, _label: label, _amount: val, date: d });
          }
        }
      }
    } else if (type === 'expense') {
      const val = amount || paidAmount;
      if (val > 0) {
        cashOutUntilEnd += val;
        if (isBefore) cashOutBeforeStart += val;
        if (isInside) {
          cashOutPeriod += val;
          let label = `مصروف: ${rec.category || ''}`;
          if (rec.expenseClassification === 'loan_in_payment') {
             label = `تسديد سلفة داخلة: ${rec.partyName || rec.entityName || ''}`;
          } else if (rec.expenseClassification === 'pay_loan') {
             label = `دفع سلفة / جمعية: ${rec.partyName || rec.entityName || ''}`;
          }
          cashOutflowItems.push({ ...rec, _label: label, _amount: -val, date: d });
        }
      }
    } else if (type === 'payment') {
      const val = amount || paidAmount;
      if (val > 0) {
        cashOutUntilEnd += val;
        if (isBefore) cashOutBeforeStart += val;
        if (isInside) {
          cashOutPeriod += val;
          cashOutflowItems.push({ ...rec, _label: `تسديد مورد: ${rec.accountName || ''}`, _amount: -val, date: d });
        }
      }
    } else if (type === 'invoice' || type === 'purchase_invoice') {
       if (paidAmount > 0) {
         cashOutUntilEnd += paidAmount;
         if (isBefore) cashOutBeforeStart += paidAmount;
         if (isInside) {
           cashOutPeriod += paidAmount;
           cashOutflowItems.push({ ...rec, _label: `شراء نقدي: ${rec.accountName || ''}`, _amount: -paidAmount, date: d });
         }
       }
    } else if (type === 'salary' || type === 'salary_payment') {
        cashOutUntilEnd += amount;
        if (isBefore) cashOutBeforeStart += amount;
        if (isInside) {
          cashOutPeriod += amount;
          cashOutflowItems.push({ ...rec, _label: `راتب: ${rec.employeeName || ''}`, _amount: -amount, date: d });
        }
    } else if (type === 'loan_outgoing') {
        cashOutUntilEnd += amount;
        if (isBefore) cashOutBeforeStart += amount;
        if (isInside) {
          cashOutPeriod += amount;
          cashOutflowItems.push({ ...rec, _label: `سلفة صادرة: ${rec.employeeName || ''}`, _amount: -amount, date: d });
        }
    } else if (type === 'loan_return') {
        cashInUntilEnd += amount;
        if (isBefore) cashInBeforeStart += amount;
        if (isInside) {
          cashInPeriod += amount;
          cashInflowItems.push({ ...rec, _label: `استرجاع سلفة: ${rec.employeeName || ''}`, _amount: amount, date: d });
        }
    }
  });

  expiredLosses.forEach(l => {
    const d = safeParseDate(l.date || l.createdAt);
    if (!d || !checkBranch(l.branchId) || d > end) return;
    
    const val = Number(l.totalLoss || l.amount || 0);
    cashOutUntilEnd += val;
    if (d < start) cashOutBeforeStart += val;
    if (d >= start && d <= end) {
      cashOutPeriod += val;
      cashOutflowItems.push({ ...l, _label: `تالف واكسباير: ${l.medicineName || ''}`, _amount: -val, date: d });
    }
  });

  const periodStartingBalance = baseOpening + cashInBeforeStart - cashOutBeforeStart;
  const remainingCash = baseOpening + cashInUntilEnd - cashOutUntilEnd;

  const supplierDebt = entities
    .filter(e => (e.type === 'office' || e.type === 'warehouse') && !e.isArchived && checkBranch(e.branchId))
    .reduce((sum, e) => sum + Math.max(0, Number(e.balance || 0)), 0);

  const netResult = totalProfit - totalExpenses - totalSalaries - totalLosses;

  return {
    totalRevenue,
    totalProfit,
    totalPurchases,
    totalExpenses,
    totalPayments,
    supplierDebt,
    customerDebt: 0,
    remainingCash,
    cashInflow: cashInPeriod,
    cashOutflow: cashOutPeriod,
    netResult,
    openingCash: periodStartingBalance, // Use the balance at the start of the period as "Opening"
    absoluteOpeningCash: baseOpening, // The fixed seed money
    totalSalaries,
    totalLosses,
    totalNonOperatingRevenue,
    totalLoansDueToMe,
    openLoansInAmount,
    openLoansInCount,
    totalLoansOutgoing: loans.filter(l => !l.deletedAt && l.type === 'outgoing' && checkBranch(l.branchId)).reduce((s, l) => s + Number(l.amount || 0), 0),
    totalLoansReturned: loans.filter(l => !l.deletedAt && l.type === 'returned' && checkBranch(l.branchId)).reduce((s, l) => s + Number(l.amount || 0), 0),
    remainingLoansPending: loans.filter(l => !l.deletedAt && checkBranch(l.branchId)).reduce((s, l) => s + (l.type === 'outgoing' ? Number(l.amount || 0) : -Number(l.amount || 0)), 0),
    counts: {
       revenue: revenueCount,
       expenses: expenseCount,
       purchases: purchaseCount,
       payments: paymentCount,
       salaries: salaryCount,
       losses: lossCount,
       openLoans: loans.filter(l => !l.deletedAt && l.type === 'outgoing' && !l.isReturned).length
    },
    cashDetails: {
      inflows: cashInflowItems,
      outflows: cashOutflowItems
    },
    profitDetails: {
      salesProfits: salesProfitsItems,
      deductions: deductionItems
    }
  };
}

