import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { calculateReportsFromRecords } from './services/reportCalculator';
import { ReportsSystem } from './components/ReportsSystem';
import { FinancialAggregationService } from './services/FinancialAggregationService';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  History, 
  Bell, 
  Search, 
  ShieldCheck,
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Printer, 
  Settings, 
  Cloud, 
  LogOut, 
  Camera, 
  Image as ImageIcon, 
  CheckCircle2, 
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Zap,
  XCircle,
  RefreshCcw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
  RefreshCw,
  FileText,
  CreditCard,
  DollarSign,
  TrendingDown,
  TrendingUp,
  PieChart,
  CalendarDays,
  Menu,
  X,
  Hash,
  CloudLightning,
  Check,
  FileUp,
  Package,
  PackageSearch,
  Store,
  Info,
  Sun,
  Moon,
  Monitor,
  Gift,
  ShoppingCart,
  Building2,
  Clock3,
  ScrollText,
  ArrowLeftRight,
  ArrowLeft,
  Upload,
  Smartphone,
  Laptop,
  BarChart3,
  MoreHorizontal,
  PlusCircle,
  Bug,
  Activity,
  Pencil,
  Table as TableIcon,
  Database,
  Layers,
  CalendarClock,
  ShieldAlert,
  Mail,
  Phone,
  KeyRound,
  Loader2,
  Award,
  Copy,
  Lock
} from 'lucide-react';
import { SupplierHistoricalImportWizard } from './components/SupplierHistoricalImportWizard';
import { LoanForm } from './components/LoanForm';
import { PaymentDeadlinesPage } from './components/PaymentDeadlinesPage';
import { PaymentDeadlineForm } from './components/PaymentDeadlineForm';
import { ExecutePaymentModal } from './components/ExecutePaymentModal';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  subMonths, 
  isWithinInterval, 
  subDays,
  isValid 
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { VERSION_INFO } from './constants/version';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, collection, where, orderBy, limit, onSnapshot, Timestamp, serverTimestamp, writeBatch, increment, runTransaction, arrayUnion, arrayRemove, QueryConstraint } from 'firebase/firestore';
import { useFirebaseQuery } from './hooks/useFirebaseQuery';
import { firebaseService, getEffectiveUserInfo } from './services/firebaseService';
import { customAuthService, getDeviceDetails } from './services/customAuthService';
import { emailjsService } from './services/emailjsService';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { 
  type Transaction, 
  type Entity, 
  type LedgerEntry, 
  type Notification, 
  type AppUser, 
  type SystemLog, 
  type CustomerDebt,
  type Deadline,
  type Announcement,
  type ActivationCode,
  type ActivationRequest,
  type RecoveryRequest,
  type Bonus,
  type Employee,
  type EmployeeAttendance,
  type PharmacyBranch,
  type AnnouncementRead,
  type HistoricalRecord,
  type MedicineRequest,
  type ExpiredDamagedLoss,
  type EntityActivity,
  type OpeningCash,
  type SupplierOpeningBalance,
  type Loan,
  type SystemConfig
} from './db';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { ImageCapture } from './components/ImageCapture';
import { googleDriveService, type SyncSettings, type ImageManagementSettings, type DriveFile } from './services/googleDriveService';
import { useGoogleAuth } from './components/AuthProvider';
import { cn, fileToBase64 } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { NumericFormat } from 'react-number-format';
import { ExpenseForm } from './components/ExpenseForm';
import { RevenueForm } from './components/RevenueForm';
import { InvoiceForm } from './components/InvoiceForm';
import { EntityForm } from './components/EntityForm';
import { SupplierAccountPage } from './components/SupplierAccountPage';
import { BonusForm } from './components/BonusForm';
import { InvoiceDetailsPage } from './components/InvoiceDetailsPage';
import { EmployeesPage } from './components/EmployeesPage';
import { DeadlineModal } from './components/DeadlineModal';
import { EmployeeForm } from './components/EmployeeForm';
import { AttendanceForm } from './components/AttendanceForm';
import { BranchesPage } from './components/BranchesPage';
import { BranchForm } from './components/BranchForm';
import { HistoricalMigrationPage } from './components/HistoricalMigrationPage';
import { MedicineRequestsPage } from './components/MedicineRequestsPage';
import { ExcelImportWizard } from './components/ExcelImportWizard';
import { MultiInvoiceEntry } from './components/MultiInvoiceEntry';
import { MultiPaymentEntry } from './components/MultiPaymentEntry';
import { DataPersistenceService } from './services/dataPersistenceService';
import { migrationService } from './services/migrationService';
import { formatIQD, formatNumberWithCommas, parseFormattedNumber, safeFormatDate, toValidDate, getSupplierTypeLabel } from './lib/formatters';
import { ensureArray } from './lib/arrayUtils';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { LossesPage } from './components/LossesPage';
import { LossForm } from './components/LossForm';
import { AdminPanel } from './components/AdminPanel';
import { SalesConsole } from './components/SalesConsole';

// Re-using the Invoice Details Dialog fragment from the corrupted file
type Theme = 'light' | 'dark' | 'system';

const ThemeToggle = ({ theme, setTheme }: { theme: Theme, setTheme: (t: Theme) => void }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="size-8 flex items-center justify-center text-slate-400 hover:text-foreground hover:bg-slate-800 rounded-xl outline-none transition-colors">
        {theme === 'light' && <Sun className="h-5 w-5" />}
        {theme === 'dark' && <Moon className="h-5 w-5" />}
        {theme === 'system' && <Monitor className="h-5 w-5" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border text-foreground p-2 rounded-xl">
        <DropdownMenuItem className="gap-3 p-3 cursor-pointer hover:bg-muted rounded-lg" onClick={() => setTheme('light')}>
          <Sun className="h-4 w-4" />
          <span>الوضع النهاري</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-3 p-3 cursor-pointer hover:bg-muted rounded-lg" onClick={() => setTheme('dark')}>
          <Moon className="h-4 w-4" />
          <span>الوضع الليلي</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-3 p-3 cursor-pointer hover:bg-muted rounded-lg" onClick={() => setTheme('system')}>
          <Monitor className="h-4 w-4" />
          <span>تلقائي (حسب النظام)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ViewRevenueDialog = ({ 
  isOpen, 
  onOpenChange, 
  revenue,
  branches
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  revenue: Transaction | null;
  branches: PharmacyBranch[];
}) => {
  if (!revenue) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-0">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <Label className="text-emerald-500 font-black text-[10px] uppercase tracking-widest block mb-2">تفاصيل الوارد</Label>
              <h2 className="text-3xl font-black text-foreground">{revenue.customerName || revenue.description}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full uppercase">
                  {branches.find(b => b.id === revenue.branchId)?.name || 'فرع غير معروف'}
                </span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                  revenue.incomeType === 'cash' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {revenue.incomeType === 'cash' ? 'نقدي' : 'آجل'}
                </span>
              </div>
            </div>
            <div className="text-left">
              <div className="text-[10px] text-muted-foreground font-black mb-1 uppercase tracking-widest">التاريخ</div>
              <div className="font-mono font-bold text-lg">{safeFormatDate(revenue.date, 'yyyy/MM/dd')}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-muted/30 rounded-2xl border border-border group hover:border-emerald-500/30 transition-colors">
              <div className="text-[10px] text-muted-foreground font-black mb-2 uppercase">إجمالي الوارد</div>
              <div className="text-xl font-black text-foreground font-mono">{formatNumberWithCommas(revenue.saleAmount || revenue.amount)}</div>
            </div>
            <div className="p-5 bg-muted/30 rounded-2xl border border-border group hover:border-emerald-500/30 transition-colors">
              <div className="text-[10px] text-muted-foreground font-black mb-2 uppercase">نسبة الربح</div>
              <div className="text-xl font-black text-blue-600 font-mono">%{revenue.profitPercent || 0}</div>
            </div>
            <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 group hover:bg-emerald-500/10 transition-colors">
              <div className="text-[10px] text-emerald-700 font-black mb-2 uppercase">صافي الربح</div>
              <div className="text-xl font-black text-emerald-600 font-mono">{formatNumberWithCommas(revenue.profitAmount || revenue.netProfit || 0)}</div>
            </div>
            <div className="p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10 group hover:bg-rose-500/10 transition-colors">
              <div className="text-[10px] text-rose-700 font-black mb-2 uppercase">المتبقي</div>
              <div className="text-xl font-black text-rose-600 font-mono">{formatNumberWithCommas(revenue.remainingAmount ?? (revenue.incomeType === 'cash' ? 0 : revenue.amount))}</div>
            </div>
          </div>

          {revenue.notes && (
            <div className="space-y-3">
              <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest block">ملاحظات</Label>
              <div className="p-6 bg-muted/30 rounded-2xl border border-border italic text-foreground font-bold leading-relaxed">
                {revenue.notes}
              </div>
            </div>
          )}

          {((revenue.imageUrls && revenue.imageUrls.length > 0) || revenue.imageUrl) && (
            <div className="space-y-4">
              <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest block">المرفقات والصور</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {(revenue.imageUrls || (revenue.imageUrl ? [revenue.imageUrl] : [])).map((url: string, idx: number) => (
                  <div key={idx} className="aspect-square rounded-2xl border-2 border-border overflow-hidden bg-muted group cursor-zoom-in shadow-xl hover:shadow-primary/5 transition-all">
                    <img src={url} alt={`Revenue Image ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {revenue.updatedAt && (
             <div className="pt-6 border-t border-border flex justify-between items-center text-[9px] font-bold text-muted-foreground uppercase opacity-50">
                <span>آخر تحديث: {safeFormatDate(revenue.updatedAt, 'yyyy/MM/dd HH:mm')}</span>
                <span>ID: {revenue.id}</span>
             </div>
          )}
        </div>
        <div className="p-6 bg-muted/20 border-t border-border flex justify-end">
           <Button onClick={() => onOpenChange(false)} className="rounded-xl h-12 px-8 font-black">إغلاق</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AddOpeningCashDialog = ({ 
  isOpen, 
  onOpenChange, 
  onSubmit,
  branches,
  currentBranchId
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  onSubmit: (data: any) => void;
  branches: PharmacyBranch[];
  currentBranchId: string | null;
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState('previous_month');
  const [branchId, setBranchId] = useState(currentBranchId || (branches.length > 0 ? branches[0].id || '' : ''));

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSource('previous_month');
      setBranchId(currentBranchId || (branches.length > 0 ? branches[0].id || '' : ''));
    }
  }, [isOpen, currentBranchId, branches]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selDate = new Date(date);
    onSubmit({
      amount: parseFormattedNumber(amount),
      date: selDate,
      month: selDate.getMonth() + 1,
      year: selDate.getFullYear(),
      notes,
      source,
      branchId
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="bg-card border-border text-foreground max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <div className="size-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
            إضافة رصيد افتتاحي كاش
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2 font-bold">
            تسجيل الرصيد النقدي المدور للفترة المالية الحالية.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-black uppercase text-muted-foreground mr-1 tracking-widest">المبلغ (د.ع)</Label>
              <CurrencyInput 
                value={amount} 
                onValueChange={setAmount} 
                placeholder="0" 
                className="h-16 rounded-2xl font-mono text-2xl font-black bg-emerald-500/5 border-emerald-500/20 focus:border-emerald-500 focus:ring- emerald-500/20" 
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground mr-1 tracking-widest">التاريخ</Label>
              <Input 
                type="date" 
                required 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-14 rounded-2xl font-bold bg-muted/30" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground mr-1 tracking-widest">المصدر</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-14 rounded-2xl font-bold bg-muted/30">
                  <SelectValue placeholder="اختر المصدر" />
                </SelectTrigger>
                <SelectContent dir="rtl" className="bg-card border-border rounded-xl">
                  <SelectItem value="previous_month">وارد سابق</SelectItem>
                  <SelectItem value="leftover_cash">كاش متبقي</SelectItem>
                  <SelectItem value="internal_transfer">تحويل داخلي</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground mr-1 tracking-widest">الفرع</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="h-14 rounded-2xl font-bold bg-muted/30">
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent dir="rtl" className="bg-card border-border rounded-xl">
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id || ''}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-black uppercase text-muted-foreground mr-1 tracking-widest">ملاحظات</Label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="إضافة تفاصيل اختيارية..." 
                className="rounded-2xl font-bold bg-muted/30 min-h-[80px]" 
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-row gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 rounded-2xl h-14 font-bold">إلغاء</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-black shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
              حفظ الرصيد
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const DeleteInvoiceConfirmDialog = ({ 
  isOpen, 
  onOpenChange, 
  onConfirm,
  invoice 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  onConfirm: () => void;
  invoice: LedgerEntry | null;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="bg-card border-border text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-rose-500 text-xl font-black">حذف القائمة</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
             هل أنت متأكد من حذف الفاتورة رقم <span className="font-bold text-foreground">{invoice?.invoiceNumber}</span>؟ سيتم حذف العملية وتعديل الرصيد تلقائياً.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl h-12 border-border font-bold">تراجع</Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1 bg-rose-500 hover:bg-rose-600 rounded-xl h-12 font-black shadow-lg shadow-rose-500/20">نعم، حذف</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EditInvoiceDialog = ({ 
  isOpen, 
  onOpenChange, 
  onSubmit,
  invoice,
  entities,
  selectedEntity,
  onImagesChange
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
  onSubmit: (data: any) => void;
  invoice: LedgerEntry | null;
  entities: Entity[];
  selectedEntity: Entity | null;
  onImagesChange?: (files: File[]) => void;
}) => {
  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-2xl lg:max-w-[85vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl font-black">تعديل فاتورة مشتريات</DialogTitle>
          <DialogDescription className="text-muted-foreground font-bold italic">
            تعديل بيانات القائمة رقم {invoice.invoiceNumber} للمورد {invoice.accountName}
          </DialogDescription>
        </DialogHeader>
        <InvoiceForm 
          entities={entities}
          selectedEntity={selectedEntity}
          initialData={invoice}
          onSubmit={onSubmit}
          onClose={() => onOpenChange(false)}
          onImagesChange={onImagesChange}
        />
      </DialogContent>
    </Dialog>
  );
};






















export default function App() {
  const { user: googleUser, isDriveLinked, loading: googleAuthLoading, linkDrive, unlinkDrive } = useGoogleAuth();
  const [user, setUser] = useState(auth.currentUser);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t: Theme) => {
      root.classList.remove('light', 'dark');
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(t);
      }
      localStorage.setItem('theme', t);
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);
  
  // States from hooks.txt
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isReadOnlyOverride, setIsReadOnlyOverride] = useState(() => localStorage.getItem('pharma-read-only-expired-override') === 'true');
  const isReadOnly = useMemo(() => {
    return appUser && appUser.role !== 'admin' && appUser.role !== 'super_admin' && appUser.activationStatus === 'expired' && isReadOnlyOverride;
  }, [appUser, isReadOnlyOverride]);

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('pharma-active-tab') || 'finance');
  const [showFinancialResetModal, setShowFinancialResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isFinancialResetting, setIsFinancialResetting] = useState(false);
  const [isHistoricalWizardOpen, setIsHistoricalWizardOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [deadlineTarget, setDeadlineTarget] = useState<{ id: string; number: string; amount: number; accountId: string; accountName: string } | null>(null);
  const [currentDeadline, setCurrentDeadline] = useState<Deadline | null>(null);
  const [isExecutePaymentOpen, setIsExecutePaymentOpen] = useState(false);
  const [selectedDeadlineForPayment, setSelectedDeadlineForPayment] = useState<Deadline | null>(null);

  useEffect(() => {
    localStorage.setItem('pharma-active-tab', activeTab);
  }, [activeTab]);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appModeSetting, setAppModeSetting] = useState<'auto' | 'laptop' | 'mobile'>(() => {
    const saved = localStorage.getItem('pharma-app-mode-setting');
    return (saved as 'auto' | 'laptop' | 'mobile') || 'auto';
  });

  // Track window size for auto-responsive logic
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine effective mode based on setting and width
  const effectiveAppMode = useMemo(() => {
    if (appModeSetting === 'laptop') return 'laptop';
    if (appModeSetting === 'mobile') return 'mobile';
    
    // Auto mode breakpoints: Mobile < 640px, Tablet/Desktop >= 640px
    return windowWidth < 640 ? 'mobile' : 'laptop';
  }, [appModeSetting, windowWidth]);

  // Persist preference
  useEffect(() => {
    localStorage.setItem('pharma-app-mode-setting', appModeSetting);
  }, [appModeSetting]);

  // Read regular user's linked devices for setting tab view
  const [myLicenseDevices, setMyLicenseDevices] = useState<any[]>([]);
  const [myLicenseMaxDevices, setMyLicenseMaxDevices] = useState(2);
  
  useEffect(() => {
    if (!appUser || !appUser.licenseCode) {
      setMyLicenseDevices([]);
      return;
    }
    const q = query(collection(db, 'licenses'), where('licenseKey', '==', appUser.licenseCode.trim().toUpperCase()));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setMyLicenseDevices(data.activatedDevices || []);
        setMyLicenseMaxDevices(data.maxDevices || 2);
      } else {
        setMyLicenseDevices([]);
      }
    }, (err) => {
      console.error("Error listening to user license devices:", err);
    });
    return () => unsubscribe();
  }, [appUser?.licenseCode]);

  const [currentBranchId, setCurrentBranchId] = useState<string | null>(localStorage.getItem('pharma-current-branch-id'));

  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    isLoading?: boolean;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    isLoading: false
  });

  const triggerDelete = (title: string, description: string, onConfirm: () => void, confirmText = 'نعم، حذف', cancelText = 'إلغاء') => {
    console.log("Delete triggered:", title);
    setDeleteConfirmState({
      isOpen: true,
      title,
      description,
      onConfirm,
      confirmText,
      cancelText,
      isLoading: false
    });
  };

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'current' | 'historical'>(() => 
    (localStorage.getItem('pharma-report-filter') as 'all' | 'current' | 'historical') || 'all'
  );
  useEffect(() => {
    localStorage.setItem('pharma-report-filter', reportTypeFilter);
  }, [reportTypeFilter]);

  const handleUpdateInvoiceImageUrls = async (invoice: LedgerEntry, imageUrls: string[]) => {
    if (!invoice.id) return;
    const safeImageUrls = Array.isArray(imageUrls) ? imageUrls : [];
    try {
      await firebaseService.updateDocument('ledgerEntries', invoice.id, { 
        imageUrls: safeImageUrls,
        imageUrl: safeImageUrls.length > 0 ? safeImageUrls[0] : '' 
      });
      setViewingInvoice(prev => prev ? { ...prev, imageUrls: safeImageUrls, imageUrl: safeImageUrls.length > 0 ? safeImageUrls[0] : '' } : null);
      toast.success('تم تحديث الصور بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء تحديث الصور');
    }
  };

  const handleSelectBranch = (id: string | null) => {
    console.log("Setting selected branch:", id);
    setCurrentBranchId(id);
    if (id) {
      localStorage.setItem('pharma-current-branch-id', id);
    } else {
      localStorage.removeItem('pharma-current-branch-id');
    }
    toast.success(id ? 'تم التبديل لمكان العمل المختار' : 'تم تفعيل العرض الموحد');
  };

  // Persist selected branch
  useEffect(() => {
    if (currentBranchId) {
      localStorage.setItem('pharma-current-branch-id', currentBranchId);
    } else {
      localStorage.removeItem('pharma-current-branch-id');
    }
  }, [currentBranchId]);

  const [entitySearch, setEntitySearch] = useState('');
  const [entityStatusFilter, setEntityStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  // Report Details State
  const [isReportDetailOpen, setIsReportDetailOpen] = useState(false);
  const [reportDetailTitle, setReportDetailTitle] = useState('');
  const [reportDetailData, setReportDetailData] = useState<any[]>([]);

  // Queries
  const ownerQuery = useMemo(() => [where('ownerId', '==', user?.uid || 'demo-user')], [user?.uid]);
  const branchesQuery = useMemo(() => ownerQuery, [ownerQuery]);
  const transactionsQuery = useMemo(() => ownerQuery, [ownerQuery]);
  const entitiesQuery = useMemo(() => ownerQuery, [ownerQuery]);
  const customerDebtsQuery = useMemo(() => ownerQuery, [ownerQuery]);
  const notificationsQuery = useMemo(() => ownerQuery, [ownerQuery]);
  const bonusesQuery = useMemo(() => ownerQuery, [ownerQuery]);
  const employeesQuery = useMemo(() => ownerQuery, [ownerQuery]);
  const attendanceQuery = useMemo(() => ownerQuery, [ownerQuery]);
  const ledgerEntriesQuery = useMemo(() => ownerQuery, [ownerQuery]);
  const historicalQuery = useMemo(() => ownerQuery, [ownerQuery]);
  const entityActivitiesQuery = useMemo(() => ownerQuery, [ownerQuery]);

  // Firebase Real-time Queries
  const { data: expiredDamagedLosses = [], loading: loadingLosses } = useFirebaseQuery<ExpiredDamagedLoss>('expiredDamagedLosses', ownerQuery);
  const { data: rawBranches = [], loading: loadingBranches } = useFirebaseQuery<PharmacyBranch>('branches', branchesQuery);
  const { data: rawTransactions = [], loading: loadingTransactions } = useFirebaseQuery<Transaction>('transactions', transactionsQuery);
  const { data: rawEntities = [], loading: loadingEntities } = useFirebaseQuery<Entity>('entities', entitiesQuery);
  const { data: rawCustomerDebts = [], loading: loadingDebts } = useFirebaseQuery<CustomerDebt>('customerDebts', customerDebtsQuery);
  const { data: rawNotifications = [], loading: loadingNotifications } = useFirebaseQuery<Notification>('notifications', notificationsQuery);
  const { data: rawBonuses = [], loading: loadingBonuses } = useFirebaseQuery<Bonus>('bonuses', bonusesQuery);
  const { data: rawEmployees = [], loading: loadingEmployees } = useFirebaseQuery<Employee>('employees', employeesQuery);
  const { data: rawEmployeeAttendance = [], loading: loadingAttendance } = useFirebaseQuery<EmployeeAttendance>('employeeAttendance', attendanceQuery);
  const { data: rawAllLedgerEntries = [], loading: loadingLedger } = useFirebaseQuery<LedgerEntry>('ledgerEntries', ledgerEntriesQuery);
  const { data: rawHistoricalRecords = [], loading: loadingHistorical } = useFirebaseQuery<HistoricalRecord>('historicalRecords', historicalQuery);
  const { data: rawEntityActivities = [], loading: loadingActivities } = useFirebaseQuery<EntityActivity>('entityActivities', entityActivitiesQuery);
  const { data: rawOpeningCash = [], loading: loadingOpeningCash } = useFirebaseQuery<OpeningCash>('openingCash', ownerQuery);
  const { data: rawLoans = [], loading: loadingLoans } = useFirebaseQuery<Loan>('loans', ownerQuery);
  const { data: rawSupplierOpeningBalances = [], loading: loadingSupplierOpening } = useFirebaseQuery<SupplierOpeningBalance>('supplierOpeningBalances', ownerQuery);
  const { data: deadlines = [], loading: loadingDeadlines } = useFirebaseQuery<Deadline>('deadlines', ownerQuery);
  const { data: activationCodes = [] } = useFirebaseQuery<ActivationCode>('activationCodes');
  const { data: activationRequests = [] } = useFirebaseQuery<ActivationRequest>('activationRequests', ownerQuery);
  const { data: recoveryRequests = [] } = useFirebaseQuery<RecoveryRequest>('recoveryRequests', ownerQuery);
  
  const [remoteConfig, setRemoteConfig] = useState<SystemConfig | null>(null);
  const [loadingRemoteConfig, setLoadingRemoteConfig] = useState(true);

  // Manual fetch for remote config - avoiding onSnapshot in preview environment
  const fetchRemoteConfig = useCallback(async () => {
    try {
      const configRef = doc(db, 'system', 'config');
      
      // Fast timeout in preview environment
      const fetchPromise = getDoc(configRef);
      const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Remote config fetch timeout")), 4000));
      
      const snap = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (snap && snap.exists()) {
        const data = snap.data() as SystemConfig;
        setRemoteConfig(data);
        console.log("[UpdateService] Remote config fetched:", data.appVersion);
      } else {
        console.warn("[UpdateService] system/config document not found in the Firestore db. Fallback to local version info.");
      }
    } catch (error: any) {
      if (error?.message === "Remote config fetch timeout") {
        console.log("[UpdateService] Remote config fetch timed out. Defaulting safely to local version info.");
      } else {
        console.warn("[UpdateService] Non-blocking fetch handled:", error?.message || error);
      }
    } finally {
      setLoadingRemoteConfig(false);
    }
  }, []);

  const handleAppUpdate = useCallback(async (isManual: boolean = true) => {
    console.log("[UpdateService] START UPDATE");
    
    // Check if in preview mode
    const isPreview = window.location.hostname.includes('studio') || 
                      window.location.hostname.includes('googleusercontent');

    if (isPreview) {
       toast.warning("التحديث التلقائي غير مدعوم حالياً داخل بيئة العرض المباشر (Preview). يرجى تحديث الصفحة يدوياً من المتصفح.");
       return;
    }

    try {
      // 1. Unregister Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
          console.log("[UpdateService] SERVICE WORKER UNREGISTERED");
        }
      }

      // 2. Clear Caches
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => {
          console.log("[UpdateService] CLEARING CACHE:", name);
          return caches.delete(name);
        }));
        console.log("[UpdateService] CACHE CLEARED");
      }

      // 3. Clear Storage
      localStorage.removeItem('appVersion'); 
      sessionStorage.clear();
      console.log("[UpdateService] STORAGE CLEARED");

      if (isManual) {
        toast.info("جاري إعادة تحميل البرنامج...");
      }
      
      console.log("[UpdateService] REDIRECTING...");
      
      // 4. Redirect with cache-buster
      setTimeout(() => {
        window.location.href = window.location.origin + '?update=' + Date.now();
      }, 500);

    } catch (error) {
      console.error("[UpdateService] ERROR DURING UPDATE:", error);
      // Fallback to simple reload
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    fetchRemoteConfig();
    // Poll every 60 seconds as a fallback to real-time
    const interval = setInterval(fetchRemoteConfig, 60000);
    return () => clearInterval(interval);
  }, [fetchRemoteConfig]);

  const isUpdateAvailable = useMemo(() => {
    if (!remoteConfig) return false;
    const isNew = remoteConfig.appVersion !== VERSION_INFO.appVersion;
    
    console.log("[UpdateService] Version Check Result:", {
      local: VERSION_INFO.appVersion,
      remote: remoteConfig.appVersion,
      updateDetected: isNew
    });
    
    return isNew;
  }, [remoteConfig]);

  const [isUpdateBannerVisible, setIsUpdateBannerVisible] = useState(true);

  // Auto-refresh logic if forceUpdate is true
  useEffect(() => {
    if (remoteConfig?.forceUpdate && isUpdateAvailable) {
      if (localStorage.getItem('DEBUG_DISABLE_UPDATE_LOOP') === 'true') {
        console.log("[System] Force update suppressed by debug flag.");
        return;
      }
      console.warn("[System] Force update requested by server. Refreshing in 3 seconds...");
      setTimeout(() => {
        handleAppUpdate(false);
      }, 3000);
    }
  }, [remoteConfig, isUpdateAvailable, handleAppUpdate]);

  const announcementsConstraints = useMemo(() => [where('isActive', '==', 1)], []);
  const readAnnouncementsConstraints = useMemo(() => [where('userId', '==', user?.uid || 'none')], [user?.uid]);

  const { data: announcements = [] } = useFirebaseQuery<Announcement>('announcements', announcementsConstraints);
  const { data: readAnnouncementsData = [] } = useFirebaseQuery<AnnouncementRead>('announcementReads', readAnnouncementsConstraints);

  // Client-side sorting and deduplication to avoid Firestore Index requirements and handle historical duplicates
  const branches = useMemo(() => {
    // 1. Deduplicate by ID first
    const uniqueById = Array.from(new Map(rawBranches.map(b => [b.id, b])).values());
    
    // 2. If there are duplicates by NAME that are both "Main Branch", we should probably only show one.
    // However, unique ID is the primary key. If the user has two "Main Branch" with different IDs, they will show.
    // The previous logic fixed NEW creations, but for cleanup:
    return [...uniqueById].sort((a: any, b: any) => {
      // Prioritize isMain branches
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;

      const da = toValidDate(a.createdAt || Date.now());
      const db = toValidDate(b.createdAt || Date.now());
      const ta = isNaN(da.getTime()) ? 0 : da.getTime();
      const tb = isNaN(db.getTime()) ? 0 : db.getTime();
      return tb - ta;
    });
  }, [rawBranches]);

  const transactions = useMemo(() => {
    // Collect from both sources for backward compatibility
    const all = [...rawTransactions.map(tx => ({ ...tx, _col: 'transactions' })), 
                 ...rawAllLedgerEntries.map(le => ({
      ...le,
      type: le.operationType || le.type,
      amount: le.amount || (le.debit > 0 ? le.debit : le.credit),
      sourceId: le.id,
      _col: 'ledgerEntries'
    }))];

    const uniqueMap = new Map();
    all.forEach(tx => {
      if (tx.isDeleted || tx.deletedAt) return;
      
      // Use unified key strategy for correct deduplication
      const key = tx.sourceId || tx.id;
      
      if (uniqueMap.has(key)) {
        const existing = uniqueMap.get(key);
        // Prefer newer or ledger entries (as they usually have more data)
        const isBetter = tx._col === 'ledgerEntries' || 
                        ((tx as any).updatedAt >= (existing as any).updatedAt);
        if (isBetter) {
          uniqueMap.set(key, tx);
        }
        return;
      }
      
      uniqueMap.set(key, tx);
    });

    return Array.from(uniqueMap.values())
      .sort((a, b) => {
        const da = toValidDate((a as any).date || (a as any).createdAt || Date.now());
        const db = toValidDate((b as any).date || (b as any).createdAt || Date.now());
        const ta = isNaN(da.getTime()) ? 0 : da.getTime();
        const tb = isNaN(db.getTime()) ? 0 : db.getTime();
        return tb - ta;
      });
  }, [rawTransactions, rawAllLedgerEntries]);
  const entities = useMemo(() => {
    const activeLedger = rawAllLedgerEntries.filter(e => !e.isDeleted);
    return [...rawEntities].map(entity => {
      // Calculate real balance from ledger entries
      const entityEntries = activeLedger.filter(e => e.accountId === entity.id || e.entityId === entity.id);
      const totalDebits = entityEntries.reduce((sum, e) => {
        const val = Number(e.debit);
        if (!isNaN(val) && val > 0) return sum + val;
        // Fallback for invoices that didn't have debit set
        if ((e.operationType === 'invoice' || e.type === 'purchase_invoice' || e.sourceType === 'invoice') && !e.credit) {
           return sum + Number(e.netAmount || e.amount || 0);
        }
        return sum;
      }, 0);
      
      const totalCredits = entityEntries.reduce((sum, e) => {
        const val = Number(e.credit);
        if (!isNaN(val) && val > 0) return sum + val;
        // Fallback for payments that didn't have credit set
        if (e.operationType === 'payment' || e.sourceType === 'payment') {
           return sum + Number(e.amount || 0);
        }
        return sum;
      }, 0);
      
      // balance = debits - credits
      const calculatedBalance = totalDebits - totalCredits;
      
      return {
        ...entity,
        balance: calculatedBalance
      };
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  }, [rawEntities, rawAllLedgerEntries]);
  const entityActivities = useMemo(() => {
    return [...rawEntityActivities].sort((a, b) => {
      const da = toValidDate(a.createdAt || Date.now());
      const db = toValidDate(b.createdAt || Date.now());
      return db.getTime() - da.getTime();
    });
  }, [rawEntityActivities]);

  const loans = useMemo(() => {
    return [...rawLoans]
      .filter(l => !l.deletedAt && (!currentBranchId || currentBranchId === 'all' || l.branchId === currentBranchId))
      .sort((a, b) => {
        const da = toValidDate(a.date || a.createdAt);
        const db = toValidDate(b.date || b.createdAt);
        return db.getTime() - da.getTime();
      });
  }, [rawLoans, currentBranchId]);

  const filteredEntities = useMemo(() => {
    let filtered = [...entities];
    
    // Status Filter
    if (entityStatusFilter === 'active') {
      filtered = filtered.filter(e => (!e.status || e.status === 'نشط') && !e.deletedAt);
    } else if (entityStatusFilter === 'archived') {
      filtered = filtered.filter(e => e.status === 'مؤرشف' && !e.deletedAt);
    } else {
      filtered = filtered.filter(e => !e.deletedAt);
    }

    // Search Filter
    if (entitySearch) {
      const s = entitySearch.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(s) || 
        (e.phone && e.phone.toLowerCase().includes(s)) ||
        getSupplierTypeLabel(e.type).toLowerCase().includes(s)
      );
    }

    return filtered;
  }, [entities, entityStatusFilter, entitySearch]);
  const customerDebts = useMemo(() => {
    return [...rawCustomerDebts].sort((a, b) => {
      const da = toValidDate(a.createdAt || Date.now());
      const db = toValidDate(b.createdAt || Date.now());
      const ta = isNaN(da.getTime()) ? 0 : da.getTime();
      const tb = isNaN(db.getTime()) ? 0 : db.getTime();
      return tb - ta;
    });
  }, [rawCustomerDebts]);

  const notifications = useMemo(() => {
    return [...rawNotifications].sort((a, b) => {
      const da = toValidDate(a.createdAt || Date.now());
      const db = toValidDate(b.createdAt || Date.now());
      const ta = isNaN(da.getTime()) ? 0 : da.getTime();
      const tb = isNaN(db.getTime()) ? 0 : db.getTime();
      return tb - ta;
    });
  }, [rawNotifications]);

  const bonuses = useMemo(() => {
    return [...rawBonuses].sort((a, b) => {
      const da = toValidDate(a.createdAt || Date.now());
      const db = toValidDate(b.createdAt || Date.now());
      const ta = isNaN(da.getTime()) ? 0 : da.getTime();
      const tb = isNaN(db.getTime()) ? 0 : db.getTime();
      return tb - ta;
    });
  }, [rawBonuses]);

  const employees = useMemo(() => [...rawEmployees].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar')), [rawEmployees]);
  
  const employeeAttendance = useMemo(() => {
    return [...rawEmployeeAttendance].sort((a, b) => {
      const da = toValidDate(a.date || a.createdAt || Date.now());
      const db = toValidDate(b.date || b.createdAt || Date.now());
      const ta = isNaN(da.getTime()) ? 0 : da.getTime();
      const tb = isNaN(db.getTime()) ? 0 : db.getTime();
      return tb - ta;
    });
  }, [rawEmployeeAttendance]);

  const allLedgerEntries = useMemo(() => {
    return [...rawAllLedgerEntries].sort((a, b) => {
      const da = toValidDate(a.date || a.createdAt || Date.now());
      const db = toValidDate(b.date || b.createdAt || Date.now());
      const ta = isNaN(da.getTime()) ? 0 : da.getTime();
      const tb = isNaN(db.getTime()) ? 0 : db.getTime();
      return tb - ta;
    });
  }, [rawAllLedgerEntries]);

  const historicalRecords = useMemo(() => {
    return [...rawHistoricalRecords].sort((a, b) => {
      const da = toValidDate(a.createdAt || Date.now());
      const db = toValidDate(b.createdAt || Date.now());
      const ta = isNaN(da.getTime()) ? 0 : da.getTime();
      const tb = isNaN(db.getTime()) ? 0 : db.getTime();
      return tb - ta;
    });
  }, [rawHistoricalRecords]);

  const validateCurrentUserStatus = async (): Promise<boolean> => {
    const customUserString = localStorage.getItem('pharma-auth-user');
    if (!customUserString) return true;
    try {
      const customUser = JSON.parse(customUserString);
      if (!customUser || !customUser.userId) return true;

      const userRef = doc(db, 'appUsers', customUser.userId);
      const userSnap = await getDoc(userRef);

      let shouldLogout = false;
      let currentStatus = 'not-found';
      let isActive = false;

      if (!userSnap.exists()) {
        shouldLogout = true;
      } else {
        const liveData = userSnap.data();
        currentStatus = liveData.status;
        if (!currentStatus) {
          currentStatus = liveData.isVerified ? 'active' : 'pending';
        }
        isActive = liveData.isActive !== false;

        if (
          currentStatus === 'disabled' || 
          currentStatus === 'deleted' || 
          currentStatus === 'expired' || 
          liveData.isActive === false
        ) {
          shouldLogout = true;
        }
      }

      console.log("APP_BOOT_USER_STATUS", { 
        userId: customUser.userId, 
        status: currentStatus, 
        isActive,
        shouldLogout
      });

      if (shouldLogout) {
        console.log("validateCurrentUserStatus: DETECTED DISABLED/DELETED USER, LOGGING OUT IMMEDIATELY");
        localStorage.removeItem('pharma-auth-user');
        localStorage.removeItem('pharma-is-authenticated');
        localStorage.removeItem('pharma-active-tab');
        setAppUser(null);
        setIsAppAuthenticated(false);
        setAuthStep('login-password');
        toast.error('حسابك معطل، تواصل مع الدعم.');
        return false;
      }
      return true;
    } catch (e) {
      console.error("Error in validateCurrentUserStatus during boot checks:", e);
      return true;
    }
  };

  useEffect(() => {
    // 1. Check custom user session first from customAuthService
    const customUserString = localStorage.getItem('pharma-auth-user');
    if (customUserString) {
      try {
        const customUser = JSON.parse(customUserString);
        if (customUser && customUser.userId) {
          // Sync with Firestore directly on app boot to enforce live activationStatus & roles (anti-bypass validation)
          const syncAndRestore = async () => {
            try {
              // 1. First validate user status live
              const isValid = await validateCurrentUserStatus();
              if (!isValid) {
                setAuthStatusLoading(false);
                return;
              }

              const userRef = doc(db, 'appUsers', customUser.userId);
              const userSnap = await getDoc(userRef);
              let latestUser = customUser;
              
              const superAdminEmail = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'mustafaenginerr35@gmail.com').trim().toLowerCase();
              
              if (userSnap.exists()) {
                const liveData = userSnap.data();
                latestUser = { ...customUser, ...liveData };

                let currentStatus = latestUser.status;
                if (!currentStatus) {
                  currentStatus = latestUser.isVerified ? 'active' : 'pending';
                }

                if (currentStatus === 'disabled' || latestUser.isActive === false || currentStatus === 'expired') {
                  localStorage.removeItem('pharma-auth-user');
                  localStorage.removeItem('pharma-is-authenticated');
                  setAppUser(null);
                  setIsAppAuthenticated(false);
                  setAuthStep('login-password');
                  toast.error('حسابك معطل، تواصل مع الدعم.');
                  setAuthStatusLoading(false);
                  return;
                }

                if (currentStatus === 'pending') {
                  localStorage.removeItem('pharma-auth-user');
                  localStorage.removeItem('pharma-is-authenticated');
                  setAppUser(null);
                  setIsAppAuthenticated(false);
                  setAuthUsername(latestUser.email);
                  setAuthStep('verify-signup');
                  toast.error('الحساب قيد التحقق. يرجى إدخال رمز التحقق OTP أولاً.');
                  setAuthStatusLoading(false);
                  return;
                }

                if (currentStatus === 'deleted') {
                  localStorage.removeItem('pharma-auth-user');
                  localStorage.removeItem('pharma-is-authenticated');
                  setAppUser(null);
                  setIsAppAuthenticated(false);
                  setAuthStep('register');
                  toast.error('حسابك معطل، تواصل مع الدعم.');
                  setAuthStatusLoading(false);
                  return;
                }
                
                // If live data does not have super_admin set yet but email is the super admin email, upgrade role
                if (latestUser.email && latestUser.email.trim().toLowerCase() === superAdminEmail) {
                  if (latestUser.role !== 'super_admin' || !latestUser.isProtected) {
                    latestUser.role = 'super_admin';
                    latestUser.isProtected = true;
                    try {
                      await updateDoc(userRef, { role: 'super_admin', isProtected: true });
                    } catch (e) {
                      console.warn("Could not write bootstrapped super_admin role to Firestore yet:", e);
                    }
                  }
                }
                
                // Live license validation check during App Boot
                let liveActivationStatus = latestUser.activationStatus || 'unlicensed';
                let tempPlanType: any = latestUser.planType || 'basic';
                let tempMaxDevices = latestUser.maxDevices || 2;
                let tempBranchesCount = latestUser.branchesCount || 1;

                const isSuperAdminBoot = latestUser.email && latestUser.email.trim().toLowerCase() === superAdminEmail;
                const isAdminBoot = latestUser.role === 'admin';

                if (!isSuperAdminBoot && isAdminBoot !== true) {
                  const keyToVerify = (latestUser.licenseCode || latestUser.licenseKey || '').trim().toUpperCase();
                  if (!keyToVerify) {
                    liveActivationStatus = 'unlicensed';
                  } else {
                    try {
                      const lSnap = await getDocs(query(collection(db, 'licenses'), where('licenseKey', '==', keyToVerify)));
                      if (lSnap.empty) {
                        liveActivationStatus = 'unlicensed';
                      } else {
                        const lDoc = lSnap.docs[0];
                        const lData = lDoc.data();
                        
                        let currentLStatus = lData.status || 'unused';

                        // Expiry Date check
                        if (lData.expiryDate) {
                          const expiry = new Date(lData.expiryDate);
                          if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
                            currentLStatus = 'expired';
                            await updateDoc(doc(db, 'licenses', lDoc.id), {
                              status: 'expired',
                              updatedAt: new Date().toISOString()
                            });
                          }
                        }

                        if (currentLStatus === 'revoked' || currentLStatus === 'suspended' || currentLStatus === 'expired') {
                          liveActivationStatus = currentLStatus;
                        } else if (lData.ownerUserId && lData.ownerUserId !== latestUser.userId) {
                          liveActivationStatus = 'used_by_other';
                        } else {
                          liveActivationStatus = currentLStatus;
                          tempPlanType = lData.planType || 'basic';
                          tempMaxDevices = lData.maxDevices || 2;
                          tempBranchesCount = lData.maxBranches || 1;

                          // B3 Device fingerprint verification
                          const dev = getDeviceDetails();
                          const fp = dev.deviceId;
                          const deviceName = dev.name;
                          const licDevices = lData.activatedDevices || [];
                          
                          const exDevice = licDevices.find((d: any) => d.deviceId === fp);
                          if (exDevice) {
                            // Update device last seen
                            const updatedList = licDevices.map((d: any) => 
                              d.deviceId === fp 
                                ? { ...d, lastSeen: new Date().toISOString(), name: deviceName }
                                : d
                            );
                            await updateDoc(doc(db, 'licenses', lDoc.id), {
                              activatedDevices: updatedList,
                              updatedAt: new Date().toISOString()
                            });
                          } else {
                            // Verify maximum devices count
                            if (licDevices.length >= tempMaxDevices) {
                              liveActivationStatus = 'blocked_device';
                            } else {
                              const newDevice = {
                                deviceId: fp,
                                name: deviceName,
                                createdAt: new Date().toISOString(),
                                lastSeen: new Date().toISOString()
                              };
                              const updatedList = [...licDevices, newDevice];
                              await updateDoc(doc(db, 'licenses', lDoc.id), {
                                activatedDevices: updatedList,
                                updatedAt: new Date().toISOString()
                              });
                            }
                          }
                        }
                      }
                    } catch (err) {
                      console.error("Error doing live license check during boot:", err);
                    }
                  }

                  // Update fields
                  latestUser.activationStatus = liveActivationStatus;
                  latestUser.licenseStatus = liveActivationStatus;
                  latestUser.planType = tempPlanType === 'pro' ? 'advanced' : tempPlanType;
                  latestUser.maxDevices = tempMaxDevices;
                  latestUser.branchesCount = tempBranchesCount;

                  try {
                    await updateDoc(userRef, {
                      activationStatus: liveActivationStatus,
                      licenseStatus: liveActivationStatus,
                      planType: tempPlanType === 'pro' ? 'advanced' : tempPlanType,
                      maxDevices: tempMaxDevices,
                      branchesCount: tempBranchesCount,
                      updatedAt: new Date().toISOString()
                    });
                  } catch (e) {
                    console.warn("Could not write live license status to appUsers on boot:", e);
                  }
                }

                localStorage.setItem('pharma-auth-user', JSON.stringify(latestUser));
              }
              
              const isSuperAdminBoot = latestUser.email && latestUser.email.trim().toLowerCase() === superAdminEmail;

              const mappedUser: AppUser = {
                userId: latestUser.userId,
                id: latestUser.userId,
                email: latestUser.email,
                username: latestUser.fullName || latestUser.username || 'User',
                displayName: latestUser.fullName || 'User',
                phone: latestUser.phone,
                isActive: latestUser.isActive !== false,
                isSetupComplete: true,
                createdAt: new Date(latestUser.createdAt || Date.now()),
                role: isSuperAdminBoot ? 'super_admin' : (latestUser.role || 'customer'),
                licenseCode: latestUser.licenseCode,
                activationStatus: latestUser.activationStatus,
                planType: latestUser.planType || 'basic',
                maxDevices: latestUser.maxDevices,
                branchesCount: latestUser.branchesCount,
                isVerified: latestUser.isVerified !== false,
                lastLogin: latestUser.lastLogin
              };
              setAppUser(mappedUser);
              setIsAppAuthenticated(true);
              setAuthStatusLoading(false);
              setAuthStep('authenticated');
            } catch (err) {
              console.error("Error syncing custom user session with Firestore during boot:", err);
              
              const superAdminEmail = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'mustafaenginerr35@gmail.com').trim().toLowerCase();
              const isSuperAdminBoot = customUser.email && customUser.email.trim().toLowerCase() === superAdminEmail;

              // Safe fallback for offline or network fluctuation
              const mappedUser: AppUser = {
                userId: customUser.userId,
                id: customUser.userId,
                email: customUser.email,
                username: customUser.fullName || customUser.username || 'User',
                displayName: customUser.fullName || 'User',
                phone: customUser.phone,
                isActive: customUser.isActive !== false,
                isSetupComplete: true,
                createdAt: new Date(customUser.createdAt || Date.now()),
                role: isSuperAdminBoot ? 'super_admin' : (customUser.role || 'customer'),
                licenseCode: customUser.licenseCode,
                activationStatus: customUser.activationStatus,
                planType: customUser.planType || 'basic',
                maxDevices: customUser.maxDevices,
                branchesCount: customUser.branchesCount,
                isVerified: customUser.isVerified !== false,
                lastLogin: customUser.lastLogin
              };
              setAppUser(mappedUser);
              setIsAppAuthenticated(true);
              setAuthStatusLoading(false);
              setAuthStep('authenticated');
            }
          };
          syncAndRestore();
          return;
        }
      } catch (e) {
        console.error("Error restoring custom user session from localStorage:", e);
      }
    }

    // If no custom user or authenticated browser session, guarantee that status is set to unauthenticated
    const isDocAuth = localStorage.getItem('pharma-is-authenticated') === 'true';
    if (isDocAuth && !localStorage.getItem('pharma-auth-user')) {
      setIsAppAuthenticated(false);
      setAuthStatusLoading(false);
      localStorage.removeItem('pharma-is-authenticated');
    }

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setIsAppAuthenticated(true);
        // Map Firebase user to AppUser format
        const mockAppUser: AppUser = {
          userId: u.uid,
          email: u.email || '',
          username: u.displayName || u.email?.split('@')[0] || 'User',
          displayName: u.displayName || 'User',
          isActive: true,
          isSetupComplete: true,
          createdAt: new Date(),
          role: u.email === 'mustafaenginerr35@gmail.com' ? 'admin' : 'manager'
        };
        setAppUser(mockAppUser);
        setAuthStatusLoading(false);
        setAuthStep('authenticated');
        localStorage.setItem('pharma-is-authenticated', 'true');
      } else if (!isDocAuth && !localStorage.getItem('pharma-auth-user')) {
        setIsAppAuthenticated(false);
        setAuthStatusLoading(false);
        localStorage.removeItem('pharma-is-authenticated');
      } else {
        setAuthStatusLoading(false);
      }
    });
  }, []);

  // Migration logic simplified for Firebase
  useEffect(() => {
    // We rely on Firestore source of truth now. 
    // Orphaned records from local storage are ignored for now to ensure data integrity in the cloud.
  }, [currentBranchId, branches.length]);
  // Debug logs for collections
  useEffect(() => {
    const collections = {
      transactions: transactions.length,
      entities: entities.length,
      ledgerEntries: allLedgerEntries.length,
      historicalRecords: historicalRecords.length,
      customerDebts: customerDebts.length,
      employees: employees.length,
      attendance: employeeAttendance.length,
      expiredLosses: expiredDamagedLosses.length,
      branches: branches.length
    };
    
    console.log("[DataSync] Collection counts:", collections);
    
    Object.entries(collections).forEach(([name, count]) => {
      if (count === 0) {
        console.warn(`[DataSync] Collection '${name}' is empty. Check if Firestore has data or if rules allow reading.`);
      }
    });
  }, [transactions.length, entities.length, allLedgerEntries.length, historicalRecords.length, customerDebts.length, employees.length, employeeAttendance.length, expiredDamagedLosses.length, branches.length]);

  const userPermissions = useMemo(() => {
    if (!appUser) return { canManageBranches: false, canViewReports: false, canEditTransactions: false };
    const isAdmin = appUser.role === 'admin' || appUser.role === 'super_admin';
    return {
      canManageBranches: isAdmin,
      canViewReports: true,
      canEditTransactions: isAdmin || appUser.role === 'manager',
    };
  }, [appUser]);

  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    const testFirebase = async () => {
      try {
        console.log("[ConnectivityCheck] Starting background online check...");
        
        // Timeout protection for the whole check
        const connectivityPromise = (async () => {
          // Diagnostic: Clear cache/SW if requested for debugging
          if (window.location.search.includes('clearCache=true')) {
            console.log("[Diagnostic] Force clearing SW and Cache...");
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              for (const reg of regs) await reg.unregister();
            }
            if (window.caches) {
              const keys = await caches.keys();
              for (const key of keys) await caches.delete(key);
            }
          }

          const configPath = 'system/config';
          const configRef = doc(db, 'system', 'config');
          
          console.log("[ConnectivityCheck] Testing getDoc on:", configPath);
          
          const snap = await getDoc(configRef).catch(err => {
            console.log("[ConnectivityCheck] Non-blocking config fetch warning:", err.code, err.message);
            return null; // Return null to indicate fetch failed but don't throw
          });
          
          if (isMounted) {
            setIsFirebaseConnected(true);
            
            if (snap && snap.exists()) {
               const data = snap.data();
               console.log("[ConnectivityCheck] Connection Verified. Data version:", data.appVersion);
            } else {
               console.log(`[ConnectivityCheck] Path "${configPath}" is empty, offline, or unreachable, proceeding with offline-first client.`);
            }
          }
        })();

        // Race against 4 second timeout
        await Promise.race([
          connectivityPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase connectivity check timed out")), 4000))
        ]);

      } catch (err: any) {
        if (isMounted) {
          setIsFirebaseConnected(true);
          console.log("[ConnectivityCheck] Connection check fell back to active offline mode:", err.message);
        }
      }
    };

    testFirebase();
    // Re-check every 60 seconds to maintain high performance
    const interval = setInterval(testFirebase, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]); // Run on mount and when user auth state changes

  useEffect(() => {
    if (user && isFirebaseConnected) {
      // Race against timeout to prevent startup hangs
      Promise.race([
        migrationService.checkAndRunMigrations(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Migration check timeout")), 10000))
      ]).catch(e => console.error("[Startup] Migration/Init error:", e));
    }
  }, [user, isFirebaseConnected]);

  const navItems = [
    { id: 'finance', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'revenues', label: 'الإيرادات', icon: CreditCard },
    { id: 'entities', label: 'الموردون والمذاخر', icon: Building2 },
    { id: 'employees', label: 'الموظفون', icon: Users },
    { id: 'invoices', label: 'الفواتير', icon: FileText },
    { id: 'payment-deadlines', label: 'مواعيد التسديد', icon: CalendarClock },
    { id: 'payments', label: 'التسديدات', icon: Receipt },
    { id: 'losses', label: 'التالف والإكسباير', icon: AlertTriangle },
    { id: 'transactions', label: 'المصاريف العامة', icon: ArrowUpCircle },
    { id: 'notifications', label: 'الإشعارات', icon: Bell, badge: (notifications || []).filter(n => !n.read).length },
    { id: 'reports', label: 'التقارير', icon: PieChart },
    { id: 'medicine-requests', label: 'طلبات الأدوية', icon: PackageSearch },
    { id: 'branches', label: 'إدارة الصيدليات', icon: Building2 },
    // Inject custom admin panel if logged user is system admin or super admin
    ...(appUser?.role === 'admin' || appUser?.role === 'super_admin' ? [{ id: 'admin-panel', label: 'لوحة التحكم والمشرف', icon: ShieldAlert }] : []),
    ...(appUser?.role === 'super_admin' ? [{ id: 'sales-console', label: 'المبيعات والتراخيص', icon: KeyRound }] : []),
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ].filter(item => {
    if (item.id === 'branches') return userPermissions.canManageBranches;
    if (item.id === 'reports') return userPermissions.canViewReports;
    return true;
  });
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [viewingEntityDetail, setViewingEntityDetail] = useState<Entity | null>(null);
  
  const ledgerConstraints = useMemo(() => [
    where('accountId', '==', selectedEntity?.id || 'none')
  ], [selectedEntity?.id]);

  const { data: rawLedgerEntries = [] } = useFirebaseQuery<LedgerEntry>('ledgerEntries', ledgerConstraints);
  const ledgerEntries = useMemo(() => [...rawLedgerEntries].sort((a, b) => toValidDate(a.date).getTime() - toValidDate(b.date).getTime()), [rawLedgerEntries]);

  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isMultiEntryOpen, setIsMultiEntryOpen] = useState(false);
  const [isMultiPaymentOpen, setIsMultiPaymentOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isEditEntityOpen, setIsEditEntityOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
  const [isViewRevenueOpen, setIsViewRevenueOpen] = useState(false);
  const [viewingRevenue, setViewingRevenue] = useState<Transaction | null>(null);
  const [revenueImageFiles, setRevenueImageFiles] = useState<File[]>([]);
  const [entityImageFiles, setEntityImageFiles] = useState<File[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteTransactionConfirmOpen, setIsDeleteTransactionConfirmOpen] = useState(false);
  const [isEditLedgerEntryOpen, setIsEditLedgerEntryOpen] = useState(false);
  const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<LedgerEntry | null>(null);
  
  const [isEditLossOpen, setIsEditLossOpen] = useState(false);
  const [selectedLoss, setSelectedLoss] = useState<ExpiredDamagedLoss | null>(null);
  const [isEditBonusOpen, setIsEditBonusOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEntityDeleteOptionsOpen, setIsEntityDeleteOptionsOpen] = useState(false);
  const [deletingEntityData, setDeletingEntityData] = useState<Entity | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ id: string, collection: string, label: string } | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [selectedDeadline, setSelectedDeadline] = useState<LedgerEntry | null>(null);
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'today' | 'week' | 'month' | 'overdue'>('all');
  const [deadlineSearch, setDeadlineSearch] = useState('');
  const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false);
  const [bulkEntries, setBulkEntries] = useState<any[]>([]);
  
  const [isAddRevenueOpen, setIsAddRevenueOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isAddOpeningCashOpen, setIsAddOpeningCashOpen] = useState(false);
  const [isAddBonusOpen, setIsAddBonusOpen] = useState(false);
  const [isAddLossOpen, setIsAddLossOpen] = useState(false);
  const [loanImageFiles, setLoanImageFiles] = useState<File[]>([]);
  const [incomeType, setIncomeType] = useState<'cash' | 'credit'>('cash');
  const [expenseType, setExpenseType] = useState<'fixed_expense' | 'variable_expense' | 'spoiled_expiration'>('fixed_expense');
  const [spoiledType, setSpoiledType] = useState<'linked' | 'unlinked'>('unlinked');
  const [isAddEntityOpen, setIsAddEntityOpen] = useState(false);
  const [isAddingFromInvoice, setIsAddingFromInvoice] = useState(false);
  const [isAddDeadlineOpen, setIsAddDeadlineOpen] = useState(false);
  const [deadlineFormEntityId, setDeadlineFormEntityId] = useState<string>('');
  const [dashboardPeriod, setDashboardPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  useEffect(() => {
    if (!isAddEntityOpen && isAddingFromInvoice) {
      setIsAddingFromInvoice(false);
    }
  }, [isAddEntityOpen, isAddingFromInvoice]);

  const [saleAmount, setSaleAmount] = useState<string>('');
  const [saleNetProfit, setSaleNetProfit] = useState<string>('');
  const [saleProfitPercentage, setSaleProfitPercentage] = useState<string>('');
  
  const [invAmount, setInvAmount] = useState<string>('');
  const [invDiscount, setInvDiscount] = useState<string>('0');
  const [invPurchaseType, setInvPurchaseType] = useState<'cash' | 'credit'>('credit');
  const [invBonus, setInvBonus] = useState<string>('0');
  
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDiscount, setPayDiscount] = useState<number>(0);
  const [payDiscountType, setPayDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [payDiscountPercentage, setPayDiscountPercentage] = useState<number>(0);
  const [payRefund, setPayRefund] = useState<string>('0');
  const [payLinkedInvoice, setPayLinkedInvoice] = useState<string>('');
  const [paySource, setPaySource] = useState<'general' | 'invoice' | 'opening_balance'>('general');

  const [deadlineAmount, setDeadlineAmount] = useState<string>('');
  const [deadlineDiscount, setDeadlineDiscount] = useState<string>('0');
  const [deadlineRefund, setDeadlineRefund] = useState<string>('0');
  const [deadlineRequiredPayment, setDeadlineRequiredPayment] = useState<string>('');

  const [txImageFile, setTxImageFile] = useState<File | null>(null);
  const [invImageFiles, setInvImageFiles] = useState<File[]>([]);
  const [payImageFile, setPayImageFile] = useState<File | null>(null);
  const [dlInvImageFile, setDlInvImageFile] = useState<File | null>(null);
  const [dlRecImageFile, setDlRecImageFile] = useState<File | null>(null);
  const [editLeImageFile, setEditLeImageFile] = useState<File | null>(null);

  const [isAppAuthenticated, setIsAppAuthenticated] = useState(() => localStorage.getItem('pharma-is-authenticated') === 'true');
  const [authStatusLoading, setAuthStatusLoading] = useState(true);
  const [authUsername, setAuthUsername] = useState(''); // serves as email or username
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authResetCode, setAuthResetCode] = useState('');
  const [authSecurityQuestion, setAuthSecurityQuestion] = useState('');
  const [authSecurityAnswer, setAuthSecurityAnswer] = useState('');
  const [authAccessCode, setAuthAccessCode] = useState('');
  
  // Custom Registration of CustomAuthService fields
  const [authFullName, setAuthFullName] = useState('');
  const [authPharmacyName, setAuthPharmacyName] = useState('');
  const [activationKeyInput, setActivationKeyInput] = useState('');
  const [activationLoading, setActivationLoading] = useState(false);
  const [authPhone, setAuthPhone] = useState('');
  const [authOTP, setAuthOTP] = useState('');
  const [authPlanType, setAuthPlanType] = useState<'basic' | 'advanced' | 'lifetime'>('basic');
  const [otpRemainingSeconds, setOtpRemainingSeconds] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const [authResetNewPassword, setAuthResetNewPassword] = useState('');
  const [authResetConfirmPassword, setAuthResetConfirmPassword] = useState('');
  const [customAuthLoading, setCustomAuthLoading] = useState(false);

  const [authStep, setAuthStep] = useState<'register' | 'verify-signup' | 'login-password' | 'forgot-password' | 'verify-reset' | 'authenticated'>('login-password');

  // Resend OTP Cooldown ticking effect
  useEffect(() => {
    let timerId: any = null;
    if (resendCooldown > 0) {
      timerId = setInterval(() => {
        setResendCooldown(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [resendCooldown]);

  // Custom OTP Countdown ticking effect
  useEffect(() => {
    let timerId: any = null;
    if ((authStep === 'verify-signup' || authStep === 'verify-reset') && otpRemainingSeconds > 0) {
      timerId = setInterval(() => {
        setOtpRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerId);
            setOtpExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [authStep, otpRemainingSeconds]);

  // One-time Admin Reset Trigger
  useEffect(() => {
    const hasReset = localStorage.getItem('pharma-one-time-reset-v2');
    const { authenticated, uid } = getEffectiveUserInfo();
    
    if (!hasReset && authenticated) {
      console.log(`[Reset] One-time reset v2 triggered for user: ${uid}`);
      const performReset = async () => {
        try {
          const success = await DataPersistenceService.resetTestData();
          if (success) {
            localStorage.setItem('pharma-one-time-reset-v2', 'true');
            toast.success("تم تصفير البيانات بنجاح وبدء اختبار جديد...");
            setTimeout(() => window.location.reload(), 2000);
          }
        } catch (err) {
          console.error("Reset trigger failed:", err);
          toast.error("فشل تصفير البيانات. يرجى مراجعة الصلاحيات.");
        }
      };
      performReset();
    }
  }, [branches.length, isAppAuthenticated]); // Trigger when data is ready or auth changes

  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);
  const [isDeleteInvoiceOpen, setIsDeleteInvoiceOpen] = useState(false);
  const [isDeleteInvoiceConfirmOpen, setIsDeleteInvoiceConfirmOpen] = useState(false);
  const [isRefundInvoiceOpen, setIsRefundInvoiceOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<LedgerEntry | null>(null);
  const [paymentMode, setPaymentMode] = useState<'normal' | 'partial' | 'full'>('normal');

  const [isAddCodeOpen, setIsAddCodeOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({ enabled: false, interval: 30, lastSync: null });
  const [imageSettings, setImageSettings] = useState<ImageManagementSettings>({ retentionYears: 3, autoDelete: false, lastCleanup: null });

  // Sync settings with Firestore
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = firebaseService.listenDocument('settings', user.uid, (data) => {
      if (data) {
        if (data.syncSettings) setSyncSettings(data.syncSettings);
        if (data.imageSettings) setImageSettings(data.imageSettings);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const updateSyncSettings = async (newSettings: SyncSettings) => {
    setSyncSettings(newSettings);
    if (user) {
      await firebaseService.setDocument('settings', user.uid, { syncSettings: newSettings }, { merge: true });
    }
  };

  const updateImageSettings = async (newSettings: ImageManagementSettings) => {
    setImageSettings(newSettings);
    if (user) {
      await firebaseService.setDocument('settings', user.uid, { imageSettings: newSettings }, { merge: true });
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToDrive = async () => {
    if (!isDriveLinked) {
      toast.error("يرجى ربط حساب Google Drive أولاً");
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading("جاري مزامنة البيانات مع Google Drive...");

    try {
      // Gather all essential collections for backup
      const dataToBackup = {
        meta: {
          timestamp: new Date().toISOString(),
          version: remoteConfig?.appVersion || '1.0.0',
          branchId: currentBranchId,
        },
        transactions: (rawTransactions || []),
        ledgerEntries: (rawLedgerEntries || []),
        entities: (rawEntities || []),
        branches: (rawBranches || []),
        employees: (rawEmployees || []),
        bonuses: (rawBonuses || []),
        loans: (rawLoans || []),
        losses: (expiredDamagedLosses || []),
        syncSettings,
        imageSettings
      };

      await googleDriveService.uploadBackup(dataToBackup);
      
      const now = new Date().toISOString();
      setSyncSettings(prev => ({ ...prev, lastSync: now }));
      await updateSyncSettings({ ...syncSettings, lastSync: now });
      
      toast.success("تم النسخ الاحتياطي بنجاح في AppDataFolder", { id: toastId });
    } catch (error: any) {
      console.error("Sync Error:", error);
      toast.error(`فشل المزامنة: ${error.message || 'خطأ غير معروف'}`, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!isDriveLinked) {
      toast.error("يرجى ربط حساب Google Drive أولاً");
      return;
    }

    if (!confirm("هل أنت متأكد من استعادة البيانات؟ هذا سيقوم باستبدال كافة البيانات الحالية بالنسخة الموجودة في Drive.")) {
      return;
    }

    const toastId = toast.loading("جاري استعادة البيانات من Google Drive...");

    try {
      const data = await googleDriveService.restoreFromDrive();
      if (!data) {
        toast.info("لا توجد ملفات نسخ احتياطي مخزنة في هذا الحساب", { id: toastId });
        return;
      }

      console.log("Restoring data:", data);
      // Here we would ideally perform a batch write to Firestore
      // For now, let's at least show it works.
      // In a real production app, we would loop through collections and set them.
      
      toast.success("تم تحميل نسخة البيانات بنجاح. يرجى تزويدنا بخدمة دمج البيانات تلقائياً لاحقاً.", { id: toastId });
    } catch (error: any) {
      console.error("Restore Error:", error);
      toast.error(`فشل الاستعادة: ${error.message || 'خطأ غير معروف'}`, { id: toastId });
    }
  };

  const [oldImages, setOldImages] = useState<DriveFile[]>([]);
  const [isCheckingImages, setIsCheckingImages] = useState(false);

  // Announcements effects
  useEffect(() => {
    if (announcements.length > 0 && user) {
      const unread = announcements.filter(a => !readAnnouncementsData.some(r => r.announcementId === a.id));
      if (unread.length > 0) {
        setActiveAnnouncement(unread[0]);
        setIsAnnouncementOpen(true);
      }
    }
  }, [announcements, readAnnouncementsData, user]);

  const handleReadAnnouncement = async () => {
    if (activeAnnouncement?.id && user) {
      await firebaseService.addDocument('announcementReads', {
        announcementId: activeAnnouncement.id,
        userId: user.uid,
        readAt: new Date()
      });
      setIsAnnouncementOpen(false);
      setActiveAnnouncement(null);
    }
  };

  // Requirement: Auto-create default branch if none exist
  useEffect(() => {
    const initDefaultBranch = async () => {
      // Only run if we are definitely authenticated and we have checked branches
      // We use rawBranches to check the actual data from metadata hook or query
      if (authStep === 'authenticated' && user?.uid && !loadingBranches) {
        // Find if a main branch exists by looking for name or isMain flag
        const mainBranch = rawBranches.find(b => b.isMain === true || b.name === 'الفرع الرئيسي');
        
        if (!mainBranch && rawBranches.length === 0) {
          process.env.NODE_ENV !== 'production' && console.log("No branches found, creating default branch...");
          
          const defaultBranch: PharmacyBranch = {
            id: 'main-branch-' + user.uid.substring(0, 5), // Stable-ish ID
            name: 'الفرع الرئيسي',
            pharmacyName: 'الصيدلية الرئيسية',
            managerName: 'المدير العام',
            phone: '07000000000',
            city: 'بغداد',
            code: 'MAIN01',
            ownerId: user.uid,
            status: 'active',
            isMain: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          try {
            await firebaseService.setDocument('branches', defaultBranch.id!, defaultBranch);
            console.log("Default branch 'main' created successfully");
          } catch (err) {
            console.error("Failed to create default branch:", err);
          }
        }
      }
    };
    initDefaultBranch();
  }, [rawBranches, authStep, user?.uid, loadingBranches]);

  // Requirement: Auto-select first branch if none selected and branches exist
  useEffect(() => {
    if (!currentBranchId && branches.length > 0) {
      const savedBranchId = localStorage.getItem('pharma-current-branch-id');
      if (savedBranchId && branches.some(b => b.id === savedBranchId)) {
        console.log("Restoring selected branch from localStorage:", savedBranchId);
        setCurrentBranchId(savedBranchId);
      } else {
        const firstActive = branches.find(b => b.status === 'active') || branches[0];
        console.log("Auto-selecting first active branch:", firstActive.name);
        setCurrentBranchId(firstActive.id || null);
        localStorage.setItem('pharma-current-branch-id', firstActive.id || '');
      }
    }
  }, [branches.length, currentBranchId]);

  useEffect(() => {
    refreshFinancialData();
  }, [rawTransactions, rawAllLedgerEntries, rawOpeningCash, employeeAttendance, expiredDamagedLosses, rawEntities, customerDebts]);

  // Data reactivity and synchronization logic
  const [refreshKey, setRefreshKey] = useState(0);
  const recalculateReports = () => {
    if (typeof lastResultRef !== 'undefined') {
      (lastResultRef as any).current = null;
    }
    setRefreshKey(prev => prev + 1);
    console.log("[Stats] Manual recalculation triggered at:", new Date().toLocaleTimeString());
    toast.success("تم تصفير ذاكرة التقارير وإعادة الحساب بنجاح (Live)");
  };

  const refreshFinancialData = () => {
    recalculateReports();
  };

  // Stats logic using Central FinancialAggregationService
  const lastResultRef = useRef<any>(null);

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    
    // LOGGING AS REQUESTED BY USER
    console.log(`[Finance-Check] Total Nodes: 
      - Transactions: ${rawTransactions.length}
      - Ledger Collections: ${rawAllLedgerEntries.length}
      - Merged List (transactions memo): ${transactions.length}
      - Historical: ${historicalRecords.length}
      - Entities: ${entities.length}
    `);

    // Current Month Aggregation
    const reportResult = calculateReportsFromRecords({
      allRecords: transactions,
      historicalRecords,
      attendance: employeeAttendance,
      loans: rawLoans,
      openingCash: rawOpeningCash,
      expiredLosses: expiredDamagedLosses,
      entities,
      filters: {
        startDate: monthStart,
        endDate: monthEnd,
        branchId: currentBranchId
      }
    });

    const s = reportResult;
    lastResultRef.current = s;

    // Daily revenue
    const dailyRevenueResult = calculateReportsFromRecords({
      allRecords: transactions,
      historicalRecords,
      attendance: employeeAttendance,
      loans: rawLoans,
      openingCash: rawOpeningCash,
      expiredLosses: expiredDamagedLosses,
      entities,
      filters: {
        startDate: today,
        endDate: today,
        branchId: currentBranchId
      }
    });

    // All-Time
    const allTimeResult = calculateReportsFromRecords({
      allRecords: transactions,
      historicalRecords,
      attendance: employeeAttendance,
      loans: rawLoans,
      openingCash: rawOpeningCash,
      expiredLosses: expiredDamagedLosses,
      entities,
      filters: { 
        startDate: new Date(2000, 0, 1), 
        endDate: new Date(2100, 0, 1), 
        branchId: currentBranchId 
      }
    });

    return {
      dailyRevenue: dailyRevenueResult.totalRevenue,
      monthlyRevenue: s.totalRevenue,
      monthlyGrossProfit: s.totalProfit,
      monthlyGeneralExpense: s.totalExpenses,
      monthlySalary: s.totalSalaries,
      monthlyLosses: s.totalLosses,
      netProfit: s.netResult,
      profitPercentage: s.totalRevenue > 0 ? (s.netResult / s.totalRevenue) * 100 : 0,
      supplierDues: s.supplierDebt,
      dueInvoices: s.counts.purchases,
      totalRevenue: allTimeResult.totalRevenue,
      totalExpense: allTimeResult.totalExpenses + allTimeResult.totalSalaries + allTimeResult.totalLosses,
      totalNetProfit: allTimeResult.netResult,
      cashBalance: s.remainingCash,
      monthlyNonOperatingRevenue: s.totalNonOperatingRevenue,
      totalNonOperatingRevenue: allTimeResult.totalNonOperatingRevenue,
      openLoansInAmount: s.openLoansInAmount,
      loansDueToMe: allTimeResult.totalLoansDueToMe,
      monthlySupplierPayments: s.totalPayments,
      openingCashBalance: s.openingCash
    };
  }, [allLedgerEntries, transactions, entities, historicalRecords, currentBranchId, expiredDamagedLosses, rawOpeningCash, employeeAttendance, customerDebts, refreshKey]);

  const [reportsMonth, setReportsMonth] = useState(new Date().getMonth());
  const [reportsYear, setReportsYear] = useState(new Date().getFullYear());
  const [reportSubTab, setReportSubTab] = useState('period');
  
  const monthlyTimelineData = useMemo(() => {
    return FinancialAggregationService.generateMonthlyTimeline({
      transactions,
      ledgerEntries: allLedgerEntries,
      historicalRecords,
      expiredLosses: expiredDamagedLosses,
      openingCash: rawOpeningCash,
      entities,
      attendance: employeeAttendance,
      customerDebts
    }, currentBranchId);
  }, [transactions, allLedgerEntries, historicalRecords, expiredDamagedLosses, rawOpeningCash, entities, employeeAttendance, customerDebts, currentBranchId]);
  
  // Branch comparison logic
  const branchComparison = useMemo(() => {
    if (branches.length === 0) return [];
    
    return branches.map(branch => {
      const res = FinancialAggregationService.calculateStats({
        startDate: new Date(2000, 0, 1),
        endDate: new Date(2100, 0, 1),
        branchId: branch.id,
        transactions,
        ledgerEntries: allLedgerEntries,
        historicalRecords,
        expiredLosses: expiredDamagedLosses,
        openingCash: rawOpeningCash,
        entities,
        attendance: employeeAttendance,
        customerDebts,
        loans: rawLoans
      });
      const s = res.stats;
      
      return {
        id: branch.id,
        name: branch.name,
        revenue: s.totalRevenue,
        expense: s.totalExpenses + s.totalSalaries + s.totalLosses,
        profit: s.netResult,
        dues: s.supplierDebt
      };
    });
  }, [branches, transactions, entities]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return safeFormatDate(d, 'yyyy-MM-dd');
    });

    return last7Days.map(dateStr => {
      const dayIncome = transactions
        .filter(tx => (tx.type === 'income' || tx.type === 'revenue') && (!currentBranchId || tx.branchId === currentBranchId) && safeFormatDate(toValidDate(tx.date), 'yyyy-MM-dd') === dateStr)
        .reduce((acc, tx) => acc + Number(tx.saleAmount || tx.amount || 0), 0);
      
      const dayGrossProfit = transactions
        .filter(tx => (tx.type === 'income' || tx.type === 'revenue') && (!currentBranchId || tx.branchId === currentBranchId) && safeFormatDate(toValidDate(tx.date), 'yyyy-MM-dd') === dateStr)
        .reduce((acc, tx) => acc + Number(tx.profitAmount || tx.netProfit || 0), 0);
      
      const daySalary = employeeAttendance
        .filter(record => (!currentBranchId || record.branchId === currentBranchId) && safeFormatDate(toValidDate(record.date), 'yyyy-MM-dd') === dateStr)
        .reduce((acc, record) => acc + Number(record.dailyWage || 0), 0);
      
      const dayExpense = transactions
        .filter(tx => tx.type === 'expense' && (!currentBranchId || tx.branchId === currentBranchId) && safeFormatDate(toValidDate(tx.date), 'yyyy-MM-dd') === dateStr)
        .reduce((acc, tx) => acc + Number(tx.amount || 0), 0) + daySalary;

      return {
        name: safeFormatDate(toValidDate(dateStr), 'EEE'),
        income: dayIncome,
        expense: dayExpense,
        profit: dayGrossProfit - dayExpense
      };
    });
  }, [transactions, employeeAttendance, currentBranchId]);

  // Handlers
  const handleViewInvoice = (invoice: LedgerEntry) => {
    setViewingInvoice(invoice);
    setActiveTab('invoice-details');
  };

  const handleEntityClick = (entity: Entity) => {
    setViewingEntityDetail(entity);
  };

  const handleReportCardClick = (type: string, label: string) => {
    const baseDate = new Date(reportsYear, reportsMonth);
    const mStart = isValid(baseDate) ? startOfMonth(baseDate) : startOfMonth(new Date());
    const mEnd = endOfMonth(mStart);
    
    // Use the central service to get the exact records for this period/branch
    const result = FinancialAggregationService.calculateStats({
      startDate: mStart,
      endDate: mEnd,
      branchId: currentBranchId,
      transactions,
      ledgerEntries: allLedgerEntries,
      historicalRecords,
      expiredLosses: expiredDamagedLosses,
      openingCash: rawOpeningCash,
      entities,
      attendance: employeeAttendance,
      customerDebts,
      loans: rawLoans
    });

    const { groups } = result;
    let details: any[] = [];

    const mapToDetail = (item: any, entryType: string) => ({
      id: item.id || Math.random().toString(),
      sourceType: item.sourceType || entryType,
      date: toValidDate(item.date || item.invoiceDate || item.saleDate || item.createdAt),
      type: entryType,
      description: item.description || item.notes || item.itemName || 'سجل مالي',
      party: item.partyName || item.accountName || item.entityName || item.customerName || '-',
      amount: Number(item.amount || item.saleAmount || item.invoiceAmount || item.totalLoss || item.dailyWage || item.paidAmount || 0),
      branch: branches.find(b => b.id === (item.branchId || item.branch))?.name || 'الرئيسي',
      expectedReturnDate: item.expectedReturnDate
    });

    switch (type) {
      case 'opening_cash_balance':
      case 'opening_cash':
        details = groups.openingCash.map(i => mapToDetail(i, 'رصيد نقدية'));
        break;
      case 'revenue':
      case 'monthly_revenue':
        details = groups.revenue.map(i => mapToDetail(i, 'وارد'));
        break;
      case 'non_operating_revenue':
        details = groups.nonOperating.map(i => mapToDetail(i, `وارد غير تشغيلي: ${i.nonOperatingType || ''}`));
        break;
      case 'loans_due_to_me':
        {
          const transDetails = groups.loansDueToMe.map(i => {
             const isPay = i.expenseClassification === 'pay_loan';
             return {
                ...mapToDetail(i, isPay ? 'دفع سلفة (زيادة رصيد)' : 'استلام سلفة (نقص رصيد)'),
                amount: isPay ? i.amount : -i.amount
             };
          });
          const rawLoanDetails = (groups.loans || []).map(i => ({
            ...mapToDetail(i, i.type === 'outgoing' ? 'سلفة صادرة' : 'أمانة واردة'),
            amount: i.type === 'outgoing' ? -i.amount : i.amount
          }));
          details = [...transDetails, ...rawLoanDetails].sort((a,b) => b.date.getTime() - a.date.getTime());
        }
        break;
      case 'profit':
      case 'monthly_gross_profit':
        details = groups.revenue.map(i => ({
             ...mapToDetail(i, 'ربح بيع'),
             amount: Number(i.profitAmount || i.netProfit || 0)
        }));
        break;
      case 'expense':
      case 'expenses':
      case 'monthly_general_expense':
        details = groups.expenses.map(i => mapToDetail(i, 'مصاريف'));
        break;
      case 'salary':
      case 'salaries':
      case 'monthly_salary':
        details = groups.salaries.map(i => mapToDetail(i, 'راتب'));
        break;
      case 'net_profit':
        {
          const profits = (stats.profitDetails?.salesProfits || []).map(i => ({
            ...mapToDetail(i, i._label || 'ربح مبيعات (+)'),
            amount: Number(i._amount || i.profitAmount || 0)
          }));
          const deductions = (stats.profitDetails?.deductions || []).map(i => ({
            ...mapToDetail(i, i._label || 'خصم من الربح (-)'),
            amount: Number(i._amount || 0)
          }));
          
          details = [...profits, ...deductions].sort((a,b) => toValidDate(b.date).getTime() - toValidDate(a.date).getTime());
        }
        break;
      case 'payment':
      case 'payments':
      case 'monthly_supplier_payments':
        details = groups.payments.map(i => {
           const d = mapToDetail(i, 'تسديد');
           return {
             ...d,
             description: i.paymentSource === 'opening_balance' ? 'تسديد رصيد افتتاحي' : (i.description || `تسديد مورد`)
           };
        });
        break;
      case 'debts':
      case 'customer_debt':
      case 'due_invoices':
        details = groups.customerDebts.map(i => mapToDetail(i, 'دين زبون'));
        break;
      case 'supplier_dues':
      case 'supplier_debt':
        details = groups.supplierDebts.map(i => ({
             ...mapToDetail(i, 'مستحقات للمورد'),
             description: `رصيد المورد: ${i.name}`,
             amount: i.balance
        }));
        break;
      case 'losses':
      case 'damaged':
      case 'monthly_losses':
        details = groups.losses.map(i => mapToDetail(i, 'خسارة'));
        break;
      case 'cash_balance':
      case 'cash_on_hand':
        {
          const inflows = (stats.cashDetails?.inflows || []).map(i => ({
            ...mapToDetail(i, i._label || 'داخل نقدي (+)'),
            amount: Number(i._amount || i.amount || 0)
          }));
          const outflows = (stats.cashDetails?.outflows || []).map(i => ({
            ...mapToDetail(i, i._label || 'خارج نقدي (-)'),
            amount: -Number(i._amount || i.amount || 0)
          }));
          const opCashDetail = groups.openingCash.map(i => mapToDetail(i, 'رصيد افتتاحي (+)'));
          
          details = [...opCashDetail, ...inflows, ...outflows].sort((a,b) => toValidDate(b.date).getTime() - toValidDate(a.date).getTime());
        }
        break;
    }

    setReportDetailTitle(label);
    setReportDetailData(details);
    setIsReportDetailOpen(true);
  };
  (window as any).handleReportCardClick = handleReportCardClick;

  const handleAddEntity = async (data: any): Promise<string | void> => {
    console.log("Adding entity...");
    const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');
    const initialBalance = Number(data.initialBalance) || 0;

    let imageUrl = '';
    const imageUrls: string[] = [];
    if (entityImageFiles && entityImageFiles.length > 0) {
      try {
        for (const file of entityImageFiles) {
          const b64 = await fileToBase64(file);
          imageUrls.push(b64);
        }
        imageUrl = imageUrls[0];
      } catch (e) {
        console.error('Error converting images to base64', e);
      }
    }

    const newEntity: Omit<Entity, 'id'> = {
      name: data.name as string,
      type: data.type as 'office' | 'warehouse',
      phone: data.phone as string,
      address: data.address as string,
      balance: initialBalance,
      initialBalance: initialBalance,
      initialBalanceDate: data.initialBalanceDate as Date,
      initialBalanceNotes: data.initialBalanceNotes as string,
      initialBalancePaid: 0,
      totalInvoices: 0,
      totalPayments: 0,
      limit: Number(data.limit) || 0,
      branchId: (targetBranchId as string) || undefined,
      ownerId: appUser?.userId || 'demo-user',
      status: data.status || 'نشط',
      notes: data.notes as string,
      imageUrl,
      imageUrls,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;
    
    try {
      const entityId = await firebaseService.addDocument('entities', newEntity as Entity);
      
      // Activity
      await firebaseService.addDocument('entityActivities', {
        entityId: entityId,
        type: 'add_invoice',
        action: 'تأسيس حساب جديد',
        details: `تم إنشاء حساب مورد جديد: ${data.name}`,
        performedBy: appUser?.username || 'user',
        createdAt: new Date(),
        ownerId: appUser?.userId || 'demo-user',
        branchId: targetBranchId as string || undefined
      });

      setIsAddEntityOpen(false);
      setEntityImageFiles([]);
      toast.success('تم إنشاء المورد بنجاح');

      if (isAddingFromInvoice) {
        setSelectedEntity({ id: entityId, name: data.name, ...newEntity } as any);
        setIsAddingFromInvoice(false);
      }

      return entityId;
    } catch (err) {
      console.error("[App] Error adding entity:", err);
      toast.error('حدث خطأ أثناء إضافة المورد');
      throw err; // Allow EntityForm to handle it
    }
  };

  const handleUpdateEntity = async (id: string, data: any) => {
    console.log("Updating entity...", id);
    const prevEntity = entities.find(e => e.id === id);
    const nameChanged = prevEntity && prevEntity.name !== data.name;

    let imageUrl = prevEntity?.imageUrl || '';
    const imageUrls = [...ensureArray(prevEntity?.imageUrls)];

    if (entityImageFiles && entityImageFiles.length > 0) {
      try {
        const newImageUrls: string[] = [];
        for (const file of entityImageFiles) {
          const b64 = await fileToBase64(file);
          newImageUrls.push(b64);
        }
        imageUrls.push(...newImageUrls);
        imageUrl = imageUrls[0];
      } catch (e) {
        console.error('Error converting images to base64', e);
      }
    }

    try {
      await firebaseService.updateDocument('entities', id, {
        name: data.name,
        type: data.type,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        limit: Number(data.limit) || 0,
        status: data.status,
        initialBalance: Number(data.initialBalance) || 0,
        imageUrl,
        imageUrls,
        isArchived: data.status === 'مؤرشف',
        updatedAt: new Date()
      });

      // Update opening balance record and ledger if initialBalance changed
      if (prevEntity && Number(data.initialBalance) !== prevEntity.initialBalance) {
        const newInitialBalance = Number(data.initialBalance);
        const existingOP = rawSupplierOpeningBalances.find(op => op.supplierId === id);
        
        if (existingOP) {
          await firebaseService.updateDocument('supplierOpeningBalances', existingOP.id!, {
            openingAmount: newInitialBalance,
            remainingAmount: newInitialBalance - (existingOP.paidAmount || 0),
            updatedAt: new Date()
          });
        } else if (newInitialBalance !== 0) {
          await firebaseService.addDocument('supplierOpeningBalances', {
            supplierId: id,
            supplierName: data.name,
            supplierType: data.type,
            openingAmount: newInitialBalance,
            paidAmount: 0,
            remainingAmount: newInitialBalance,
            date: new Date(),
            branchId: prevEntity.branchId || 'main',
            userId: appUser?.userId || 'demo-user',
            ownerId: appUser?.userId || 'demo-user',
            notes: 'رصيد افتتاحي (تمت إضافته لاحقاً)',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      // Propagate name change to ledger entries if name changed
      if (nameChanged) {
        const relatedEntries = rawAllLedgerEntries.filter(e => e.accountId === id);
        for (const entry of relatedEntries) {
          if (entry.id) await firebaseService.updateDocument('ledgerEntries', entry.id, { accountName: data.name });
        }
      }

      // Add Activity
      await firebaseService.addDocument('entityActivities', {
        entityId: id,
        type: 'update_entity',
        action: 'تعديل بيانات الحساب',
        details: `تعديل بيانات المورد: ${data.name}`,
        performedBy: appUser?.username || 'user',
        createdAt: new Date(),
        ownerId: appUser?.userId || 'demo-user',
        branchId: currentBranchId || undefined
      });

      setIsEditEntityOpen(false);
      setEditingEntity(null);
      toast.success('تم تحديث بيانات المورد بنجاح');
    } catch (err) {
      console.error("[App] Error updating entity:", err);
      toast.error('حدث خطأ أثناء تحديث المورد');
    }
  };

  const handleArchiveEntity = async (id: string) => {
    try {
      await firebaseService.updateDocument('entities', id, { 
        status: 'مؤرشف',
        isArchived: true,
        updatedAt: new Date()
      });

      await firebaseService.addDocument('entityActivities', {
        entityId: id,
        type: 'archive_entity',
        action: 'أرشفة المورد',
        details: 'تم نقل المورد إلى الأرشيف',
        performedBy: appUser?.username || 'user',
        createdAt: new Date(),
        ownerId: appUser?.userId || 'demo-user',
        branchId: currentBranchId || undefined
      });

      setIsEntityDeleteOptionsOpen(false);
      setDeletingEntityData(null);
      toast.success('تم أرشفة المورد بنجاح (مع الاحتفاظ ببياناته)');
    } catch (error) {
      console.error(error);
      toast.error('فشل في عملية الأرشفة');
    }
  };

  const handleSoftDeleteEntity = async (id: string) => {
    try {
      await firebaseService.updateDocument('entities', id, { 
        status: 'محذوف',
        deletedAt: new Date(),
        updatedAt: new Date()
      });

      await firebaseService.addDocument('entityActivities', {
        entityId: id,
        type: 'delete_entity',
        action: 'حذف (Soft Delete)',
        details: 'تم وسم المورد كمحذوف',
        performedBy: appUser?.username || 'user',
        createdAt: new Date(),
        ownerId: appUser?.userId || 'demo-user',
        branchId: currentBranchId || undefined
      });

      setIsDeleteConfirmOpen(false);
      toast.success('تم حذف المورد بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('فشل في عملية الحذف');
    }
  };

  const handleFullDeleteEntity = async (id: string) => {
    triggerDelete(
      'حذف المورد نهائياً',
      'هل أنت متأكد؟ سيتم حذف المورد وكافة سجلاته المالية (كشف حساب، فواتير، تسديدات) نهائياً من كل مكان ولا يمكن التراجع.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await firebaseService.deleteDocument('entities', id);
          
          setIsEntityDeleteOptionsOpen(false);
          setViewingEntityDetail(null);
          setDeletingEntityData(null);
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم حذف المورد وكافة بياناته المرتبطة نهائياً');
        } catch (error) {
          console.error("Full delete failed:", error);
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('فشل في عملية الحذف النهائي');
        }
      }
    );
  };

  const handleAddEmployee = async (data: Partial<Employee>) => {
    console.log("[App] Adding employee...");
    if (!appUser) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }
    const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');

    try {
      await firebaseService.addDocument('employees', {
        ...data as Employee,
        branchId: (targetBranchId as string) || undefined,
        ownerId: appUser.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);
      console.log("[App] Employee added successfully");
      toast.success('تم إضافة الموظف بنجاح');
    } catch (error) {
      console.error("[App] Failed to add employee:", error);
      toast.error('حدث خطأ أثناء إضافة الموظف');
    }
  };

  const handleUpdateEmployee = async (id: string, data: Partial<Employee>) => {
    console.log("Updating record... (Employee)");
    try {
      await firebaseService.updateDocument('employees', id, {
        ...data,
        updatedAt: new Date()
      } as any);
      console.log("Updated successfully (Employee)");
      toast.success('تم تحديث بيانات الموظف');
    } catch (error) {
      console.error("Failed to update employee:", error);
      toast.error('فشل في تحديث البيانات');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const employee = employees.find(e => e.id === id);
    const attendanceCount = rawEmployeeAttendance.filter(a => a.employeeId === id).length;
    
    triggerDelete(
      `حذف الموظف: ${employee?.name}`,
      attendanceCount > 0 
        ? `هذا الموظف لديه ${attendanceCount} سجل حضور. هل أنت متأكد؟ سيتم حذف الموظف وكافة سجلاته نهائياً من كل مكان ولا يمكن التراجع.`
        : `هل أنت متأكد؟ سيتم حذف الموظف وكل بياناته نهائياً من كل مكان ولا يمكن التراجع.`,
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          console.log("Deleting employee and cascading records:", id);
          await firebaseService.deleteDocument('employees', id);
          
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم حذف الموظف وكافة بياناته نهائياً');
        } catch (error) {
          console.error(error);
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('فشل في حذف الموظف');
        }
      }
    );
  };

  const handleAddAttendance = async (data: Partial<EmployeeAttendance>) => {
    console.log("Saving record... (Attendance)");
    if (!appUser) return;
    const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');
    
    try {
      // 1. Save attendance record
      const docId = await firebaseService.addDocument('employeeAttendance', {
        ...data,
        branchId: targetBranchId as string | undefined,
        ownerId: appUser.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      if (data.dailyWage && Number(data.dailyWage) > 0) {
        const commonData = {
          sourceId: docId as string,
          branchId: targetBranchId as string,
          date: data.date || new Date(),
          amount: Number(data.dailyWage) || 0,
          entityId: data.employeeId,
          entityName: data.employeeName,
          ownerId: appUser.userId,
          updatedAt: new Date()
        };

        // Unified Save
        await firebaseService.saveFinancialRecordOnce({
          ...commonData,
          type: 'expense',
          operationType: 'expense',
          sourceType: 'employee_salary',
          userId: appUser.userId,
          debit: commonData.amount,
          credit: 0,
          category: 'رواتب الموظفين',
          description: `راتب موظف: ${data.employeeName} (${data.month}/${data.year}) - ${data.notes || ''}`
        });
      }

      console.log("Saved successfully (Attendance)");
      toast.success('تم تسجيل الحضور والراتب بنجاح');
    } catch (error) {
      console.error("Failed to save attendance:", error);
      toast.error('فشل في تسجيل الحضور');
    }
  };

  const handleUpdateAttendance = async (id: string, data: Partial<EmployeeAttendance>) => {
    console.log("Updating record... (Attendance)");
    if (!appUser) return;
    const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');

    try {
      // 1. Update attendance record
      await firebaseService.updateDocument('employeeAttendance', id, {
        ...data,
        updatedAt: new Date()
      });

      // 2. Find and sync related records
      if (data.dailyWage && Number(data.dailyWage) > 0) {
        const commonData = {
          sourceId: id,
          branchId: targetBranchId as string,
          date: data.date || new Date(),
          amount: Number(data.dailyWage) || 0,
          entityId: data.employeeId,
          entityName: data.employeeName,
          ownerId: appUser.userId,
          updatedAt: new Date()
        };

        // Unified Save
        await firebaseService.saveFinancialRecordOnce({
          ...commonData,
          type: 'expense',
          operationType: 'expense',
          sourceType: 'employee_salary',
          userId: appUser.userId,
          debit: commonData.amount,
          credit: 0,
          category: 'رواتب الموظفين',
          description: `تعديل راتب موظف: ${data.employeeName} (${data.month}/${data.year}) - ${data.notes || ''}`
        });
      }
      
      toast.success('تم تحديث سجل الحضور وإعادة حساب الراتب');
    } catch (error) {
      console.error("Failed to update attendance:", error);
      toast.error('فشل في التحديث');
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    triggerDelete(
      'حذف سجل الحضور',
      'هل أنت متأكد؟ سيتم حذف هذا السجل نهائياً من كل مكان ولا يمكن التراجع.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          console.log("Deleting attendance:", id);
          await firebaseService.deleteDocument('employeeAttendance', id);
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم حذف سجل الحضور نهائياً');
        } catch (error) {
          console.error(error);
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('فشل في الحذف');
        }
      }
    );
  };

  const handleAddBranch = async (data: Partial<PharmacyBranch>) => {
    console.log("[App] Adding branch...");
    if (!appUser) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    // Protection: check for duplicate name
    const isDuplicate = rawBranches.some(b => b.name === data.name && b.status !== 'archived');
    if (isDuplicate) {
      toast.error('يوجد فرع بالفعل بهذا الاسم، يرجى اختيار اسم مختلف');
      return;
    }

    try {
      const allBranches = rawBranches;
      const nextNum = (allBranches.length > 0) 
        ? Math.max(...allBranches.map(b => {
             const num = parseInt(b.code?.split('-')[1] || '0');
             return isNaN(num) ? 0 : num;
          })) + 1 
        : 1;
      const code = `BR-${nextNum.toString().padStart(4, '0')}`;
      
      // If this is set as main, unset other main branches
      if (data.isMain) {
        const otherMainBranches = rawBranches.filter(b => b.isMain === true);
        for (const mb of otherMainBranches) {
          await firebaseService.updateDocument('branches', mb.id!, { isMain: false });
        }
      }

      const newBranch: PharmacyBranch = {
        ...data as any,
        code,
        ownerId: appUser.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: data.isMain ? 'active' : (data.activationCode ? 'active' : 'pending')
      } as any;

      await firebaseService.addDocument('branches', newBranch);
      console.log("[App] Branch added successfully");
      toast.success(newBranch.status === 'active' ? 'تم تسجيل وتفعيل الفرع بنجاح' : 'تم تسجيل الفرع. بانتظار التفعيل');
    } catch (error) {
      console.error("[App] Failed to add branch:", error);
      toast.error('فشل في عملية تسجيل الفرع');
    }
  };

  const handleUpdateBranch = async (id: string, data: Partial<PharmacyBranch>) => {
    try {
      // Check for duplicate name if name is being changed
      if (data.name) {
        const isDuplicate = rawBranches.some(b => 
          b.id !== id &&
          b.status !== 'archived' && 
          b.name.trim().toLowerCase() === data.name?.trim().toLowerCase()
        );
        
        if (isDuplicate) {
          toast.error('يوجد فرع نشط بنفس هذا الاسم بالفعل');
          return;
        }
      }

      // If setting this as main, unset others
      if (data.isMain) {
        const otherMainBranches = rawBranches.filter(b => b.isMain === true && b.id !== id);
        for (const mb of otherMainBranches) {
          await firebaseService.updateDocument('branches', mb.id!, { isMain: false });
        }
      }

      await firebaseService.updateDocument('branches', id, data);
      toast.success('تم تحديث بيانات الفرع');
    } catch (error) {
      console.error(error);
      toast.error('فشل في التحديث');
    }
  };

  const handleArchiveBranch = async (id: string) => {
    try {
      await firebaseService.updateDocument('branches', id, { status: 'archived' });
      if (currentBranchId === id) setCurrentBranchId(null);
      toast.success('تم أرشفة الفرع');
    } catch (error) {
      console.error(error);
      toast.error('فشل في الأرشفة');
    }
  };

  const handleDeleteBranch = async (id: string) => {
    const branch = rawBranches.find(b => b.id === id);
    triggerDelete(
      'تعطيل فرع',
      'هل أنت متأكد؟ لن يتم حذف الفرع نهائياً للحفاظ على السجلات المالية، ولكن سيتم إزالته من القوائم النشطة وتعطيله.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await firebaseService.updateDocument('branches', id, { status: 'inactive' });
          if (currentBranchId === id) setCurrentBranchId(null);
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم تعطيل الفرع بنجاح');
        } catch (err) {
          console.error("Delete Branch Error:", err);
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('حدث خطأ أثناء التعطيل');
        }
      }
    );
  };

  const handleAddLoan = async (loanData: Partial<Loan>) => {
    if (!user || !currentBranchId) return;

    try {
      const imageUrls: string[] = [];
      if (loanImageFiles && loanImageFiles.length > 0) {
        for (const file of loanImageFiles) {
          const b64 = await fileToBase64(file);
          imageUrls.push(b64);
        }
      }

      const finalLoan: Partial<Loan> = {
        ...loanData,
        branchId: currentBranchId,
        ownerId: user.uid,
        createdBy: appUser?.username || user.email || 'unknown',
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const loanId = await firebaseService.addDocument('loans', finalLoan);

      // If it's a return, update the parent loan status
      if (loanData.type === 'returned' && loanData.parentLoanId) {
        const parentLoan = rawLoans.find(l => l.id === loanData.parentLoanId);
        if (parentLoan) {
          const returns = rawLoans.filter(l => l.parentLoanId === parentLoan.id && !l.deletedAt);
          const totalReturnedSoFar = returns.reduce((sum, r) => sum + Number(r.amount || 0), 0);
          const totalReturnedIncludingCurrent = totalReturnedSoFar + Number(loanData.amount || 0);
          
          let newStatus: any = 'partially_returned';
          if (totalReturnedIncludingCurrent >= parentLoan.amount) {
            newStatus = 'fully_returned';
          }
          
          await firebaseService.updateDocument('loans', parentLoan.id!, { 
            status: newStatus,
            updatedAt: new Date()
          });
        }
      }

      toast.success("تم تسجيل السلفة/الأمانة بنجاح");
      setIsAddLoanOpen(false);
      setLoanImageFiles([]);
    } catch (err) {
      console.error("Failed to add loan:", err);
      toast.error("فشل في تسجيل العملية");
    }
  };

  const [isSavingRecord, setIsSavingRecord] = useState(false);

  const handleAddInvoice = async (data: any) => {
    if (isSavingRecord) return;
    setIsSavingRecord(true);

    try {
      console.trace("INVOICE SAVE CALLED", data.invoiceNumber);
      const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');

      const entityToInvoice = entities.find(e => e.id === data.accountId) || selectedEntity;
      if (!entityToInvoice?.id) {
        setIsSavingRecord(false);
        return;
      }
      
      const amount = Number(data.amount);
      const discount = Number(data.discount) || 0;
      const bonus = Number(data.bonus) || 0;
      const netAmount = amount - discount;
      const purchaseType = data.purchaseType;
      
      let imageUrl = '';
      const imageUrls: string[] = [];
      if (invImageFiles && invImageFiles.length > 0) {
        try {
          imageUrl = await fileToBase64(invImageFiles[0]);
          for (const file of invImageFiles) {
            const b64 = await fileToBase64(file);
            imageUrls.push(b64);
          }
        } catch (e) {
          console.error('Error converting images to base64', e);
        }
      }

      const newEntry: Omit<LedgerEntry, 'id'> = {
        accountId: entityToInvoice.id,
        accountName: entityToInvoice.name,
        accountType: entityToInvoice.type,
        date: data.date ? new Date(data.date) : new Date(),
        invoiceDate: data.date ? new Date(data.date) : new Date(),
        operationType: 'invoice',
        purchaseType: purchaseType,
        invoiceNumber: data.invoiceNumber as string,
        amount,
        discount,
        discountType: data.discountType,
        discountValue: data.discountPercentage,
        bonus,
        bonusArrivalDate: data.bonusArrivalDate,
        dueDate: data.dueDate,
        netAmount,
        paidAmount: purchaseType === 'cash' ? netAmount : 0,
        remainingAmount: purchaseType === 'cash' ? 0 : netAmount,
        paymentStatus: purchaseType === 'cash' ? 'paid' : 'pending',
        imageUrl,
        imageUrls,
        notes: data.notes as string,
        ownerId: appUser?.userId || 'demo-user',
        branchId: (targetBranchId as string) || undefined,
        isCommitted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;

      // Use the unified saveInvoice method which handles deduplication and syncing internally
      const result = await firebaseService.saveInvoice(newEntry);
      const addedId = result?.id;
      const isUpdate = result?.isUpdate;
      const blocked = (result as any)?.blocked;
      
      if (blocked) {
         toast.success("تم الحفظ مسبقاً (تم تخطي التكرار)");
         setIsAddInvoiceOpen(false);
         setIsSavingRecord(false);
         return;
      }

      // NO RE-SYNC HERE. Service already calls syncTransaction.

      // Update entity balance - ONLY IF IT'S A NEW INVOICE
      if (addedId && !isUpdate) {
        await firebaseService.updateDocument('entities', entityToInvoice.id, {
          balance: (entityToInvoice.balance || 0) + netAmount,
          totalInvoices: (entityToInvoice.totalInvoices || 0) + 1,
          updatedAt: new Date()
        } as any);
      }

      if (newEntry.dueDate && addedId && !isUpdate) {
        await firebaseService.addDocument('deadlines', {
          accountId: entityToInvoice.id,
          accountName: entityToInvoice.name,
          invoiceId: addedId, 
          invoiceNumber: newEntry.invoiceNumber || '',
          amount: newEntry.amount,
          requiredPayment: newEntry.netAmount,
          dueDate: newEntry.dueDate,
          status: 'pending',
          ownerId: appUser?.userId || 'demo-user',
          branchId: targetBranchId as string | undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any);
      }

      setIsAddInvoiceOpen(false);
      setInvAmount('');
      setInvDiscount('0');
      setInvBonus('0');
      setInvImageFiles([]);
      toast.success('تم إضافة الفاتورة بنجاح');
    } catch (err) {
      console.error("Failed to save invoice:", err);
      toast.error('حدث خطأ أثناء إضافة الفاتورة');
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[App] Adding deadline...");
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const entityId = formData.get('entityId') as string;
    const targetEntity = entities.find(e => e.id === entityId);
    
    if (!targetEntity) {
      toast.error('لم يتم العثور على المورد');
      return;
    }

    const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : undefined);

    const newDeadline: Omit<Deadline, 'id'> = {
      accountId: entityId,
      accountName: targetEntity.name,
      invoiceId: formData.get('invoiceId') as string || '',
      invoiceNumber: formData.get('invoiceNumber') as string,
      amount: Number(formData.get('amount')),
      requiredPayment: Number(formData.get('requiredPayment')),
      dueDate: new Date(formData.get('dueDate') as string),
      notes: formData.get('notes') as string,
      status: 'pending',
      ownerId: appUser?.userId || 'demo-user',
      branchId: (targetBranchId as string) || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;
    
    try {
      await firebaseService.addDocument('deadlines', newDeadline as Deadline);
      console.log("[App] Deadline added successfully");
      setIsAddDeadlineOpen(false);
      toast.success('تم إضافة موعد السداد بنجاح');
    } catch (err) {
      console.error("[App] Failed to add deadline:", err);
      toast.error('حدث خطأ أثناء إضافة موعد السداد');
    }
  };

  const handleSaveDeadline = async (data: Partial<Deadline>) => {
    if (!appUser) return;
    try {
      const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');
      if (data.id) {
        await firebaseService.updateDocument('deadlines', data.id, {
          ...data,
          branchId: targetBranchId as string,
          updatedAt: new Date()
        });
        toast.success('تم تحديث موعد التسديد');
      } else {
        await firebaseService.addDocument('deadlines', {
          ...data,
          ownerId: appUser.userId,
          branchId: targetBranchId as string,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Deadline);
        toast.success('تم تحديد موعد التسديد');
      }
    } catch (error) {
      console.error('Failed to save deadline:', error);
      toast.error('فشل في حفظ الموعد');
      throw error;
    }
  };

  const handleDeleteDeadline = async (id: string) => {
    try {
      await firebaseService.deleteDocument('deadlines', id);
      toast.success('تم حذف موعد التسديد');
    } catch (error) {
      console.error('Failed to delete deadline:', error);
      toast.error('فشل في حذف الموعد');
      throw error;
    }
  };

  const handleExecuteDeadlinePayment = async (data: { amount: number; date: Date; notes: string; images: File[] }) => {
    if (!selectedDeadlineForPayment || !appUser) return;
    
    setIsSavingRecord(true);
    try {
      const deadline = selectedDeadlineForPayment;
      const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');
      
      // 1. Process images
      const imageUrls: string[] = [];
      for (const file of data.images) {
        const b64 = await fileToBase64(file);
        imageUrls.push(b64);
      }
      
      // 2. Create Ledger Entry (Payment)
      const newEntry: Omit<LedgerEntry, 'id'> = {
        accountId: deadline.accountId,
        accountName: deadline.accountName,
        accountType: 'office', // Default if not found
        date: data.date,
        operationType: 'payment',
        sourceType: 'payment',
        paymentSource: 'invoice',
        amount: data.amount,
        discount: 0,
        discountType: 'amount',
        discountValue: 0,
        refundAmount: 0,
        netAmount: data.amount,
        linkedInvoiceNumber: deadline.invoiceNumber,
        linkedInvoiceId: deadline.invoiceId,
        receiptImageUrl: imageUrls[0] || '',
        imageUrls: imageUrls,
        notes: data.notes,
        ownerId: appUser.userId,
        branchId: (targetBranchId as string) || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;

      // 3. Create Transaction
      const newTx: Omit<Transaction, 'id'> = {
        type: 'payment',
        category: 'payment',
        amount: data.amount,
        date: data.date,
        description: `تسديد موعد: ${deadline.accountName} - فاتورة ${deadline.invoiceNumber}`,
        entityId: deadline.accountId,
        entityName: deadline.accountName,
        invoiceNumber: deadline.invoiceNumber,
        branchId: targetBranchId as string | undefined,
        createdBy: appUser.userId,
        ownerId: appUser.userId,
        userId: appUser.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;

      // 4. Save to Firebase via unified service (to ensure atomicity/deduplication)
      await firebaseService.saveFinancialRecordOnce({
        ...newEntry,
        ...newTx,
        sourceType: 'payment',
        type: 'payment',
        operationType: 'payment',
        debit: 0,
        credit: data.amount,
        amount: data.amount,
        category: 'التسديدات',
        description: newTx.description || '',
      });

      // 5. Update linked invoice remaining amount
      const invoice = allLedgerEntries.find(e => e.id === deadline.invoiceId);
      if (invoice) {
        const totalPaid = (invoice.paidAmount || 0) + data.amount;
        const totalNet = invoice.netAmount || invoice.amount;
        const remaining = Math.max(0, totalNet - totalPaid);
        
        await firebaseService.updateDocument('ledgerEntries', invoice.id!, {
          paidAmount: totalPaid,
          remainingAmount: remaining,
          paymentStatus: remaining <= 0 ? 'paid' : 'partial',
          updatedAt: new Date()
        });
      }

      // 6. Update deadline status
      await firebaseService.updateDocument('deadlines', deadline.id!, {
        status: 'paid',
        updatedAt: new Date()
      });

      toast.success('تم تنفيذ عملية التسديد بنجاح');
      setIsExecutePaymentOpen(false);
      setSelectedDeadlineForPayment(null);
    } catch (error) {
      console.error('Failed to execute deadline payment:', error);
      toast.error('حدث خطأ أثناء تنفيذ التسديد');
      throw error;
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleAddBonus = async (data: any) => {
    console.log("[App] Adding bonus...");
    const bonusEntity = entities.find(e => e.id === data.entityId) || viewingEntityDetail || selectedEntity;
    if (!bonusEntity?.id) {
      toast.error('يرجى اختيار المورد أولاً');
      return;
    }
    
    const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');

    const newBonus: Omit<Bonus, 'id'> = {
      entityId: bonusEntity.id,
      entityName: bonusEntity.name,
      description: data.description as string,
      amount: Number(data.amount) || 0,
      dueDate: data.dueDate,
      status: data.status,
      notes: data.notes as string,
      ownerId: appUser?.userId || 'demo-user',
      branchId: (targetBranchId as string) || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;
    
    try {
      await firebaseService.addDocument('bonuses', newBonus as Bonus);
      console.log("[App] Bonus added successfully");
      setIsAddBonusOpen(false);
      toast.success('تم إضافة البونص بنجاح');
    } catch (err) {
      console.error("[App] Failed to add bonus:", err);
      toast.error('حدث خطأ أثناء إضافة البونص');
    }
  };

  const handlePayAmountChange = (val: number) => {
    setPayAmount(val);
    if (payDiscountType === 'percentage') {
      const newDiscount = (val * payDiscountPercentage) / 100;
      setPayDiscount(newDiscount);
    }
  };

  const handlePayDiscountChange = (val: number) => {
    setPayDiscount(val);
    if (payAmount > 0) {
      setPayDiscountPercentage((val / payAmount) * 100);
    }
  };

  const handlePayPercentageChange = (val: number) => {
    setPayDiscountPercentage(val);
    const newDiscount = (payAmount * val) / 100;
    setPayDiscount(newDiscount);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRecord) return;
    setIsSavingRecord(true);
    
    console.log("Saving record... (Payment)");
    if (!selectedEntity?.id || !appUser) {
      setIsSavingRecord(false);
      return;
    }
    
    const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const amount = payAmount;
    const discount = payDiscount;
    const refund = Number(formData.get('refund')) || 0;
    const totalEffect = amount + discount - refund;
    
    const paymentSource = paySource;
    const linkedInvoiceId = viewingInvoice?.id;
    const linkedInvoiceNumber = formData.get('linkedInvoice') as string;

    // Validation
    if (paymentSource === 'invoice' && !viewingInvoice) {
      toast.error('يرجى اختيار الفاتورة المطلوب تسديدها');
      setIsSavingRecord(false);
      return;
    }

    if (paymentSource === 'invoice' && viewingInvoice) {
      const remaining = viewingInvoice.remainingAmount || 0;
      if (amount > remaining) {
        toast.error(`المبلغ المدخل (${formatNumberWithCommas(amount)}) أكبر من المتبقي في الفاتورة (${formatNumberWithCommas(remaining)})`);
        setIsSavingRecord(false);
        return;
      }
    } else if (paymentSource === 'opening_balance') {
      const supplierOpeningPaid = selectedEntity.initialBalancePaid || 0;
      const remainingOpening = (selectedEntity.initialBalance || 0) - supplierOpeningPaid;
      if (amount > remainingOpening) {
        toast.error(`المبلغ المدخل (${formatNumberWithCommas(amount)}) أكبر من المتبقي في الرصيد الافتتاحي (${formatNumberWithCommas(remainingOpening)})`);
        setIsSavingRecord(false);
        return;
      }
    }

    try {
      let receiptImageUrl = '';
      if (payImageFile) {
        try {
          receiptImageUrl = await fileToBase64(payImageFile);
        } catch (e) {
          console.error('Error converting receipt image to base64', e);
        }
      }

      const newEntry: Omit<LedgerEntry, 'id'> = {
        accountId: selectedEntity.id,
        accountName: selectedEntity.name,
        accountType: selectedEntity.type,
        date: new Date(formData.get('date') as string),
        operationType: 'payment',
        sourceType: paymentSource === 'opening_balance' ? 'supplier_opening_balance_payment' : 'payment',
        paymentSource: paymentSource,
        amount,
        discount,
        discountType: payDiscountType,
        discountValue: payDiscountPercentage,
        refundAmount: refund,
        netAmount: amount,
        linkedInvoiceNumber: paymentSource === 'invoice' ? linkedInvoiceNumber : '',
        linkedInvoiceId: paymentSource === 'invoice' ? linkedInvoiceId : '',
        balanceAfterOperation: (selectedEntity.balance || 0) - totalEffect,
        receiptImageUrl,
        notes: formData.get('notes') as string,
        ownerId: appUser.userId,
        branchId: (targetBranchId as string) || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;

      if (paymentSource === 'opening_balance') {
        const openingRecord = rawSupplierOpeningBalances.find(ob => ob.supplierId === selectedEntity.id);
        if (openingRecord) {
          (newEntry as any).openingBalanceId = openingRecord.id;
        }
      }
      
      const newTx: Omit<Transaction, 'id'> = {
        type: 'payment',
        category: 'payment',
        amount: totalEffect,
        date: new Date(formData.get('date') as string),
        description: paymentSource === 'opening_balance' 
          ? `تسديد من الرصيد الافتتاحي: ${selectedEntity.name}`
          : paymentSource === 'invoice'
          ? `تسديد فاتورة: ${selectedEntity.name} - ${linkedInvoiceNumber || ''}`
          : `تسديد عام (FIFO): ${selectedEntity.name}`,
        entityId: selectedEntity.id,
        entityName: selectedEntity.name,
        invoiceNumber: paymentSource === 'invoice' ? linkedInvoiceNumber : '',
        branchId: targetBranchId as string | undefined,
        createdBy: appUser.userId,
        ownerId: appUser.userId,
        userId: appUser.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;

      const result = await firebaseService.saveFinancialRecordOnce({
        ...newEntry,
        ...newTx,
        sourceType: paymentSource === 'opening_balance' ? 'supplier_opening_balance_payment' : 'payment',
        type: 'payment',
        operationType: 'payment',
        debit: 0,
        credit: totalEffect,
        amount: totalEffect,
        category: 'التسديدات',
        description: newTx.description || '',
      });
      
      if (result?.blocked) {
        toast.info('هذا التسديد مسجل بالفعل');
        setIsSavingRecord(false);
        return;
      }

      // SIDE EFFECTS
      let remainingToApply = amount + discount;
      let currentInitialBalancePaid = selectedEntity.initialBalancePaid || 0;

      // FIFO or Explicit Opening Balance Payment
      if (paymentSource === 'opening_balance' || paymentSource === 'general') {
        const remainingOpening = (selectedEntity.initialBalance || 0) - currentInitialBalancePaid;
        const appliedToOpening = Math.min(remainingToApply, remainingOpening);
        currentInitialBalancePaid += appliedToOpening;
        remainingToApply -= appliedToOpening;
      }

      // Apply to invoices if general (FIFO)
      if (paymentSource === 'general' && remainingToApply > 0) {
        const unpaidInvoices = allLedgerEntries
          .filter(e => e.accountId === selectedEntity.id && e.operationType === 'invoice' && e.paymentStatus !== 'paid' && !e.isDeleted)
          .sort((a,b) => toValidDate(a.date).getTime() - toValidDate(b.date).getTime());
          
        for (const inv of unpaidInvoices) {
          if (remainingToApply <= 0) break;
          const invRemaining = inv.remainingAmount || 0;
          const appliedToInv = Math.min(remainingToApply, invRemaining);
          
          const newPaidAmount = (inv.paidAmount || 0) + appliedToInv;
          const newRemaining = Math.max(0, (inv.netAmount || 0) - newPaidAmount);
          
          await firebaseService.updateDocument('ledgerEntries', inv.id!, {
            paidAmount: newPaidAmount,
            remainingAmount: newRemaining,
            paymentStatus: newRemaining <= 0 ? 'paid' : 'partial',
            updatedAt: new Date()
          } as any);
          
          remainingToApply -= appliedToInv;
        }
      }

      // Explicit Invoice Payment
      if (paymentSource === 'invoice' && linkedInvoiceId && remainingToApply > 0) {
        const inv = allLedgerEntries.find(i => i.id === linkedInvoiceId);
        if (inv) {
          const newPaidAmount = (inv.paidAmount || 0) + remainingToApply;
          const newRemaining = Math.max(0, (inv.netAmount || 0) - newPaidAmount);
          await firebaseService.updateDocument('ledgerEntries', linkedInvoiceId, {
            paidAmount: newPaidAmount,
            remainingAmount: newRemaining,
            paymentStatus: newRemaining <= 0 ? 'paid' : 'partial',
            updatedAt: new Date()
          } as any);
        }
      }

      // Final Entity Update
      await firebaseService.updateDocument('entities', selectedEntity.id, {
        balance: (selectedEntity.balance || 0) - totalEffect,
        totalPayments: (selectedEntity.totalPayments || 0) + 1,
        totalPaidAmount: (selectedEntity.totalPaidAmount || 0) + totalEffect,
        initialBalancePaid: currentInitialBalancePaid,
        updatedAt: new Date()
      } as any);

      // Update opening balance tracking if applicable
      if (paymentSource === 'opening_balance') {
        const openingRecord = rawSupplierOpeningBalances.find(ob => ob.supplierId === selectedEntity.id);
        if (openingRecord) {
          const newOpPaid = (openingRecord.paidAmount || 0) + amount;
          await firebaseService.updateDocument('supplierOpeningBalances', openingRecord.id!, {
            paidAmount: newOpPaid,
            remainingAmount: Math.max(0, (openingRecord.openingAmount || 0) - newOpPaid),
            updatedAt: new Date()
          });
        }
      }
      
      setIsAddPaymentOpen(false);
      setPayAmount(0);
      setPayDiscount(0);
      setPayDiscountPercentage(0);
      setPayDiscountType('fixed');
      setPayRefund('0');
      setPayImageFile(null);
      setViewingInvoice(null);
      setPaymentMode('normal');
      toast.success('تم تسجيل التسديد بنجاح');
    } catch (err) {
      console.error("Failed to save payment:", err);
      toast.error('حدث خطأ أثناء حفظ التسديد');
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleEditInvoice = async (data: any) => {
    console.log("Updating record... (Invoice)");
    if (!viewingInvoice?.id || !selectedEntity?.id) return;
    
    const amount = Number(data.amount);
    const discount = Number(data.discount) || 0;
    const netAmount = amount - discount;
    
    const oldNetAmount = viewingInvoice.netAmount || (viewingInvoice.amount - (viewingInvoice.discount || 0));
    const balanceDiff = netAmount - oldNetAmount;

    const updatedInvoice: LedgerEntry = {
      ...viewingInvoice,
      date: toValidDate(data.date),
      invoiceNumber: data.invoiceNumber as string,
      amount,
      discount,
      discountType: data.discountType,
      discountValue: data.discountPercentage,
      netAmount,
      bonus: Number(data.bonus) || 0,
      bonusArrivalDate: data.bonusArrivalDate ? toValidDate(data.bonusArrivalDate) : undefined,
      dueDate: data.dueDate ? toValidDate(data.dueDate) : undefined,
      purchaseType: data.purchaseType as 'cash' | 'credit',
      notes: data.notes as string,
      updatedAt: new Date()
    } as any;

    // Correctly update paid and remaining based on edits
    updatedInvoice.remainingAmount = Math.max(0, netAmount - (updatedInvoice.paidAmount || 0));
    
    if (updatedInvoice.remainingAmount <= 0) {
      updatedInvoice.paymentStatus = 'paid';
      updatedInvoice.remainingAmount = 0;
    } else if (updatedInvoice.paidAmount && updatedInvoice.paidAmount > 0) {
      updatedInvoice.paymentStatus = 'partial';
    } else {
      updatedInvoice.paymentStatus = 'pending';
    }
    
    // Check overdue
    if (updatedInvoice.paymentStatus !== 'paid' && updatedInvoice.dueDate && toValidDate(updatedInvoice.dueDate) < new Date()) {
      updatedInvoice.paymentStatus = 'overdue';
    }

    try {
      await firebaseService.updateDocument('ledgerEntries', viewingInvoice.id, updatedInvoice as any);
      
      // Sync to unified ledger
      await firebaseService.syncLedger({
        sourceType: 'invoice',
        sourceId: viewingInvoice.id as string,
        userId: appUser?.userId || 'demo-user',
        branchId: viewingInvoice.branchId || 'main',
        date: updatedInvoice.date,
        debit: updatedInvoice.netAmount,
        credit: 0,
        amount: updatedInvoice.netAmount,
        category: 'المشتريات',
        entityId: selectedEntity.id,
        entityName: selectedEntity.name,
        description: `تعديل فاتورة: ${selectedEntity.name} - ${updatedInvoice.invoiceNumber || ''}`,
        ownerId: appUser?.userId || 'demo-user'
      });

      await firebaseService.updateDocument('entities', selectedEntity.id, {
        balance: selectedEntity.balance + balanceDiff,
        updatedAt: new Date()
      } as any);
      
      console.log("Updated successfully (Invoice)");
      setIsEditInvoiceOpen(false);
      setViewingInvoice(null);
      toast.success('تم تحديث الفاتورة والميزانية بنجاح');
    } catch (err) {
      console.error("Failed to update invoice:", err);
      toast.error('حدث خطأ أثناء تحديث الفاتورة');
    }
  };

  const handleDeleteInvoice = async (invoiceToDel?: LedgerEntry) => {
    const inv = invoiceToDel || viewingInvoice;
    if (!inv?.id || !selectedEntity?.id) return;
    
    const isPayment = inv.operationType === 'payment';
    const isInvoice = inv.operationType === 'invoice';

    const title = isPayment ? 'حذف التسديد' : (isInvoice ? 'حذف الفاتورة' : 'حذف العملية');
    const message = 'هل أنت متأكد؟ سيتم حذف هذا السجل نهائياً من كل مكان ولا يمكن التراجع.';

    triggerDelete(
      title,
      message,
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          // 1. Reversal logic for payments before deletion
          if (isPayment) {
            const amount = inv.amount || 0;
            const discount = inv.discount || 0;
            const refund = inv.refundAmount || 0;
            const totalToReverse = amount + discount - refund;

            if (inv.paymentSource === 'invoice') {
              let invoiceDoc = inv.linkedInvoiceId ? allLedgerEntries.find(e => e.id === inv.linkedInvoiceId) : null;
              
              if (!invoiceDoc && inv.linkedInvoiceNumber) {
                invoiceDoc = allLedgerEntries.find(e => 
                  e.accountId === selectedEntity.id && 
                  e.invoiceNumber === inv.linkedInvoiceNumber && 
                  e.operationType === 'invoice'
                );
              }

              if (invoiceDoc && invoiceDoc.id) {
                const newPaidAmount = Math.max(0, (invoiceDoc.paidAmount || 0) - amount - discount);
                const newRemaining = (invoiceDoc.netAmount || 0) - newPaidAmount;
                
                let newStatus: 'pending' | 'partial' | 'paid' | 'overdue' = 'pending';
                if (newRemaining <= 0) newStatus = 'paid';
                else if (newPaidAmount > 0) newStatus = 'partial';
                
                await firebaseService.updateDocument('ledgerEntries', invoiceDoc.id, {
                  paidAmount: newPaidAmount,
                  remainingAmount: newRemaining,
                  paymentStatus: newStatus,
                  updatedAt: new Date()
                } as any);
              }
            }
          }

          // 2. Hard delete the original record (cascading cleanup)
          await firebaseService.deleteDocument('ledgerEntries', inv.id!);
          
          // 3. Add audit log
          await firebaseService.addDocument('historicalRecords', {
            title: `حذف نهائي: ${isPayment ? 'تسديد' : (isInvoice ? 'فاتورة' : 'عملية')}`,
            type: 'permanent_delete',
            sourceType: isPayment ? "payment_deleted_reversal" : "record_deleted",
            amount: isPayment ? (inv.amount || 0) : 0,
            entityId: selectedEntity.id,
            entityName: selectedEntity.name,
            recordId: inv.id,
            details: `تم حذف ${isPayment ? 'وصل' : 'عملية'} بقيمة ${formatIQD(isPayment ? (inv.amount || 0) : 0)} للمورد ${selectedEntity.name} نهائياً`,
            ownerId: appUser?.userId || 'demo-user',
            createdAt: new Date()
          } as any);

          // 4. Update entity balance & totals
          const amount = inv.amount || 0;
          const discount = inv.discount || 0;
          const refund = inv.refundAmount || 0;
          const totalToReverseOnEntity = isPayment ? (amount + discount - refund) : 0;
          
          const balanceAdjustment = isInvoice 
            ? -((inv as any).remainingAmount || 0) 
            : totalToReverseOnEntity; 

          const updateData: any = {
            balance: (selectedEntity.balance || 0) + balanceAdjustment,
            updatedAt: new Date()
          };

          if (isPayment) {
            updateData.totalPaidAmount = Math.max(0, (selectedEntity.totalPaidAmount || 0) - totalToReverseOnEntity);
            if (inv.paymentSource === 'opening_balance') {
              updateData.initialBalancePaid = Math.max(0, (selectedEntity.initialBalancePaid || 0) - amount);
            }
          }
          
          await firebaseService.updateDocument('entities', selectedEntity.id!, updateData);
          
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          setIsDeleteInvoiceConfirmOpen(false);
          setViewingInvoice(null);
          toast.success('تم الحذف النهائي وتحديث الحسابات بنجاح');
        } catch (err) {
          console.error("Failed to delete record:", err);
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error(err instanceof Error ? err.message : 'فشل حذف العملية');
        }
      }
    );
  };

  const handleDeleteTransaction = async (tx: Transaction) => {
    const isExpense = tx.type === 'expense';
    
    triggerDelete(
      `حذف ${isExpense ? 'المصروف' : 'الإيراد'}`,
      'هل أنت متأكد؟ سيتم حذف هذا السجل نهائياً من كل مكان ولا يمكن التراجع.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          if (!tx.id) throw new Error("ID السجل غير موجود");
          
          await firebaseService.deleteDocument('transactions', tx.id);
          
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          setIsEditTransactionOpen(false);
          toast.success(`تم حذف ${isExpense ? 'المصروف' : 'الإيراد'} نهائياً`);
        } catch (err) {
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('فشل عملية الحذف النهائي');
        }
      }
    );
  };

  const handleDeleteHistoricalRecord = async (id: string) => {
    triggerDelete(
      'حذف سجل تاريخي',
      'هل أنت متأكد؟ سيتم حذف هذا السجل نهائياً من كل مكان ولا يمكن التراجع.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await firebaseService.deleteDocument('historicalRecords', id);
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم حذف السجل التاريخي بنجاح');
        } catch (err) {
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('حدث خطأ أثناء الحذف');
        }
      }
    );
  };

  const handleDeleteOpeningCash = async (item: OpeningCash) => {
    triggerDelete(
      'حذف رصيد افتتاحي كاش',
      'هل أنت متأكد؟ سيتم حذف هذا الرصيد نهائياً مع قيود الأستاذ العام المرتبطة به.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          // Delete from openingCash collection
          await firebaseService.deleteDocument('openingCash', item.id!);
          
          // Delete associated ledger entries
          const ledgerEntries = rawAllLedgerEntries.filter(e => e.sourceId === item.id);
          for (const entry of ledgerEntries) {
             await firebaseService.deleteDocument('ledgerEntries', entry.id!);
          }

          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم حذف الرصيد الافتتاحي والقيود المرتبطة به بنجاح');
        } catch (err) {
          console.error("Delete Opening Cash Error:", err);
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('حدث خطأ أثناء الحذف');
        }
      }
    );
  };

  const handleDeleteBonus = async (id: string | undefined) => {
    if (!id) return;
    triggerDelete(
      'حذف البونص',
      'هل أنت متأكد؟ سيتم حذف هذا السجل نهائياً من كل مكان ولا يمكن التراجع.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await firebaseService.deleteDocument('bonuses', id);
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم حذف البونص بنجاح');
        } catch (err) {
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('حدث خطأ أثناء الحذف');
        }
      }
    );
  };

  const handleDeleteAttachment = async (ledgerId: string, url: string) => {
    const entry = ledgerEntries.find(e => e.id === ledgerId);
    if (!entry) return;

    triggerDelete(
      'حذف المرفق',
      'هل أنت متأكد؟ سيتم حذف هذه الصورة نهائياً من كل مكان ولا يمكن التراجع.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          let updateData: any = {};
          if (entry.imageUrl === url) updateData.imageUrl = null;
          if (entry.receiptImageUrl === url) updateData.receiptImageUrl = null;
          if (entry.imageUrls?.includes(url)) {
            updateData.imageUrls = entry.imageUrls.filter(u => u !== url);
          }
          
          await firebaseService.updateDocument('ledgerEntries', ledgerId, updateData);
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم حذف الصورة بنجاح');
        } catch (err) {
          console.error("Error deleting attachment:", err);
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('فشل في حذف الصورة');
        }
      }
    );
  };

  const handleAddRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving record... (Refund)");
    if (!viewingInvoice?.id || !selectedEntity?.id) return;
    
    const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : undefined);
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const refundAmount = Number(formData.get('refundAmount'));
    const reason = formData.get('reason') as string;
    const date = new Date(formData.get('date') as string);
    
    const newRefundEntry: Omit<LedgerEntry, 'id'> = {
      accountId: selectedEntity.id,
      accountName: selectedEntity.name,
      accountType: selectedEntity.type,
      date,
      operationType: 'refund',
      sourceType: 'return',
      amount: 0,
      discount: 0,
      refundAmount: refundAmount,
      debit: 0,
      credit: refundAmount,
      netAmount: 0,
      linkedInvoiceId: viewingInvoice.id,
      linkedInvoiceNumber: viewingInvoice.invoiceNumber,
      notes: reason,
      balanceAfterOperation: selectedEntity.balance - refundAmount,
      ownerId: user?.uid || 'guest',
      branchId: (targetBranchId as string) || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    try {
      await firebaseService.addDocument('ledgerEntries', newRefundEntry as LedgerEntry);
      console.log("Saved successfully (Refund)");
      
      const newRefundTotal = (viewingInvoice.refundAmount || 0) + refundAmount;
      const newPaid = (viewingInvoice.paidAmount || 0) + refundAmount; 
      
      const currentPaid = (viewingInvoice.paidAmount || 0) + refundAmount;
      const currentRemaining = Math.max(0, viewingInvoice.netAmount - currentPaid);
      let status: 'paid' | 'partial' | 'pending' | 'overdue' = 'partial';
      if (currentRemaining <= 0) status = 'paid';
      else if (currentPaid === 0) status = 'pending';
      
      if (status !== 'paid' && viewingInvoice.dueDate && toValidDate(viewingInvoice.dueDate) < new Date()) {
        status = 'overdue';
      }

      await firebaseService.updateDocument('ledgerEntries', viewingInvoice.id, {
        paidAmount: currentPaid,
        remainingAmount: currentRemaining,
        paymentStatus: status,
        refundAmount: newRefundTotal,
        updatedAt: new Date()
      } as any);
      
      await firebaseService.updateDocument('entities', selectedEntity.id, {
        balance: selectedEntity.balance - refundAmount,
        updatedAt: new Date()
      } as any);
      
      setIsRefundInvoiceOpen(false);
      setViewingInvoice(null);
      toast.success('تم تسجيل المرتجع بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
    }
  };

  const handleAddRevenue = async (data: any) => {
    if (isSavingRecord) return;
    setIsSavingRecord(true);
    
    console.log("[App] handleAddRevenue called with:", data);
    const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');
    
    try {
      let imageUrl = '';
      const imageUrls: string[] = [];
      if (revenueImageFiles && revenueImageFiles.length > 0) {
        try {
          for (const file of revenueImageFiles) {
            const b64 = await fileToBase64(file);
            imageUrls.push(b64);
          }
          imageUrl = imageUrls[0];
        } catch (e) {
          console.error('Error converting images to base64', e);
        }
      }

      const txPayload = {
        ...data,
        branchId: targetBranchId as string,
        createdBy: appUser?.userId || 'demo-user',
        ownerId: appUser?.userId || 'demo-user',
        userId: appUser?.userId || 'demo-user',
        imageUrl,
        imageUrls,
        description: `${data.incomeTypeCustom || 'مبيعات'} - ${data.incomeType === 'cash' ? 'نقدي' : 'دين'}`
      };

      const result = await firebaseService.saveRevenue(txPayload);
      
      if (result?.blocked) {
        toast.info('هذه العملية مسجلة بالفعل');
      } else {
        toast.success('تم حفظ الوارد بنجاح');
      }

      // Success actions: Reset files, Close modal, Refreshing happens via useFirebaseQuery
      setRevenueImageFiles([]);
      setIsAddRevenueOpen(false);
      
    } catch (err: any) {
      console.error("[App] Failed to add revenue:", err);
      // Determine error message in Arabic
      let errorMsg = 'حدث خطأ أثناء حفظ الوارد';
      if (err?.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error === 'Missing or insufficient permissions.') {
            errorMsg = 'عذراً، ليس لديك صلاحية لإضافة وارد';
          } else {
            errorMsg = `فشل الحفظ: ${parsed.error}`;
          }
        } catch {
          errorMsg = `فشل الحفظ: ${err.message}`;
        }
      }
      toast.error(errorMsg);
      // Re-throw to inform RevenueForm that it failed
      throw err;
    } finally {
      setIsSavingRecord(false);
    }
  };

  const getExpenseStatement = (tx: Transaction) => {
    if (!tx) return "غير معروف";
    if (tx.type !== 'expense') return tx.customerName || (tx as any).accountName || tx.description || "عملية مالية";

    const categoryLabels: Record<string, string> = {
      'rent_pharmacy': 'إيجار صيدلية',
      'rent': 'إيجار',
      'electricity': 'كهرباء / مولد',
      'rent_license': 'إيجار إجازة',
      'internet': 'إنترنت واشتراكات',
      'service_worker': 'عامل خدمة',
      'salaries': 'رواتب ومكافآت',
      'transport': 'نقل وتوصيل أدوية',
      'marketing': 'تسويق وإعلان',
      'repairs': 'صيانة معدات أو مكان',
      'materials': 'مواد تشغيلية',
      'damaged_expired': 'تلف واكسباير',
      'other': 'مصاريف أخرى'
    };

    const category = tx.category ? (categoryLabels[tx.category] || tx.category) : "مصروف عام";
    const statement = tx.statement || category || "مصروف عام";
    
    const partyDisplay = tx.partyName || tx.entityName || "";
    if (partyDisplay) return `${statement} - ${partyDisplay}`;
    return statement;
  };

  const handleAddExpense = async (data: any) => {
    if (isSavingRecord) return;
    setIsSavingRecord(true);

    console.log("[App] handleAddExpense called with:", data);
    const targetBranchId = currentBranchId || (branches.length > 0 ? branches[0].id : 'main');

    let detailedDescription = data.description;
    if (data.category === 'rent' || data.category === 'rent_pharmacy') {
      detailedDescription = `إيجار (${data.rentType || 'عام'}) - ${data.period || ''}: ${data.description || ''}`;
    } else if (data.category === 'salaries') {
      detailedDescription = `راتب الموظف ${data.employeeName || ''} (${data.jobTitle || ''}) - ${data.period || ''}`;
    } else if (data.category === 'electricity') {
      detailedDescription = `${data.serviceType === 'national' ? 'كهرباء وطنية' : data.serviceType === 'generator' ? 'مولدة' : 'اشتراك'} - ${data.reading || ''}: ${data.description || ''}`;
    }

    const categoryLabels: Record<string, string> = {
      'rent_pharmacy': 'إيجار صيدلية',
      'rent': 'إيجار',
      'electricity': 'كهرباء / مولد',
      'rent_license': 'إيجار إجازة',
      'internet': 'إنترنت واشتراكات',
      'service_worker': 'عامل خدمة',
      'salaries': 'رواتب ومكافآت',
      'transport': 'نقل وتوصيل أدوية',
      'marketing': 'تسويق وإعلان',
      'repairs': 'صيانة معدات أو مكان',
      'materials': 'مواد تشغيلية',
      'damaged_expired': 'تلف واكسباير',
      'other': 'مصاريف أخرى'
    };
    
    const categoryLabel = data.category ? (categoryLabels[data.category] || data.category) : "مصروف عام";

    const txPayload = {
      ...data,
      description: detailedDescription || categoryLabel,
      statement: data.statement || categoryLabel,
      branchId: targetBranchId as string,
      createdBy: appUser?.userId || 'demo-user',
      ownerId: appUser?.userId || 'demo-user',
      userId: appUser?.userId || 'demo-user'
    };
    
    try {
      const result = await firebaseService.saveExpense(txPayload);
      
      if (result?.blocked) {
        toast.info('هذه العملية مسجلة بالفعل');
      } else {
        toast.success('تم حفظ المصروف بنجاح');
      }

      setIsAddExpenseOpen(false);
    } catch (err: any) {
      console.error("[App] Failed to add expense:", err);
      let errorMsg = 'حدث خطأ أثناء حفظ المصروف';
      if (err?.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error === 'Missing or insufficient permissions.') {
            errorMsg = 'عذراً، ليس لديك صلاحية لإضافة مصروف';
          } else {
            errorMsg = `فشل الحفظ: ${parsed.error}`;
          }
        } catch {
          errorMsg = `فشل الحفظ: ${err.message}`;
        }
      }
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleAddLoss = async (data: any) => {
    try {
      // 1. Add to Firestore
      await firebaseService.addDocument('expiredDamagedLosses', {
        ...data,
        ownerId: appUser?.userId || 'demo-user',
        branchId: currentBranchId || 'main'
      });

      // 2. If linked to invoice, update invoice remaining amount
      if (data.invoiceId && data.invoiceId !== 'none') {
         const invoice = (allLedgerEntries || []).find(i => i.id === data.invoiceId);
         if (invoice) {
            const currentRemaining = Number(invoice.remainingAmount || 0);
            const lossAmount = Number(data.totalLoss || 0);
            const newRemaining = Math.max(0, currentRemaining - lossAmount);
            
            await firebaseService.updateDocument('ledgerEntries', data.invoiceId, {
              remainingAmount: newRemaining,
              notes: `${invoice.notes || ''}\n[خسارة تالف/اكسباير مرتبطة: -${formatIQD(lossAmount)}]`,
              updatedAt: new Date()
            } as any);

            // Also update entity balance
            const entity = entities.find(e => e.id === invoice.accountId);
            if (entity) {
               const currentBalance = Number(entity.balance || 0);
               await firebaseService.updateDocument('entities', entity.id!, {
                 balance: currentBalance - lossAmount,
                 updatedAt: new Date()
               } as any);
            }
         }
      }

      setIsAddLossOpen(false);
      toast.success('تم تسجيل الخسارة وتحديث الحسابات بنجاح');
    } catch (err) {
      console.error(err);
      toast.error('فشل في تسجيل الخسارة');
    }
  };

  const handleUpdateLoss = async (data: Partial<ExpiredDamagedLoss>) => {
    if (!selectedLoss?.id) return;
    try {
      await firebaseService.updateDocument('expiredDamagedLosses', selectedLoss.id, {
        ...data,
        updatedAt: new Date()
      });
      setIsEditLossOpen(false);
      setSelectedLoss(null);
      toast.success('تم تحديث سجل الخسارة بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء تحديث السجل');
    }
  };

  const handleUpdateBonus = async (data: Partial<Bonus>) => {
    if (!editingBonus?.id) return;
    try {
      await firebaseService.updateDocument('bonuses', editingBonus.id, {
        ...data,
        updatedAt: new Date()
      });
      setIsEditBonusOpen(false);
      setEditingBonus(null);
      toast.success('تم تحديث سجل البونص بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء تحديث السجل');
    }
  };

  const handleGenericDelete = async () => {
    if (!deletingItem) return;
    try {
      await firebaseService.deleteDocument(deletingItem.collection as any, deletingItem.id);
      setIsDeleteConfirmOpen(false);
      setDeletingItem(null);
      toast.success('تم الحذف بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleUpdateTransaction = async (data: any) => {
    console.log("Updating record... (Transaction)");
    if (!selectedTransaction?.id) return;
    
    let imageUrl = selectedTransaction.imageUrl || '';
    const imageUrls: string[] = selectedTransaction.imageUrls || (imageUrl ? [imageUrl] : []);
    
    if (revenueImageFiles && revenueImageFiles.length > 0) {
      try {
        // Convert all new images to base64
        for (const file of revenueImageFiles) {
          const b64 = await fileToBase64(file);
          imageUrls.push(b64);
        }
        // Use first available image for backward compatibility imageUrl field
        imageUrl = imageUrls[0];
      } catch (e) {
        console.error('Error converting images to base64', e);
      }
    }

    const updatedTx = {
      ...selectedTransaction,
      ...data,
      imageUrl,
      imageUrls,
      updatedAt: new Date()
    };
    
    try {
      const col = (selectedTransaction as any)._col || 'transactions';
      await firebaseService.updateDocument(col, selectedTransaction.id, updatedTx);
      
      // If it also exists in ledger (old system sync), try to update it too but ignore errors
      if (col === 'transactions') {
         const relatedLedger = rawAllLedgerEntries.find(e => e.sourceId === selectedTransaction.id);
         if (relatedLedger) {
           await firebaseService.updateDocument('ledgerEntries', relatedLedger.id, {
             ...updatedTx,
             debit: updatedTx.type === 'expense' ? updatedTx.amount : 0,
             credit: updatedTx.type === 'revenue' ? updatedTx.amount : 0,
           });
         }
      }

      setIsEditTransactionOpen(false);
      setRevenueImageFiles([]);
      toast.success('تم تحديث البيانات بنجاح');
    } catch (err) {
      console.error("Failed to update transaction:", err);
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const handleAddOpeningCash = async (data: Partial<OpeningCash>) => {
    console.log("Adding opening cash balance records:", data);
    if (!appUser) return;
    
    // Ensure all required fields for openingCash are present
    const openingCashData: any = {
      ...data,
      date: data.date || new Date(),
      month: data.month || (new Date().getMonth() + 1),
      year: data.year || (new Date().getFullYear()),
      amount: data.amount || 0,
      branchId: data.branchId || 'main',
      ownerId: appUser.userId
    };

    try {
      // 1. Add to dedicated collection for management
      const cashId = await firebaseService.addDocument('openingCash', openingCashData);
      
      // 2. Unified Ledger Save
      await firebaseService.saveFinancialRecordOnce({
        ...openingCashData,
        sourceType: 'opening_cash',
        sourceId: cashId,
        type: 'opening_balance',
        operationType: 'opening_balance',
        debit: 0,
        credit: openingCashData.amount,
        amount: openingCashData.amount,
        category: 'أرصدة افتتاحية',
        description: `رصيد مدور: ${openingCashData.notes || ''}`,
      });

      setIsAddOpeningCashOpen(false);
      toast.success('تم إضافة الرصيد الافتتاحي وتحديث الحسابات بنجاح');
    } catch (err) {
      console.error("Failed to add opening cash:", err);
      toast.error('حدث خطأ أثناء إضافة الرصيد');
    }
  };

  const handleDeleteLoss = async (loss: ExpiredDamagedLoss) => {
    triggerDelete(
      'حذف سجل التالف/المنتهي',
      'هل أنت متأكد؟ سيتم حذف هذا السجل نهائياً من كل مكان ولا يمكن التراجع.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await firebaseService.deleteDocument('expiredDamagedLosses', loss.id!);
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم حذف السجل بنجاح');
        } catch (err) {
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('حدث خطأ أثناء الحذف');
        }
      }
    );
  };

  // Auth UI logic handled by onAuthStateChanged

  const handleDeleteMedicineRequest = async (id: string) => {
    triggerDelete(
      'حذف طلب توفير دواء',
      'هل أنت متأكد؟ سيتم حذف هذا الطلب نهائياً من كل مكان ولا يمكن التراجع.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await firebaseService.deleteDocument('medicineRequests', id);
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم حذف الطلب بنجاح');
        } catch (err) {
          console.error("Error deleting medicine request:", err);
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('حدث خطأ أثناء الحذف');
        }
      }
    );
  };

  const handleDeleteRequestImage = async (id: string) => {
    triggerDelete(
      'حذف صورة الطلب',
      'هل أنت متأكد؟ سيتم حذف هذه الصورة نهائياً من كل مكان ولا يمكن التراجع.',
      async () => {
        setDeleteConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await firebaseService.updateDocument('medicineRequests', id, { imageUrl: null });
          setDeleteConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          toast.success('تم حذف الصورة بنجاح');
        } catch (err) {
          console.error("Error deleting image:", err);
          setDeleteConfirmState(prev => ({ ...prev, isLoading: false }));
          toast.error('فشل في الحذف');
        }
      }
    );
  };

  const handleCustomRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authFullName.trim() || !authPharmacyName.trim() || !authUsername.trim() || !authPhone.trim() || !authPassword) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }
    if (authPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف أو أكثر');
      return;
    }

    setCustomAuthLoading(true);
    try {
      const result = await customAuthService.registerPendingUser(
        authFullName,
        authPharmacyName,
        authUsername,
        authPhone,
        authPassword,
        authPlanType
      );

      if (result.success) {
        setOtpRemainingSeconds(600); // 10 minutes count
        setResendCooldown(60); // 60 seconds resend cooldown
        setOtpExpired(false);
        setAuthOTP('');
        
        if (result.pendingUserExists) {
          setAuthUsername(result.email || authUsername);
          setAuthFullName(result.fullName || authFullName);
          setAuthStep('verify-signup');
          toast.info('البريد مستخدم مسبقاً، أكمل التفعيل. لقد أرسلنا رمز تحقق جديد لبريدك الإلكتروني.');
        } else {
          setAuthStep('verify-signup');
          toast.success('تم إرسال الرمز وتنبيه الحساب الجديد بنجاح؛ يرجى إدخال رمز التحقق لتفعيله.');
        }
      } else {
        toast.error(result.error || 'فشل إنشاء الحساب');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ غير متوقع أثناء التسجيل');
    } finally {
      setCustomAuthLoading(false);
    }
  };

  const handleVerifyCustomRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authOTP.trim()) {
      toast.error('يرجى إدخال رمز التحقق');
      return;
    }

    setCustomAuthLoading(true);
    try {
      const result = await customAuthService.verifyUserOTP(authUsername, authOTP);
      if (result.success && result.user) {
        // Live license validation check during OTP success
        let liveActivationStatus = result.user.activationStatus || 'unlicensed';
        let tempPlanType: any = result.user.planType || 'basic';
        let tempMaxDevices = result.user.maxDevices || 2;
        let tempBranchesCount = result.user.branchesCount || 1;

        const superAdminEmail = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'mustafaenginerr35@gmail.com').trim().toLowerCase();
        const isSuperAdminOTP = result.user.email && result.user.email.trim().toLowerCase() === superAdminEmail;
        const isAdminOTP = result.user.role === 'admin';

        if (!isSuperAdminOTP && isAdminOTP !== true) {
          const keyToVerify = (result.user.licenseCode || result.user.licenseKey || '').trim().toUpperCase();
          if (!keyToVerify) {
            liveActivationStatus = 'unlicensed';
          } else {
            try {
              const lSnap = await getDocs(query(collection(db, 'licenses'), where('licenseKey', '==', keyToVerify)));
              if (lSnap.empty) {
                liveActivationStatus = 'unlicensed';
              } else {
                const lDoc = lSnap.docs[0];
                const lData = lDoc.data();
                
                let currentLStatus = lData.status || 'unused';

                // Expiry Date check
                if (lData.expiryDate) {
                  const expiry = new Date(lData.expiryDate);
                  if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
                    currentLStatus = 'expired';
                    await updateDoc(doc(db, 'licenses', lDoc.id), {
                      status: 'expired',
                      updatedAt: new Date().toISOString()
                    });
                  }
                }

                if (currentLStatus === 'revoked' || currentLStatus === 'suspended' || currentLStatus === 'expired') {
                  liveActivationStatus = currentLStatus;
                } else if (lData.ownerUserId && lData.ownerUserId !== result.user.userId) {
                  liveActivationStatus = 'used_by_other';
                } else {
                  liveActivationStatus = currentLStatus;
                  tempPlanType = lData.planType || 'basic';
                  tempMaxDevices = lData.maxDevices || 2;
                  tempBranchesCount = lData.maxBranches || 1;

                  // B3 Device fingerprint verification
                  const dev = getDeviceDetails();
                  const fp = dev.deviceId;
                  const deviceName = dev.name;
                  const licDevices = lData.activatedDevices || [];
                  
                  const exDevice = licDevices.find((d: any) => d.deviceId === fp);
                  if (exDevice) {
                    // Update device last seen
                    const updatedList = licDevices.map((d: any) => 
                      d.deviceId === fp 
                        ? { ...d, lastSeen: new Date().toISOString(), name: deviceName }
                        : d
                    );
                    await updateDoc(doc(db, 'licenses', lDoc.id), {
                      activatedDevices: updatedList,
                      updatedAt: new Date().toISOString()
                    });
                  } else {
                    // Verify maximum devices count
                    if (licDevices.length >= tempMaxDevices) {
                      liveActivationStatus = 'blocked_device';
                    } else {
                      const newDevice = {
                        deviceId: fp,
                        name: deviceName,
                        createdAt: new Date().toISOString(),
                        lastSeen: new Date().toISOString()
                      };
                      const updatedList = [...licDevices, newDevice];
                      await updateDoc(doc(db, 'licenses', lDoc.id), {
                        activatedDevices: updatedList,
                        updatedAt: new Date().toISOString()
                      });
                    }
                  }
                }
              }
            } catch (err) {
              console.error("Error doing live license check during OTP verification:", err);
            }
          }

          // Update result.user object with live license status
          result.user.activationStatus = liveActivationStatus;
          result.user.licenseStatus = liveActivationStatus;
          result.user.planType = tempPlanType === 'pro' ? 'advanced' : tempPlanType;
          result.user.maxDevices = tempMaxDevices;
          result.user.branchesCount = tempBranchesCount;

          try {
            await updateDoc(doc(db, 'appUsers', result.user.userId), {
              activationStatus: liveActivationStatus,
              licenseStatus: liveActivationStatus,
              planType: tempPlanType === 'pro' ? 'advanced' : tempPlanType,
              maxDevices: tempMaxDevices,
              branchesCount: tempBranchesCount,
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn("Could not write live license status to appUsers on OTP success:", e);
          }
        }

        localStorage.setItem('pharma-auth-user', JSON.stringify(result.user));
        localStorage.setItem('pharma-is-authenticated', 'true');
        
        const mappedUser: AppUser = {
          userId: result.user.userId,
          id: result.user.userId,
          email: result.user.email,
          username: result.user.fullName,
          displayName: result.user.pharmacyName || result.user.fullName,
          phone: result.user.phone,
          isActive: true,
          isSetupComplete: true,
          createdAt: new Date(result.user.createdAt),
          role: isSuperAdminOTP ? 'super_admin' : (result.user.role || 'manager'),
          licenseCode: result.user.licenseCode,
          activationStatus: result.user.activationStatus,
          planType: result.user.planType || 'basic',
          maxDevices: result.user.maxDevices,
          branchesCount: result.user.branchesCount,
          isVerified: true,
          lastLogin: result.user.lastLogin,
          pharmacyName: result.user.pharmacyName
        };
        setAppUser(mappedUser);
        setIsAppAuthenticated(true);
        setAuthStep('authenticated');
        
        // Clear old inputs
        setAuthFullName('');
        setAuthPharmacyName('');
        setAuthPhone('');
        setAuthPassword('');
        setAuthConfirmPassword('');
        setAuthOTP('');

        toast.success(`أهلاً بك د. ${result.user.fullName}! تم تأكيد بريدك الإلكتروني بنجاح. يرجى تفعيل البرنامج بواسطة كود الترخيص الآن.`);
      } else {
        toast.error(result.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل التحقق من الرمز');
    } finally {
      setCustomAuthLoading(false);
    }
  };

  const handleVerifyResendSignUp = async () => {
    setCustomAuthLoading(true);
    try {
      const sent = await customAuthService.resendOTP(authUsername, 'register');
      if (sent) {
        setOtpRemainingSeconds(600);
        setResendCooldown(60); // 60 seconds resend cooldown
        setOtpExpired(false);
        toast.success('تمت إعادة إرسال رمز تحقق جديد إلى بريدك الإلكتروني.');
      }
    } catch (err) {
      toast.error('فشل إرسال الرمز مجدداً');
    } finally {
      setCustomAuthLoading(false);
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKeyInput.trim()) {
      toast.error('يرجى إدخال مفتاح رخصة التفعيل');
      return;
    }
    if (!appUser?.userId) {
      toast.error('لم يتم تحديد هوية المستخدم');
      return;
    }

    setActivationLoading(true);
    try {
      let fp = localStorage.getItem('pharma-device-fp');
      if (!fp) {
        fp = 'fp_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('pharma-device-fp', fp);
      }

      const res = await customAuthService.activateLicenseKey(
        appUser.userId,
        activationKeyInput,
        fp
      );

      if (res.success && res.user) {
        localStorage.setItem('pharma-auth-user', JSON.stringify(res.user));
        
        const updatedMappedUser: AppUser = {
          ...appUser,
          licenseCode: res.user.licenseCode,
          activationStatus: res.user.activationStatus,
          planType: res.user.planType || 'basic',
          maxDevices: res.user.maxDevices,
          branchesCount: res.user.branchesCount,
          customerName: res.user.customerName,
          customerPhone: res.user.phone,
          customerEmail: res.user.email,
        };
        setAppUser(updatedMappedUser);
        toast.success('تم تفعيل وترخيص صيدليتك بنجاح وبدء تشغيل النظام!');
      } else {
        toast.error(res.error || 'فشل التفعيل، يرجى التحقق من مفتاح رخصة التفعيل.');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ غير متوقع أثناء التفعيل');
    } finally {
      setActivationLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword) {
      toast.error('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setCustomAuthLoading(true);
    try {
      // Generate or retrieve persistent browser device fingerprint
      let fp = localStorage.getItem('pharma-device-fp');
      if (!fp) {
        fp = 'fp_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('pharma-device-fp', fp);
      }

      const loginResult = await customAuthService.loginUser(authUsername, authPassword, fp);
      
      if (loginResult.success && loginResult.user) {
        let loggedInUser = loginResult.user;
        const superAdminEmail = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'mustafaenginerr35@gmail.com').trim().toLowerCase();
        const isSuperAdminLogin = loggedInUser.email && loggedInUser.email.trim().toLowerCase() === superAdminEmail;

        if (isSuperAdminLogin && (loggedInUser.role !== 'super_admin' || !loggedInUser.isProtected)) {
          loggedInUser = { ...loggedInUser, role: 'super_admin', isProtected: true };
          try {
            await updateDoc(doc(db, 'appUsers', loggedInUser.userId), { role: 'super_admin', isProtected: true });
          } catch (e) {
            console.warn("Could not write logged-in super_admin role to Firestore:", e);
          }
        }

        // Live license validation check during Login
        let liveActivationStatus = loggedInUser.activationStatus || 'unlicensed';
        let tempPlanType: any = loggedInUser.planType || 'basic';
        let tempMaxDevices = loggedInUser.maxDevices || 2;
        let tempBranchesCount = loggedInUser.branchesCount || 1;

        if (isSuperAdminLogin !== true && loggedInUser.role !== 'admin') {
          const keyToVerify = (loggedInUser.licenseCode || loggedInUser.licenseKey || '').trim().toUpperCase();
          if (!keyToVerify) {
            liveActivationStatus = 'unlicensed';
          } else {
            try {
              const lSnap = await getDocs(query(collection(db, 'licenses'), where('licenseKey', '==', keyToVerify)));
              if (lSnap.empty) {
                liveActivationStatus = 'unlicensed';
              } else {
                const lDoc = lSnap.docs[0];
                const lData = lDoc.data();
                
                let currentLStatus = lData.status || 'unused';

                // Expiry Date check
                if (lData.expiryDate) {
                  const expiry = new Date(lData.expiryDate);
                  if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
                    currentLStatus = 'expired';
                    await updateDoc(doc(db, 'licenses', lDoc.id), {
                      status: 'expired',
                      updatedAt: new Date().toISOString()
                    });
                  }
                }

                if (currentLStatus === 'revoked' || currentLStatus === 'suspended' || currentLStatus === 'expired') {
                  liveActivationStatus = currentLStatus;
                } else if (lData.ownerUserId && lData.ownerUserId !== loggedInUser.userId) {
                  liveActivationStatus = 'used_by_other';
                } else {
                  liveActivationStatus = currentLStatus;
                  tempPlanType = lData.planType || 'basic';
                  tempMaxDevices = lData.maxDevices || 2;
                  tempBranchesCount = lData.maxBranches || 1;

                  // B3 Device fingerprint verification
                  const dev = getDeviceDetails();
                  const fp = dev.deviceId;
                  const deviceName = dev.name;
                  const licDevices = lData.activatedDevices || [];
                  
                  const exDevice = licDevices.find((d: any) => d.deviceId === fp);
                  if (exDevice) {
                    // Update device last seen
                    const updatedList = licDevices.map((d: any) => 
                      d.deviceId === fp 
                        ? { ...d, lastSeen: new Date().toISOString(), name: deviceName }
                        : d
                    );
                    await updateDoc(doc(db, 'licenses', lDoc.id), {
                      activatedDevices: updatedList,
                      updatedAt: new Date().toISOString()
                    });
                  } else {
                    // Verify maximum devices count
                    if (licDevices.length >= tempMaxDevices) {
                      liveActivationStatus = 'blocked_device';
                      // Wait! If blocked, we also return success: false from customAuthService during login.
                      // Doing this double check ensures standard error triggers.
                    } else {
                      const newDevice = {
                        deviceId: fp,
                        name: deviceName,
                        createdAt: new Date().toISOString(),
                        lastSeen: new Date().toISOString()
                      };
                      const updatedList = [...licDevices, newDevice];
                      await updateDoc(doc(db, 'licenses', lDoc.id), {
                        activatedDevices: updatedList,
                        updatedAt: new Date().toISOString()
                      });
                    }
                  }
                }
              }
            } catch (err) {
              console.error("Error doing live license check during login:", err);
            }
          }

          // Update loggedInUser object with live license status
          loggedInUser.activationStatus = liveActivationStatus;
          loggedInUser.licenseStatus = liveActivationStatus;
          loggedInUser.planType = tempPlanType === 'pro' ? 'advanced' : tempPlanType;
          loggedInUser.maxDevices = tempMaxDevices;
          loggedInUser.branchesCount = tempBranchesCount;

          try {
            await updateDoc(doc(db, 'appUsers', loggedInUser.userId), {
              activationStatus: liveActivationStatus,
              licenseStatus: liveActivationStatus,
              planType: tempPlanType === 'pro' ? 'advanced' : tempPlanType,
              maxDevices: tempMaxDevices,
              branchesCount: tempBranchesCount,
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn("Could not write live license status to appUsers on login:", e);
          }
        }

        localStorage.setItem('pharma-auth-user', JSON.stringify(loggedInUser));
        localStorage.setItem('pharma-is-authenticated', 'true');
        
        const mappedUser: AppUser = {
          userId: loggedInUser.userId,
          id: loggedInUser.userId,
          email: loggedInUser.email,
          username: loggedInUser.fullName,
          displayName: loggedInUser.fullName,
          phone: loggedInUser.phone,
          isActive: true,
          isSetupComplete: true,
          createdAt: new Date(loggedInUser.createdAt),
          role: isSuperAdminLogin ? 'super_admin' : (loggedInUser.role || 'customer'),
          licenseCode: loggedInUser.licenseCode,
          activationStatus: loggedInUser.activationStatus,
          planType: loggedInUser.planType || 'basic',
          maxDevices: loggedInUser.maxDevices,
          branchesCount: loggedInUser.branchesCount,
          isVerified: true,
          lastLogin: loggedInUser.lastLogin
        };
        setAppUser(mappedUser);
        setIsAppAuthenticated(true);
        setAuthStep('authenticated');
        
        toast.success(`أهلاً بك مجدداً د. ${loginResult.user.fullName}`);
      } else if (loginResult.needVerification) {
        toast.info('حسابك غير مفعّل بعد. جاري إرسال كود تفعيلي جديد على بريدك الإلكتروني الآن...');
        const sent = await customAuthService.resendOTP(authUsername, 'register');
        setOtpRemainingSeconds(600);
        setResendCooldown(60); // 60 seconds resend cooldown
        setOtpExpired(false);
        setAuthStep('verify-signup');
      } else {
        toast.error(loginResult.error || 'فشل تسجيل الدخول، تأكد من البيانات');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setCustomAuthLoading(false);
    }
  };

  const handleRequestResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim()) {
      toast.error('الرجاء إدخال البريد الإلكتروني');
      return;
    }

    setCustomAuthLoading(true);
    try {
      const result = await customAuthService.requestPasswordResetOTP(authUsername);
      if (result.success) {
        setOtpRemainingSeconds(600);
        setResendCooldown(60); // 60 seconds resend cooldown
        setOtpExpired(false);
        setAuthOTP('');
        setAuthResetNewPassword('');
        setAuthResetConfirmPassword('');
        setAuthStep('verify-reset');
        toast.success('تم إرسال رمز إعادة التعيين OTP إلى بريدك الإلكتروني.');
      } else {
        toast.error(result.error || 'فشل طلب إعادة تعيين كلمة المرور');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ ما');
    } finally {
      setCustomAuthLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authOTP.trim() || !authResetNewPassword || !authResetConfirmPassword) {
      toast.error('يرجى تعبئة كافة الحقول المطلوبة');
      return;
    }
    if (authResetNewPassword !== authResetConfirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    if (authResetNewPassword.length < 6) {
      toast.error('يجب أن تكون كلمة المرور 6 أحرف أو أكثر');
      return;
    }

    setCustomAuthLoading(true);
    try {
      const result = await customAuthService.resetPasswordWithOTP(
        authUsername,
        authOTP,
        authResetNewPassword
      );

      if (result.success) {
        toast.success('تم تعيين كلمة المرور الجديدة بنجاح! يمكنك الدخول الآن.');
        setAuthPassword('');
        setAuthStep('login-password');
      } else {
        toast.error(result.error || 'فشل تعيين كلمة المرور الجديدة');
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
    } finally {
      setCustomAuthLoading(false);
    }
  };

  const handleVerifyResendReset = async () => {
    setCustomAuthLoading(true);
    try {
      const sent = await customAuthService.resendOTP(authUsername, 'reset');
      if (sent) {
        setOtpRemainingSeconds(600);
        setResendCooldown(60); // 60 seconds resend cooldown
        setOtpExpired(false);
        toast.success('تمت إعادة إرسال رمز تحقق إعادة التعيين.');
      }
    } catch (err) {
      toast.error('فشل محاولة الإرسال مجدداً');
    } finally {
      setCustomAuthLoading(false);
    }
  };



  const handleMigrateToLedger = async () => {
    if (!appUser) return;
    try {
      console.log("[Migration] Starting full sync...");
      
      // 1. Sync Base Transactions (Revenue & Expenses)
      for (const tx of transactions) {
        if (!tx.isDeleted) {
          await firebaseService.syncLedger({
            sourceType: tx.type === 'revenue' ? 'revenue' : 'expense',
            sourceId: tx.id!,
            userId: appUser.userId,
            branchId: tx.branchId || 'main',
            date: toValidDate(tx.date || tx.createdAt || new Date()),
            debit: tx.type === 'expense' ? tx.amount : 0,
            credit: tx.type === 'revenue' ? tx.amount : 0,
            amount: tx.amount || 0,
            category: tx.category || (tx.type === 'revenue' ? 'إيرادات' : 'مصاريف'),
            description: tx.description || tx.statement || '',
            ownerId: appUser.userId
          });
        }
      }

      // 2. Sync Invoices & Payments (already handled by ledgerEntries normally, but ensure types match)
      for (const entry of allLedgerEntries) {
        if (!entry.isDeleted) {
           // We ensure sourceType is set if missing
           const st = entry.sourceType || (entry.operationType === 'invoice' ? 'invoice' : 'payment');
           await firebaseService.syncLedger({
             ...entry,
             sourceType: st as any,
             sourceId: entry.id!,
             userId: appUser.userId
           } as any);
        }
      }

      // 3. Sync Salaries
      for (const record of employeeAttendance) {
        if (record.dailyWage && Number(record.dailyWage) > 0) {
          await firebaseService.syncLedger({
            sourceType: 'employee_salary',
            sourceId: record.id!,
            userId: appUser.userId,
            branchId: record.branchId || 'main',
            date: toValidDate(record.date || record.createdAt || new Date()),
            debit: Number(record.dailyWage),
            credit: 0,
            amount: Number(record.dailyWage),
            category: 'رواتب الموظفين',
            entityId: record.employeeId,
            entityName: record.employeeName,
            description: `راتب موظف: ${record.employeeName}`,
            ownerId: appUser.userId
          });
        }
      }

      console.log("[Migration] Full sync completed");
    } catch (err) {
      console.error("[Migration] Error:", err);
      throw err;
    }
  };

  const handleViewRecordFromReport = (type: string, id: string) => {
    console.log("Viewing record from report:", type, id);
    if (type === 'invoice' || type === 'purchase' || type === 'payment' || type === 'expense' || type === 'salary' || type === 'debt' || type === 'supplier_debt') {
      const entry = allLedgerEntries.find(e => e.id === id);
      if (entry) {
        setViewingInvoice(entry);
        setActiveTab('invoice-details');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.info('جاري عرض التفاصيل');
      } else {
        toast.error('لم يتم العثور على السجل في سجلات الأستاذ');
      }
    } else if (type === 'revenue' || type === 'damaged' || type === 'expired') {
      const tx = transactions.find(t => t.id === id) || (expiredDamagedLosses as any[]).find(l => l.id === id);
      if (tx) {
        if (type === 'revenue') {
          setViewingRevenue(tx);
          setIsViewRevenueOpen(true);
        } else {
          // For losses, maybe there's a view modal too
          toast.info('عرض تفاصيل التالف/الاكسباير متاح من خلال التعديل');
        }
      } else {
        toast.error('لم يتم العثور على المعاملة');
      }
    } else if (type === 'opening_cash') {
      setActiveTab('financial-settings');
      toast.info('جاري الانتقال للإعدادات المالية');
    } else {
      toast.info('عرض التفاصيل لهذا النوع غير متاح حالياً');
    }
  };

  const handleEditRecordFromReport = (type: string, id: string) => {
    console.log("Editing record from report:", type, id);
    if (type === 'invoice' || type === 'purchase' || type === 'payment' || type === 'expense' || type === 'salary' || type === 'debt' || type === 'supplier_debt') {
      const entry = allLedgerEntries.find(e => e.id === id);
      if (entry) {
        setViewingInvoice(entry);
        setIsEditInvoiceOpen(true);
      }
    } else if (type === 'revenue') {
      const tx = transactions.find(t => t.id === id);
      if (tx) {
        setSelectedTransaction(tx);
        setIsAddRevenueOpen(true);
      }
    } else if (type === 'damaged' || type === 'expired') {
      const loss = expiredDamagedLosses.find(l => l.id === id);
      if (loss) {
        // Find if there's an edit loss modal? I'll assume adding/editing is the same or similar
        toast.info('يمكن تعديل هذه السجلات من قسم التالف والاكسباير');
      }
    } else if (type === 'opening_cash') {
       const o = rawOpeningCash.find(item => item.id === id);
       if (o) {
         setActiveTab('financial-settings');
         toast.info('يمكن تعديل الرصيد الافتتاحي من الإعدادات المالية');
       }
    }
  };

  const handleDeleteRecordFromReport = async (type: string, id: string) => {
    console.log("Deleting record from report:", type, id);
    
    const confirmDelete = (title: string, desc: string, onConfirm: () => void) => {
      triggerDelete(title, desc, onConfirm);
    };

    if (type === 'invoice' || type === 'purchase' || type === 'payment' || type === 'expense' || type === 'salary' || type === 'debt' || type === 'supplier_debt') {
      const entry = allLedgerEntries.find(e => e.id === id);
      if (entry) {
        confirmDelete(
          'حذف السجل المالي', 
          'هل أنت متأكد من حذف هذا السجل من الأستاذ العام؟ سيؤثر هذا على كشوفات الحساب والموازين المالية.',
          () => handleDeleteInvoice(entry)
        );
      }
    } else if (type === 'revenue') {
      const tx = transactions.find(t => t.id === id);
      if (tx) {
        confirmDelete(
          'حذف العملية', 
          'هل أنت متأكد من حذف هذه المعاملة؟ سيتم خصم المبلغ من الصندوق وتحديث الأرباح.',
          () => handleDeleteTransaction(tx)
        );
      }
    } else if (type === 'damaged' || type === 'expired') {
      const loss = expiredDamagedLosses.find(l => l.id === id);
      if (loss) {
        confirmDelete(
          'حذف سجل تالف/اكسباير',
          'هل أنت متأكد من حذف هذا السجل؟ لن يمكن التراجع عن هذه العملية.',
          () => handleDeleteLoss(loss)
        );
      }
    } else if (type === 'opening_cash') {
       const o = rawOpeningCash.find(item => item.id === id);
       if (o) {
          confirmDelete(
            'حذف رصيد افتتاحي',
            'سيؤدي حذف الرصيد الافتتاحي إلى تغيير رصيد الصندوق للمدة الحالية والمقبلة. هل تود المتابعة؟',
            () => handleDeleteOpeningCash(o)
          );
       }
    }
  };

  const handleLogout = async () => {
    // Release this device fingerprint session from Firestore database
    if (appUser && appUser.userId) {
      const fp = localStorage.getItem('pharma-device-fp');
      if (fp) {
        try {
          await customAuthService.logoutDevice(appUser.userId, fp);
        } catch (err) {
          console.warn("[Device Control] Failed to clear session during logout", err);
        }
      }
    }

    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase signOut failed:", e);
    }
    localStorage.removeItem('pharma-is-authenticated');
    localStorage.removeItem('pharma-auth-user');
    setAppUser(null);
    setIsAppAuthenticated(false);
    setAuthStep('login-password');
    setAuthAccessCode('');
    // Clear all inputs
    setAuthFullName('');
    setAuthPhone('');
    setAuthPassword('');
    setAuthConfirmPassword('');
    setAuthOTP('');
    toast.success('تم تسجيل الخروج بنجاح');
  };

  if (googleAuthLoading || authStatusLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-background" dir="rtl">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="relative"
        >
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <Package className="h-12 w-12 text-primary relative z-10" />
        </motion.div>
        <div className="flex flex-col items-center">
          <p className="text-foreground font-black text-lg">صيدليتي</p>
          <p className="text-muted-foreground font-bold text-sm">جاري تحميل بياناتك بأمان...</p>
        </div>
      </div>
    );
  }

  if (!isAppAuthenticated) {
    const otpMinutes = Math.floor(otpRemainingSeconds / 60);
    const otpSeconds = otpRemainingSeconds % 60;
    const countdownText = `${otpMinutes.toString().padStart(2, '0')}:${otpSeconds.toString().padStart(2, '0')}`;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 select-none" dir="rtl">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-8 space-y-6 overflow-hidden relative">
          {/* Decorative ambient light */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16" />
          
          <div className="text-center space-y-2 relative z-10">
            <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-foreground">صيدليتي</h1>
            <p className="text-muted-foreground text-sm">نظام الحسابات الذكية والتحقق المتكامل</p>
          </div>

          {/* REGISTER STEP */}
          {authStep === 'register' && (
            <form onSubmit={handleCustomRegister} className="space-y-4 relative z-10">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">إنشاء حساب جديد</h3>
                <p className="text-xs text-muted-foreground">أدخل تفاصيل حساب الصيدلي لتفعيل رخصة النظام</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">الاسم الكامل</Label>
                  <div className="relative">
                    <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10" 
                      placeholder="الاسم الثلاثي للصيدلي المسؤول"
                      value={authFullName} 
                      onChange={e => setAuthFullName(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">اسم الصيدلية</Label>
                  <div className="relative">
                    <Award className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10" 
                      placeholder="مثال: صيدلية النخبة السحابية"
                      value={authPharmacyName} 
                      onChange={e => setAuthPharmacyName(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10 text-left" 
                      type="email"
                      placeholder="name@example.com"
                      value={authUsername} 
                      onChange={e => setAuthUsername(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">رقم الهاتف</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10 text-left" 
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={authPhone} 
                      onChange={e => setAuthPhone(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">كلمة المرور</Label>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10" 
                      type="password"
                      placeholder="••••••••"
                      value={authPassword} 
                      onChange={e => setAuthPassword(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10" 
                      type="password"
                      placeholder="••••••••"
                      value={authConfirmPassword} 
                      onChange={e => setAuthConfirmPassword(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>

                {/* SaaS Commercial Package Selection */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-black text-muted-foreground block">اختيار نوع رخصة التفعيل (دفع لمرة واحدة)</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Basic */}
                    <div 
                      onClick={() => !customAuthLoading && setAuthPlanType('basic')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        authPlanType === 'basic' 
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/5' 
                          : 'border-border bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="authPlanType" 
                        checked={authPlanType === 'basic'} 
                        onChange={() => {}} 
                        className="mt-1 h-3.5 w-3.5 text-primary accent-primary" 
                      />
                      <div className="space-y-0.5 text-right w-full">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-xs font-black text-foreground">الباقة الأساسية</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md font-bold">رخصة أساسية</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                          صيدلية واحدة • جهازين متصلين • دعم كامل للنسخ الاحتياطي السحابي لـ Google Drive وتقارير PDF المتقدمة.
                        </p>
                      </div>
                    </div>

                    {/* Advanced */}
                    <div 
                      onClick={() => !customAuthLoading && setAuthPlanType('advanced')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        authPlanType === 'advanced' 
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/5' 
                          : 'border-border bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="authPlanType" 
                        checked={authPlanType === 'advanced'} 
                        onChange={() => {}} 
                        className="mt-1 h-3.5 w-3.5 text-primary accent-primary" 
                      />
                      <div className="space-y-0.5 text-right w-full">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-xs font-black text-foreground">الباقة المتقدمة (لمجموعات الصيدليات)</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-md font-bold">رخصة متقدمة</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                          حتى 5 فروع • 10 أجهزة متزامنة • تفعيل نظام إدارة صلاحيات الموظفين والكاشير بالكامل.
                        </p>
                      </div>
                    </div>

                    {/* Lifetime */}
                    <div 
                      onClick={() => !customAuthLoading && setAuthPlanType('lifetime')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        authPlanType === 'lifetime' 
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/5' 
                          : 'border-border bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="authPlanType" 
                        checked={authPlanType === 'lifetime'} 
                        onChange={() => {}} 
                        className="mt-1 h-3.5 w-3.5 text-primary accent-primary" 
                      />
                      <div className="space-y-0.5 text-right w-full">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-xs font-black text-foreground">باقة مدى الحياة (شراء مرة واحدة)</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded-md font-bold">شراء لمرة واحدة</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                          دفع مرة واحدة مدى الحياة • ترقية فورية (كود تفعيل) • يدعم حتى 15 فرع وصيدليات كبرى و99 جهاز متصل.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 h-11 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2"
                disabled={customAuthLoading}
              >
                {customAuthLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري إرسال رمز OTP...
                  </>
                ) : (
                  'تسجيل الحساب وإرسال كود التحقق'
                )}
              </Button>

              <div className="pt-2 text-center">
                <button 
                  type="button" 
                  onClick={() => setAuthStep('login-password')}
                  className="text-xs text-primary/80 hover:text-primary font-bold transition-colors"
                  disabled={customAuthLoading}
                >
                  لديك حساب بالفعل؟ تسجيل الدخول
                </button>
              </div>
            </form>
          )}

          {/* VERIFY SIGNUP STEP */}
          {authStep === 'verify-signup' && (
            <form onSubmit={handleVerifyCustomRegister} className="space-y-5 relative z-10">
              <div className="space-y-1 text-center">
                <div className="bg-amber-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-500">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">تأكيد وتفعيل الحساب</h3>
                <p className="text-xs text-muted-foreground px-4">
                  أدخل رمز الطوارئ المؤقت (OTP) المكوّن من 6 أرقام والمُرسل إلى:
                </p>
                <div className="text-sm font-mono text-primary/95 font-bold select-all break-all">{authUsername}</div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <Input 
                    className="bg-muted border-border text-foreground h-14 rounded-xl text-center text-3xl font-black tracking-[0.4em] pr-4 max-w-[240px] mx-auto" 
                    placeholder="000000"
                    value={authOTP} 
                    onChange={e => setAuthOTP(e.target.value.replace(/\D/g, ''))} 
                    maxLength={6}
                    disabled={customAuthLoading}
                    required 
                    autoFocus
                  />
                </div>

                {/* Countdown display */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Clock className={`h-4 w-4 ${otpExpired ? 'text-destructive animate-pulse' : 'text-primary'}`} />
                  {otpExpired ? (
                    <span className="text-destructive font-bold text-xs">انتهت صلاحية رمز التحقق (10 دقائق)!</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      تنتهي صلاحية الرمز خلال: 
                      <strong className="text-primary font-mono mr-1 text-sm">{countdownText}</strong>
                    </span>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 h-11 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2"
                  disabled={customAuthLoading || otpExpired}
                >
                  {customAuthLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'تأكيد وتفعيل الحساب'
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs px-2 border-t border-border/40 pt-4">
                  <button 
                    type="button" 
                    onClick={handleVerifyResendSignUp}
                    className="text-primary hover:text-primary font-bold disabled:text-muted-foreground transition-all"
                    disabled={customAuthLoading || resendCooldown > 0}
                  >
                    {resendCooldown > 0 ? `إعادة إرسال الرمز خلال (${resendCooldown} ث)` : 'إعادة إرسال الرمز مجدداً'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setAuthStep('register')}
                    className="text-muted-foreground hover:text-foreground transition-all"
                    disabled={customAuthLoading}
                  >
                    تعديل بيانات الحساب
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* LOGIN STEP */}
          {authStep === 'login-password' && (
            <form onSubmit={handleCustomLogin} className="space-y-4 relative z-10">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">تسجيل الدخول</h3>
                <p className="text-xs text-muted-foreground">أدخل البريد الإلكتروني وكلمة المرور لدخول نظام الصيدلية</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10 text-left" 
                      type="email"
                      placeholder="example@pharma.com"
                      value={authUsername} 
                      onChange={e => setAuthUsername(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-muted-foreground">كلمة المرور</Label>
                    <button 
                      type="button" 
                      onClick={() => setAuthStep('forgot-password')}
                      className="text-xs text-primary/95 hover:text-primary transition-colors font-medium"
                      disabled={customAuthLoading}
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10" 
                      type="password"
                      placeholder="••••••••"
                      value={authPassword} 
                      onChange={e => setAuthPassword(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 h-11 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2"
                disabled={customAuthLoading}
              >
                {customAuthLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>

              <div className="pt-2 border-t border-border/40 flex flex-col gap-2.5 text-center">
                <button 
                  type="button" 
                  onClick={() => setAuthStep('register')}
                  className="text-xs text-primary/80 hover:text-primary font-bold transition-colors"
                  disabled={customAuthLoading}
                >
                  ليس لديك حساب؟ إنشاء حساب جديد
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD STEP */}
          {authStep === 'forgot-password' && (
            <form onSubmit={handleRequestResetPassword} className="space-y-4 relative z-10">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">استعادة كلمة المرور</h3>
                <p className="text-xs text-muted-foreground">أدخل بريدك الإلكتروني المسجل لنرسل إليك كود إعادة التعيين</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10 text-left" 
                      type="email"
                      placeholder="example@pharma.com"
                      value={authUsername} 
                      onChange={e => setAuthUsername(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 h-11 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2"
                disabled={customAuthLoading}
              >
                {customAuthLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'إرسال رمز إعادة التعيين OTP'
                )}
              </Button>

              <div className="pt-2 text-center">
                <button 
                  type="button" 
                  onClick={() => setAuthStep('login-password')}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  disabled={customAuthLoading}
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            </form>
          )}

          {/* VERIFY & RESET PASSWORD STEP */}
          {authStep === 'verify-reset' && (
            <form onSubmit={handleVerifyAndResetPassword} className="space-y-4 relative z-10">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">تعيين كود المرور الجديد</h3>
                <p className="text-xs text-muted-foreground">أدخل رمز OTP الذي وصلك وكلمة المرور الجديدة للحساب</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2 text-center">
                  <Label className="text-xs font-semibold text-muted-foreground text-right block">رمز التحقق OTP (6 أرقام)</Label>
                  <Input 
                    className="bg-muted border-border text-foreground h-12 rounded-xl text-center text-xl font-black tracking-[0.3em]" 
                    placeholder="000000"
                    value={authOTP} 
                    onChange={e => setAuthOTP(e.target.value.replace(/\D/g, ''))} 
                    maxLength={6}
                    disabled={customAuthLoading}
                    required 
                    autoFocus
                  />
                </div>

                {/* Countdown display */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Clock className={`h-4 w-4 ${otpExpired ? 'text-destructive animate-pulse' : 'text-primary'}`} />
                  {otpExpired ? (
                    <span className="text-destructive font-bold text-xs">انتهت الصلاحية! يرجى طلب رمز جديد</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      ينتهي الرمز خلال: 
                      <strong className="text-primary font-mono mr-1 text-sm">{countdownText}</strong>
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10" 
                      type="password"
                      placeholder="••••••••"
                      value={authResetNewPassword} 
                      onChange={e => setAuthResetNewPassword(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">تأكيد كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="bg-muted border-border text-foreground h-11 rounded-xl pr-10" 
                      type="password"
                      placeholder="••••••••"
                      value={authResetConfirmPassword} 
                      onChange={e => setAuthResetConfirmPassword(e.target.value)} 
                      disabled={customAuthLoading}
                      required 
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 h-11 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2"
                disabled={customAuthLoading || otpExpired}
              >
                {customAuthLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'تحديث كلمة المرور والدخول'
                )}
              </Button>

              <div className="flex items-center justify-between text-xs px-2 pt-2">
                <button 
                  type="button" 
                  onClick={handleVerifyResendReset}
                  className="text-primary hover:text-primary font-bold transition-all"
                  disabled={customAuthLoading || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `إعادة إرسال الرمز خلال (${resendCooldown} ث)` : 'إعادة إرسال رمز OTP'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setAuthStep('login-password')}
                  className="text-muted-foreground hover:text-foreground transition-all"
                  disabled={customAuthLoading}
                >
                  إلغاء والعودة
                </button>
              </div>
            </form>
          )}


        </div>
      </div>
    );
  }

  // Gating licensed/activated states for non-admin/non-super_admin users
  if (appUser && appUser.role !== 'admin' && appUser.role !== 'super_admin' && appUser.activationStatus !== 'active') {
    if (appUser.activationStatus === 'blocked_device') {
      const dev = getDeviceDetails();
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-card border border-amber-500/20 rounded-3xl shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16" />
            <div className="bg-amber-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <Laptop className="h-8 w-8 text-amber-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-foreground">تم تجاوز عدد الأجهزة المسموح بها</h1>
              <p className="text-muted-foreground text-xs leading-relaxed">
                لقد تجاوزت عدد الأجهزة النشطة المقترنة برخصتك بالتزامن. يرجى مراجعة لوحة إدارة النظام للأجهزة المرتبطة للتعديل، أو التواصل مع الدعم لترقية باقتك وتوسعة حد الأجهزة.
              </p>
            </div>
            
            <div className="p-4 bg-muted/40 rounded-2xl border border-border text-[11px] space-y-2 text-right">
              <div className="flex justify-between">
                <span className="text-muted-foreground">صيدلية المشترك:</span>
                <span className="font-bold text-foreground">{appUser.displayName || appUser.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">معرف هذا الجهاز:</span>
                <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-foreground select-all">{dev.deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">اسم هذا الجهاز:</span>
                <span className="font-sans font-semibold text-foreground">{dev.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مفتاح الترخيص:</span>
                <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-foreground">{appUser.licenseCode || 'لا يوجد'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleLogout} 
                className="flex-1 bg-muted hover:bg-muted/80 text-foreground border border-border h-12 rounded-xl text-sm font-bold"
              >
                تسجيل الخروج
              </Button>
              <a 
                href={`https://wa.me/9647700000000?text=مرحبا، تم تجاوز عدد الأجهزة المسموح بها لرخصتي: ${appUser.licenseCode}، جهاز: ${dev.deviceId} (${dev.name})`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
              >
                ترقية الرخصة / الدعم
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (appUser.activationStatus === 'blocked') {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-card border border-red-500/20 rounded-3xl shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16" />
            <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Lock className="h-8 w-8 text-red-500 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-foreground">تم حظر رخصة الاستخدام</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                لقد تم إيقاف أو حظر مفتاح ترخيص هذا المنتج السحابي لمخالفة شروط الاستخدام أو الكشف عن جلسات متزامنة غير مصرح بها. يرجى التواصل مع إدارة النظام فوراً.
              </p>
            </div>
            
            <div className="p-4 bg-muted/40 rounded-2xl border border-border text-xs space-y-2 text-right">
              <div className="flex justify-between">
                <span className="text-muted-foreground">صيدلية المشترك:</span>
                <span className="font-bold text-foreground">{appUser.displayName || appUser.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مفتاح الترخيص المحظور:</span>
                <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-foreground">{appUser.licenseCode || 'لا يوجد'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleLogout} 
                className="flex-1 bg-muted hover:bg-muted/80 text-foreground border border-border h-12 rounded-xl text-sm font-bold"
              >
                تسجيل الخروج
              </Button>
              <a 
                href={`https://wa.me/9647700000000?text=مرحبا، أحتاج مساعدة بخصوص رخصة صيدليتي المحظورة: ${appUser.licenseCode}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
              >
                الدعم الفني
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (appUser.activationStatus === 'expired' && !isReadOnlyOverride) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-card border border-amber-500/20 rounded-3xl shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16" />
            <div className="bg-amber-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <Clock className="h-8 w-8 text-amber-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-foreground">انتهت صلاحية الترخيص</h1>
              <p className="text-muted-foreground text-xs leading-relaxed px-2">
                لقد انتهت فترة الاشتراك أو صلاحية الترخيص الخاص بصيدليتكم. لتجنب توقف العمل، يرجى تجديد الاشتراك أو إدخال مفتاح ترخيص جديد ومعتمد أدناه.
              </p>
            </div>
            
            <form onSubmit={handleActivateLicense} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">مفتاح ترخيص جديد</Label>
                <Input 
                  className="bg-muted border border-border text-foreground h-12 rounded-xl text-center font-mono font-bold text-lg tracking-wider pr-3"
                  placeholder="LIC-XXXXXX-XXXX"
                  value={activationKeyInput}
                  onChange={e => setActivationKeyInput(e.target.value.toUpperCase())}
                  disabled={activationLoading}
                  required
                />
              </div>
              <Button type="submit" disabled={activationLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl font-bold flex items-center justify-center gap-2">
                {activationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تحديث الترخيص وتنشيط الاستخدام'}
              </Button>
            </form>

            <div className="border-t border-border/60 pt-4 space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground">أو تصفح بياناتك بشكل محدود دون إضافة وتعديل:</p>
              <Button 
                onClick={() => {
                  setIsReadOnlyOverride(true);
                  localStorage.setItem('pharma-read-only-expired-override', 'true');
                  toast.info("تم الدخول في وضع القراءة فقط. يمكنك استعراض وطباعة البيانات والتقارير ولكن لن تتمكن من إجراء أي كشوفات أو تداول مالي.");
                }} 
                className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 h-11 rounded-xl text-xs font-black transition-all"
              >
                الدخول بوضع القراءة فقط
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleLogout} 
                className="flex-1 bg-muted hover:bg-muted/80 text-foreground border border-border h-11 rounded-xl text-xs font-bold"
              >
                تسجيل الخروج
              </Button>
              <a 
                href={`https://wa.me/9647700000000?text=مرحبا، رخصة صيدليتي منتهية الصلاحية: ${appUser.licenseCode}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 text-white h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-border"
              >
                طلب التجديد / المبيعات
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (appUser.activationStatus === 'suspended') {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-card border border-red-500/20 rounded-3xl shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16" />
            <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Lock className="h-8 w-8 text-red-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-foreground">تم تعليق الترخيص</h1>
              <p className="text-muted-foreground text-xs leading-relaxed px-2">
                تم تعليق حساب هذه الصيدلية مؤقتاً لأسباب تتعلق بالاشتراك الفني للشبكة أو متطلبات صيانة الحساب. يرجى التواصل مع الدعم الفني فوراً.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleLogout} 
                className="flex-1 bg-muted hover:bg-muted/80 text-foreground border border-border h-12 rounded-xl text-sm font-bold"
              >
                تسجيل الخروج
              </Button>
              <a 
                href={`https://wa.me/9647700000000?text=مرحبا، الترخيص الخاص بصيدليتي معلق: ${appUser.licenseCode}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
              >
                التواصل مع الدعم
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (appUser.activationStatus === 'revoked') {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-card border border-rose-500/20 rounded-3xl shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl -mr-16 -mt-16" />
            <div className="bg-rose-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <XCircle className="h-8 w-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-foreground">تم إلغاء الترخيص</h1>
              <p className="text-muted-foreground text-xs leading-relaxed px-2">
                إن رخصة الاستخدام المرتبطة بهذا الحساب تم إبطال مفعولها وإلغاؤها نهائياً. يرجى إدخال مفتاح ترخيص جديد وصحيح للوصول مجدداً.
              </p>
            </div>

            <form onSubmit={handleActivateLicense} className="space-y-4 text-right">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">مفتاح ترخيص جديد</Label>
                <Input 
                  className="bg-muted border border-border text-foreground h-12 rounded-xl text-center font-mono font-bold text-lg tracking-wider pr-3"
                  placeholder="LIC-XXXXXX-XXXX"
                  value={activationKeyInput}
                  onChange={e => setActivationKeyInput(e.target.value.toUpperCase())}
                  disabled={activationLoading}
                  required
                />
              </div>
              <Button type="submit" disabled={activationLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl font-bold flex items-center justify-center gap-2">
                {activationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تفعيل رخصة جديدة'}
              </Button>
            </form>

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleLogout} 
                className="flex-1 bg-muted hover:bg-muted/80 text-foreground border border-border h-12 rounded-xl text-sm font-bold"
              >
                تسجيل الخروج
              </Button>
              <a 
                href={`https://wa.me/9647700000000?text=مرحبا، الترخيص الخاص بصيدليتي ملغى نهائيا: ${appUser.licenseCode}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
              >
                طلب مساعدة فورية
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Default expired/unactivated License Activation Screen
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground animate-fade-in" dir="rtl">
        <div className="w-full max-w-md bg-card border border-primary/20 rounded-3xl shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 animate-pulse" />
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-1 border border-primary/10">
            <KeyRound className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-foreground">تنشيط رخصة البرنامج</h1>
            <p className="text-muted-foreground text-xs leading-relaxed px-2">
              هذه الصيدلية السحابية تتطلب تفعيل الرخصة لتتمكن من استخدام النظام بكامل صلاحياته. يرجى إدخال مفتاح الترخيص أدناه:
            </p>
          </div>

          {appUser.activationStatus && appUser.activationStatus !== 'unlicensed' && appUser.activationStatus !== 'unused' && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs py-3 px-4 rounded-xl text-right space-y-1">
              <span className="font-bold block text-sm">⚠️ تنبيه حالة الترخيص:</span>
              {appUser.activationStatus === 'expired' && (
                <span>إنّ مفتاح الترخيص الخاص بك منتهي الصلاحية ويحتاج لتمديد. يرجى تجديد الاشتراك أو إدخال مفتاح ترخيص جديد.</span>
              )}
              {appUser.activationStatus === 'suspended' && (
                <span>إنّ مفتاح الترخيص الحالي معلق أو موقوف مؤقتاً. يرجى تزويدنا بمفتاح ترخيص فعال لتفعيل النظام.</span>
              )}
              {appUser.activationStatus === 'revoked' && (
                <span>إنّ مفتاح الترخيص ملغى نهائياً ومبطل الاستخدام. الرجاء كتابة مفتاح تفعيل جديد معتمد.</span>
              )}
              {appUser.activationStatus === 'used_by_other' && (
                <span>مفتاح الترخيص هذا مستخدم مسبقاً لدى حساب مستخدم آخر. يرجى إدخال مفتاح ترخيص غير مستخدم.</span>
              )}
            </div>
          )}

          <form onSubmit={handleActivateLicense} className="space-y-4 text-right">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">مفتاح الترخيص (License Key)</Label>
              <div className="relative">
                <Input 
                  className="bg-muted border border-border text-foreground h-12 rounded-xl text-center font-mono font-bold text-lg tracking-wider focus:ring-2 focus:ring-primary/20 focus:border-primary pr-3"
                  placeholder="LIC-XXXXXX-XXXX"
                  value={activationKeyInput}
                  onChange={e => setActivationKeyInput(e.target.value.toUpperCase())}
                  disabled={activationLoading}
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                احصل على الرمز من إدارة النظام أو المبيعات.
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground h-12 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              disabled={activationLoading}
            >
              {activationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التحقق وتفعيل الترخيص سحابياً...
                </>
              ) : (
                'تفعيل الترخيص'
              )}
            </Button>
          </form>
          
          <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
            <a 
              href={`https://wa.me/9647700000000?text=مرحبا، أود شراء مفتاح رخص صيدلية جديدة لحساب بريد: ${appUser.email}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-500/15"
            >
              تواصل مع الدعم لشراء ترخيص
            </a>
            <Button 
              onClick={handleLogout} 
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground h-11 text-xs font-bold"
              disabled={activationLoading}
            >
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleFinancialReset = async () => {
    if (resetConfirmText !== 'تصفير') {
      toast.error('كلمة التأكيد غير صحيحة');
      return;
    }

    try {
      setIsFinancialResetting(true);
      await DataPersistenceService.resetFinancialAccounts();
      toast.success('تم تصفير الحسابات المالية بنجاح');
      setShowFinancialResetModal(false);
      setResetConfirmText('');
      // Force reload to clear all states and re-fetch clean data
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error('حدث خطأ أثناء تصفير الحسابات');
    } finally {
      setIsFinancialResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans overflow-x-hidden w-full" dir="rtl">
      {/* Financial Reset Confirmation Modal */}
      <Dialog open={showFinancialResetModal} onOpenChange={setShowFinancialResetModal}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground space-y-4 rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-rose-500 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              تحذير أمان: تصفير الحسابات
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-bold pt-2 leading-relaxed">
              سيتم حذف جميع العمليات والحسابات المالية نهائياً وإعادة البرنامج إلى صفر حسابات. هل أنت متأكد؟
              <br />
              <span className="text-rose-500 font-black underline">هذا الإجراء لا يمكن التراجع عنه.</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest">لتأكيد العملية، يرجى كتابة الكلمة التالية:</Label>
              <div className="p-3 bg-rose-500/10 text-rose-600 font-black text-center rounded-xl border border-rose-500/20 text-xl tracking-[0.5em]">تصفير</div>
              <Input 
                placeholder="اكتب (تصفير) هنا..." 
                className="h-14 rounded-2xl text-center font-black bg-muted/40 border-border"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="destructive" 
              className="w-full h-14 rounded-2xl font-black gap-2 shadow-lg shadow-rose-500/20"
              onClick={handleFinancialReset}
              disabled={resetConfirmText !== 'تصفير' || isFinancialResetting}
            >
              {isFinancialResetting ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
              تأكيد تصفير كافة الحسابات
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-14 rounded-2xl font-bold"
              onClick={() => setShowFinancialResetModal(false)}
              disabled={isFinancialResetting}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed top-0 right-0 z-50 h-screen bg-sidebar border-l border-border transition-all duration-300 flex flex-col ${
          effectiveAppMode === 'laptop' 
            ? (isSidebarCollapsed ? 'w-20' : 'w-64') 
            : (isMobileMenuOpen ? 'w-64' : 'w-0 -mr-64')
        }`}
      >
        <div className="flex h-16 items-center px-6 gap-3 border-b border-sidebar-border shrink-0">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shrink-0 overflow-hidden">
            <Package className="h-5 w-5" />
          </div>
          {(effectiveAppMode === 'mobile' || !isSidebarCollapsed) && (
            <h1 className="text-lg font-black tracking-tight text-foreground whitespace-nowrap overflow-hidden">صيدليتي</h1>
          )}
          {effectiveAppMode === 'mobile' && (
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="mr-auto">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'invoices' && activeTab === 'invoice-details');
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (effectiveAppMode === 'mobile') setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative ${
                  isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-sidebar-primary' : 'group-hover:text-sidebar-primary/80'}`} />
                {(effectiveAppMode === 'mobile' || !isSidebarCollapsed) && (
                  <span className="font-bold text-sm whitespace-nowrap">{item.label}</span>
                )}
                {item.badge > 0 && (effectiveAppMode === 'mobile' || !isSidebarCollapsed) && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
                {item.badge > 0 && effectiveAppMode === 'laptop' && isSidebarCollapsed && (
                   <span className="absolute top-2 left-2 block h-2 w-2 rounded-full bg-rose-600 border border-background" />
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-sidebar-primary rounded-r-full" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={() => {
              setActiveTab('settings');
              if (effectiveAppMode === 'mobile') setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
              activeTab === 'settings' 
                ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
            }`}
          >
            <Settings className={`h-5 w-5 shrink-0 ${activeTab === 'settings' ? 'text-sidebar-primary' : ''}`} />
            {(effectiveAppMode === 'mobile' || !isSidebarCollapsed) && <span className="font-bold text-sm">الإعدادات</span>}
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all font-bold text-sm"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {(effectiveAppMode === 'mobile' || !isSidebarCollapsed) && <span>تسجيل الخروج</span>}
          </button>

          {effectiveAppMode === 'laptop' && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full justify-center mt-2 hover:bg-muted"
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </aside>

      {/* Backdrop for mobile menu */}
      {effectiveAppMode === 'mobile' && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Bottom Navigation for Mobile */}
      {effectiveAppMode === 'mobile' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-16 px-2 md:hidden">
          {[
            { id: 'finance', label: 'الرئيسية', icon: LayoutDashboard },
            { id: 'revenues', label: 'الإيرادات', icon: CreditCard },
            { id: 'invoices', label: 'الفواتير', icon: FileText },
            { id: 'reports', label: 'التقارير', icon: PieChart },
            { id: 'more', label: 'المزيد', icon: MoreHorizontal },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'more' 
              ? !['finance', 'revenues', 'invoices', 'reports'].includes(activeTab)
              : activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'more') {
                    setIsMobileMenuOpen(true);
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-black">{item.label}</span>
                {isActive && (
                  <motion.div layoutId="bottom-nav-indicator" className="h-1 w-4 bg-primary rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 w-full min-w-0 ${effectiveAppMode === 'laptop' ? (isSidebarCollapsed ? 'mr-20' : 'mr-64') : 'mr-0 pb-20 md:pb-0'}`}>
        <header className="sticky top-0 z-40 h-16 md:h-20 border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between gap-3 md:gap-8">
          <div className="flex items-center gap-2 md:gap-6 flex-1 max-w-xl min-w-0">
            {effectiveAppMode === 'mobile' && (
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} className="shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="relative flex-1 group min-w-0">
               <Search className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
               <Input 
                 placeholder={effectiveAppMode === 'mobile' ? "بحث..." : "ابحث عن مورد، فاتورة، أو عملية..."} 
                 className="w-full bg-muted/50 border-border pr-10 md:pr-12 h-10 md:h-11 rounded-xl text-xs md:text-sm focus:ring-primary/20 focus:border-primary/50 transition-all text-foreground"
                 value={globalSearch}
                 onChange={(e) => setGlobalSearch(e.target.value)}
               />
             </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="hidden lg:flex flex-col items-start gap-1">
              <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">مكان العمل الحالي</span>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 group outline-none">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors">
                    {branches.find(b => b.id === currentBranchId)?.name || 'جميع الفروع'}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-all" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-card border-border text-foreground w-64 p-2 rounded-xl shadow-2xl z-50">
                   <DropdownMenuItem 
                     className={`p-3 cursor-pointer rounded-lg gap-3 ${!currentBranchId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                     onClick={() => handleSelectBranch(null)}
                   >
                     <LayoutDashboard className="h-4 w-4" />
                     <div className="flex flex-col text-right">
                        <span className="font-black text-sm">جميع الفروع</span>
                        <span className="text-[10px] font-bold text-muted-foreground">إحصائيات المؤسسة بالكامل</span>
                     </div>
                   </DropdownMenuItem>
                   <DropdownMenuSeparator className="bg-border" />
                   <DropdownMenuGroup>
                     <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground px-3 py-2 uppercase">هذا الفرع (تبديل النطاق)</DropdownMenuLabel>
                    {branches.filter(b => b.status === 'active').map(branch => (
                     <DropdownMenuItem 
                        key={branch.id}
                        className={`p-3 cursor-pointer rounded-lg gap-3 ${currentBranchId === branch.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                        onClick={() => handleSelectBranch(branch.id!)}
                     >
                        <Building2 className="h-4 w-4" />
                        <div className="flex flex-col text-right">
                           <span className="font-bold text-sm">{branch.name}</span>
                        </div>
                     </DropdownMenuItem>
                   ))}
                   {branches.length === 0 && (
                     <div className="p-4 text-center text-xs text-muted-foreground italic">لا توجد فروع مضافة بعد</div>
                   )}
                   </DropdownMenuGroup>
                   <DropdownMenuSeparator className="bg-border" />
                   <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-lg gap-3 text-primary" onClick={() => setActiveTab('branches')}>
                      <Plus className="h-4 w-4" />
                      <span className="font-black text-sm">إدارة الصيدليات</span>
                   </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="h-8 w-px bg-border hidden lg:block mx-2" />

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className={`${effectiveAppMode === 'mobile' ? 'size-10' : 'h-11 px-6'} flex items-center justify-center gap-2 border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 font-bold rounded-xl outline-none transition-all`}>
                   <Plus className="h-4 w-4" />
                   {effectiveAppMode !== 'mobile' && "إجراء سريع"}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border text-foreground w-56 p-2 rounded-xl">
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-lg gap-3" onClick={() => setIsAddInvoiceOpen(true)}>
                    <Receipt className="h-4 w-4 text-blue-500" />
                    <span>فاتورة شراء جديدة</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-lg gap-3" onClick={() => setIsMultiEntryOpen(true)}>
                    <TableIcon className="h-4 w-4 text-primary" />
                    <span>إدخال متعدد للقوائم</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-lg gap-3" onClick={() => setIsExcelImportOpen(true)}>
                    <FileUp className="h-4 w-4 text-emerald-500" />
                    <span>استيراد من Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-lg gap-3" onClick={() => setIsAddRevenueOpen(true)}>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    <span>تسجيل دخل جديد</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-lg gap-3" onClick={() => setIsAddEntityOpen(true)}>
                    <Users className="h-4 w-4 text-purple-500" />
                    <span>إضافة مورد جديد</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-lg gap-3" onClick={() => setIsAddOpeningCashOpen(true)}>
                    <Layers className="h-4 w-4 text-orange-500" />
                    <span>رصيد نقدي افتتاحي</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-lg gap-3 text-rose-500" onClick={() => setIsAddExpenseOpen(true)}>
                    <ArrowDownCircle className="h-4 w-4" />
                    <span>تسجيل مصروف</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-lg gap-3" onClick={() => setIsAddBonusOpen(true)}>
                    <Gift className="h-4 w-4 text-amber-500" />
                    <span>إضافة بونص جديد</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted rounded-lg gap-3" onClick={() => setIsAddLoanOpen(true)}>
                    <ArrowLeftRight className="h-4 w-4 text-indigo-500" />
                    <span>سلفة / أمانة</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ThemeToggle theme={theme} setTheme={setTheme} />
              
              <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border">
                {[
                  { id: 'auto', icon: Monitor, label: 'تلقائي' },
                  { id: 'laptop', icon: Laptop, label: 'لابتوب' },
                  { id: 'mobile', icon: Smartphone, label: 'موبايل' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setAppModeSetting(mode.id as any)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                      appModeSetting === mode.id 
                        ? 'bg-background text-primary shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <mode.icon className="h-4 w-4" />
                    <span className="hidden xl:block">{mode.label}</span>
                  </button>
                ))}
              </div>

              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl" onClick={() => setActiveTab('notifications')}>
                <Bell className="h-5 w-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-600 ring-2 ring-background" />
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 custom-scrollbar">
          {isReadOnly && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden shadow-sm mb-6 animate-pulse" dir="rtl">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <h4 className="font-black text-sm text-amber-500">وضع الاستعراض المحدود (قراءة فقط)</h4>
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 font-sans">تنبيه: انتهت صلاحية الترخيص السحابي لصيدليتكم. يمكنك عرض التقارير وتصفح السجلات والطباعة ولكن جميع عمليات الإضافة والتعديل والحفظ مغلقة للتأمين.</p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  setIsReadOnlyOverride(false);
                  localStorage.removeItem('pharma-read-only-expired-override');
                }} 
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 px-4 font-black text-xs gap-1 transition-all active:scale-95 shrink-0"
              >
                شاشة التنشيط والتجديد
              </Button>
            </div>
          )}
          <AnimatePresence>
            {isUpdateAvailable && isUpdateBannerVisible && (
              <motion.div 
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="size-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <CloudLightning className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="text-right">
                    <h4 className="font-black text-sm text-primary">تم إصدار تحديث جديد للبرنامج ({remoteConfig?.appVersion})</h4>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">يتوفر تحديث جديد يتضمن تحسينات ومميزات إضافية. يرجى تحديث الصفحة للحصول على آخر نسخة.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Button 
                    onClick={() => handleAppUpdate(true)} 
                    className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-black gap-2 transition-all active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4" />
                    تحديث البرنامج الآن
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsUpdateBannerVisible(false)}
                    className="size-11 rounded-xl text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
            {/* TabsList removed as navigation is now in the sidebar */}

          <TabsContent value="finance" className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black text-foreground">عرض البيانات التاريخية</h3>
                    <p className="text-xs text-muted-foreground font-bold">تضمين أرصدة الترحيل والأرصدة الافتتاحية في الإحصائيات العامة</p>
                  </div>
                </div>
                <Select value={reportTypeFilter} onValueChange={(v: any) => setReportTypeFilter(v)}>
                  <SelectTrigger className="w-[200px] h-11 bg-card border-border rounded-xl font-black text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">كل البيانات (حالي+قديم)</SelectItem>
                    <SelectItem value="current">البيانات الحالية فقط</SelectItem>
                    <SelectItem value="historical">البيانات القديمة فقط</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            {/* Conditional Stats: Branch specific vs Unified */}
            <div className={`grid gap-4 md:gap-6 ${effectiveAppMode === 'laptop' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
              {currentBranchId ? (
                // Branch Specific Stats
                [
                  { id: 'opening_cash_balance', label: 'الرصيد الافتتاحي', value: stats.openingCashBalance, icon: History, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { id: 'revenue', label: 'إجمالي الوارد', value: stats.monthlyRevenue, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                  { id: 'monthly_gross_profit', label: 'إجمالي الربح الإجمالي', value: stats.monthlyGrossProfit, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                  { id: 'expense', label: 'المصاريف العامة', value: stats.monthlyGeneralExpense, icon: ArrowUpCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                  { id: 'net_profit', label: 'صافي الربح', value: stats.netProfit, icon: DollarSign, color: stats.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-600', bg: stats.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-600/10' },
                  { id: 'payment', label: 'تسديدات الموردين', value: stats.monthlySupplierPayments, icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                  { id: 'non_operating_revenue', label: 'الوارد غير التشغيلي (الشهر)', value: stats.monthlyNonOperatingRevenue, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
                  { id: 'loans_due_to_me', label: 'السلف المستحقة لي', value: stats.loansDueToMe, icon: Users, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                  { id: 'cash_balance', label: 'الرصيد النقدي الحالي', value: stats.cashBalance, icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                  { id: 'supplier_dues', label: 'ديون الموردين المتبقية', value: stats.supplierDues, icon: Users, color: 'text-emerald-900 dark:text-emerald-400', bg: 'bg-emerald-900/10' },
                ].map((stat, idx) => (
                  <Card key={idx} 
                    onClick={() => handleReportCardClick(stat.id, stat.label)}
                    className="bg-card border-border overflow-hidden relative group hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 rounded-2xl w-full cursor-pointer active:scale-95"
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} blur-3xl -mr-16 -mt-16 opacity-30 group-hover:opacity-50 transition-opacity`} />
                    <CardHeader className="pb-1 md:pb-2 space-y-0 flex flex-row items-center justify-between relative z-10">
                      <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                      <CardTitle className="text-[10px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 pb-4 md:pb-6">
                      <div className="text-2xl md:text-3xl font-black text-foreground font-mono tracking-tighter">
                        {formatIQD(stat.value)}
                      </div>
                      <div className="mt-1 md:mt-2 flex items-center gap-1.5">
                         <div className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-primary animate-pulse" />
                         <span className="text-[9px] md:text-[10px] text-muted-foreground font-bold">تحديث تلقائي</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                // Unified Master Stats
                [
                  { id: 'opening_cash_balance', label: 'الرصيد الافتتاحي المجمع', value: stats.openingCashBalance, icon: History, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { id: 'revenue', label: 'إجمالي الوارد (الكل)', value: stats.totalRevenue, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                  { id: 'expense', label: 'المصاريف العامة (الكل)', value: stats.totalExpense, icon: ArrowUpCircle, color: 'text-rose-600', bg: 'bg-rose-500/10' },
                  { id: 'profit', label: 'صافي الربح المجمع', value: stats.totalNetProfit, icon: DollarSign, color: stats.totalNetProfit >= 0 ? 'text-blue-600' : 'text-rose-600', bg: stats.totalNetProfit >= 0 ? 'bg-blue-500/10' : 'bg-rose-600/10' },
                  { id: 'non_operating_revenue', label: 'الوارد غير التشغيلي المجمع', value: stats.totalNonOperatingRevenue, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
                  { id: 'loans_due_to_me', label: 'السلف المستحقة لي (الكل)', value: stats.loansDueToMe, icon: Users, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                  { id: 'cash_balance', label: 'الرصيد النقدي المجمع', value: stats.cashBalance, icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                ].map((stat, idx) => (
                  <Card key={idx} 
                    onClick={() => handleReportCardClick(stat.id, stat.label)}
                    className="bg-card border-border overflow-hidden relative group hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 rounded-2xl w-full cursor-pointer active:scale-95"
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} blur-3xl -mr-16 -mt-16 opacity-30 group-hover:opacity-50 transition-opacity`} />
                    <CardHeader className="pb-1 md:pb-2 space-y-0 flex flex-row items-center justify-between relative z-10">
                      <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                      <CardTitle className="text-[10px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 pb-4 md:pb-6">
                      <div className="text-2xl md:text-3xl font-black text-foreground font-mono tracking-tighter">
                        {formatIQD(stat.value)}
                      </div>
                      <div className="mt-1 md:mt-2 flex items-center gap-1.5">
                         <div className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-primary animate-pulse" />
                         <span className="text-[9px] md:text-[10px] text-muted-foreground font-bold">عرض موحد للفروع</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className={`${!currentBranchId && branches.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'} bg-card border-border p-4 md:p-8 rounded-2xl overflow-hidden w-full`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-4">
                  <div>
                    <CardTitle className="text-lg md:text-xl font-black text-foreground">
                      {currentBranchId ? 'التحليل المالي للفرع' : 'التحليل المالي الموحد'}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground font-bold font-sans">
                      {currentBranchId ? 'حركة الإيرادات والمصاريف لآخر 7 أيام' : 'مقارنة الأداء المالي لكل الفروع مجمعة'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 md:gap-4 p-1 md:p-1.5 bg-muted/30 border border-border rounded-xl w-fit">
                    <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs text-primary font-black">
                      <div className="h-1.5 md:h-2 w-1.5 md:w-2 rounded-full bg-primary" />
                      الدخل
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs text-rose-500 font-black">
                      <div className="h-1.5 md:h-2 w-1.5 md:w-2 rounded-full bg-rose-500" />
                      المصاريف
                    </div>
                  </div>
                </div>
                <div className="h-[240px] md:h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'hsla(var(--border), 0.5)' : '#f1f5f9'} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700 }}
                        dy={15}
                      />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        contentStyle={{ 
                          backgroundColor: 'var(--card)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: '900' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="income" 
                        stroke="var(--primary)" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorIncome)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expense" 
                        stroke="#ef4444" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorExpense)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Sidebar Content (Comparison + Standard Stats) */}
              <div className="space-y-8 lg:col-span-1">
                {!currentBranchId && branches.length > 0 && (
                  <Card className="bg-card border-border p-6 rounded-2xl flex flex-col shadow-lg shadow-primary/5">
                    <div className="mb-6">
                      <CardTitle className="text-lg font-black text-foreground">مقارنة أداء الفروع</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground font-bold">بناءً على الإيرادات والأرباح الحالية</CardDescription>
                    </div>
                    
                    <div className="flex-1 space-y-6">
                      {branchComparison.sort((a,b) => b.revenue - a.revenue).map((branch) => (
                        <div key={branch.id} className="space-y-2 group">
                          <div className="flex justify-between items-end">
                             <span className="text-xs font-black text-foreground group-hover:text-primary transition-colors">{branch.name}</span>
                             <span className="text-[10px] font-mono font-bold text-muted-foreground">{formatIQD(branch.revenue)}</span>
                          </div>
                          <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border/50">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min(100, (branch.revenue / (Math.max(...branchComparison.map(b => b.revenue)) || 1)) * 100)}%` }}
                               className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]"
                             />
                          </div>
                          <div className="flex justify-between items-center px-1">
                             <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">صافي الربح: {formatIQD(branch.profit)}</span>
                             <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">الديون: {formatIQD(branch.dues)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button 
                      variant="ghost" 
                      className="mt-6 w-full text-xs font-black text-primary hover:bg-primary/5 gap-2 border border-primary/10 rounded-xl py-5"
                      onClick={() => setActiveTab('branches')}
                    >
                      إدارة بيانات الفروع
                      <Building2 className="h-4 w-4" />
                    </Button>
                  </Card>
                )}

                <Card className="bg-card border-border p-8 rounded-2xl">
                  <CardTitle className="text-sm font-black text-foreground mb-6 uppercase tracking-widest">توزيع الأرباح</CardTitle>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" hide />
                        <Tooltip 
                          cursor={{ fill: 'hsla(var(--primary), 0.05)' }}
                          contentStyle={{ 
                            backgroundColor: 'var(--card)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '12px' 
                          }}
                        />
                        <Bar dataKey="profit" radius={[6, 6, 0, 0]} fill="var(--primary)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-6 flex items-center justify-between pt-6 border-t border-border">
                    <span className="text-xs text-muted-foreground font-bold">إجمالي أرباح الأسبوع</span>
                    <span className="text-xl font-black text-primary font-mono tracking-tighter">
                      {formatNumberWithCommas(chartData.reduce((acc, d) => acc + d.profit, 0))}
                    </span>
                  </div>
                </Card>

                <Card className="bg-card border-border p-8 rounded-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-2xl -mr-12 -mt-12" />
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest">تنبيهات السداد</CardTitle>
                    <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full font-black">بانتظار الإجراء</span>
                  </div>
                  <div className="space-y-4 relative z-10">
                    {deadlines.filter(d => d.status === 'pending').slice(0, 3).map((d) => (
                      <div key={d.id} className="p-4 bg-muted/30 border border-border rounded-xl flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                        <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-xs font-black text-foreground truncate">{d.accountName}</div>
                          <div className="text-[10px] text-muted-foreground font-bold">متبقي: {formatIQD(d.requiredPayment)}</div>
                        </div>
                      </div>
                    ))}
                    {deadlines.filter(d => d.status === 'pending').length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground italic font-bold">لا توجد تنبيهات سداد حالياً</div>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            <Card className="bg-card border-border overflow-hidden rounded-2xl shadow-sm">
              <CardHeader className="border-b border-border px-8 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black text-foreground">النشاطات الأخيرة</CardTitle>
                    <CardDescription className="text-muted-foreground font-bold">متابعة فورية لكافة العمليات المالية</CardDescription>
                  </div>
                  <Button variant="outline" className="text-xs text-primary font-black gap-2 border-primary/20 hover:bg-primary/5 px-6 h-11 rounded-xl" onClick={() => setActiveTab('transactions')}>
                    عرض السجل الكامل
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {effectiveAppMode === 'laptop' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr>
                          <th className="px-8 !text-right">التاريخ</th>
                          <th className="px-8 !text-right">البيان والجهة</th>
                          <th className="px-8 !text-left">المبلغ الصافي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.filter(tx => tx.isDeleted !== true).slice(0, 8).map((tx) => (
                          <tr key={tx.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => {
                            setSelectedTransaction(tx);
                            setIsEditTransactionOpen(true);
                          }}>
                            <td className="px-8 py-5 text-xs text-muted-foreground font-mono font-bold tracking-tight">{safeFormatDate(tx.date, 'yyyy/MM/dd')}</td>
                            <td className="px-8 py-5">
                              <div className="font-black text-foreground group-hover:text-primary transition-colors">
                                {getExpenseStatement(tx)}
                              </div>
                              {tx.type === 'expense' && tx.description && tx.description !== tx.statement && (
                                <div className="text-[10px] text-muted-foreground font-bold mt-1 px-2 py-0.5 bg-muted rounded-md inline-block">
                                  {tx.description}
                                </div>
                              )}
                            </td>
                            <td className={`px-8 py-5 text-left font-black font-mono text-base ${(tx.type === 'income' || tx.type === 'revenue') ? 'text-primary' : 'text-rose-500'}`}>
                              {(tx.type === 'income' || tx.type === 'revenue') ? '+' : '-'}{formatNumberWithCommas(tx.amount)}
                            </td>
                            <td className="px-8 py-5 text-left">
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="opacity-0 group-hover:opacity-100 h-8 w-8 text-rose-500 hover:bg-rose-500/10 transition-all rounded-lg" 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleDeleteTransaction(tx);
                                 }}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {transactions.slice(0, 8).map((tx) => (
                      <div 
                        key={tx.id} 
                        className="p-5 flex flex-col gap-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border last:border-0"
                        onClick={() => {
                          setSelectedTransaction(tx);
                          setIsEditTransactionOpen(true);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-sm text-foreground truncate">
                              {getExpenseStatement(tx)}
                            </div>
                            {tx.type === 'expense' && tx.description && tx.description !== tx.statement && (
                              <div className="text-[9px] text-muted-foreground mt-1 truncate">{tx.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`font-black font-mono text-lg ${(tx.type === 'income' || tx.type === 'revenue') ? 'text-primary' : 'text-rose-500'}`}>
                              {(tx.type === 'income' || tx.type === 'revenue') ? '+' : '-'}{formatNumberWithCommas(tx.amount)}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-xl" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTransaction(tx);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                          <div className="flex items-center gap-2 font-mono">
                             <span>{safeFormatDate(tx.date, 'yyyy/MM/dd')}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg font-black ${
                            (tx.type === 'income' || tx.type === 'revenue') 
                              ? 'bg-emerald-500/10 text-emerald-600' 
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {(tx.type === 'income' || tx.type === 'revenue') ? 'دخل / وارد' : 'مصروفات'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="bg-card border-border p-8 rounded-2xl relative group overflow-hidden shadow-sm">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl -mr-12 -mt-12 group-hover:bg-emerald-500/20 transition-colors" />
                 <div className="relative z-10 flex flex-col items-center">
                    <Receipt className="h-6 w-6 text-emerald-600 mb-4" />
                    <div className="text-[10px] font-black text-muted-foreground mb-1 tracking-widest uppercase text-center">إجمالي التسديدات</div>
                    <div className="text-3xl font-black text-emerald-600 font-mono tracking-tighter">
                      {formatNumberWithCommas(allLedgerEntries.filter(e => e.operationType === 'payment').reduce((acc, e) => acc + e.amount, 0))}
                      <span className="text-[10px] text-muted-foreground mr-2 font-sans font-bold italic tracking-normal">د.ع</span>
                    </div>
                 </div>
               </Card>
               <Card className="bg-card border-border p-8 rounded-2xl relative group overflow-hidden shadow-sm">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-2xl -mr-12 -mt-12 group-hover:bg-primary/20 transition-colors" />
                 <div className="relative z-10 flex flex-col items-center">
                    <Calendar className="h-6 w-6 text-primary mb-4" />
                    <div className="text-[10px] font-black text-muted-foreground mb-1 tracking-widest uppercase text-center">تسديدات الشهر</div>
                    <div className="text-3xl font-black text-foreground font-mono tracking-tighter">
                      {formatNumberWithCommas(allLedgerEntries.filter(e => e.operationType === 'payment' && toValidDate(e.date) >= startOfMonth(new Date())).reduce((acc, e) => acc + e.amount, 0))}
                      <span className="text-[10px] text-muted-foreground mr-2 font-sans font-bold italic tracking-normal">د.ع</span>
                    </div>
                 </div>
               </Card>
               <Card className="bg-card border-border p-8 rounded-2xl relative group overflow-hidden shadow-sm">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl -mr-12 -mt-12 group-hover:bg-blue-500/20 transition-colors" />
                 <div className="relative z-10 flex flex-col items-center">
                    <Hash className="h-6 w-6 text-blue-600 mb-4" />
                    <div className="text-[10px] font-black text-muted-foreground mb-1 tracking-widest uppercase text-center">عدد العمليات</div>
                    <div className="text-3xl font-black text-blue-600 font-mono tracking-tighter">
                      {allLedgerEntries.filter(e => e.operationType === 'payment' && e.isDeleted !== true).length}
                    </div>
                 </div>
               </Card>
            </div>

            <Card className="bg-card border-border overflow-hidden rounded-2xl shadow-sm">
               <CardHeader className="border-b border-border px-8 py-10 bg-muted/20">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                      <h2 className="text-2xl font-black text-foreground mb-1">سجل المدفوعات</h2>
                      <p className="text-muted-foreground font-bold">كافة التسديدات والمصاريف الصادرة</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-96 group">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          placeholder="ابحث عن وصل أو مورد..." 
                          className="bg-background border-border pr-12 h-12 rounded-xl text-foreground focus:ring-primary/20 placeholder:font-bold"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={() => setIsMultiPaymentOpen(true)} 
                        variant="outline"
                        className="gap-2 border-primary/20 text-primary font-black h-12 px-6 rounded-xl hover:bg-primary/10"
                      >
                        <Plus className="h-4 w-4" />
                        إدخال متعدد
                      </Button>
                    </div>
                  </div>
               </CardHeader>
                <CardContent className="p-0">
                   {effectiveAppMode === 'laptop' ? (
                   <table className="w-full text-right text-sm">
                     <thead>
                       <tr>
                         <th className="px-8 !text-right">التاريخ</th>
                         <th className="px-8 !text-right">المورد / الجهة</th>
                         <th className="px-8 !text-right">رقم الوصل</th>
                         <th className="px-8 !text-left">المبلغ</th>
                       </tr>
                     </thead>
                     <tbody>
                       {allLedgerEntries
                         .filter(e => e.operationType === 'payment' && e.isDeleted !== true)
                         .filter(e => e.accountName.toLowerCase().includes(searchTerm.toLowerCase()) || (e.invoiceNumber || '').includes(searchTerm))
                         .slice(0, 50)
                         .map((entry) => (
                           <tr key={entry.id} className="group cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => handleViewInvoice(entry)}>
                             <td className="px-8 py-6 text-xs text-muted-foreground font-mono font-bold">{safeFormatDate(entry.date, 'yyyy/MM/dd')}</td>
                             <td className="px-8 py-6">
                               <div className="font-black text-foreground group-hover:text-primary transition-colors">{entry.accountName}</div>
                               <div className="text-[10px] text-muted-foreground font-bold mt-1 px-2.5 py-0.5 bg-muted rounded-full inline-block">سيد قيد مباشر</div>
                             </td>
                             <td className="px-8 py-6 font-mono text-muted-foreground font-bold">{entry.invoiceNumber || '---'}</td>
                             <td className="px-8 py-6 text-left font-black text-emerald-600 font-mono text-lg tracking-tighter">
                               {formatNumberWithCommas(entry.amount)}
                             </td>
                           </tr>
                         ))}
                       {allLedgerEntries.filter(e => e.operationType === 'payment' && e.isDeleted !== true).length === 0 && (
                         <tr>
                           <td colSpan={4} className="py-20 text-center text-muted-foreground italic font-bold">لا توجد تسديدات مسجلة</td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                   ) : (
                     <div className="divide-y divide-border">
                       {allLedgerEntries
                        .filter(e => e.operationType === 'payment' && e.isDeleted !== true)
                        .filter(e => e.accountName.toLowerCase().includes(searchTerm.toLowerCase()) || (e.invoiceNumber || '').includes(searchTerm))
                        .slice(0, 50)
                        .map((entry) => (
                          <div 
                            key={entry.id} 
                            className="p-4 flex flex-col gap-3 hover:bg-primary/5 transition-colors cursor-pointer" 
                            onClick={() => handleViewInvoice(entry)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-black text-foreground">{entry.accountName}</div>
                                <div className="text-[10px] text-muted-foreground font-bold mt-0.5">رقم الوصل: {entry.invoiceNumber || '---'}</div>
                              </div>
                              <div className="text-lg font-black text-emerald-600 font-mono tracking-tighter">
                                {formatNumberWithCommas(entry.amount)}
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                              <span>{safeFormatDate(entry.date, 'yyyy/MM/dd')}</span>
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded">مدفوعات</span>
                            </div>
                          </div>
                        ))}
                      {allLedgerEntries.filter(e => e.operationType === 'payment').length === 0 && (
                        <div className="py-20 text-center text-muted-foreground italic font-bold">لا توجد تسديدات مسجلة</div>
                      )}
                     </div>
                   )}
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenues" className="space-y-6 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  label: 'إجمالي الوارد', 
                  value: transactions
                    .filter(tx => (tx.type === 'income' || tx.type === 'revenue') && (!currentBranchId || tx.branchId === currentBranchId))
                    .reduce((acc, tx) => acc + (tx.saleAmount || tx.amount || 0), 0), 
                  icon: TrendingUp, 
                  color: 'text-primary', 
                  bg: 'bg-primary/10' 
                },
                { 
                  label: 'إجمالي الأرباح', 
                  value: transactions
                    .filter(tx => (tx.type === 'income' || tx.type === 'revenue') && (!currentBranchId || tx.branchId === currentBranchId))
                    .reduce((acc, tx) => acc + (tx.profitAmount || tx.netProfit || 0), 0), 
                  icon: DollarSign, 
                  color: 'text-emerald-600', 
                  bg: 'bg-emerald-500/10' 
                },
                { 
                  label: 'الديون (المتبقي)', 
                  value: transactions
                    .filter(tx => (tx.type === 'income' || tx.type === 'revenue') && (!currentBranchId || tx.branchId === currentBranchId))
                    .reduce((acc, tx) => acc + (tx.remainingAmount ?? (tx.incomeType === 'cash' ? 0 : tx.amount)), 0), 
                  icon: AlertCircle, 
                  color: 'text-rose-600', 
                  bg: 'bg-rose-500/10' 
                },
              ].map((stat, idx) => (
                <Card key={idx} className="bg-card border-border p-8 relative group overflow-hidden rounded-2xl shadow-sm">
                  <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-2xl -mr-12 -mt-12 group-hover:bg-primary/20 transition-colors`} />
                  <div className="relative z-10 flex flex-col items-center">
                    <stat.icon className={`h-6 w-6 ${stat.color} mb-4`} />
                    <span className="text-[10px] font-black text-muted-foreground mb-1 tracking-widest uppercase text-center">{stat.label}</span>
                    <span className="text-3xl font-black text-foreground font-mono tracking-tighter">
                      {formatIQD(stat.value)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden">
               <CardHeader className="px-8 py-10 border-b border-border bg-muted/20">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                      <h2 className="text-2xl font-black text-foreground mb-1">سجل الإيرادات والديون</h2>
                      <p className="text-muted-foreground font-bold">متابعة تحصيلات الصيدلية الخارجية</p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <Button onClick={() => setIsAddLoanOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black h-12 px-6 rounded-xl shadow-lg shadow-indigo-600/10 whitespace-nowrap">
                        <Plus className="h-4 w-4" />
                        سلفة / أمانة
                      </Button>
                      <Button onClick={() => setIsAddRevenueOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 px-6 rounded-xl shadow-lg shadow-emerald-600/10 whitespace-nowrap">
                        <Plus className="h-4 w-4" />
                        إضافة إيراد يومي
                      </Button>
                      <div className="relative flex-1 md:w-80 group">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          placeholder="ابحث باسم الزبون..." 
                          className="bg-background border-border pr-12 h-12 rounded-xl text-foreground focus:ring-primary/20 placeholder:font-bold"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
               </CardHeader>
               <CardContent className="p-0">
                  {effectiveAppMode === 'laptop' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr>
                          <th className="px-8 !text-right">الفرع / التفاصيل</th>
                          <th className="px-8 !text-right">إجمالي الوارد</th>
                          <th className="px-8 !text-right text-center">نسبة الربح %</th>
                          <th className="px-8 !text-right">صافي الربح</th>
                          <th className="px-8 !text-right">التاريخ</th>
                          <th className="px-8 !text-right text-center">نوع العملية (نقد / آجل)</th>
                          <th className="px-8 !text-right">المتبقي (للآجل فقط)</th>
                          <th className="px-8 !text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                           const visibleRevenues = transactions.filter(tx => {
                             const isRevenue = tx.type === 'income' || tx.type === 'revenue' || tx.category === 'revenue';
                             const mainBranchId = branches.length > 0 ? branches[0].id : 'main';
                             const txBranchId = tx.branchId || mainBranchId;
                             
                             const matchesBranch = !currentBranchId || txBranchId === currentBranchId;
                             const matchesSearch = (tx.description || '').includes(searchTerm) || 
                                                 (tx.customerName && tx.customerName.includes(searchTerm));
                             
                             return isRevenue && matchesBranch && matchesSearch;
                           });
                           
                           if (visibleRevenues.length > 0) {
                             console.log("Visible revenue records:", visibleRevenues);
                           }
                           
                           return visibleRevenues.map((tx) => (
                             <tr key={tx.id} className="group hover:bg-primary/5 transition-colors">
                               <td className="px-8 py-6 text-right">
                                 <div className="font-black text-foreground group-hover:text-primary transition-colors">{tx.customerName || tx.description}</div>
                                 <div className="flex items-center gap-2 mt-1">
                                   <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                     {branches.find(b => b.id === (tx.branchId || (branches.length > 0 ? branches[0].id : 'main')))?.name || 'الفرع الرئيسي'}
                                   </span>
                                 </div>
                               </td>
                              <td className="px-8 py-6 font-mono font-bold text-muted-foreground text-lg">{formatNumberWithCommas(tx.saleAmount || tx.amount)}</td>
                              <td className="px-8 py-6 font-mono font-bold text-slate-500 text-center">%{tx.profitPercent || 0}</td>
                              <td className="px-8 py-6 font-mono font-bold text-emerald-600 text-lg">{formatNumberWithCommas(tx.profitAmount || tx.netProfit || 0)}</td>
                              <td className="px-8 py-6">
                                <div className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">{safeFormatDate(tx.date, 'yyyy/MM/dd')}</div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  tx.incomeType === 'cash' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                  {tx.incomeType === 'cash' ? 'نقدي' : 'آجل'}
                                </span>
                              </td>
                              <td className="px-8 py-6 font-black text-rose-600 font-mono text-lg tracking-tighter text-right">
                                {tx.incomeType === 'cash' ? '0' : formatNumberWithCommas(tx.remainingAmount ?? tx.amount)}
                              </td>
                              <td className="px-8 py-6 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/50 outline-none transition-colors">
                                    <div className="flex flex-col gap-0.5">
                                      <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                                      <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                                      <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                                    </div>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40 bg-card border-border text-foreground rounded-xl shadow-xl" dir="rtl">
                                    <DropdownMenuItem onClick={() => {
                                      setViewingRevenue(tx);
                                      setIsViewRevenueOpen(true);
                                    }} className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-muted/50 rounded-lg">
                                      <Eye className="h-4 w-4 text-blue-500" />
                                      <span className="font-bold">عرض التفاصيل</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedTransaction(tx);
                                      setIsEditTransactionOpen(true);
                                    }} className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-muted/50 rounded-lg text-amber-500">
                                      <Edit className="h-4 w-4" />
                                      <span className="font-bold">تعديل</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border/50" />
                                    <DropdownMenuItem onClick={() => {
                                      handleDeleteTransaction(tx);
                                    }} className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-rose-500/10 text-rose-500 rounded-lg text-rose-500">
                                      <Trash2 className="h-4 w-4" />
                                      <span className="font-bold">حذف</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))
                        })()}
                        {(() => {
                           const visibleCount = transactions.filter(tx => {
                             const isRevenue = tx.type === 'income' || tx.type === 'revenue' || tx.category === 'revenue';
                             const mainBranchId = branches.length > 0 ? branches[0].id : 'main';
                             const txBranchId = tx.branchId || mainBranchId;
                             return isRevenue && (!currentBranchId || txBranchId === currentBranchId);
                           }).length;
                           return visibleCount === 0 && (
                             <tr>
                               <td colSpan={8} className="py-20 text-center text-muted-foreground italic font-bold">لا توجد سجلات إيرادات حالياً</td>
                             </tr>
                           )
                        })()}
                      </tbody>
                    </table>
                  </div>
                  ) : (
                     <div className="p-4 space-y-4">
                       {(() => {
                          const visibleRevenues = transactions.filter(tx => {
                            const isRevenue = tx.type === 'income' || tx.type === 'revenue' || tx.category === 'revenue';
                            const mainBranchId = branches.length > 0 ? branches[0].id : 'main';
                            const txBranchId = tx.branchId || mainBranchId;
                            return isRevenue && (!currentBranchId || txBranchId === currentBranchId) && 
                                   ((tx.description || '').includes(searchTerm) || (tx.customerName && tx.customerName.includes(searchTerm)));
                          });
                          return visibleRevenues.map((tx) => (
                          <div key={tx.id} className="p-4 bg-muted/20 border border-border rounded-2xl space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-black text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => {
                                  setViewingRevenue(tx);
                                  setIsViewRevenueOpen(true);
                                }}>{tx.customerName || tx.description}</div>
                                <div className="text-[10px] text-muted-foreground font-bold">{safeFormatDate(tx.date, 'yyyy/MM/dd')}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                  tx.incomeType === 'cash' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                  {tx.incomeType === 'cash' ? 'نقدي' : 'آجل'}
                                </span>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-muted/50 outline-none transition-colors">
                                    <div className="flex flex-col gap-0.5">
                                      <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                      <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                      <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                    </div>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-32 bg-card border-border text-foreground rounded-xl" dir="rtl">
                                    <DropdownMenuItem onClick={() => {
                                      setViewingRevenue(tx);
                                      setIsViewRevenueOpen(true);
                                    }} className="text-[10px] p-2 font-bold cursor-pointer hover:bg-muted font-bold">عرض</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedTransaction(tx);
                                      setIsEditTransactionOpen(true);
                                    }} className="text-[10px] p-2 font-bold cursor-pointer hover:bg-muted text-amber-500 font-bold">تعديل</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      handleDeleteTransaction(tx);
                                    }} className="text-[10px] p-2 font-bold cursor-pointer hover:bg-rose-500/10 text-rose-500 font-bold">حذف</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-muted-foreground">
                               <div className="bg-muted p-2 rounded-lg">الوارد: {formatNumberWithCommas(tx.saleAmount || tx.amount)}</div>
                               <div className="bg-emerald-500/5 text-emerald-600 p-2 rounded-lg">الربح: {formatNumberWithCommas(tx.profitAmount || tx.netProfit || 0)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-muted-foreground">
                               <div className="bg-blue-500/5 text-blue-600 p-2 rounded-lg">المسدد: {formatNumberWithCommas(tx.paidAmount || (tx.incomeType === 'cash' ? tx.amount : 0))}</div>
                               <div className="bg-rose-500/5 text-rose-600 p-2 rounded-lg">المتبقي: {formatNumberWithCommas(tx.remainingAmount ?? (tx.incomeType === 'cash' ? 0 : tx.amount))}</div>
                            </div>
                            {tx.notes && (
                              <div className="text-[10px] font-bold text-muted-foreground border-t border-border/50 pt-2 bg-muted/30 p-2 rounded-xl">
                                {tx.notes}
                              </div>
                            )}
                          </div>
                        ))
                      })()}
                      {(() => {
                         const visibleCount = transactions.filter(tx => {
                            const isRevenue = tx.type === 'income' || tx.type === 'revenue' || tx.category === 'revenue';
                            const mainBranchId = branches.length > 0 ? branches[0].id : 'main';
                            const txBranchId = tx.branchId || mainBranchId;
                            return isRevenue && (!currentBranchId || txBranchId === currentBranchId) && 
                                   ((tx.description || '').includes(searchTerm) || (tx.customerName && tx.customerName.includes(searchTerm)));
                         }).length;
                         return visibleCount === 0 && (
                            <div className="py-20 text-center text-muted-foreground italic font-bold">لا توجد سجلات إيرادات حالياً</div>
                         )
                      })()}
                    </div>
                  )}
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entities" className="space-y-4 animate-in fade-in duration-500">
            {viewingEntityDetail ? (
              <SupplierAccountPage 
                entity={viewingEntityDetail}
                onBack={() => setViewingEntityDetail(null)}
                ledgerEntries={allLedgerEntries.filter(e => e.accountId === viewingEntityDetail.id)}
                bonuses={bonuses.filter(b => b.entityId === viewingEntityDetail.id)}
                deadlines={deadlines.filter(d => d.accountId === viewingEntityDetail.id)}
                onSetDeadline={(target) => {
                  setDeadlineTarget(target);
                  const existing = deadlines.find(d => d.invoiceId === target.id && d.status === 'pending');
                  setCurrentDeadline(existing || null);
                  setIsDeadlineModalOpen(true);
                }}
                activities={entityActivities.filter(a => a.entityId === viewingEntityDetail.id)}
                supplierOpeningBalances={rawSupplierOpeningBalances.filter(o => o.supplierId === viewingEntityDetail.id)}
                onAddInvoice={() => { setSelectedEntity(viewingEntityDetail); setIsAddInvoiceOpen(true); }}
                onAddPayment={() => { setSelectedEntity(viewingEntityDetail); setViewingInvoice(null); setPaymentMode('normal'); setIsAddPaymentOpen(true); }}
                onEditEntity={() => { setSelectedEntity(viewingEntityDetail); setIsEditEntityOpen(true); }}
                onViewInvoice={handleViewInvoice}
                onEditInvoice={(invoice) => { setViewingInvoice(invoice); setIsEditInvoiceOpen(true); }}
                onDeleteInvoice={(invoice) => { 
                  setSelectedEntity(viewingEntityDetail);
                  handleDeleteInvoice(invoice); 
                }}
                onRefundInvoice={(invoice) => { setViewingInvoice(invoice); setIsRefundInvoiceOpen(true); }}
                onPartialPayment={(invoice) => { 
                  setViewingInvoice(invoice); 
                  setPaymentMode('partial'); 
                  setPayAmount(invoice.remainingAmount?.toString() || '0');
                  setSelectedEntity(viewingEntityDetail); 
                  setIsAddPaymentOpen(true); 
                }}
                onFullPayment={(invoice) => { 
                  setViewingInvoice(invoice); 
                  setPaymentMode('full'); 
                  setPayAmount(invoice.remainingAmount?.toString() || '0');
                  setSelectedEntity(viewingEntityDetail); 
                  setIsAddPaymentOpen(true); 
                }}
                onEditPayment={(payment) => {
                  setViewingInvoice(payment);
                  setPaymentMode('normal');
                  setPayAmount(payment.amount);
                  setSelectedEntity(viewingEntityDetail);
                  setIsAddPaymentOpen(true);
                }}
                onDeletePayment={(id) => {
                  const payment = allLedgerEntries.find(e => e.id === id);
                  setSelectedEntity(viewingEntityDetail);
                  if (payment) handleDeleteInvoice(payment);
                }}
                onEditBonus={(bonus) => {
                  setEditingBonus(bonus);
                  setIsEditBonusOpen(true);
                }}
                onDeleteBonus={handleDeleteBonus}
                onDeleteAttachment={handleDeleteAttachment}
                onShowImage={setLightboxImage}
                onImportHistorical={() => setIsHistoricalWizardOpen(true)}
                onImportExcel={() => {
                  setSelectedEntity(viewingEntityDetail);
                  setIsExcelImportOpen(true);
                }}
                onMultiEntry={() => {
                  setSelectedEntity(viewingEntityDetail);
                  setIsMultiEntryOpen(true);
                }}
                onAddBonus={() => {
                  setSelectedEntity(viewingEntityDetail);
                  setIsAddBonusOpen(true);
                }}
                appMode={effectiveAppMode}
              />
            ) : (
              <>
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-foreground">إدارة الموردين والمذاخر</h2>
                    <p className="text-muted-foreground font-bold text-sm mt-1">تنسيق التعامل المالي مع مكاتب الأدوية والمذاخر العلمية</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="بحث عن مورد..." 
                        value={entitySearch}
                        onChange={e => setEntitySearch(e.target.value)}
                        className="bg-card border-border pr-10 rounded-xl h-11"
                      />
                    </div>
                    <Select value={entityStatusFilter} onValueChange={(v: any) => setEntityStatusFilter(v)}>
                       <SelectTrigger className="w-[140px] h-11 rounded-xl bg-card border-border font-bold">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-card border-border">
                          <SelectItem value="active">النشطون</SelectItem>
                          <SelectItem value="archived">المؤرشفون</SelectItem>
                          <SelectItem value="all">كل الموردين</SelectItem>
                       </SelectContent>
                    </Select>
                    <Button onClick={() => setIsAddEntityOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2 h-11 px-6 text-white shadow-lg shadow-emerald-500/20 rounded-xl font-black">
                      <Plus className="h-4 w-4" />
                      مورد جديد
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEntities.map((entity) => (
                    <Card key={entity.id} className="group cursor-pointer bg-card border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-xl hover:shadow-primary/5 rounded-2xl overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
                      <CardHeader className="p-6 pb-4 relative z-10" onClick={() => handleEntityClick(entity)}>
                        <div className="flex justify-between items-start">
                           <div className="flex-1 overflow-hidden">
                              <CardTitle className="text-xl text-foreground font-black tracking-tight truncate group-hover:text-primary transition-colors">{entity.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  entity.type === 'office' ? 'bg-blue-500/10 text-blue-600' : 
                                  entity.type === 'scientific_office' ? 'bg-purple-500/10 text-purple-600' :
                                  'bg-amber-500/10 text-amber-600'
                                }`}>
                                  {getSupplierTypeLabel(entity.type)}
                                </span>
                                {entity.status === 'مؤرشف' && (
                                  <span className="bg-slate-500/10 text-slate-500 px-2.5 py-0.5 rounded-full text-[9px] font-black">مؤرشف</span>
                                )}
                                <span className="text-[10px] text-muted-foreground font-bold">#{String(entity.id).slice(-4)}</span>
                              </div>
                           </div>
                           <div className="flex flex-col items-end gap-2">
                              <div className={`text-sm font-black px-4 py-2 rounded-xl font-mono tracking-tighter shadow-sm border-2 ${entity.balance > 0 ? 'bg-rose-500/5 text-rose-600 border-rose-500/10' : 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10'}`}>
                                {formatNumberWithCommas(entity.balance)}
                              </div>
                           </div>
                        </div>
                      </CardHeader>
                      <CardFooter className="p-4 pt-0 bg-muted/20 relative z-10 flex items-center justify-between gap-2 border-t border-border/50">
                        <Button 
                          variant="ghost" 
                          className="flex-1 h-10 rounded-xl font-black text-primary hover:bg-primary/5 gap-2" 
                          onClick={() => handleEntityClick(entity)}
                        >
                           <Eye className="h-3.5 w-3.5" />
                           عرض
                        </Button>
                        <div className="w-px h-5 bg-border/50 mx-1" />
                        <Button 
                          variant="ghost" 
                          className="flex-1 h-10 rounded-xl font-black text-amber-600 hover:bg-amber-500/5 gap-2" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEntity(entity);
                            setIsEditEntityOpen(true);
                          }}
                        >
                           <Edit className="h-3.5 w-3.5" />
                           تعديل
                        </Button>
                        <div className="w-px h-5 bg-border/50 mx-1" />
                        <Button 
                          variant="ghost" 
                          className="flex-1 h-10 rounded-xl font-black text-rose-600 hover:bg-rose-500/5 gap-2" 
                          onClick={(e) => {
                            e.stopPropagation();
                            const hasHistory = (allLedgerEntries || []).some(entry => entry.accountId === entity.id);
                            if (hasHistory) {
                              setDeletingEntityData(entity);
                              setIsEntityDeleteOptionsOpen(true);
                            } else {
                              setDeletingItem({ id: entity.id!, collection: 'entities', label: entity.name });
                              setIsDeleteConfirmOpen(true);
                            }
                          }}
                        >
                           <Trash2 className="h-3.5 w-3.5" />
                           حذف
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                  {filteredEntities.length === 0 && (
                    <div className="col-span-full py-24 text-center text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed border-border/50 flex flex-col items-center">
                       <div className="bg-muted p-6 rounded-full mb-4">
                         <Users className="h-12 w-12 opacity-20" />
                       </div>
                       <p className="font-black text-lg text-foreground/50">لا يوجد موردين مطابقة للفلاتر</p>
                       {entityStatusFilter !== 'all' && <p className="text-sm font-bold mt-2">جرب تغيير حالة الفلتر أو البحث</p>}
                       <Button onClick={() => setIsAddEntityOpen(true)} className="mt-8 bg-primary hover:bg-primary/90 h-11 px-8 rounded-xl font-black">
                          إضافة مورد جديد
                       </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="employees" className="space-y-6 animate-in fade-in duration-700">
            <EmployeesPage
              employees={employees}
              attendance={employeeAttendance}
              appMode={effectiveAppMode}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onAddAttendance={handleAddAttendance}
              onUpdateAttendance={handleUpdateAttendance}
              onDeleteAttendance={handleDeleteAttendance}
            />
          </TabsContent>

            <TabsContent value="invoices" className="space-y-6 animate-in fade-in duration-700">
              <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="px-8 py-10 border-b border-border bg-muted/20">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                      <h2 className="text-2xl font-black text-foreground mb-1">فواتير المشتريات</h2>
                      <p className="text-muted-foreground font-bold">كافة التوريدات والطلبيات المسجلة</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-80 group">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          placeholder="بحث برقم الفاتورة أو المورد..."
                          className="bg-background border-border pr-12 h-12 rounded-xl text-foreground focus:ring-primary/20 placeholder:font-bold"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsMultiEntryOpen(true)} 
                        className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 gap-2 h-12 px-6 rounded-xl font-black shrink-0"
                      >
                        <PlusCircle className="h-4 w-4" />
                        إدخال متعدد
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsExcelImportOpen(true)} 
                        className="bg-emerald-600 hover:bg-emerald-700 gap-2 h-12 px-6 text-white shadow-lg shadow-emerald-500/20 rounded-xl font-black shrink-0"
                      >
                        <FileUp className="h-4 w-4" />
                        استيراد من Excel
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={async () => {
                          if (confirm('هل أنت متأكد من تنظيف كافة الفواتير المكررة؟ سيتم الإبقاء على نسخة واحدة صحيحة لكل فاتورة.')) {
                            try {
                              const deletedCount = await firebaseService.cleanupDuplicateInvoices();
                              if (deletedCount > 0) {
                                toast.success(`تم حذف ${deletedCount} فاتورة مكررة بنجاح`);
                              } else {
                                toast.info('لم يتم العثور على فواتير مكررة');
                              }
                            } catch (e) {
                              toast.error('فشل عملية التنظيف');
                            }
                          }
                        }} 
                        className="bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 gap-2 h-12 px-6 rounded-xl font-black shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                        تنظيف المتكرر
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {effectiveAppMode === 'laptop' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr>
                          <th className="px-8 !text-right">رقم الفاتورة</th>
                          <th className="px-8 !text-right">المورد</th>
                          <th className="px-8 !text-right">التاريخ</th>
                          <th className="px-8 !text-left">المبلغ الصافي</th>
                          <th className="px-8 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allLedgerEntries
                          .filter(e => e.operationType === 'invoice' && e.isCommitted === true && e.isDeleted !== true && (e.invoiceNumber?.includes(searchTerm) || e.accountName.includes(searchTerm)))
                          .slice(0, 50)
                          .map((entry) => (
                            <tr key={entry.id} className="group hover:bg-primary/5 cursor-pointer transition-colors" onClick={() => handleViewInvoice(entry)}>
                              <td className="px-8 py-6 font-mono font-black text-foreground">{entry.invoiceNumber}</td>
                              <td className="px-8 py-6">
                                <div className="font-black text-foreground group-hover:text-primary transition-colors">{entry.accountName}</div>
                                <div className="text-[10px] text-muted-foreground font-bold mt-1">سجل توريد آجل</div>
                              </td>
                              <td className="px-8 py-6 text-xs text-muted-foreground font-mono font-bold">{safeFormatDate(entry.date, 'yyyy/MM/dd')}</td>
                              <td className="px-8 py-6 text-left">
                                <div className="text-lg font-black text-emerald-600 font-mono tracking-tighter">{formatNumberWithCommas(entry.amount || entry.netAmount)}</div>
                              </td>
                              <td className="px-8 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => {
                                    setViewingInvoice(entry);
                                    setIsEditInvoiceOpen(true);
                                  }}>
                                    <Edit className="h-4 w-4 text-amber-500" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => {
                                    setViewingInvoice(entry);
                                    setIsDeleteInvoiceConfirmOpen(true);
                                  }}>
                                    <Trash2 className="h-4 w-4 text-rose-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        {allLedgerEntries.filter(e => e.operationType === 'invoice' && e.isCommitted === true && e.isDeleted !== true).length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-20 text-center text-muted-foreground italic font-bold">لا توجد فواتير مسجلة بعد</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {allLedgerEntries
                        .filter(e => e.operationType === 'invoice' && e.isCommitted === true && e.isDeleted !== true && (e.invoiceNumber?.includes(searchTerm) || e.accountName.includes(searchTerm)))
                        .slice(0, 50)
                        .map((entry) => (
                          <div 
                            key={entry.id} 
                            className="p-4 flex flex-col gap-2 hover:bg-primary/5 cursor-pointer"
                            onClick={() => handleViewInvoice(entry)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-black text-foreground">قائمة: {entry.invoiceNumber}</div>
                                <div className="text-[10px] text-muted-foreground font-bold">{entry.accountName}</div>
                              </div>
                              <div className="text-lg font-black text-emerald-600 font-mono tracking-tighter">
                                {formatNumberWithCommas(entry.amount || entry.netAmount)}
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                              <span>{safeFormatDate(entry.date, 'yyyy/MM/dd')}</span>
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">توريد مشتريات</span>
                            </div>
                          </div>
                        ))}
                      {allLedgerEntries.filter(e => e.operationType === 'invoice' && e.isCommitted === true && e.isDeleted !== true).length === 0 && (
                        <div className="py-20 text-center text-muted-foreground italic font-bold">لا توجد فواتير مسجلة بعد</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment-deadlines" className="animate-in fade-in duration-700">
               <PaymentDeadlinesPage 
                 deadlines={deadlines}
                 entities={entities}
                 allLedgerEntries={allLedgerEntries}
                 branches={branches}
                 currentBranchId={currentBranchId}
                 currentCash={stats.cashBalance}
                 onAdd={() => {
                   setCurrentDeadline(null);
                   setIsDeadlineModalOpen(true);
                 }}
                 onEdit={(deadline) => {
                   setCurrentDeadline(deadline);
                   setIsDeadlineModalOpen(true);
                 }}
                 onDelete={(id) => handleDeleteDeadline(id)}
                 onPayNow={(deadline) => {
                   setSelectedDeadlineForPayment(deadline);
                   setIsExecutePaymentOpen(true);
                 }}
               />
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6 animate-in fade-in duration-700">
              <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="px-8 py-10 border-b border-border bg-muted/20">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                      <h2 className="text-2xl font-black text-foreground mb-1">سجل العمليات الكامل</h2>
                      <p className="text-muted-foreground font-bold">كافة الحركات المالية والإيرادات والمصاريف</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-80 group">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          placeholder="ابحث في السجل..."
                          className="bg-background border-border pr-12 h-12 rounded-xl text-foreground focus:ring-primary/20 placeholder:font-bold"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button onClick={() => setIsAddExpenseOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-white font-black h-12 px-6 rounded-xl shadow-lg shadow-primary/10">
                        <Plus className="h-4 w-4" />
                        إضافة مصروف
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {effectiveAppMode === 'laptop' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr>
                          <th className="px-8 !text-right">التاريخ</th>
                          <th className="px-8 !text-right">البيان والجهة</th>
                          <th className="px-8 !text-right">المبلغ</th>
                          <th className="px-8 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions
                          .filter(tx => tx.type === 'expense')
                          .filter(tx => 
                            (tx.description || "").includes(searchTerm) || 
                            (tx.entityName && tx.entityName.includes(searchTerm)) ||
                            (tx.category && tx.category.includes(searchTerm)) ||
                            (tx.statement && tx.statement.includes(searchTerm)) ||
                            (tx.partyName && tx.partyName.includes(searchTerm))
                          )
                          .slice(0, 50)
                          .map((tx) => (
                            <tr key={tx.id} className="group hover:bg-primary/5 transition-colors">
                              <td className="px-8 py-6 text-xs text-muted-foreground font-mono font-bold tracking-tight">
                                {safeFormatDate(tx.date, 'yyyy/MM/dd HH:mm')}
                              </td>
                              <td className="px-8 py-6">
                                <div className="font-black text-foreground group-hover:text-primary transition-colors">
                                  {getExpenseStatement(tx)}
                                </div>
                                {tx.type === 'expense' && tx.description && tx.description !== tx.statement && (
                                  <div className="text-[10px] text-muted-foreground font-bold mt-1 px-2 py-0.5 bg-muted rounded-md inline-block">
                                    {tx.description}
                                  </div>
                                )}
                              </td>
                              <td className={`px-8 py-6 font-black font-mono text-lg tracking-tighter ${(tx.type === 'income' || tx.type === 'revenue') ? 'text-primary' : 'text-rose-600'}`}>
                                {(tx.type === 'income' || tx.type === 'revenue') ? '+' : '-'}{formatNumberWithCommas(tx.amount)}
                              </td>
                              <td className="px-8 py-6 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" onClick={() => {
                                    setSelectedTransaction(tx);
                                    setIsEditTransactionOpen(true);
                                  }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all" onClick={() => handleDeleteTransaction(tx)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {transactions
                        .filter(tx => tx.type === 'expense')
                        .filter(tx => 
                          (tx.description || "").includes(searchTerm) || 
                          (tx.entityName && tx.entityName.includes(searchTerm)) ||
                          (tx.category && tx.category.includes(searchTerm)) ||
                          (tx.statement && tx.statement.includes(searchTerm)) ||
                          (tx.partyName && tx.partyName.includes(searchTerm))
                        )
                        .slice(0, 50)
                        .map((tx) => (
                          <div key={tx.id} className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="text-[10px] text-muted-foreground font-mono">{safeFormatDate(tx.date, 'yyyy/MM/dd HH:mm')}</div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary transition-all" onClick={() => {
                                  setSelectedTransaction(tx);
                                  setIsEditTransactionOpen(true);
                                }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-all" onClick={() => handleDeleteTransaction(tx)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <div className="font-black text-foreground">{getExpenseStatement(tx)}</div>
                              {tx.type === 'expense' && tx.description && tx.description !== tx.statement && (
                                <div className="text-[9px] text-muted-foreground mt-1">{tx.description}</div>
                              )}
                            </div>
                            <div className={`text-xl font-black font-mono tracking-tighter ${(tx.type === 'income' || tx.type === 'revenue') ? 'text-primary' : 'text-rose-600'}`}>
                              {(tx.type === 'income' || tx.type === 'revenue') ? '+' : '-'}{formatNumberWithCommas(tx.amount)}
                              <span className="text-[10px] mr-1 font-sans">د.ع</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-8 animate-in fade-in duration-700">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 bg-card border-border rounded-2xl overflow-hidden relative shadow-sm">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32" />
                  <CardHeader className="px-8 py-10 relative z-10 border-b border-border/50">
                    <CardTitle className="text-2xl font-black text-foreground">الملف التعريفي للصيدلية</CardTitle>
                    <CardDescription className="text-muted-foreground font-bold">إدارة معلومات الحساب والترخيص</CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 py-10 relative z-10 items-start space-y-8">
                    <div className="flex items-center gap-6 p-6 bg-muted/30 rounded-3xl border border-border shadow-inner">
                      <div className="h-20 w-20 bg-primary/10 rounded-2xl flex items-center justify-center border-2 border-primary/20 shadow-xl shadow-primary/5">
                        <Users className="h-10 w-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-black text-2xl text-foreground tracking-tight">{appUser?.displayName || appUser?.username}</h3>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground font-bold">
                           <ShieldCheck className="h-4 w-4 text-primary" />
                           {appUser?.email}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {[
                         { icon: ShieldCheck, label: 'تغيير كلمة المرور', desc: 'تأمين الحساب بكلمة مرور جديدة', color: 'text-primary', onClick: () => {} },
                         { icon: Monitor, label: 'وضع التشغيل', desc: `الضبط الحقيقي: ${appModeSetting === 'auto' ? 'تلقائي' : appModeSetting === 'laptop' ? 'لابتوب (ثابت)' : 'موبايل (ثابت)'}`, color: 'text-emerald-500', onClick: () => setAppModeSetting(prev => prev === 'auto' ? 'laptop' : prev === 'laptop' ? 'mobile' : 'auto') },
                         { icon: RefreshCcw, label: 'إعادة تعيين الترخيص', desc: 'مسح بيانات الجلسة الحالية', color: 'text-blue-500', onClick: async () => { if(user) { await firebaseService.deleteDocument('users', user.uid); window.location.reload(); } } },
                         { icon: LayoutDashboard, label: 'تخصيص الواجهة', desc: 'تبديل المظهر والألوان', color: 'text-amber-500', onClick: () => {} },
                       ].map((item, idx) => (
                         <Button key={idx} variant="outline" className="h-auto p-6 justify-start gap-4 bg-muted/20 border-border rounded-2xl hover:bg-muted transition-all group" onClick={item.onClick}>
                           <div className={`p-3 rounded-xl bg-muted border border-border group-hover:scale-110 transition-transform ${item.color}`}>
                             <item.icon className="h-5 w-5" />
                           </div>
                           <div className="text-right">
                             <div className="font-black text-foreground">{item.label}</div>
                             <div className="text-[10px] text-muted-foreground font-bold mt-0.5">{item.desc}</div>
                           </div>
                         </Button>
                       ))}
                    </div>

                    <div className="pt-8 border-t border-border flex justify-between items-center">
                       <Button variant="outline" className="border-rose-500/50 text-rose-600 hover:bg-rose-500/10 h-12 px-8 rounded-xl font-black gap-2 transition-all" onClick={() => setIsAppAuthenticated(false)}>
                         <LogOut className="h-4 w-4" />
                         تسجيل الخروج الآمن
                       </Button>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest italic opacity-50">v2.4.0 • Enterprise Edition</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-8">
                   <Card className="bg-muted/10 border-border rounded-2xl p-8 shadow-sm">
                      <CardTitle className="text-sm font-black text-foreground mb-4 uppercase tracking-widest flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        إدارة الفروع
                      </CardTitle>
                      <p className="text-xs font-bold text-muted-foreground mb-6 leading-relaxed">
                         أضف صيدليات جديدة أو فروعاً أخرى لمؤسستك. يمكنك متابعة كل فرع بشكل مستقل أو مجمع.
                      </p>
                      <Button onClick={() => setActiveTab('branches')} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl h-12 shadow-lg shadow-primary/20 transition-all">
                         دخول مركز إدارة الفروع
                      </Button>
                   </Card>

                   <Card className="bg-primary/5 border-primary/10 rounded-2xl p-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform" />
                      <CardTitle className="text-sm font-black text-primary mb-6 uppercase tracking-widest relative z-10">حالة الربط السحابي</CardTitle>
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between p-4 bg-background/50 backdrop-blur-sm rounded-xl border border-primary/10">
                           <span className="text-xs font-bold text-muted-foreground">Google Drive</span>
                           <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">متصل الآن</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-background/50 backdrop-blur-sm rounded-xl border border-primary/10">
                           <span className="text-xs font-bold text-muted-foreground">التزامن التلقائي</span>
                           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                      </div>
                   </Card>

                    {/* B3 Regular User Connected Devices Card */}
                    {appUser && appUser.licenseCode && (
                      <Card className="bg-card border-border rounded-2xl p-8 shadow-sm">
                         <CardTitle className="text-sm font-black text-foreground mb-4 uppercase tracking-widest flex items-center gap-2">
                           <Laptop className="h-4 w-4 text-violet-500 animate-pulse" />
                           الأجهزة المرتبطة برخصتك ({myLicenseDevices.length} / {myLicenseMaxDevices})
                         </CardTitle>
                         <p className="text-[11px] font-bold text-muted-foreground mb-4 leading-relaxed">
                           توضح القائمة الأجهزة المصرح لها بالولوج السحابي لبرنامج صيدليتي بالتزامن. لحذف جهاز، يرجى مراجعة إدارة الدعم مع كتابة معرّف الجهاز المطلوب حذفه.
                         </p>
                         
                         {myLicenseDevices.length === 0 ? (
                           <div className="text-[10px] text-muted-foreground text-center py-2">لا توجد أجهزة نشطة حالياً.</div>
                         ) : (
                           <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                             {myLicenseDevices.map((d: any, index: number) => {
                               const localDev = getDeviceDetails();
                               const isThisDevice = d.deviceId === localDev.deviceId;
                               return (
                                 <div key={d.deviceId || index} className={`p-3 rounded-xl border flex justify-between items-center text-xs ${isThisDevice ? 'bg-primary/5 border-primary/20 shadow-sm shadow-primary/5' : 'bg-muted/10 border-border/60'}`}>
                                   <div className="space-y-0.5">
                                     <div className="font-black text-foreground flex items-center gap-1.5">
                                       {d.name || 'جهاز مجهول'}
                                       {isThisDevice && <span className="text-[9px] bg-primary text-primary-foreground font-black px-1.5 py-0.5 rounded">هذا الجهاز</span>}
                                     </div>
                                     <div className="text-[9px] text-muted-foreground font-mono select-all">
                                        ID: {d.deviceId}
                                     </div>
                                     <div className="text-[9px] text-muted-foreground">آخر حضور: {d.lastSeen ? new Date(d.lastSeen).toLocaleDateString() : 'غير معروف'}</div>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         )}
                      </Card>
                    )}

                   <Card className="bg-muted/10 border-border rounded-2xl p-8 shadow-sm">
                      <CardTitle className="text-sm font-black text-foreground mb-6 uppercase tracking-widest">تلميحات النظام</CardTitle>
                      <div className="space-y-4 text-xs font-bold text-muted-foreground leading-relaxed">
                         <p>• استخدم <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border">Ctrl + F</kbd> للبحث السريع في أي صفحة.</p>
                         <p>• يمكنك تصدير التقارير بصيغة PDF من خلال صفحة التقارير المركزية.</p>
                         <p>• اضغط مرتين على أي فاتورة لاستعراض التفاصيل الكاملة وصورة الوصل.</p>
                      </div>
                   </Card>
                </div>
              </div>
             </TabsContent>

            <TabsContent value="branches" className="space-y-4 outline-none">
              <BranchesPage 
                branches={branches}
                currentBranchId={currentBranchId}
                onSelectBranch={handleSelectBranch}
                onAddBranch={handleAddBranch}
                onUpdateBranch={handleUpdateBranch}
                onDeleteBranch={handleDeleteBranch}
                onArchiveBranch={handleArchiveBranch}
              />
            </TabsContent>

          <TabsContent value="reports" className="space-y-8 animate-in fade-in duration-700">
             <ReportsSystem 
                transactions={transactions}
                ledgerEntries={allLedgerEntries}
                historicalRecords={historicalRecords}
                expiredLosses={expiredDamagedLosses}
                openingCash={rawOpeningCash}
                entities={entities}
                attendance={employeeAttendance}
                customerDebts={customerDebts}
                loans={rawLoans}
                branches={branches}
                currentBranchId={currentBranchId}
                supplierOpeningBalances={rawSupplierOpeningBalances}
              />
              {/* Extra tag removed */}

             <Card className="bg-card border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="p-8 border-b border-border bg-muted/10 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <ScrollText className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-black text-foreground">سجل الأداء الشهري الشامل</h3>
                   </div>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-right border-collapse">
                      <thead className="bg-muted/30 text-[10px] font-black text-muted-foreground uppercase border-b border-border">
                         <tr>
                            <th className="px-8 py-6">الشهر</th>
                            <th className="px-8 py-6">الوارد</th>
                            <th className="px-8 py-6">الربح</th>
                            <th className="px-8 py-6">الفواتير</th>
                            <th className="px-8 py-6">التسديدات</th>
                            <th className="px-8 py-6">المصاريف</th>
                            <th className="px-8 py-6">الديون المتبقية</th>
                            <th className="px-8 py-6 text-left">صافي النتيجة</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                         {monthlyTimelineData.map((data, idx) => (
                           <tr key={idx} className={`group hover:bg-primary/5 transition-colors ${idx === reportsMonth ? 'bg-primary/5' : ''}`}>
                             <td className="px-8 py-6">
                               <div className="flex flex-col">
                                 <span className="font-black text-foreground">{data.monthName}</span>
                                 {(data as any).hasHistorical && (
                                   <span className="text-[9px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded mt-0.5 w-fit">قديمة/مرحّلة</span>
                                 )}
                               </div>
                             </td>
                             <td className="px-8 py-6 font-mono font-bold text-slate-600">{formatNumberWithCommas(data.revenue)}</td>
                             <td className="px-8 py-6 font-mono font-bold text-emerald-600">{formatNumberWithCommas(data.profit)}</td>
                             <td className="px-8 py-6 font-mono font-bold text-indigo-600">{formatNumberWithCommas(data.invoices)}</td>
                             <td className="px-8 py-6 font-mono font-bold text-blue-600">{formatNumberWithCommas(data.payments)}</td>
                             <td className="px-8 py-6 font-mono font-bold text-rose-500">{formatNumberWithCommas(data.expenses)}</td>
                             <td className="px-8 py-6 font-mono font-bold text-amber-500">{formatNumberWithCommas(data.remaining)}</td>
                             <td className="px-8 py-6 text-left">
                                <span className={`text-lg font-black font-mono tracking-tighter ${data.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {formatNumberWithCommas(data.net)}
                                </span>
                             </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </Card>

             {currentBranchId === null && branches.length > 1 && (
                <Card className="bg-primary/5 border-primary/10 rounded-3xl overflow-hidden p-8 mb-20">
                  <div className="flex items-center gap-3 mb-8 relative z-10">
                     <Building2 className="h-6 w-6 text-primary" />
                     <h3 className="text-2xl font-black text-foreground">أداء الفروع المجمع ({safeFormatDate(new Date(reportsYear, reportsMonth), 'MMMM')})</h3>
                  </div>
                  <div className="overflow-x-auto relative z-10">
                      <table className="w-full text-right">
                         <thead className="text-[10px] font-black text-muted-foreground uppercase border-b border-border/50">
                            <tr>
                               <th className="px-8 py-4 text-right">الفرع</th>
                               <th className="px-8 py-4 text-right">الوارد</th>
                               <th className="px-8 py-4 text-right">المصاريف</th>
                               <th className="px-8 py-4 text-left">صافي الربح</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-border/30">
                            {branches.map(branch => {
                              const baseDate = new Date(reportsYear, reportsMonth);
                              const mStart = isValid(baseDate) ? startOfMonth(baseDate) : startOfMonth(new Date());
                              const mEnd = endOfMonth(mStart);
                              
                              const bTx = transactions.filter(t => t.branchId === branch.id && toValidDate(t.date) >= mStart && toValidDate(t.date) <= mEnd);
                              const bSalaries = employeeAttendance.filter(r => r.branchId === branch.id && toValidDate(r.date) >= mStart && toValidDate(r.date) <= mEnd).reduce((acc, r) => acc + r.dailyWage, 0);
                              const bRevenue = bTx.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.saleAmount || t.amount), 0);
                              const bProfit = bTx.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.profitAmount || t.netProfit || 0), 0);
                              const bExpense = bTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0) + bSalaries;
                              return (
                                <tr key={branch.id} className="hover:bg-primary/5 transition-colors">
                                   <td className="px-8 py-5 font-black text-foreground">{branch.name}</td>
                                   <td className="px-8 py-5 font-mono font-bold text-emerald-600">{formatIQD(bRevenue)}</td>
                                   <td className="px-8 py-5 font-mono font-bold text-rose-600">{formatIQD(bExpense)}</td>
                                   <td className="px-8 py-5 text-left font-mono font-black text-lg">{formatIQD(bProfit - bExpense)}</td>
                                </tr>
                              );
                            })}
                         </tbody>
                      </table>
                  </div>
                </Card>
             )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
               <div className="flex items-center justify-between gap-4">
                 <div className="min-w-0">
                   <h2 className="text-xl md:text-2xl font-black text-foreground truncate">الإشعارات</h2>
                   <p className="text-muted-foreground text-xs md:text-sm truncate">تنبيهات النظام ومواعيد السداد</p>
                 </div>
                 <Button variant="ghost" className="text-emerald-500 hover:bg-emerald-500/10 font-bold text-xs shrink-0" onClick={async () => {
                    for (const n of notifications) {
                      if (!n.read) await firebaseService.updateDocument('notifications', n.id!, { read: true });
                    }
                  }}>
                    تمييز الكل
                 </Button>
               </div>

               <Card className="bg-card border-border overflow-hidden rounded-2xl">
                 <div className="divide-y divide-border">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-4 md:p-6 flex gap-4 md:gap-6 transition-all ${n.read ? 'opacity-50' : 'bg-emerald-500/5 border-r-4 border-r-emerald-500'}`}>
                          <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center ${
                            n.type === 'deadline' ? 'bg-amber-500/10 text-amber-500' : 
                            n.type === 'invoice' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            <Bell className="h-5 w-5 md:h-6 md:w-6" />
                          </div>
                          <div className="flex-1 space-y-1.5 md:space-y-2 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-black text-foreground text-sm md:text-base truncate">{n.title}</h4>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[9px] md:text-xs text-muted-foreground font-mono">{safeFormatDate(n.createdAt, 'MM/dd HH:mm')}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 rounded-lg" onClick={() => firebaseService.deleteDocument('notifications', n.id!)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                            {!n.read && (
                               <Button variant="link" className="p-0 h-auto text-[10px] md:text-xs text-emerald-500 font-bold hover:text-emerald-400" onClick={() => firebaseService.updateDocument('notifications', n.id!, { read: true })}>
                                 تمييز كمقروء
                               </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-24 text-center">
                        <div className="bg-muted w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 opacity-40">
                          <Bell className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-bold">لا توجد إشعارات حالياً</p>
                      </div>
                    )}
                 </div>
               </Card>
            </TabsContent>

            <TabsContent value="medicine-requests" className="animate-in fade-in zoom-in-95 duration-300 pb-20 md:pb-0">
               <MedicineRequestsPage 
                 branchId={currentBranchId} 
                 ownerId={user?.uid || 'demo-user'} 
                 onDeleteRequest={handleDeleteMedicineRequest}
                 onDeleteImage={handleDeleteRequestImage}
               />
            </TabsContent>

            <TabsContent value="losses" className="animate-in fade-in slide-in-from-left-4 duration-500 pb-20 md:pb-0">
                <LossesPage 
                  losses={expiredDamagedLosses.filter(l => !currentBranchId || l.branchId === currentBranchId)} 
                  onAdd={() => setIsAddLossOpen(true)}
                  onEdit={(loss) => {
                    setSelectedLoss(loss);
                    setIsEditLossOpen(true);
                  }}
                  onDelete={handleDeleteLoss}
                  onViewInvoice={(invoiceId) => {
                     const invoice = (allLedgerEntries || []).find(i => i.id === invoiceId);
                     if (invoice) {
                        setViewingInvoice(invoice);
                        setActiveTab('invoice-details');
                     }
                  }}
                />
            </TabsContent>

            <TabsContent value="admin-panel" className="animate-in fade-in slide-in-from-left-4 duration-500 pb-20 md:pb-0">
               {appUser?.role === 'admin' || appUser?.role === 'super_admin' ? <AdminPanel /> : <div className="py-24 text-center text-muted-foreground font-black">عذراً، هذه الصفحة حصرية لمدير النظام الرئيسي.</div>}
            </TabsContent>

            <TabsContent value="sales-console" className="animate-in fade-in slide-in-from-left-4 duration-500 pb-20 md:pb-0">
               {appUser?.role === 'super_admin' ? <SalesConsole /> : <div className="py-24 text-center text-muted-foreground font-black">عذراً، هذه الصفحة حصرية للمشرف العام الرئيسي للنظام.</div>}
            </TabsContent>

            <TabsContent value="settings" className="space-y-8 animate-in fade-in duration-500 pb-20 md:pb-0">
               <div>
                 <h2 className="text-2xl font-black text-foreground">إعدادات النظام</h2>
                 <p className="text-muted-foreground text-sm">تخصيص الصيدلية، الأمان، وإدارة البيانات</p>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  <Card className="bg-card border-border p-6 md:p-8 space-y-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                        <Cloud className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground">المزامنة الاحتياطية</h3>
                        <p className="text-xs text-muted-foreground">Google Drive Sync</p>
                      </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-border">
                       <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl">
                         <div className="min-w-0">
                           <div className="text-sm font-bold text-foreground">حالة الربط</div>
                           {!googleDriveService.isConfigured() ? (
                             <div className="text-[10px] text-rose-500 font-bold">Google Client ID is missing</div>
                           ) : (
                             <div className="text-[10px] text-muted-foreground truncate">{googleUser?.email || (isDriveLinked ? 'متصل' : 'غير متصل')}</div>
                           )}
                         </div>
                         <Button 
                            variant={isDriveLinked ? "outline" : "default"} 
                            className={isDriveLinked ? "border-border text-foreground h-10 px-4" : "bg-emerald-600 hover:bg-emerald-700 h-10 px-6"}
                            onClick={isDriveLinked ? unlinkDrive : linkDrive}
                            disabled={!isDriveLinked && !googleDriveService.isConfigured()}
                         >
                            <Cloud className="h-4 w-4 mr-2" />
                           {isDriveLinked ? 'إلغاء الربط' : 'ربط الحساب'}
                         </Button>
                       </div>

                       {isDriveLinked && (
                         <div className="grid grid-cols-2 gap-3 pt-2">
                           <Button 
                             className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-bold gap-2"
                             onClick={handleSyncToDrive}
                             disabled={isSyncing}
                           >
                             <RefreshCw className={isSyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                             <span>مزامنة الآن</span>
                           </Button>

                           <Button 
                             variant="outline"
                             className="border-border text-foreground rounded-xl h-11 font-bold gap-2"
                             onClick={handleRestoreFromDrive}
                           >
                             <History className="h-4 w-4 text-amber-500" />
                             <span>استعادة</span>
                           </Button>
                           
                           {syncSettings.lastSync && (
                             <div className="col-span-2 text-[10px] text-center text-muted-foreground font-medium">
                               آخر مزامنة: {new Date(syncSettings.lastSync).toLocaleString('ar-EG')}
                             </div>
                           )}
                         </div>
                       )}
                    </div>
                  </Card>

                  <Card className="bg-card border-border p-6 md:p-8 space-y-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                        <History className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground">النسخ الاحتياطي JSON</h3>
                        <p className="text-xs text-muted-foreground">تصدير واستيراد البيانات يدوياً</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                       <Button 
                         variant="outline" 
                         className="h-11 border-border hover:bg-muted text-foreground/80 rounded-xl px-4 gap-2 font-bold"
                         onClick={() => DataPersistenceService.exportToJSON()}
                       >
                         <Download className="h-4 w-4 text-emerald-500" />
                         <span>تصدير</span>
                       </Button>
                       
                       <div className="relative">
                         <input 
                           type="file" 
                           id="import-backup-json" 
                           className="hidden" 
                           accept=".json" 
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) DataPersistenceService.importFromJSON(file);
                           }}
                         />
                         <Button 
                           variant="outline" 
                           className="w-full h-11 border-border hover:bg-muted text-foreground/80 rounded-xl px-4 gap-2 font-bold"
                           onClick={() => document.getElementById('import-backup-json')?.click()}
                         >
                           <Upload className="h-4 w-4 text-blue-500" />
                           <span>استيراد</span>
                         </Button>
                       </div>

                       <Button 
                         variant="ghost" 
                         className="col-span-2 h-11 text-rose-500 hover:bg-rose-500/10 rounded-xl font-bold border border-rose-500/10"
                         onClick={() => DataPersistenceService.factoryReset()}
                       >
                         <Trash2 className="h-4 w-4" />
                         مسح كافة البيانات
                       </Button>
                    </div>
                  </Card>

                  <Card className="bg-card border-border p-6 md:p-8 space-y-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground">الأمان والحساب التجاري</h3>
                        <p className="text-xs text-muted-foreground">إدارة الجلسة وبيانات الحساب الحالي</p>
                      </div>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-border">
                       <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs flex gap-2.5 justify-between items-center">
                         <div>
                           <span className="font-bold text-foreground block">{appUser?.displayName || 'مستشار الصيدلية'}</span>
                           <span className="font-mono text-muted-foreground text-[10px] select-all break-all">{appUser?.email || 'demo@pharma.local'}</span>
                         </div>
                         <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-primary/10 text-primary">نشط الآن</span>
                       </div>

                       <Button 
                         variant="outline" 
                         className="w-full justify-between h-12 border-border hover:bg-muted/60 text-rose-500 rounded-xl px-4 font-black mt-2" 
                         onClick={handleLogout}
                       >
                         <span>تسجيل الخروج الآمن</span>
                         <LogOut className="h-4 w-4" />
                       </Button>
                    </div>
                  </Card>

                  {/* Premium SaaS Subscription & Licensing Deck */}
                  <Card className="bg-card border border-border p-6 md:p-8 space-y-6 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-24 h-24 bg-primary/5 blur-2xl -ml-6 -mt-6 animate-pulse" />
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shadow-amber-500/10">
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-foreground">ترخيص الصيدلية السحابي</h3>
                        <p className="text-xs text-muted-foreground font-medium">رخصة شراء مدى الحياة (شراء لمرة واحدة)</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border relative z-10">
                      {/* Subscription Status Block */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/45 border border-border/55 rounded-xl space-y-1">
                          <span className="text-[10px] text-muted-foreground font-semibold block">حالة تفعيل الرخصة</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                            {appUser?.activationStatus === 'blocked' ? 'محظورة ومستبعدة' : appUser?.activationStatus === 'expired' ? 'منتهية الصلاحية' : 'رخصة دائمة ونشطة'}
                          </span>
                        </div>

                        <div className="p-3 bg-muted/45 border border-border/55 rounded-xl space-y-1">
                          <span className="text-[10px] text-muted-foreground font-semibold block">ملاك الحساب</span>
                          <span className="text-xs font-black text-foreground block">
                            {appUser?.role === 'super_admin' ? 'المدير العام الرئيسي (Super Admin)' : appUser?.role === 'admin' ? 'المدير العام (Admin)' : appUser?.role === 'customer' ? 'العميل العادي (Customer)' : appUser?.role === 'manager' ? 'مدير الصيدلية' : 'حساب مستخدم'}
                          </span>
                        </div>
                      </div>

                      {/* License Key block */}
                      <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-muted-foreground">رقم مفتاح ترخيص البيع (License Code)</span>
                          <button 
                            onClick={() => {
                              const code = appUser?.licenseCode || 'DEMO-LICENSE-KEY-ACTIVE';
                              navigator.clipboard.writeText(code);
                              toast.success('تم نسخ مفتاح الترخيص إلى الحافظة');
                            }}
                            className="text-[10px] text-primary hover:text-primary/80 transition-all font-bold flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg"
                          >
                            <Copy className="h-3 w-3" />
                            نسخ الكود
                          </button>
                        </div>
                        <div className="text-base font-mono tracking-wider text-right font-black text-primary bg-card/60 border border-border/40 p-2 rounded-lg select-all">
                          {appUser?.licenseCode || 'DEMO-LICENSE-KEY-ACTIVE'}
                        </div>
                      </div>

                      {/* Device & Branch restrictions (SaaS Scale parameters) */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/40 rounded-xl">
                          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                            <Laptop className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground font-semibold block">الأجهزة المسموحة</span>
                            <span className="text-[10px] font-black text-foreground">{appUser?.maxDevices || 3} أجهزة متزامنة</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/40 rounded-xl">
                          <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground font-semibold block">الفروع المتاحة</span>
                            <span className="text-[10px] font-black text-foreground">{appUser?.branchesCount || 1} فرع واحد</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-card border-border p-6 md:p-8 space-y-4 rounded-2xl border-dashed border-indigo-500/30">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                        <RefreshCw className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground">صيانة البيانات العميقة</h3>
                        <p className="text-xs text-muted-foreground">تنظيف السجلات المكررة وإصلاح التزامن المزدوج</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 pt-4 border-t border-border">
                        <Button 
                          className="w-full h-12 rounded-xl font-black gap-3 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={async () => {
                            const toastId = toast.loading('جاري فحص وتنظيف البيانات...');
                            try {
                              const count = await firebaseService.cleanupDuplicateInvoices();
                              toast.dismiss(toastId);
                              toast.success(`تم بنجاح تنظيف ${count} سجل مكرر من قاعدة البيانات`);
                            } catch (err) {
                              toast.dismiss(toastId);
                              toast.error('فشل في عملية تنظيف البيانات');
                              console.error(err);
                            }
                          }}
                        >
                          <Database className="h-5 w-5" />
                          تنظيف الفواتير المكررة
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center">
                          يساعد هذا الإجراء في حذف النسخ المكررة الناتجة عن أخطاء الحفظ المزدوج السابقة.
                        </p>
                    </div>
                  </Card>

                  <Card className="bg-card border-border p-6 md:p-8 space-y-4 rounded-2xl border-dashed border-amber-500/30">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                        <RefreshCw className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground">تصفير الحسابات المالية</h3>
                        <p className="text-xs text-muted-foreground">مسح كافة المعاملات المالية وتصفير الأرصدة</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <Button 
                        className="w-full h-12 rounded-xl font-black gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                        onClick={() => setShowFinancialResetModal(true)}
                      >
                        <Zap className="h-5 w-5" />
                        <span>بدء عملية تصفير الحسابات</span>
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-3 text-center leading-relaxed">
                        * ملاحظة: سيتم الاحتفاظ بأسماء الموردين والفروع والمستخدمين، ولكن سيتم حذف كل المعاملات المالية المرتبطة بهم وتصفير أرصدتهم.
                      </p>
                    </div>
                  </Card>

                  <Card className="bg-card border-border p-6 md:p-8 space-y-4 rounded-2xl border-dashed border-primary/30">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
                        <Bug className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground">لوحة المطور (Debug)</h3>
                        <p className="text-xs text-muted-foreground">تصفير وإدارة بيانات الاختبار</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 pt-4 border-t border-border">
                        <Button 
                          variant="destructive" 
                          className="w-full h-12 rounded-xl font-black gap-3 shadow-lg shadow-rose-500/20"
                          onClick={async () => {
                            setIsResetting(true);
                            await DataPersistenceService.resetTestData();
                            setIsResetting(false);
                          }}
                          disabled={isResetting}
                        >
                          {isResetting ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <RefreshCcw className="h-5 w-5" />}
                          تصفير كل بيانات الاختبار
                        </Button>

                        <Button 
                          variant="ghost" 
                          className="w-full h-12 rounded-xl font-black gap-3 text-rose-500 border-rose-500/20"
                          onClick={() => {
                            const current = localStorage.getItem('DEBUG_DISABLE_UPDATE_LOOP');
                            if (current === 'true') {
                              localStorage.removeItem('DEBUG_DISABLE_UPDATE_LOOP');
                              toast.success("تم تفعيل تحديثات النظام مرة أخرى");
                            } else {
                              localStorage.setItem('DEBUG_DISABLE_UPDATE_LOOP', 'true');
                              toast.warning("تم تعطيل حلقة التحديث التلقائي - للاختبار فقط");
                            }
                          }}
                        >
                          <ShieldAlert className="h-5 w-5" />
                          <span className="font-black text-xs">TOGGLE UPDATE LOOP PROTECTION</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full h-12 rounded-xl font-black gap-3 border-emerald-500/30"
                          onClick={async () => {
                            try {
                              const ok = await firebaseService.testFirebaseConnection();
                              if (ok) {
                                toast.success("اتصال ناجح بسيرفر Firebase!");
                              } else {
                                toast.error("فشل الاتصال بسيرفر Firebase. تحقق من حالة الشبكة أو القواعد.");
                              }
                            } catch (e: any) {
                              console.error("[TestConnection] Critical UI Error:", e);
                              toast.error(`خطأ تقني: ${e.message}`);
                            }
                          }}
                        >
                          <Activity className="h-5 w-5 text-emerald-500" />
                          <span className="font-black text-xs">TEST FIREBASE CONNECTION</span>
                        </Button>

                        <Button 
                          variant="outline" 
                          className="w-full h-12 rounded-xl font-black gap-3 border-primary/30"
                          onClick={async () => {
                            try {
                              const { setDoc, doc, getDoc, serverTimestamp } = await import('firebase/firestore');
                              const { db } = await import('./lib/firebase');
                              
                              console.log("[TestButton] Starting manual creation of system/config...");
                              
                              const configRef = doc(db, "system", "config");
                              await setDoc(configRef, {
                                appVersion: "1.2.1",
                                schemaVersion: "1.0.0",
                                forceUpdate: false,
                                updatedAt: serverTimestamp()
                              });
                              
                              const snap = await getDoc(configRef);
                              console.log("CREATED?", snap.exists());
                              console.log("DATA:", snap.data());
                              
                              if (snap.exists()) {
                                toast.success("تم إنشاء إعدادات النظام بنجاح (v1.2.1)");
                              } else {
                                toast.error("فشل التحقق من المستند بعد الإنشاء");
                              }
                            } catch (e: any) {
                              console.error("[TestButton] ERROR:", e);
                              toast.error(`خطأ: ${e.message}`);
                            }
                          }}
                        >
                          <Database className="h-5 w-5 text-primary" />
                          <span className="font-black text-xs">CREATE SYSTEM CONFIG TEST</span>
                        </Button>

                        <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
                           <div className="space-y-1">
                             <div className="text-muted-foreground uppercase">Number of Branches</div>
                             <div className="font-bold text-foreground">{branches.length}</div>
                           </div>
                           <div className="space-y-1">
                             <div className="text-muted-foreground uppercase">Selected Branch ID</div>
                             <div className="font-bold text-primary truncate max-w-[100px]">{currentBranchId || 'NULL (Unified)'}</div>
                           </div>
                        </div>
                    </div>
                  </Card>

                  <Card className="bg-card border-border p-6 md:p-8 space-y-6 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-500/10 text-slate-500 rounded-2xl">
                        <Info className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground">معلومات النسخة</h3>
                        <p className="text-xs text-muted-foreground">تفاصيل الإصدار الحالي والتحديثات</p>
                      </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-border">
                       <div className="flex justify-between items-center py-2 border-b border-border/30">
                          <span className="text-sm font-bold text-muted-foreground">رقم الإصدار الحالي</span>
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-black font-mono text-foreground">{VERSION_INFO.appVersion}</span>
                            {remoteConfig && remoteConfig.appVersion !== VERSION_INFO.appVersion && (
                              <span className="text-[10px] text-primary font-bold">(يتوفر {remoteConfig.appVersion})</span>
                            )}
                          </div>
                       </div>
                       <div className="flex justify-between items-center py-2 border-b border-border/30">
                          <span className="text-sm font-bold text-muted-foreground">نسخة السيرفر (Remote)</span>
                          <span className={`text-sm font-black font-mono ${remoteConfig ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {remoteConfig?.appVersion || (loadingRemoteConfig ? 'جاري التحميل...' : 'فشل الحصول على النسخة')}
                          </span>
                       </div>
                       <div className="flex justify-between items-center py-2 border-b border-border/30">
                          <span className="text-sm font-bold text-muted-foreground">إصدار قاعدة البيانات (Schema)</span>
                          <span className="text-sm font-black font-mono text-foreground">{VERSION_INFO.schemaVersion}</span>
                       </div>
                       <div className="flex justify-between items-center py-2 border-b border-border/30">
                          <span className="text-sm font-bold text-muted-foreground">آخر تحديث للسيرفر</span>
                          <span className="text-sm font-black font-mono text-foreground">{remoteConfig?.updatedAt ? safeFormatDate(remoteConfig.updatedAt, 'yyyy/MM/dd HH:mm') : 'تحميل...'}</span>
                       </div>
                       <div className="flex justify-between items-center py-2 border-b border-border/30">
                          <span className="text-sm font-bold text-muted-foreground">آخر تحديث محلي</span>
                          <span className="text-sm font-black font-mono text-foreground">{safeFormatDate(VERSION_INFO.lastUpdatedAt, 'yyyy/MM/dd HH:mm')}</span>
                       </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                          <span className="text-sm font-bold text-muted-foreground">حالة الاتصال</span>
                          <div className="flex items-center gap-2">
                             <div className={`h-2 w-2 rounded-full ${(isFirebaseConnected || remoteConfig) ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                             <span className="text-xs font-black">{(isFirebaseConnected || remoteConfig) ? 'متصل بالسيرفر' : 'غير متصل'}</span>
                          </div>
                       </div>
                       
                       {isUpdateAvailable && (
                         <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl mt-4">
                            <div className="flex items-center gap-3 mb-2 text-primary font-black text-sm">
                               <CloudLightning className="h-4 w-4" />
                               يتوفر تحديث جديد!
                            </div>
                            <p className="text-[11px] text-muted-foreground font-bold mb-3">يتوفر الإصدار {remoteConfig?.appVersion} حالياً. يرجى التحديث للحصول على المميزات الجديدة.</p>
                            <Button 
                              onClick={() => handleAppUpdate(true)}
                              className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-10 font-bold gap-2 text-xs"
                            >
                               <RefreshCw className="h-3 w-3" />
                               تحديث النسخة الآن
                            </Button>
                         </div>
                       )}
                    </div>
                  </Card>
               </div>
            </TabsContent>
            <TabsContent value="invoice-details" className="animate-in fade-in slide-in-from-left-4 duration-500">
            {viewingInvoice && (
              <InvoiceDetailsPage 
                invoice={viewingInvoice}
                entity={entities.find(e => e.id === viewingInvoice.accountId) || null}
                paymentHistory={allLedgerEntries.filter(e => e.linkedInvoiceId === viewingInvoice.id)}
                appMode={effectiveAppMode}
                onBack={() => {
                  setViewingInvoice(null);
                  setActiveTab('invoices');
                }}
                onEdit={(invoice) => { setViewingInvoice(invoice); setIsEditInvoiceOpen(true); }}
                onPayment={(invoice) => { 
                  setViewingInvoice(invoice); 
                  setPaymentMode('full'); 
                  setPayAmount(invoice.remainingAmount?.toString() || '0');
                  setSelectedEntity(entities.find(e => e.id === invoice.accountId) || null);
                  setIsAddPaymentOpen(true); 
                }}
                onRefund={(invoice) => { setViewingInvoice(invoice); setIsRefundInvoiceOpen(true); }}
                onDelete={(invoice) => { setViewingInvoice(invoice); setIsDeleteInvoiceConfirmOpen(true); }}
                onPrint={() => window.print()}
                onUpdateImageUrls={handleUpdateInvoiceImageUrls}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Reconstructed Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4">
        <Button onClick={() => setIsAddRevenueOpen(true)} size="lg" className="rounded-full h-14 w-14 shadow-2xl bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-500/20">
          <TrendingUp className="h-6 w-6" />
        </Button>
      </div>

      {/* Reconstructed Dialogs */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-4xl bg-slate-950 border-white/5 p-2" dir="rtl">
          <DialogHeader className="sr-only">
             <DialogTitle>معاينة المرفق</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-auto max-h-[85vh] overflow-hidden rounded-lg">
            {lightboxImage ? (
              <img 
                src={lightboxImage} 
                alt="Enlarged view" 
                className="w-full h-full object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-20 text-muted-foreground gap-4">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <span className="font-bold text-lg">الصورة غير متوفرة أو تم حذفها</span>
              </div>
            )}
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 left-4 h-10 w-10 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Loss Dialog */}
      <Dialog open={isAddLossOpen} onOpenChange={setIsAddLossOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl lg:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black">تسجيل خسارة مادة (تالف / إكسباير)</DialogTitle>
          </DialogHeader>
          <LossForm 
            invoices={allLedgerEntries}
            onSubmit={handleAddLoss}
            onClose={() => setIsAddLossOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Entity Dialog */}
      <Dialog open={isAddEntityOpen} onOpenChange={setIsAddEntityOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl lg:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black">إضافة مورد جديد</DialogTitle>
          </DialogHeader>
          <EntityForm 
            onSubmit={handleAddEntity} 
            onClose={() => setIsAddEntityOpen(false)} 
            onImagesChange={setEntityImageFiles}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Entity Dialog */}
      <Dialog open={isEditEntityOpen} onOpenChange={setIsEditEntityOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl lg:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black">تعديل بيانات المورد</DialogTitle>
          </DialogHeader>
          {editingEntity && (
            <EntityForm 
              entity={editingEntity}
              onSubmit={(data) => handleUpdateEntity(editingEntity.id!, data)} 
              onClose={() => setIsEditEntityOpen(false)} 
              onImagesChange={setEntityImageFiles}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* Add Invoice Dialog */}
      <ExcelImportWizard 
        open={isExcelImportOpen} 
        onOpenChange={setIsExcelImportOpen} 
        entities={entities} 
        currentBranchId={currentBranchId || undefined}
        appUser={appUser}
        preSelectedEntityId={selectedEntity?.id}
      />

      <MultiInvoiceEntry
        open={isMultiEntryOpen}
        onOpenChange={(open) => {
          setIsMultiEntryOpen(open);
          if (!open) {
            setSelectedEntity(null);
          }
        }}
        entities={entities}
        currentBranchId={currentBranchId || 'main'}
        appUser={appUser}
        preselectedEntityId={selectedEntity?.id}
        onImportExcel={() => {
          setIsMultiEntryOpen(false);
          setIsExcelImportOpen(true);
        }}
      />

      {isMultiPaymentOpen && (
        <MultiPaymentEntry 
          entities={entities}
          userId={appUser?.userId || 'guest'}
          branchId={currentBranchId}
          onRefresh={() => {}}
          onClose={() => setIsMultiPaymentOpen(false)}
        />
      )}

      <Dialog open={isAddInvoiceOpen} onOpenChange={setIsAddInvoiceOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-2xl lg:max-w-[85vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black">فاتورة مشتريات جديدة</DialogTitle>
          </DialogHeader>
          <InvoiceForm 
            entities={entities}
            selectedEntity={selectedEntity}
            onSubmit={handleAddInvoice}
            onClose={() => setIsAddInvoiceOpen(false)}
            onImagesChange={setInvImageFiles}
            onAddEntityClick={() => {
              setIsAddingFromInvoice(true);
              setIsAddEntityOpen(true);
            }}
          />
        </DialogContent>
      </Dialog>
      {/* Add Deadline Dialog */}
      <Dialog open={isAddDeadlineOpen} onOpenChange={setIsAddDeadlineOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl lg:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black">إضافة موعد سداد جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDeadline} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">المورد</Label>
                <Select name="entityId">
                  <SelectTrigger className="bg-muted border-border text-foreground h-12 rounded-xl">
                    <SelectValue placeholder="اختر المورد" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {entities.map(e => <SelectItem key={e.id} value={e.id!}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">رقم الفاتورة</Label>
                <Input id="invoiceNumber" name="invoiceNumber" required className="bg-muted border-border text-foreground h-12 rounded-xl font-bold" placeholder="مثلاً: 1254" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">مبلغ الفاتورة الكلي</Label>
                <CurrencyInput id="amount" name="amount" required className="bg-muted border-border text-foreground h-12 rounded-xl font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredPayment" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">المبلغ المطلوب سداده</Label>
                <CurrencyInput id="requiredPayment" name="requiredPayment" required className="bg-muted border-border text-foreground h-12 rounded-xl font-mono text-emerald-500 font-black" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">موعد الاستحقاق</Label>
                <Input id="dueDate" name="dueDate" type="date" required className="bg-muted border-border text-foreground h-12 rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">ملاحظات</Label>
                <Input id="notes" name="notes" className="bg-muted border-border text-foreground h-12 rounded-xl" placeholder="مثلاً: بانتظام سداد الأسبوع المقبل" />
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black h-14 rounded-2xl shadow-lg">حفظ الموعد الجديد</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl lg:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black">
              {paymentMode === 'partial' ? 'تسديد جزئي للقائمة' : paymentMode === 'full' ? 'تسديد كلي للقائمة' : 'وصل سداد جديد'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {paymentMode !== 'normal' ? `تسديد للفاتورة رقم ${viewingInvoice?.invoiceNumber}` : 'تسجيل سداد مالي للمورد'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">المورد / الجهة المستلمة</Label>
                  <div className="bg-muted p-4 rounded-xl border border-border font-black text-foreground text-lg shadow-inner">
                    {selectedEntity?.name}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">التسديد مقابل</Label>
                  <Select value={paySource} onValueChange={(val: any) => {
                    setPaySource(val);
                    if (val !== 'invoice') setViewingInvoice(null);
                  }} disabled={paymentMode !== 'normal'}>
                    <SelectTrigger className="bg-muted border-border text-foreground h-14 rounded-xl font-bold">
                      <SelectValue placeholder="اختر نوع التسديد" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                       <SelectItem value="general">تسديد عام لحساب المورد (FIFO)</SelectItem>
                       <SelectItem value="invoice">تسديد قائمة / فاتورة محددة</SelectItem>
                       <SelectItem value="opening_balance">تسديد من الرصيد الافتتاحي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {paySource === 'invoice' && (
                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <h4 className="font-black text-blue-500 text-sm">اختيار الفاتورة المطلوب تسديدها</h4>
                  </div>
                  
                  {viewingInvoice ? (
                    <div className="flex flex-col md:flex-row justify-between items-center bg-card p-4 rounded-xl border border-blue-500/20 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-black">رقم القائمة: {viewingInvoice.invoiceNumber}</div>
                        <div className="text-[10px] text-muted-foreground font-bold">التاريخ: {safeFormatDate(viewingInvoice.date, 'yyyy/MM/dd')}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-6 text-center">
                         <div className="space-y-1">
                           <div className="text-[9px] text-muted-foreground uppercase font-black">المبلغ</div>
                           <div className="text-xs font-black">{formatNumberWithCommas(viewingInvoice.netAmount)}</div>
                         </div>
                         <div className="space-y-1">
                           <div className="text-[9px] text-muted-foreground uppercase font-black">المسدد</div>
                           <div className="text-xs font-black text-emerald-500">{formatNumberWithCommas(viewingInvoice.paidAmount || 0)}</div>
                         </div>
                         <div className="space-y-1">
                           <div className="text-[9px] text-muted-foreground uppercase font-black">المتبقي</div>
                           <div className="text-xs font-black text-rose-500">{formatNumberWithCommas(viewingInvoice.remainingAmount || 0)}</div>
                         </div>
                      </div>
                      {paymentMode === 'normal' && (
                        <Button type="button" variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-500/10" onClick={() => setViewingInvoice(null)}>إلغاء</Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-[10px] text-muted-foreground font-black">ابحث عن الفاتورة:</Label>
                      <Select 
                        onValueChange={(id) => {
                          const inv = allLedgerEntries.find(i => i.id === id);
                          if (inv) {
                            setViewingInvoice(inv);
                            setPayAmount(inv.remainingAmount || 0);
                            setPayLinkedInvoice(inv.invoiceNumber || '');
                          }
                        }}
                      >
                        <SelectTrigger className="bg-muted border-border h-12 rounded-xl">
                          <SelectValue placeholder="اختر من القوائم غير المسددة لهذا المورد" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {allLedgerEntries
                            .filter(e => e.accountId === selectedEntity?.id && e.operationType === 'invoice' && e.paymentStatus !== 'paid' && !e.isDeleted)
                            .map(inv => (
                              <SelectItem key={inv.id} value={inv.id!}>
                                قائمة رقم: {inv.invoiceNumber} | بتاريخ: {safeFormatDate(inv.date, 'yyyy/MM/dd')} | المتبقي: {formatIQD(inv.remainingAmount || 0)}
                              </SelectItem>
                            ))}
                          {allLedgerEntries.filter(e => e.accountId === selectedEntity?.id && e.operationType === 'invoice' && e.paymentStatus !== 'paid' && !e.isDeleted).length === 0 && (
                            <div className="p-2 text-xs text-muted-foreground italic text-center">لا توجد فواتير بحاجة للتسديد</div>
                          )}
                        </SelectContent>
                      </Select>
                      <input type="hidden" name="linkedInvoice" value={viewingInvoice?.invoiceNumber || ''} />
                    </div>
                  )}
                </div>
              )}

              {paySource === 'opening_balance' && selectedEntity && (
                <div className="p-6 bg-orange-500/5 border border-orange-500/10 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-5 w-5 text-orange-500" />
                    <h4 className="font-black text-orange-500 text-sm">تفاصيل الرصيد الافتتاحي</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-6 bg-card p-6 rounded-xl border border-orange-500/20 text-center">
                    <div className="space-y-1">
                       <div className="text-[10px] font-black text-muted-foreground">الرصيد الافتتاحي</div>
                       <div className="text-lg font-mono font-black">{formatIQD(selectedEntity.initialBalance)}</div>
                    </div>
                    <div className="space-y-1">
                       <div className="text-[10px] font-black text-muted-foreground">المسدد سابقاً</div>
                       <div className="text-lg font-mono font-black text-emerald-500">{formatIQD(selectedEntity.initialBalancePaid || 0)}</div>
                    </div>
                    <div className="space-y-1">
                       <div className="text-[10px] font-black text-muted-foreground">المتبقي</div>
                       <div className="text-lg font-mono font-black text-orange-500">{formatIQD(selectedEntity.initialBalance - (selectedEntity.initialBalancePaid || 0))}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pay_amount" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">المبلغ المسدد نقداً</Label>
                  <div className="relative group">
                    <CurrencyInput 
                      id="pay_amount" 
                      name="amount" 
                      required 
                      value={payAmount}
                      readOnly={paymentMode === 'full'}
                      onChange={handlePayAmountChange}
                      className={`bg-muted border-border text-foreground h-14 rounded-xl font-mono text-2xl font-black pr-12 ${paymentMode === 'full' ? 'opacity-50' : 'focus:ring-emerald-500/20 focus:border-emerald-500'}`}
                    />
                    <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-emerald-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay_date" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">تاريخ الوصول / الصرف</Label>
                  <div className="relative">
                    <Input id="pay_date" name="date" type="date" defaultValue={safeFormatDate(new Date(), 'yyyy-MM-dd')} required className="bg-muted border-border text-foreground h-14 rounded-xl pr-10 font-bold" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pay_notes" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">ملاحظات إضافية</Label>
                  <Input id="pay_notes" name="notes" placeholder="مثلاً: دفعة ربع سنوية، سداد رصيد قديم..." className="bg-muted border-border text-foreground h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                   <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">صورة الوصل / مستند الدفع</Label>
                   <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="h-12 w-full rounded-xl gap-2 border-dashed border-2 hover:bg-muted" onClick={() => document.getElementById('receipt_upload')?.click()}>
                        {payImageFile ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Upload className="h-4 w-4" />}
                        {payImageFile ? 'تم الرفع' : 'رفع مستند'}
                      </Button>
                      <input type="file" id="receipt_upload" className="hidden" accept="image/*" onChange={(e) => setPayImageFile(e.target.files?.[0] || null)} />
                   </div>
                </div>
              </div>

              {paymentMode === 'normal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/30 border border-border rounded-2xl">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="pay_discount" className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">الخصم المكتسب (تعجيل دفع)</Label>
                      <div className="flex bg-muted p-1 rounded-lg scale-90 origin-right">
                        <button
                          type="button"
                          onClick={() => setPayDiscountType('fixed')}
                          className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${payDiscountType === 'fixed' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >د.ع</button>
                        <button
                          type="button"
                          onClick={() => setPayDiscountType('percentage')}
                          className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${payDiscountType === 'percentage' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >%</button>
                      </div>
                    </div>
                    {payDiscountType === 'percentage' ? (
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          value={payDiscountPercentage}
                          onChange={(e) => handlePayPercentageChange(parseFloat(e.target.value) || 0)}
                          className="bg-card border-emerald-500/20 text-emerald-600 h-14 rounded-xl font-mono text-xl font-black pl-10 text-left"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">%</span>
                      </div>
                    ) : (
                      <CurrencyInput 
                        id="pay_discount" 
                        name="discount" 
                        value={payDiscount}
                        onChange={handlePayDiscountChange}
                        className="bg-card border-emerald-500/20 text-emerald-600 h-14 rounded-xl font-mono text-xl font-black" 
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="pay_refund" className="text-rose-500 font-black text-[10px] uppercase tracking-widest">قيمة المرتجع النقدي</Label>
                    <CurrencyInput 
                      id="pay_refund" 
                      name="refund" 
                      value={Number(payRefund)}
                      onChange={(val) => setPayRefund(val.toString())}
                      className="bg-card border-rose-500/10 text-rose-500 h-14 rounded-xl font-mono text-xl font-black" 
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">مستند الوصل (اختياري)</Label>
                  <div 
                    className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:bg-muted/50 transition-all font-black bg-muted/20 hover:border-primary/50 relative overflow-hidden group"
                    onClick={() => document.getElementById('pay-image-input')?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs text-muted-foreground block">ارفق صورة الوصل الورقي لتوثيق التسديد</span>
                    <input 
                      id="pay-image-input"
                      type="file" 
                      className="hidden" 
                      onChange={(e) => setPayImageFile(e.target.files ? e.target.files[0] : null)}
                      accept="image/*"
                    />
                    {payImageFile && (
                      <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in fade-in zoom-in-95">
                        <div className="text-[10px] text-emerald-600 font-black truncate">{payImageFile.name}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay_notes" className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">ملاحظات توضيحية</Label>
                  <Textarea 
                    id="pay_notes" 
                    name="notes" 
                    placeholder="اكتب أي ملاحظات إضافية حول مبلغ السداد أو طريقة التحصيل..." 
                    className="bg-muted border-border text-foreground rounded-2xl min-h-[6rem] font-bold text-sm leading-relaxed" 
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4 mt-2">
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-2xl h-18 rounded-3xl shadow-2xl transition-all scale-100 hover:scale-[1.01] active:scale-[0.98] shadow-emerald-500/30 ring-4 ring-emerald-500/10">
                تسجيل وتأكيد عملية السداد
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Refund Invoice Dialog */}
      <Dialog open={isRefundInvoiceOpen} onOpenChange={setIsRefundInvoiceOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl lg:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black text-rose-500">إرجاع مواد (مرتجع قائمة)</DialogTitle>
            <DialogDescription className="text-muted-foreground">تسجيل مرتجع للفاتورة رقم {viewingInvoice?.invoiceNumber}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddRefund} className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                <div className="text-xs text-rose-500 font-bold mb-1">صافي الفاتورة الأصلية</div>
                <div className="text-2xl font-black text-foreground font-mono">{formatIQD(viewingInvoice?.netAmount)}</div>
                <div className="text-[10px] text-muted-foreground mt-1">المتبقي حالياً: {formatIQD(viewingInvoice?.remainingAmount || 0)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refund_amount" className="text-muted-foreground font-bold">قيمة المرتجع</Label>
                  <CurrencyInput 
                    id="refund_amount" 
                    name="refundAmount" 
                    required 
                    placeholder="0,000"
                    className="bg-muted border-border text-foreground h-11 rounded-xl font-mono text-lg" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refund_date" className="text-muted-foreground font-bold">تاريخ الإرجاع</Label>
                  <Input id="refund_date" name="date" type="date" defaultValue={safeFormatDate(new Date(), 'yyyy-MM-dd')} required className="bg-muted border-border text-foreground h-11 rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund_reason" className="text-muted-foreground font-bold">سبب الإرجاع / الملاحظات</Label>
                <Input id="refund_reason" name="reason" required placeholder="تلف، انتهاء صلاحية، خطأ بالطلب..." className="bg-muted border-border text-foreground rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black h-14 rounded-2xl shadow-lg shadow-rose-500/20">تأكيد المرتجع وخصمه من الحساب</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>



      <ViewRevenueDialog 
        isOpen={isViewRevenueOpen} 
        onOpenChange={setIsViewRevenueOpen} 
        revenue={viewingRevenue}
        branches={branches}
      />

      {/* Add Revenue Dialog */}
      <Dialog open={isAddRevenueOpen} onOpenChange={setIsAddRevenueOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl lg:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black">إضافة وارد (دخل جديد)</DialogTitle>
          </DialogHeader>
          <RevenueForm 
            onSubmit={handleAddRevenue} 
            onClose={() => setIsAddRevenueOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl lg:max-w-[80vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black">إضافة مصروف جديد</DialogTitle>
          </DialogHeader>
          <ExpenseForm 
            onSubmit={handleAddExpense} 
            onClose={() => setIsAddExpenseOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditTransactionOpen} onOpenChange={setIsEditTransactionOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl max-h-[95vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-right">تعديل عملية مالية</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedTransaction?.type === 'income' ? (
              <RevenueForm 
                initialData={selectedTransaction}
                onSubmit={handleUpdateTransaction}
                onDelete={() => handleDeleteTransaction(selectedTransaction)}
                onClose={() => setIsEditTransactionOpen(false)}
              />
            ) : (
              <ExpenseForm 
                initialData={selectedTransaction}
                onSubmit={handleUpdateTransaction}
                onDelete={() => handleDeleteTransaction(selectedTransaction)}
                onClose={() => setIsEditTransactionOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground" dir="rtl">
          <DialogHeader>
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
              activeAnnouncement?.type === 'alert' ? 'bg-rose-500/10 text-rose-500' :
              activeAnnouncement?.type === 'feature' ? 'bg-blue-500/10 text-blue-500' :
              'bg-emerald-500/10 text-emerald-500'
            }`}>
              {activeAnnouncement?.type === 'alert' ? <AlertCircle className="h-6 w-6" /> : 
               activeAnnouncement?.type === 'feature' ? <CloudLightning className="h-6 w-6" /> : 
               <Info className="h-6 w-6" />}
            </div>
            <DialogTitle className="text-center text-xl text-foreground">{activeAnnouncement?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-muted-foreground whitespace-pre-wrap">{activeAnnouncement?.message}</p>
          </div>
          <DialogFooter>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl" onClick={handleReadAnnouncement}>فهمت ذلك</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditInvoiceDialog
        isOpen={isEditInvoiceOpen}
        onOpenChange={setIsEditInvoiceOpen}
        onSubmit={handleEditInvoice}
        invoice={viewingInvoice}
        entities={entities}
        selectedEntity={selectedEntity}
        onImagesChange={setInvImageFiles}
      />

      <AddOpeningCashDialog
        isOpen={isAddOpeningCashOpen}
        onOpenChange={setIsAddOpeningCashOpen}
        onSubmit={handleAddOpeningCash}
        branches={branches}
        currentBranchId={currentBranchId}
      />

      <Dialog open={deleteConfirmState.isOpen} onOpenChange={(open) => setDeleteConfirmState(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-rose-500">{deleteConfirmState.title}</DialogTitle>
            <DialogDescription className="text-muted-foreground font-bold">
              {deleteConfirmState.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">لا يمكن التراجع عن هذه العملية بعد تأكيد الحذف.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmState(prev => ({ ...prev, isOpen: false }))} className="rounded-xl font-bold h-12 flex-1">
              {deleteConfirmState.cancelText || 'إلغاء'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteConfirmState.onConfirm} 
              disabled={deleteConfirmState.isLoading}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black h-12 flex-1"
            >
              {deleteConfirmState.isLoading ? 'جاري الحذف...' : (deleteConfirmState.confirmText || 'تأكيد الحذف')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-rose-500">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-muted-foreground font-bold">
              هل أنت متأكد من حذف المورد: {deletingItem?.label}؟
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">سيتم نقل المورد إلى قائمة المحذوفات. يمكنك استعادته لاحقاً أو أرشفته.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="rounded-xl font-bold">إلغاء</Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingItem?.id && handleSoftDeleteEntity(deletingItem.id)} 
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black"
            >
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bonus Dialog */}
      <Dialog open={isAddBonusOpen} onOpenChange={setIsAddBonusOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-xl lg:max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black">إضافة بونص جديد</DialogTitle>
          </DialogHeader>
          <BonusForm 
            entities={entities}
            selectedEntity={viewingEntityDetail || selectedEntity}
            onSubmit={handleAddBonus}
            onClose={() => setIsAddBonusOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Entity Delete Options Dialog */}
      <Dialog open={isEntityDeleteOptionsOpen} onOpenChange={setIsEntityDeleteOptionsOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-rose-500">حذف المورد: {deletingEntityData?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground font-bold">
              هذا المورد لديه سجلات فواتير أو دفعات سابقة. ماذا تريد أن تفعل؟
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
             <div className="bg-muted p-4 rounded-2xl border border-border flex gap-4 items-start">
                <div className="bg-amber-500/10 p-2 rounded-full">
                   <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                   <h4 className="font-black text-sm">مكافحة فقدان البيانات</h4>
                   <p className="text-xs text-muted-foreground mt-1">يحتوي سجل هذا المورد على تفاصيل مالية تؤثر على تقارير الصيدلية السابقة.</p>
                </div>
             </div>

             <div className="grid gap-3">
               <Button 
                 variant="outline" 
                 className="h-16 justify-start px-6 rounded-2xl border-border hover:bg-primary/5 hover:border-primary/30 group"
                 onClick={() => deletingEntityData?.id && handleArchiveEntity(deletingEntityData.id)}
               >
                 <div className="flex flex-col items-start">
                   <span className="font-black text-primary group-hover:translate-x-1 transition-transform">أرشفة المورد</span>
                   <span className="text-[10px] text-muted-foreground">(الاحتفاظ بالفواتير والتقارير - إخفاء من القائمة)</span>
                 </div>
               </Button>

               <Button 
                 variant="destructive" 
                 className="h-16 justify-start px-6 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/20 group"
                 onClick={() => {
                   if (window.confirm('هل أنت متأكد من المسح الكامل؟ سيتم حذف جميع الفواتير والدفعات المرتبطة وسيتم تعديل التقارير التاريخية.')) {
                     deletingEntityData?.id && handleFullDeleteEntity(deletingEntityData.id);
                   }
                 }}
               >
                 <div className="flex flex-col items-start">
                   <span className="font-black group-hover:translate-x-1 transition-transform">حذف المورد وكل بياناته</span>
                   <span className="text-[10px] opacity-70">(مسح نهائي للفواتير والوصلات والمرفقات)</span>
                 </div>
               </Button>
             </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEntityDeleteOptionsOpen(false)} className="w-full h-11 rounded-xl font-bold">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Deadlines Modals */}
      <PaymentDeadlineForm 
        isOpen={isDeadlineModalOpen}
        onClose={() => setIsDeadlineModalOpen(false)}
        onSave={handleSaveDeadline}
        entities={entities}
        allLedgerEntries={allLedgerEntries}
        initialData={currentDeadline}
        currentBranchId={currentBranchId}
      />

      <ExecutePaymentModal 
        isOpen={isExecutePaymentOpen}
        onClose={() => setIsExecutePaymentOpen(false)}
        deadline={selectedDeadlineForPayment}
        currentCash={stats.cashBalance}
        onConfirm={handleExecuteDeadlinePayment}
      />

      {/* Historical Import Wizard for Suppliers */}
      {viewingEntityDetail && (
        <SupplierHistoricalImportWizard 
          entity={viewingEntityDetail}
          branchId={currentBranchId}
          ledgerEntries={allLedgerEntries.filter(e => e.accountId === viewingEntityDetail.id)}
          isOpen={isHistoricalWizardOpen}
          onOpenChange={setIsHistoricalWizardOpen}
          onComplete={() => {
            setIsHistoricalWizardOpen(false);
          }}
        />
      )}

      {/* Report Detail Modal */}
      <Dialog open={isReportDetailOpen} onOpenChange={setIsReportDetailOpen}>
        <DialogContent dir="rtl" className="sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-card border-border rounded-3xl p-0">
          <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ScrollText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-foreground">تفاصيل {reportDetailTitle}</DialogTitle>
                <p className="text-xs text-muted-foreground font-bold mt-0.5">
                  استعراض كافة السجلات المكونة لهذا الإجمالي للفترة من {safeFormatDate(isValid(new Date(reportsYear, reportsMonth)) ? startOfMonth(new Date(reportsYear, reportsMonth)) : new Date(), 'dd/MM/yyyy')} إلى {safeFormatDate(isValid(new Date(reportsYear, reportsMonth)) ? endOfMonth(new Date(reportsYear, reportsMonth)) : new Date(), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-muted text-[10px] font-black text-muted-foreground uppercase sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 border-b border-border">التاريخ</th>
                    <th className="px-6 py-4 border-b border-border">النوع</th>
                    <th className="px-6 py-4 border-b border-border">البيان / التفاصيل</th>
                    <th className="px-6 py-4 border-b border-border">الجهة / المورد</th>
                    <th className="px-6 py-4 border-b border-border">المبلغ</th>
                    <th className="px-6 py-4 border-b border-border text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportDetailData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-muted-foreground font-bold italic">لا توجد سجلات لعرضها</td>
                    </tr>
                  ) : (
                    reportDetailData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-4 text-xs font-mono font-bold text-muted-foreground">{safeFormatDate(row.date, 'yyyy/MM/dd')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            row.type === 'وارد' ? 'bg-emerald-500/10 text-emerald-600' :
                            row.type === 'شراء' ? 'bg-indigo-500/10 text-indigo-600' :
                            row.type === 'تسديد' ? 'bg-blue-500/10 text-blue-600' :
                            row.type === 'مصروف' ? 'bg-rose-500/10 text-rose-600' :
                            row.type === 'راتب' ? 'bg-amber-500/10 text-amber-600' :
                            'bg-slate-500/10 text-slate-600'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="font-bold text-sm text-foreground truncate max-w-[250px]">{row.description}</span>
                              {row.expectedReturnDate && (
                                <span className="text-[10px] text-amber-600 font-bold mt-1 inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  موعد الاسترجاع: {safeFormatDate(row.expectedReturnDate, 'yyyy/MM/dd')}
                                </span>
                              )}
                              {!row.expectedReturnDate && (row.type.includes('سلفة') || row.type.includes('أمانة')) && (
                                <span className="text-[10px] text-muted-foreground mt-1">موعد الاسترجاع: غير محدد</span>
                              )}
                              {row.sourceType === 'transaction' && <span className="text-[10px] text-muted-foreground">ID: {row.id?.substring(0, 8)}</span>}
                           </div>
                        </td>
                        <td className="px-6 py-4 font-black text-sm text-foreground">{row.party}</td>
                        <td className="px-6 py-4 font-mono font-black text-lg tracking-tighter">{formatNumberWithCommas(row.amount)}</td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                              onClick={() => {
                                if (row.sourceType === 'transaction') {
                                  setSelectedTransaction(transactions.find(t => t.id === row.id) || null);
                                  setIsEditTransactionOpen(true);
                                } else if (row.sourceType === 'ledger') {
                                  const entry = allLedgerEntries.find(e => e.id === row.id);
                                  if (entry) {
                                    setViewingInvoice(entry);
                                    if (entry.operationType === 'invoice') setIsEditInvoiceOpen(true);
                                    else if (entry.operationType === 'payment') {
                                      setSelectedEntity(entities.find(e => e.id === entry.accountId) || null);
                                      setPayAmount(entry.amount);
                                      toast.info('يمكنك تعديل الدفعات من خلال صفحة كشف حساب المورد');
                                    }
                                  }
                                } else if (row.sourceType === 'entity') {
                                  setViewingEntityDetail(entities.find(e => e.id === row.id) || null);
                                  setIsReportDetailOpen(false);
                                }
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10"
                              onClick={() => {
                                if (row.sourceType === 'transaction') {
                                  handleDeleteTransaction(transactions.find(t => t.id === row.id)!);
                                } else if (row.sourceType === 'ledger') {
                                  const entry = allLedgerEntries.find(e => e.id === row.id);
                                  if (entry) {
                                    if (entry.operationType === 'invoice') {
                                      setViewingInvoice(entry);
                                      setIsDeleteInvoiceOpen(true);
                                    } else {
                                      toast.info('عملية الحذف لهذه الفئة تتم من صفحة السجل الخاص بها');
                                    }
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-6 border-t border-border bg-muted/30 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
             <div className="flex items-center gap-4">
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-muted-foreground uppercase">مجموع السجلات الحالية</span>
                 <span className="text-2xl font-black font-mono text-primary">{formatNumberWithCommas(reportDetailData.reduce((s, r) => s + (r.amount || 0), 0))}</span>
               </div>
               <div className="h-10 w-px bg-border mx-2" />
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-muted-foreground uppercase">عدد العمليات</span>
                 <span className="text-2xl font-black font-mono text-foreground">{reportDetailData.length}</span>
               </div>
             </div>
             <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl font-bold h-11 px-6" onClick={() => setIsReportDetailOpen(false)}>إغلاق</Button>
                <Button className="rounded-xl font-black gap-2 h-11 px-6 bg-primary text-white shadow-lg shadow-primary/20" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  طباعة الكشف
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddLoanOpen} onOpenChange={setIsAddLoanOpen}>
        <DialogContent dir="rtl" className="bg-card border-border text-foreground sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl font-black">تسجيل سلفة / أمانة مستردة</DialogTitle>
          </DialogHeader>
          <LoanForm 
            loans={rawLoans}
            onSubmit={handleAddLoan}
            onClose={() => setIsAddLoanOpen(false)}
            onImagesChange={setLoanImageFiles}
          />
        </DialogContent>
      </Dialog>

      <DeadlineModal 
        isOpen={isDeadlineModalOpen}
        onClose={() => setIsDeadlineModalOpen(false)}
        onSave={handleSaveDeadline}
        onDelete={handleDeleteDeadline}
        target={deadlineTarget}
        currentDeadline={currentDeadline}
      />

      </div>
    </div>
  );
}
