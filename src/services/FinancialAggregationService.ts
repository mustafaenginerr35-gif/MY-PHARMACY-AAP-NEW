import { calculateReportsFromRecords, ReportFilters, ReportResult } from './reportCalculator';
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, subMonths } from 'date-fns';

export interface FinancialStats extends ReportResult {
  // Add any additional fields if needed
}

export const FinancialAggregationService = {
  /**
   * Calculates statistics for a given period and branch
   */
  calculateStats: (options: {
    startDate: Date;
    endDate: Date;
    branchId: string | null;
    transactions: any[];
    ledgerEntries: any[];
    historicalRecords: any[];
    expiredLosses: any[];
    openingCash: any[];
    entities: any[];
    attendance: any[];
    customerDebts: any[];
    loans: any[];
  }) => {
    const { 
      startDate, endDate, branchId, 
      transactions, ledgerEntries, historicalRecords, 
      expiredLosses, openingCash, entities, 
      attendance, customerDebts, loans 
    } = options;

    const stats = calculateReportsFromRecords({
      allRecords: [...transactions, ...ledgerEntries],
      historicalRecords,
      expiredLosses,
      openingCash,
      entities,
      attendance,
      loans,
      filters: {
        startDate,
        endDate,
        branchId
      }
    });
    
    // Group records by type for detailed analysis
    const groups = {
      revenue: transactions.filter((t: any) => (t.type === 'revenue' || t.type === 'income') && !t.deletedAt && (t.revenueClassification === 'operating' || !t.revenueClassification)),
      nonOperating: transactions.filter((t: any) => (t.type === 'revenue' || t.type === 'income') && !t.deletedAt && t.revenueClassification === 'non-operating'),
      expenses: transactions.filter((t: any) => t.type === 'expense' && !t.deletedAt),
      purchases: transactions.filter((t: any) => t.type === 'invoice' && !t.deletedAt),
      payments: ledgerEntries.filter((e: any) => (e.operationType === 'payment' || e.sourceType === 'payment') && !e.isDeleted),
      losses: expiredLosses.filter((l: any) => !l.deletedAt),
      salaries: attendance.filter((a: any) => !a.deletedAt),
      loansDueToMe: transactions.filter((t: any) => !t.deletedAt && (t.revenueClassification === 'receive_loan' || t.expenseClassification === 'pay_loan')),
      openingCash: openingCash || [],
      customerDebts: customerDebts || [],
      supplierDebts: entities.filter((e: any) => (e.type === 'office' || e.type === 'warehouse') && e.balance > 0),
      loans: loans || []
    };

    return {
      stats,
      groups
    };
  },

  /**
   * Generates a monthly timeline for the last 12 months
   */
  generateMonthlyTimeline: (records: any, branchId: string | null) => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(new Date(), 11));
    
    const months = eachMonthOfInterval({ start, end });
    
    return months.map(month => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      
      const res = calculateReportsFromRecords({
        allRecords: records.transactions || [],
        historicalRecords: records.historicalRecords || [],
        attendance: records.attendance || [],
        loans: records.loans || [],
        openingCash: records.openingCash || [],
        expiredLosses: records.expiredLosses || [],
        entities: records.entities || [],
        filters: {
          startDate: mStart,
          endDate: mEnd,
          branchId
        }
      });
      
      return {
        month: mStart,
        monthName: format(mStart, 'MMMM yyyy'),
        revenue: res.totalRevenue,
        profit: res.totalProfit,
        expenses: res.totalExpenses + res.totalSalaries + res.totalLosses,
        invoices: res.totalPurchases,
        payments: res.totalPayments,
        remaining: res.remainingCash,
        net: res.netResult,
        hasHistorical: false // Can be determined by checking historicalRecords for this month
      };
    }).reverse();
  }
};
