import Dexie, { type Table } from 'dexie';

export interface Transaction {
  id?: string;
  type: 'revenue' | 'expense' | 'invoice' | 'payment' | 'income' | 'loan_in'; // added income for legacy, loan_in for new feature
  incomeType?: 'cash' | 'credit';
  revenueClassification?: 'operating' | 'non-operating' | 'receive_loan';
  nonOperatingType?: string;
  loanInStatus?: 'open' | 'partially_returned' | 'fully_returned';
  returnDate?: Date;
  entityName?: string;
  source?: string;
  incomeClassification?: string;
  category: string;
  expenseClassification?: 'operating' | 'loan_in_payment' | 'pay_loan';
  employeeName?: string;
  customerName?: string;
  amount: number;
  saleAmount?: number;
  costAmount?: number;
  profitAmount?: number;
  profitPercent?: number;
  paidAmount?: number;
  remainingAmount?: number;
  netProfit?: number;
  profitPercentage?: number;
  date: Date;
  description: string;
  statement?: string;
  partyName?: string;
  notes?: string;
  entityId?: string;
  invoiceNumber?: string;
  invoiceAmount?: number;
  spoiledType?: 'linked' | 'unlinked';
  reason?: string;
  discount?: number;
  refundAmount?: number;
  invoiceDate?: Date;
  dueDate?: Date;
  imageUrl?: string;
  imageUrls?: string[];
  branchId?: string;
  createdBy: string;
  ownerId: string; // added ownerId explicitly
  userId?: string; // user convenience field requested
  username?: string;
  isHistorical?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Entity {
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  type: 'office' | 'scientific_office' | 'personal' | 'warehouse';
  balance: number;
  initialBalance: number;
  initialBalanceDate?: Date;
  initialBalanceNotes?: string;
  totalInvoices: number;
  totalPayments: number;
  limit: number;
  dueDate?: Date;
  nextDueDate?: Date;
  lastPaymentDate?: Date;
  lastInvoiceDate?: Date;
  totalPaidAmount?: number;
  initialBalancePaid?: number;
  paymentsAppliedToOpeningBalance?: number;
  notes?: string;
  branchId?: string;
  ownerId: string;
  username?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  isArchived?: boolean;
  status? : 'نشط' | 'مؤرشف' | 'محذوف';
  imageUrl?: string;
  imageUrls?: string[];
}

export interface LedgerEntry {
  id?: string;
  sourceType: 'revenue' | 'expense' | 'invoice' | 'payment' | 'employee_salary' | 'opening_cash' | 'supplier_opening_balance' | 'supplier_opening_payment' | 'supplier_opening_balance_payment' | 'return' | 'damaged_expired' | 'adjustment';
  sourceId: string;
  userId: string;
  branchId: string;
  date: Date;
  debit: number;
  credit: number;
  amount: number;
  category: string;
  entityId?: string;
  entityName?: string;
  description: string;
  notes?: string;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  ownerId: string;
  
  // Extension fields for UI and legacy helpers
  operationType?: string;
  invoiceNumber?: string;
  accountName?: string;
  accountId?: string;
  remainingAmount?: number;
  paidAmount?: number;
  paymentStatus?: string;
  dueDate?: Date;
  netAmount?: number;
  totalAmount?: number;
  discount?: number;
  bonus?: number;
  receiptImageUrl?: string;
  isHistorical?: boolean;
  isCommitted?: boolean;
  purchaseType?: 'cash' | 'credit';
  accountType?: string;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  linkedInvoiceId?: string;
  linkedInvoiceNumber?: string;
  paymentSource?: 'invoice' | 'opening_balance';
  refundAmount?: number;
  invoiceDate?: Date;
  source?: string;
  type?: string;
  subtype?: string;
}

export interface Notification {
  id?: string;
  userId: string;
  username?: string;
  title: string;
  message: string;
  type: string;
  accountId?: string;
  amount?: number;
  invoiceNumber?: string;
  read: boolean;
  branchId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AppUser {
  userId: string;
  id?: string;
  email: string;
  username: string;
  displayName: string;
  phone?: string;
  password?: string;
  passwordHash?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  role?: string;
  createdAt: Date;
  updatedAt?: Date;
  isActive: boolean;
  isSetupComplete: boolean;

  // One-time Licensing Context
  licenseCode?: string;
  activationStatus?: 'active' | 'blocked' | 'expired' | 'suspended' | 'revoked' | 'unlicensed' | 'used_by_other' | 'blocked_device';
  planType?: 'basic' | 'advanced' | 'lifetime';
  maxDevices?: number;
  branchesCount?: number;
  isVerified?: boolean;
  lastLogin?: string;
  activatedAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  pharmacyName?: string;
}

export interface SystemLog {
  id?: string;
  type: 'auto_delete' | 'sync' | 'backup';
  message: string;
  ownerId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CustomerDebt {
  id?: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'unpaid' | 'partial' | 'paid';
  saleDate: Date;
  dueDate: Date;
  notes?: string;
  branchId?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Deadline {
  id?: string;
  accountId: string;
  accountName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  requiredPayment: number;
  dueDate: Date;
  notes?: string;
  invoiceImageUrl?: string;
  receiptImageUrl?: string;
  status: 'pending' | 'paid' | 'cancelled';
  branchId?: string;
  createdAt: Date;
  updatedAt?: Date;
  ownerId: string;
}

export interface Announcement {
  id?: string;
  title: string;
  message: string;
  type: 'update' | 'feature' | 'bugfix' | 'alert';
  isActive: number; // 0 or 1
  displayType: 'once' | 'permanent';
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
}

export interface AnnouncementRead {
  id?: string;
  announcementId: string;
  userId: string;
  readAt: Date;
  updatedAt?: Date;
}

export interface ActivationCode {
  id?: string;
  code: string;
  assignedEmail?: string;
  isUsed: boolean;
  createdAt: Date;
  updatedAt?: Date;
  planType?: 'basic' | 'advanced' | 'lifetime';
  maxDevices?: number;
  branchesCount?: number;
  activationStatus?: 'active' | 'blocked' | 'expired';
}

export interface ActivationRequest {
  id?: string;
  email: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt?: Date;
}

export interface RecoveryRequest {
  id?: string;
  email: string;
  status: 'pending' | 'resolved';
  createdAt: Date;
  updatedAt?: Date;
}

export interface Bonus {
  id?: string;
  entityId: string;
  entityName: string;
  invoiceNumber?: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'received' | 'cancelled';
  notes?: string;
  imageUrl?: string;
  branchId?: string;
  createdAt: Date;
  updatedAt?: Date;
  ownerId: string;
}

export interface Employee {
  id?: string;
  name: string;
  phone: string;
  jobTitle: string;
  notes?: string;
  branchId?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface EmployeeAttendance {
  id?: string;
  employeeId: string;
  employeeName: string;
  date: Date; // Keep for legacy and sorting
  month: number;
  year: number;
  attendanceDays: number;
  dailyWorkHours: number;
  hoursWork: number; // Total monthly hours
  hourlyRate: number;
  dailyWage: number; // For monthly it will be the total pay
  notes?: string;
  branchId?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PharmacyBranch {
  id?: string;
  code: string; // BR-0001
  name: string; // Branch Name
  pharmacyName: string; 
  managerName: string;
  phone: string;
  city: string;
  email?: string;
  notes?: string;
  status: 'active' | 'pending' | 'inactive' | 'archived';
  isMain?: boolean;
  activationCode?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface HistoricalRecord {
  id?: string;
  type: 'opening_balance' | 'batch_period' | 'single_entry' | 'monthly_summary' | 'yearly_summary';
  
  // For opening balances
  cashHand?: number;
  inventoryValue?: number;
  customerDebts?: number;
  officeDebts?: number;
  warehouseDebts?: number;
  accumulatedExpenses?: number;
  retainedEarnings?: number;
  
  // For summaries (Monthly/Yearly/Batch)
  year?: number;
  month?: number;
  startDate?: Date;
  endDate?: Date;
  totalSales?: number;
  totalRevenueCash?: number;
  totalRevenueCredit?: number;
  totalPurchases?: number;
  totalExpenses?: number;
  totalProfits?: number;
  totalDebtOwed?: number;
  totalPaidDebt?: number;
  estimatedInventory?: number;
  officeDebtPeriod?: number;
  warehouseDebtPeriod?: number;

  // For single entries
  entryType?: 'revenue' | 'expense' | 'invoice' | 'payment' | 'customer_debt' | 'supplier_debt';
  amount?: number;
  date?: Date;
  entityId?: string;
  entityName?: string;
  invoiceNumber?: string;
  discount?: number;
  bonus?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: string;
  category?: string;

  notes?: string;
  isHistorical: boolean;
  branchId?: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface MedicineRequest {
  id?: string;
  patientName: string;
  phone: string;
  medicineName: string;
  quantity: string;
  status: 'waiting' | 'provided' | 'notified';
  notes?: string;
  imageUrl?: string;
  branchId?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ExpiredDamagedLoss {
  id?: string;
  date: Date;
  lossType: 'expired' | 'damaged';
  itemName: string;
  quantity: number;
  purchasePrice: number;
  totalLoss: number;
  invoiceId?: string | null;
  notes?: string;
  branchId?: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Loan {
  id?: string;
  type: 'outgoing' | 'returned'; // سلفة صادرة | استرجاع سلفة
  partyName: string; // اسم الجهة أو الشخص
  amount: number;
  reason?: string; // سبب السلفة
  expectedReturnDate?: Date; // موعد الاسترجاع المتوقع
  status: 'open' | 'partially_returned' | 'fully_returned' | 'overdue'; // مفتوحة | مسترجعة جزئياً | مسترجعة بالكامل | متأخرة
  notes?: string;
  imageUrl?: string;
  imageUrls?: string[];
  parentLoanId?: string; // For returns, link to original loan
  date: Date;
  branchId: string;
  ownerId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface EntityActivity {
  id?: string;
  entityId: string;
  type: 'add_invoice' | 'update_invoice' | 'delete_invoice' | 'payment' | 'update_entity' | 'archive_entity' | 'delete_entity';
  action: string;
  details?: string;
  performedBy: string;
  createdAt: Date;
  updatedAt?: Date;
  ownerId: string;
  branchId?: string;
}

export interface OpeningCash {
  id?: string;
  date: Date;
  month: number;
  year: number;
  amount: number;
  branchId: string;
  notes?: string;
  source: 'previous_month' | 'leftover_cash' | 'internal_transfer' | 'other';
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierOpeningBalance {
  id?: string;
  supplierId: string;
  supplierName: string;
  supplierType: 'office' | 'scientific_office' | 'personal' | 'warehouse';
  openingAmount: number;
  paidAmount: number;
  remainingAmount: number;
  date: Date;
  branchId: string;
  userId: string;
  ownerId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemConfig {
  id: 'app_version' | 'config';
  appVersion: string;
  schemaVersion: string;
  updatedAt: Date;
  forceUpdate?: boolean;
  lastUpdatedAt?: Date; // keep for compatibility
  forceRefresh?: boolean; // keep for compatibility
}

export class PharmacyDatabase extends Dexie {
  transactions!: Table<Transaction>;
  entities!: Table<Entity>;
  ledgerEntries!: Table<LedgerEntry>;
  notifications!: Table<Notification>;
  users!: Table<AppUser>;
  systemLogs!: Table<SystemLog>;
  customerDebts!: Table<CustomerDebt>;
  deadlines!: Table<Deadline>;
  announcements!: Table<Announcement>;
  announcementReads!: Table<AnnouncementRead>;
  activationCodes!: Table<ActivationCode>;
  activationRequests!: Table<ActivationRequest>;
  recoveryRequests!: Table<RecoveryRequest>;
  bonuses!: Table<Bonus>;
  employees!: Table<Employee>;
  employeeAttendance!: Table<EmployeeAttendance>;
  branches!: Table<PharmacyBranch>;
  historicalRecords!: Table<HistoricalRecord>;
  medicineRequests!: Table<MedicineRequest>;
  expiredDamagedLosses!: Table<ExpiredDamagedLoss>;
  entityActivities!: Table<EntityActivity>;
  openingCash!: Table<OpeningCash>;
  supplierOpeningBalances!: Table<SupplierOpeningBalance>;
  loans!: Table<Loan>;
  systemConfig!: Table<SystemConfig>;

  constructor() {
    super('PharmacyDatabase');
    this.version(22).stores({
      transactions: '++id, type, incomeType, category, date, entityId, branchId, createdBy',
      entities: '++id, name, type, branchId, ownerId',
      ledgerEntries: '++id, accountId, date, operationType, purchaseType, branchId, ownerId',
      notifications: '++id, userId, type, read, branchId, createdAt',
      users: 'userId, email, username',
      systemLogs: '++id, type, ownerId, createdAt',
      customerDebts: '++id, customerName, status, saleDate, dueDate, branchId, ownerId',
      deadlines: '++id, accountId, invoiceId, status, dueDate, branchId, ownerId',
      announcements: '++id, isActive, createdAt',
      announcementReads: '++id, userId, announcementId',
      activationCodes: '++id, code, assignedEmail, isUsed',
      activationRequests: '++id, email, status',
      recoveryRequests: '++id, email, status',
      bonuses: '++id, entityId, status, dueDate, branchId, ownerId',
      employees: '++id, name, phone, branchId, ownerId',
      employeeAttendance: '++id, employeeId, date, branchId, ownerId',
      branches: '++id, name, status, ownerId',
      historicalRecords: '++id, type, startDate, endDate, branchId, ownerId',
      medicineRequests: '++id, patientName, phone, medicineName, status, branchId, ownerId',
      expiredDamagedLosses: '++id, date, lossType, invoiceId, branchId, ownerId',
      entityActivities: '++id, entityId, type, createdAt, performedBy, branchId, ownerId',
      openingCash: '++id, date, month, year, branchId, ownerId',
      supplierOpeningBalances: '++id, supplierId, date, branchId, ownerId',
      loans: '++id, type, partyName, date, parentLoanId, status, branchId, ownerId',
      systemConfig: 'id'
    });
  }
}

export const db = new PharmacyDatabase();
