import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc,
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Search, 
  ShieldAlert, 
  Users, 
  Award, 
  Edit, 
  Plus, 
  RotateCw, 
  Save, 
  X, 
  Phone, 
  Mail, 
  Laptop, 
  Building2, 
  CheckCircle, 
  Clock,
  UserCheck,
  Power,
  ShieldCheck,
  KeyRound,
  Trash2,
  Copy,
  Wrench,
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import { hashPassword } from '../services/customAuthService';

interface SaaSUser {
  userId: string;
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  status: 'pending' | 'active' | 'disabled' | 'expired' | 'deleted';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  verifiedAt?: string;
  licenseCode: string;
  activationStatus: 'active' | 'blocked' | 'expired';
  planType: 'basic' | 'advanced' | 'lifetime';
  maxDevices: number;
  branchesCount: number;
  role: string;
  isProtected?: boolean;
  passwordHash?: string;

  // One-time Licensing Parameters
  activatedAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

export function AdminPanel({ currentUserId }: { currentUserId?: string }) {
  const [activeTab, setActiveTab] = useState<'users' | 'keys' | 'licenses' | 'tools'>('users');
  const [users, setUsers] = useState<SaaSUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<SaaSUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Migration Tools state
  const [migrationState, setMigrationState] = useState<{
    scanning: boolean;
    migrating: boolean;
    scanned: boolean;
    counts: Record<string, number>;
    status: Record<string, 'idle' | 'loading' | 'success' | 'failed'>;
  }>({
    scanning: false,
    migrating: false,
    scanned: false,
    counts: {},
    status: {}
  });

  const collectionsToMigrate = [
    { id: 'entities', name: 'الموردين والحسابات المالية' },
    { id: 'ledgerEntries', name: 'سجلات الأستاذ الموحد' },
    { id: 'transactions', name: 'العمليات والفواتير المالية' },
    { id: 'entityActivities', name: 'سجلات النشاطات والمراجعة' },
    { id: 'branches', name: 'الصيدليات والفروع المعرفة' },
    { id: 'customerDebts', name: 'ديون ومستحقات العملاء' },
    { id: 'notifications', name: 'التنبيهات والبريد الداخلي' },
    { id: 'bonuses', name: 'سحوبات البونص المجاني' },
    { id: 'employees', name: 'الموظفين وملاك الكوادر' },
    { id: 'employeeAttendance', name: 'سجلات حضور الموظفين' },
    { id: 'openingCash', name: 'سجلات الصندوق والافتتاحيات' },
    { id: 'loans', name: 'سجلات السلف والقروض' },
    { id: 'supplierOpeningBalances', name: 'الأرصدة الافتتاحية للموردين' },
    { id: 'deadlines', name: 'مواعيد الاستحقاق والسداد' },
    { id: 'activationRequests', name: 'طلبات تفعيل التراخيص' },
    { id: 'recoveryRequests', name: 'طلبات استعادة الحسابات' },
    { id: 'expiredDamagedLosses', name: 'توالف ومسترجعات الأدوية' },
    { id: 'medicineRequests', name: 'طلبات توفير الأدوية النادرة' }
  ];

  const handleScanDemoData = async () => {
    setMigrationState(prev => ({ ...prev, scanning: true, scanned: false }));
    const countsMap: Record<string, number> = {};
    const statusMap: Record<string, 'idle' | 'loading' | 'success' | 'failed'> = {};

    try {
      for (const col of collectionsToMigrate) {
        statusMap[col.id] = 'loading';
        const q = query(collection(db, col.id), where('ownerId', '==', 'demo-user'));
        const snap = await getDocs(q);
        countsMap[col.id] = snap.size;
        statusMap[col.id] = 'idle';
      }
      setMigrationState({
        scanning: false,
        migrating: false,
        scanned: true,
        counts: countsMap,
        status: statusMap
      });
      toast.success('اكتمل فحص البيانات بنجاح! تم العثور على سجلات تابعة للمستخدم التجريبي.');
    } catch (err: any) {
      console.error("Migration scan error:", err);
      toast.error('حدث خطأ أثناء فحص البيانات: ' + (err?.message || err));
      setMigrationState(prev => ({ ...prev, scanning: false }));
    }
  };

  const handleMigrateDemoData = async () => {
    if (!currentUserId) {
      toast.error('لم يتم تحديد هوية المستخدم الحالي للترحيل إليه!');
      return;
    }

    setMigrationState(prev => ({ ...prev, migrating: true }));
    const statusMap = { ...migrationState.status };

    try {
      for (const col of collectionsToMigrate) {
        const count = migrationState.counts[col.id] || 0;
        if (count === 0) {
          statusMap[col.id] = 'success';
          continue;
        }

        statusMap[col.id] = 'loading';
        setMigrationState(prev => ({ ...prev, status: { ...statusMap } }));

        const q = query(collection(db, col.id), where('ownerId', '==', 'demo-user'));
        const snap = await getDocs(q);

        for (const docSnap of snap.docs) {
          const docRef = doc(db, col.id, docSnap.id);
          const updateData: any = { ownerId: currentUserId };
          
          const docData = docSnap.data();
          if (docData.userId === 'demo-user') {
            updateData.userId = currentUserId;
          }

          await updateDoc(docRef, updateData);
        }

        statusMap[col.id] = 'success';
        setMigrationState(prev => ({ ...prev, status: { ...statusMap } }));
      }

      toast.success('مبروك! تم ترحيل كافة البيانات من demo-user إلى حسابك الحالي بنجاح.');
      
      setMigrationState(prev => ({
        ...prev,
        migrating: false,
        counts: Object.fromEntries(collectionsToMigrate.map(c => [c.id, 0])),
        status: Object.fromEntries(collectionsToMigrate.map(c => [c.id, 'success']))
      }));
    } catch (err: any) {
      console.error("Migration execution error:", err);
      toast.error('فشل ترحيل بعض الجداول: ' + (err?.message || err));
      setMigrationState(prev => ({ ...prev, migrating: false }));
    }
  };
  
  // New User custom form states for manual registration helper
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlanType, setNewPlanType] = useState<'basic' | 'advanced' | 'lifetime'>('basic');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'user'>('manager');

  // Key Generator Form states
  const [keys, setKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genPlanType, setGenPlanType] = useState<'basic' | 'advanced' | 'lifetime'>('basic');
  const [genMaxDevices, setGenMaxDevices] = useState(2);
  const [genBranchesCount, setGenBranchesCount] = useState(1);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<{
    scannedCount: number;
    duplicatesCount: number;
    deletedCount: number;
    disabledCount: number;
    skippedProtectedCount: number;
    details: string[];
  } | null>(null);

  // ==========================================
  // LICENSE MANAGEMENT ENGINE STATES & HANDLERS
  // ==========================================
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [licenseSearchTerm, setLicenseSearchTerm] = useState('');
  const [licensePlanFilter, setLicensePlanFilter] = useState<'all' | 'basic' | 'pro' | 'lifetime'>('all');
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<'all' | 'active' | 'expired' | 'suspended' | 'revoked' | 'unused'>('all');
  const [selectedLicense, setSelectedLicense] = useState<any | null>(null);
  const [isLicenseDetailModalOpen, setIsLicenseDetailModalOpen] = useState(false);
  const [isCreateLicenseModalOpen, setIsCreateLicenseModalOpen] = useState(false);

  // Form states for creating manual license
  const [licenseFormOwnerName, setLicenseFormOwnerName] = useState('');
  const [licenseFormOwnerEmail, setLicenseFormOwnerEmail] = useState('');
  const [licenseFormOwnerPhone, setLicenseFormOwnerPhone] = useState('');
  const [licenseFormPlanType, setLicenseFormPlanType] = useState<'basic' | 'pro' | 'lifetime'>('basic');
  const [licenseFormNotes, setLicenseFormNotes] = useState('');
  const [licenseFormPaymentStatus, setLicenseFormPaymentStatus] = useState<'paid' | 'pending' | 'manual'>('manual');

  const fetchLicenses = async () => {
    setLoadingLicenses(true);
    try {
      const snap = await getDocs(collection(db, 'licenses'));
      const loaded: any[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        let formattedCreatedAt = d.createdAt;
        if (d.createdAt && typeof d.createdAt.toDate === 'function') {
          formattedCreatedAt = d.createdAt.toDate().toISOString();
        } else if (d.createdAt && d.createdAt.seconds) {
          formattedCreatedAt = new Date(d.createdAt.seconds * 1000).toISOString();
        } else {
          formattedCreatedAt = d.createdAt || new Date().toISOString();
        }

        let formattedExpiry = d.expiryDate;
        if (d.expiryDate && typeof d.expiryDate.toDate === 'function') {
          formattedExpiry = d.expiryDate.toDate().toISOString();
        } else if (d.expiryDate && d.expiryDate.seconds) {
          formattedExpiry = new Date(d.expiryDate.seconds * 1000).toISOString();
        } else {
          formattedExpiry = d.expiryDate || null;
        }

        let formattedPurchase = d.purchaseDate;
        if (d.purchaseDate && typeof d.purchaseDate.toDate === 'function') {
          formattedPurchase = d.purchaseDate.toDate().toISOString();
        } else if (d.purchaseDate && d.purchaseDate.seconds) {
          formattedPurchase = new Date(d.purchaseDate.seconds * 1000).toISOString();
        } else {
          formattedPurchase = d.purchaseDate || new Date().toISOString();
        }

        loaded.push({
          id: docSnap.id,
          ...d,
          createdAt: formattedCreatedAt,
          expiryDate: formattedExpiry,
          purchaseDate: formattedPurchase,
          updatedAt: d.updatedAt || formattedCreatedAt
        });
      });
      // Sort licenses latest first
      loaded.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      setLicenses(loaded);
    } catch (err) {
      console.error('Failed to load licenses from Firestore:', err);
      toast.error('فشل في جلب قائمة التراخيص من السحابة');
    } finally {
      setLoadingLicenses(false);
    }
  };

  const generateUniqueLicenseKey = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randomChars = (length: number) => {
      const array = new Uint32Array(length);
      window.crypto.getRandomValues(array);
      let res = '';
      for (let i = 0; i < length; i++) {
        res += chars[array[i] % chars.length];
      }
      return res;
    };
    return `LIC-${randomChars(8)}-${randomChars(4)}`;
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseFormOwnerName.trim()) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }

    const toastId = toast.loading('جاري إنشاء الترخيص وتوليد المفتاح الآمن...');
    try {
      const licenseKey = generateUniqueLicenseKey();
      
      let maxDevices = 2;
      let maxBranches = 1;
      let expiryDays = 365;

      if (licenseFormPlanType === 'pro') {
        maxDevices = 10;
        maxBranches = 5;
        expiryDays = 365;
      } else if (licenseFormPlanType === 'lifetime') {
        maxDevices = 99;
        maxBranches = 15;
        expiryDays = 0;
      }

      const now = new Date();
      let expiryDate: string | null = null;
      if (expiryDays > 0) {
        const exp = new Date();
        exp.setDate(now.getDate() + expiryDays);
        expiryDate = exp.toISOString();
      }

      // Check if a registered user matches this ownerEmail or ownerPhone
      let ownerUserId = '';
      let matchedUser = users.find(u => 
        (licenseFormOwnerEmail && u.email && u.email.trim().toLowerCase() === licenseFormOwnerEmail.trim().toLowerCase()) ||
        (licenseFormOwnerPhone && u.phone && u.phone.trim() === licenseFormOwnerPhone.trim())
      );

      if (matchedUser) {
        ownerUserId = matchedUser.userId || matchedUser.id || '';
      }

      const newLicense: any = {
        licenseKey,
        planType: licenseFormPlanType,
        status: matchedUser ? 'active' : 'unused',
        ownerUserId,
        ownerName: licenseFormOwnerName.trim(),
        ownerEmail: licenseFormOwnerEmail.trim().toLowerCase(),
        ownerPhone: licenseFormOwnerPhone.trim(),
        maxDevices,
        maxBranches,
        activatedDevices: [],
        activatedAt: matchedUser ? now.toISOString() : null,
        purchaseDate: now.toISOString(),
        expiryDate,
        createdBy: 'super_admin',
        notes: licenseFormNotes.trim(),
        paymentStatus: licenseFormPaymentStatus,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      const licRef = doc(collection(db, 'licenses'));
      await setDoc(licRef, newLicense);

      if (matchedUser && ownerUserId) {
        const userDocRef = doc(db, 'appUsers', ownerUserId);
        await updateDoc(userDocRef, {
          licenseCode: licenseKey,
          planType: licenseFormPlanType === 'pro' ? 'advanced' : (licenseFormPlanType === 'lifetime' ? 'lifetime' : 'basic'),
          maxDevices,
          branchesCount: maxBranches,
          activationStatus: 'active',
          updatedAt: now.toISOString()
        });

        setUsers(prevUsers => prevUsers.map(u => {
          if ((u.userId || u.id) === ownerUserId) {
            return {
              ...u,
              licenseCode: licenseKey,
              planType: licenseFormPlanType === 'pro' ? 'advanced' : (licenseFormPlanType === 'lifetime' ? 'lifetime' : 'basic'),
              maxDevices,
              branchesCount: maxBranches,
              activationStatus: 'active',
              updatedAt: now.toISOString()
            };
          }
          return u;
        }));
      }

      toast.dismiss(toastId);
      toast.success(`تم توليد مفتاح الترخيص بنجاح: ${licenseKey}`);
      
      setIsCreateLicenseModalOpen(false);
      setLicenseFormOwnerName('');
      setLicenseFormOwnerEmail('');
      setLicenseFormOwnerPhone('');
      setLicenseFormPlanType('basic');
      setLicenseFormNotes('');
      setLicenseFormPaymentStatus('manual');

      fetchLicenses();
    } catch (err) {
      console.error('Failed to create license:', err);
      toast.dismiss(toastId);
      toast.error('حدث عطل أثناء حفظ الترخيص على السحابة');
    }
  };

  const handleSuspendLicense = async (license: any) => {
    if (!window.confirm('هل أنت متأكد من تعليق هذا الترخيص؟ سيتم إيقاف صلاحيات أجهزة المستفيد فوراً.')) return;
    const toastId = toast.loading('جاري تعليق الترخيص...');
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'licenses', license.id), {
        status: 'suspended',
        updatedAt: now
      });

      if (license.ownerUserId) {
        const userDocRef = doc(db, 'appUsers', license.ownerUserId);
        await updateDoc(userDocRef, {
          activationStatus: 'blocked',
          status: 'disabled',
          isActive: false,
          updatedAt: now
        });

        setUsers(prevUsers => prevUsers.map(u => {
          if ((u.userId || u.id) === license.ownerUserId) {
            return {
              ...u,
              activationStatus: 'blocked',
              status: 'disabled',
              isActive: false,
              updatedAt: now
            };
          }
          return u;
        }));
      }

      toast.dismiss(toastId);
      toast.success('تم تعليق الترخيص بنجاح.');
      fetchLicenses();
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('فشل في تعليق الترخيص');
    }
  };

  const handleActivateLicense = async (license: any) => {
    const toastId = toast.loading('جاري تفعيل الترخيص...');
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'licenses', license.id), {
        status: 'active',
        updatedAt: now
      });

      if (license.ownerUserId) {
        const userDocRef = doc(db, 'appUsers', license.ownerUserId);
        await updateDoc(userDocRef, {
          activationStatus: 'active',
          status: 'active',
          isActive: true,
          updatedAt: now
        });

        setUsers(prevUsers => prevUsers.map(u => {
          if ((u.userId || u.id) === license.ownerUserId) {
            return {
              ...u,
              activationStatus: 'active',
              status: 'active',
              isActive: true,
              updatedAt: now
            };
          }
          return u;
        }));
      }

      toast.dismiss(toastId);
      toast.success('تم تنشيط الترخيص وتفعيل المستفيد بنجاح.');
      fetchLicenses();
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('فشل تفعيل الترخيص');
    }
  };

  const handleRevokeLicense = async (license: any) => {
    if (!window.confirm('هل أنت متأكد من إلغاء الترخيص نهائياً؟ هذا الإجراء لا يمكن التراجع عنه وسيبطل تنشيط الحساب.')) return;
    const toastId = toast.loading('جاري إلغاء الترخيص...');
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'licenses', license.id), {
        status: 'revoked',
        updatedAt: now
      });

      if (license.ownerUserId) {
        const userDocRef = doc(db, 'appUsers', license.ownerUserId);
        await updateDoc(userDocRef, {
          activationStatus: 'blocked',
          status: 'disabled',
          isActive: false,
          updatedAt: now
        });

        setUsers(prevUsers => prevUsers.map(u => {
          if ((u.userId || u.id) === license.ownerUserId) {
            return {
              ...u,
              activationStatus: 'blocked',
              status: 'disabled',
              isActive: false,
              updatedAt: now
            };
          }
          return u;
        }));
      }

      toast.dismiss(toastId);
      toast.success('تم إلغاء صلاحية الترخيص كلياً.');
      fetchLicenses();
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('فشل إلغاء الترخيص');
    }
  };

  const handleExtendLicense = async (license: any) => {
    if (license.planType === 'lifetime') {
      toast.error('ترخيص مدى الحياة غير قابل للمحدودية الزمنية.');
      return;
    }
    const toastId = toast.loading('جاري تمديد صلاحية الترخيص لسنة إضافية...');
    try {
      const now = new Date().toISOString();
      let currentExpiry = license.expiryDate ? new Date(license.expiryDate) : new Date();
      if (currentExpiry.getTime() < new Date().getTime()) {
        currentExpiry = new Date();
      }
      currentExpiry.setDate(currentExpiry.getDate() + 365);
      const newExpiry = currentExpiry.toISOString();

      await updateDoc(doc(db, 'licenses', license.id), {
        expiryDate: newExpiry,
        status: 'active',
        updatedAt: now
      });

      if (license.ownerUserId) {
        const userDocRef = doc(db, 'appUsers', license.ownerUserId);
        await updateDoc(userDocRef, {
          activationStatus: 'active',
          status: 'active',
          isActive: true,
          updatedAt: now
        });

        setUsers(prevUsers => prevUsers.map(u => {
          if ((u.userId || u.id) === license.ownerUserId) {
            return {
              ...u,
              activationStatus: 'active',
              status: 'active',
              isActive: true,
              updatedAt: now
            };
          }
          return u;
        }));
      }

      toast.dismiss(toastId);
      toast.success(`تم تمديد الترخيص بنجاح لغاية ${new Date(newExpiry).toLocaleDateString()}`);
      fetchLicenses();
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('فشل تمديد الترخيص');
    }
  };

  const handleLinkLicenseToUser = async (licenseId: string, user: SaaSUser) => {
    const toastId = toast.loading('جاري ربط الترخيص بحساب المستخدم...');
    try {
      const now = new Date().toISOString();
      const targetLicense = licenses.find(l => l.id === licenseId);
      if (!targetLicense) {
        toast.dismiss(toastId);
        toast.error('الترخيص غير موجود');
        return;
      }

      const maxDevices = targetLicense.maxDevices || 2;
      const maxBranches = targetLicense.maxBranches || 1;

      await updateDoc(doc(db, 'licenses', licenseId), {
        ownerUserId: user.userId || user.id,
        ownerName: user.fullName,
        ownerEmail: user.email,
        ownerPhone: user.phone,
        status: 'active',
        activatedAt: now,
        updatedAt: now
      });

      await updateDoc(doc(db, 'appUsers', user.userId || user.id || ''), {
        licenseCode: targetLicense.licenseKey,
        planType: targetLicense.planType === 'pro' ? 'advanced' : (targetLicense.planType === 'lifetime' ? 'lifetime' : 'basic'),
        maxDevices,
        branchesCount: maxBranches,
        activationStatus: 'active',
        status: 'active',
        isActive: true,
        updatedAt: now
      });

      setUsers(prevUsers => prevUsers.map(u => {
        if ((u.userId || u.id) === (user.userId || user.id)) {
          return {
            ...u,
            licenseCode: targetLicense.licenseKey,
            planType: targetLicense.planType === 'pro' ? 'advanced' : (targetLicense.planType === 'lifetime' ? 'lifetime' : 'basic'),
            maxDevices,
            branchesCount: maxBranches,
            activationStatus: 'active',
            status: 'active',
            isActive: true,
            updatedAt: now
          };
        }
        return u;
      }));

      toast.dismiss(toastId);
      toast.success('تم الاقتران والارتباط بنجاح.');
      fetchLicenses();
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('فشل في عملية الاقتران');
    }
  };

  const handleDeleteDevice = async (licenseId: string, deviceId: string) => {
    const toastId = toast.loading('جاري حذف الجهاز وتحديث رخصة التشغيل...');
    try {
      const targetLicense = licenses.find(l => l.id === licenseId);
      if (!targetLicense) {
        toast.dismiss(toastId);
        toast.error('الترخيص غير موجود');
        return;
      }

      const rawDevices = targetLicense.activatedDevices || [];
      const updatedDevices = rawDevices.filter((d: any) => d.deviceId !== deviceId);

      await updateDoc(doc(db, 'licenses', licenseId), {
        activatedDevices: updatedDevices,
        updatedAt: new Date().toISOString()
      });

      // If user is linked, update their session too
      if (targetLicense.ownerUserId) {
        await updateDoc(doc(db, 'appUsers', targetLicense.ownerUserId), {
          deviceSessions: updatedDevices.map((d: any) => d.deviceId),
          updatedAt: new Date().toISOString()
        });
      }

      // Sync state immediately
      setSelectedLicense((prev: any) => {
        if (prev && prev.id === licenseId) {
          return {
            ...prev,
            activatedDevices: updatedDevices
          };
        }
        return prev;
      });

      toast.dismiss(toastId);
      toast.success('تم حذف الجهاز وسحب تسجيله بنجاح.');
      fetchLicenses();
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('فشل في حذف الجهاز من الترخيص');
    }
  };

  const handleResetDevices = async (licenseId: string) => {
    if (!window.confirm('هل أنت متأكد من تصفير وإعادة تعيين جميع الأجهزة المرتبطة بهذا الترخيص؟ سيتم تسجيل الخروج منها فوراً.')) {
      return;
    }
    const toastId = toast.loading('جاري إخلاء خانات الأجهزة...');
    try {
      const targetLicense = licenses.find(l => l.id === licenseId);
      if (!targetLicense) {
        toast.dismiss(toastId);
        toast.error('الترخيص غير موجود');
        return;
      }

      await updateDoc(doc(db, 'licenses', licenseId), {
        activatedDevices: [],
        updatedAt: new Date().toISOString()
      });

      if (targetLicense.ownerUserId) {
        await updateDoc(doc(db, 'appUsers', targetLicense.ownerUserId), {
          deviceSessions: [],
          updatedAt: new Date().toISOString()
        });
      }

      // Sync state immediately
      setSelectedLicense((prev: any) => {
        if (prev && prev.id === licenseId) {
          return {
            ...prev,
            activatedDevices: []
          };
        }
        return prev;
      });

      toast.dismiss(toastId);
      toast.success('تمت إعادة تعيين وتصفير الأجهزة بنجاح.');
      fetchLicenses();
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('فشل تصفير الأجهزة من الترخيص');
    }
  };

  const handleAdminResendOTP = async (email: string) => {
    const toastId = toast.loading('جاري طلب إعادة إرسال رمز OTP للمستفيد...');
    try {
      const response = await fetch("/api/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      toast.dismiss(toastId);
      if (response.ok && data.success) {
        toast.success('تمت إعادة إرسال رمز التحقق OTP بنجاح لبريد المستخدم!');
      } else {
        toast.error(data.error || 'فشل إرسال الرمز للبريد');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('حدث عطل أثناء الاتصال بالخادم لإعادة الإرسال: ' + err.message);
    }
  };

  const handleAdminSetStatus = async (userId: string, newStatus: 'active' | 'disabled') => {
    const confirmMsg = newStatus === 'disabled' 
      ? 'هل أنت متأكد من تعطيل هذا الحساب؟ لن يتمكن المستخدم من الدخول للنظام.'
      : 'هل تريد إعادة تفعيل هذا الحساب؟';
    if (!window.confirm(confirmMsg)) return;

    try {
      // Synchronously update the UI state immediately
      setUsers(prevUsers => prevUsers.map(u => {
        if ((u.userId || u.id) === userId) {
          const updated = {
            ...u,
            status: newStatus,
            isActive: newStatus === 'active',
            updatedAt: new Date().toISOString()
          };
          console.log("ADMIN_UPDATED_USER_STATUS", { userId, newStatus, user: updated });
          return updated;
        }
        return u;
      }));

      await updateDoc(doc(db, 'appUsers', userId), {
        status: newStatus,
        isActive: newStatus === 'active',
        updatedAt: new Date().toISOString()
      });
      toast.success('تم تحديث حالة الحساب بنجاح.');
      fetchUsers();
    } catch (err: any) {
      toast.error('فشل تغيير حالة الحساب: ' + err.message);
    }
  };

  const handleAdminDeleteAccount = async (u: SaaSUser) => {
    console.log("DELETE BUTTON CLICKED", u);
    try {
      const isSuperAdminUser = (user: SaaSUser) => (user.role || '').trim().toLowerCase() === 'super_admin';

      const targetId = u.userId || u.id;
      if (!targetId) {
        toast.error('لم نتمكن من العثور على المعرف الفريد لهذا الحساب لعملية الحذف.');
        return;
      }

      if (isSuperAdminUser(u)) {
        const usersRef = collection(db, 'appUsers');
        const snap = await getDocs(usersRef);
        const allUsers: SaaSUser[] = [];
        snap.forEach((docSnap) => {
          allUsers.push(docSnap.data() as SaaSUser);
        });
        const superAdmins = allUsers.filter(isSuperAdminUser);
        if (superAdmins.length <= 1) {
          toast.error('ليس مسموحاً بحذف حساب المسؤول الرئيسي الوحيد المتبقي في النظام لشروط الأمان.');
          return;
        }
      }

      const confirmMsg = `هل أنت متأكد من حذف الحساب والترخيص لـ "${u.fullName}" نهائياً من قاعدة البيانات السحابية؟ هذا الإجراء لا يمكن التراجع عنه.`;
      if (!window.confirm(confirmMsg)) return;

      await deleteDoc(doc(db, 'appUsers', targetId));
      toast.success('تم حذف الحساب والترخيص بنجاح من قاعدة البيانات.');

      // Update state immediately
      setUsers(prev => prev.filter(user => (user.userId || user.id) !== targetId));

      fetchUsers();
    } catch (err: any) {
      toast.error('فشل حذف حساب العميل: ' + err.message);
    }
  };

  const handleDeleteTargetEmailDuplicates = async () => {
    console.log("TARGET CLEAN BUTTON CLICKED");
    console.log("ALL USERS:", users);
    const targetEmail = 'mustafaenginerr35@gmail.com';
    setLoading(true);
    try {
      const usersRef = collection(db, 'appUsers');
      const snap = await getDocs(usersRef);
      const allUsers: SaaSUser[] = [];
      snap.forEach((docSnap) => {
        const u = docSnap.data() as SaaSUser;
        if (!u.userId) {
          u.userId = docSnap.id;
        }
        allUsers.push(u);
      });
      console.log("ALL FETCHED USERS FROM DB (TARGET):", allUsers);

      const isSuperAdminUser = (user: SaaSUser) => (user.role || '').trim().toLowerCase() === 'super_admin';
      let totalSuperAdminsInSystem = allUsers.filter(isSuperAdminUser).length;

      // Filter users with the target email
      const targetUsers = allUsers.filter(u => (u.email || '').trim().toLowerCase() === targetEmail);

      console.log(`[Target Clean] Found ${targetUsers.length} users with email ${targetEmail}`);
      targetUsers.forEach(u => {
        console.log(`[Target Clean] ID: ${u.userId || u.id}, Name: ${u.fullName}, Role: ${u.role}, Status: ${u.status}, CreatedAt: ${u.createdAt}`);
      });

      console.log("DUPLICATES FOUND:", targetUsers);

      if (targetUsers.length <= 1) {
        toast.info(`لا توجد حسابات مكررة للبريد ${targetEmail}.`);
        setLoading(false);
        return;
      }

      // Sort with priority:
      // 1- active + isVerified
      // 2- oldest createdAt (earliest chronological timestamp)
      // 3- first record
      const isUserActiveAndVerified = (u: SaaSUser) => {
        const isAct = u.status === 'active' || u.isActive === true || (u.status as string) === 'verified';
        const isVer = !!u.verifiedAt || !!(u as any).isVerified || (u.status as string) === 'verified';
        return isAct && isVer;
      };

      const sorted = [...targetUsers].sort((a, b) => {
        const actVerA = isUserActiveAndVerified(a) ? 1 : 0;
        const actVerB = isUserActiveAndVerified(b) ? 1 : 0;
        if (actVerA !== actVerB) {
          return actVerB - actVerA;
        }

        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA > 0 && timeB > 0) {
          if (timeA !== timeB) {
            return timeA - timeB; // Oldest first
          }
        } else if (timeA > 0) {
          return -1;
        } else if (timeB > 0) {
          return 1;
        }

        const idA = a.userId || a.id || '';
        const idB = b.userId || b.id || '';
        return idA.localeCompare(idB);
      });

      const keptUser = sorted[0];
      const toDeleteList = sorted.slice(1);
      const deletedIds: string[] = [];

      console.log("KEEPING BEST MATCH:", keptUser.userId || keptUser.id, keptUser.email, keptUser.role);

      for (const userToDelete of toDeleteList) {
        const docId = userToDelete.userId || userToDelete.id;
        if (!docId) continue;

        // Prevent deleting super_admin only if there is only 1 super admin left in the ENTIRE system database
        if (isSuperAdminUser(userToDelete) && totalSuperAdminsInSystem <= 1) {
          console.log("BLOCKED:", docId, "Reason: last super admin in system database");
          continue;
        }

        if (isSuperAdminUser(userToDelete)) {
          totalSuperAdminsInSystem--;
        }

        console.log("DELETING:", docId, userToDelete.email, userToDelete.role);
        await deleteDoc(doc(db, 'appUsers', docId));
        deletedIds.push(docId);
      }

      // Update state immediately
      if (deletedIds.length > 0) {
        setUsers(prev => prev.filter(u => {
          const uId = u.userId || u.id;
          return !uId || !deletedIds.includes(uId);
        }));
      }

      toast.success(`تم حذف ${deletedIds.length} حساب مكرر للبريد الإلكتروني ${targetEmail}`);
      fetchUsers();
    } catch (e: any) {
      console.error('Error during targeted email cleanup:', e);
      toast.error('فشل تصفية مكررات البريد: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    console.log("CLEANUP BUTTON CLICKED");
    console.log("ALL USERS:", users);
    if (!window.confirm('هل أنت متأكد من تفعيل أداة تنظيف الحسابات المكررة؟ سيتم تجميع الحسابات حسب البريد والهاتف والاحتفاظ بالخيار الأفضل تلقائيًا مع حذف كل الحسابات المكررة الأخرى نهائياً، حتى وإن كانت رتبة مسؤولين (super_admin). ويتم الإبقاء على حساب واحد فقط لكل مجموعة.')) {
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, 'appUsers');
      const snap = await getDocs(usersRef);
      const allUsers: SaaSUser[] = [];
      snap.forEach((docSnap) => {
        const u = docSnap.data() as SaaSUser;
        if (!u.userId) {
          u.userId = docSnap.id;
        }
        allUsers.push(u);
      });
      console.log("ALL FETCHED USERS FROM DB:", allUsers);

      const totalChecked = allUsers.length;
      const reportDetails: string[] = [];

      const isSuperAdminUser = (user: SaaSUser) => (user.role || '').trim().toLowerCase() === 'super_admin';
      let totalSuperAdminsInSystem = allUsers.filter(isSuperAdminUser).length;

      const isUserActiveAndVerified = (u: SaaSUser) => {
        const isAct = u.status === 'active' || u.isActive === true || (u.status as string) === 'verified';
        const isVer = !!u.verifiedAt || !!(u as any).isVerified || (u.status as string) === 'verified';
        return isAct && isVer;
      };

      const sortKeepBestFirstInGroup = (a: SaaSUser, b: SaaSUser) => {
        // 1- احتفظ بالحساب active + isVerified
        const actVerA = isUserActiveAndVerified(a) ? 1 : 0;
        const actVerB = isUserActiveAndVerified(b) ? 1 : 0;
        if (actVerA !== actVerB) {
          return actVerB - actVerA;
        }

        // 2- إذا لا يوجد، احتفظ بالأقدم createdAt (oldest first)
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA > 0 && timeB > 0) {
          if (timeA !== timeB) {
            return timeA - timeB; // Oldest first
          }
        } else if (timeA > 0) {
          return -1;
        } else if (timeB > 0) {
          return 1;
        }

        // 3- إذا لا يوجد createdAt، احتفظ بأول حساب فقط (by ID comparison)
        const idA = a.userId || a.id || '';
        const idB = b.userId || b.id || '';
        return idA.localeCompare(idB);
      };

      // Identify duplicate groups (sharing either email or phone)
      const groups: SaaSUser[][] = [];
      const visited = new Set<string>();

      allUsers.forEach(u => {
        const uId = u.userId || u.id;
        if (!uId || visited.has(uId)) return;

        const currentGroup: SaaSUser[] = [];
        const queue: SaaSUser[] = [u];
        visited.add(uId);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          currentGroup.push(curr);

          const emailKey = (curr.email || '').trim().toLowerCase();
          const phoneKey = (curr.phone || '').trim();

          allUsers.forEach(other => {
            const oId = other.userId || other.id;
            if (!oId || visited.has(oId)) return;

            const otherEmailKey = (other.email || '').trim().toLowerCase();
            const otherPhoneKey = (other.phone || '').trim();

            const matchEmail = emailKey && otherEmailKey && emailKey === otherEmailKey;
            const matchPhone = phoneKey && otherPhoneKey && phoneKey === otherPhoneKey;

            if (matchEmail || matchPhone) {
              visited.add(oId);
              queue.push(other);
            }
          });
        }

        groups.push(currentGroup);
      });

      const duplicateGroups = groups.filter(g => g.length > 1);
      console.log("DUPLICATES FOUND:", duplicateGroups);

      let totalDeleted = 0;
      let skippedProtectedCount = 0;
      const keptList: string[] = [];
      const deletedIds: string[] = [];

      for (const group of duplicateGroups) {
        const sorted = [...group].sort(sortKeepBestFirstInGroup);
        const keptUser = sorted[0];

        const label = keptUser.email || keptUser.phone || keptUser.fullName || 'حساب مكرر';
        if (!keptList.includes(label)) {
          keptList.push(label);
        }

        console.log("KEEPING BEST MATCH:", keptUser.userId || keptUser.id, keptUser.email, keptUser.role);
        reportDetails.push(`تم الإبقاء على: ${keptUser.fullName} (${keptUser.email || keptUser.phone})`);

        const toDeleteList = sorted.slice(1);
        for (const userToDelete of toDeleteList) {
          const docId = userToDelete.userId || userToDelete.id;
          if (!docId) continue;

          // If we are deleting a super admin, check if it's the absolute last in the system database
          if (isSuperAdminUser(userToDelete) && totalSuperAdminsInSystem <= 1) {
            skippedProtectedCount++;
            reportDetails.push(`تم تخطي وحماية: ${userToDelete.fullName || 'مسؤول'} (${userToDelete.email || userToDelete.phone}) - حساب المسؤول الأخير وحارس النظام`);
            console.log("BLOCKED:", docId, "Reason: last super admin in system database");
            continue;
          }

          if (isSuperAdminUser(userToDelete)) {
            totalSuperAdminsInSystem--;
          }

          console.log("DELETING:", docId, userToDelete.email, userToDelete.role);
          await deleteDoc(doc(db, 'appUsers', docId));
          deletedIds.push(docId);
          totalDeleted++;
          reportDetails.push(`تم حذف: ${userToDelete.fullName || 'حساب مكرر'} (${userToDelete.email || userToDelete.phone || 'بدون معلومات'})`);
        }
      }

      // Update state immediately
      if (deletedIds.length > 0) {
        setUsers(prev => prev.filter(u => {
          const uId = u.userId || u.id;
          return !uId || !deletedIds.includes(uId);
        }));
      }

      setCleanupReport({
        scannedCount: totalChecked,
        duplicatesCount: duplicateGroups.length,
        deletedCount: totalDeleted,
        disabledCount: 0,
        skippedProtectedCount: skippedProtectedCount,
        details: reportDetails,
        keptList: keptList
      } as any);

      toast.success('اكتمل تنظيف الحسابات المكررة وحذفها بنجاح!');
      fetchUsers();
    } catch (e: any) {
      console.error('Error cleaning duplicate accounts:', e);
      toast.error('لم نتمكن من إكمال أداة التنظيف: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRepairBrokenAccounts = async () => {
    if (!window.confirm('هل أنت متأكد من تشغيل أداة "إصلاح الحسابات المعطوبة"؟ سيقوم هذا الإجراء بفحص جميع حسابات super_admin المكررة بنفس البريد أو الهاتف، والاحتفاظ بحساب نشط/أقدم واحد كمسؤول رئيسي، وتحويل الحسابات المكررة الأخرى إلى باقة مستخدم عادي (customer) لتتمكن من تنظيفها أو حذفها.')) {
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, 'appUsers');
      const snap = await getDocs(usersRef);
      const allUsers: SaaSUser[] = [];
      snap.forEach((docSnap) => {
        allUsers.push(docSnap.data() as SaaSUser);
      });

      // Group accounts by email
      const emailGroups: { [key: string]: SaaSUser[] } = {};
      const phoneGroups: { [key: string]: SaaSUser[] } = {};

      allUsers.forEach(u => {
        const emailKey = (u.email || '').trim().toLowerCase();
        const phoneKey = (u.phone || '').trim();

        if (emailKey) {
          if (!emailGroups[emailKey]) emailGroups[emailKey] = [];
          emailGroups[emailKey].push(u);
        }
        if (phoneKey) {
          if (!phoneGroups[phoneKey]) phoneGroups[phoneKey] = [];
          phoneGroups[phoneKey].push(u);
        }
      });

      // For comparison of super_admin priority:
      const sortSuperAdminPriority = (a: SaaSUser, b: SaaSUser) => {
        const aActive = (a.status === 'active' || (a.status as string) === 'verified' || !!a.verifiedAt || !!(a as any).isVerified) ? 1 : 0;
        const bActive = (b.status === 'active' || (b.status as string) === 'verified' || !!b.verifiedAt || !!(b as any).isVerified) ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;

        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime; // Oldest first
      };

      let fixedCount = 0;
      const repairedDetails: string[] = [];

      // Pass over email groups
      for (const email of Object.keys(emailGroups)) {
        const group = emailGroups[email];
        // Filter super_admins in this email group
        const superAdminsInGroup = group.filter(u => u.role === 'super_admin');
        if (superAdminsInGroup.length > 1) {
          // Sort to find the single best super_admin account to keep
          superAdminsInGroup.sort(sortSuperAdminPriority);
          const bestPrimary = superAdminsInGroup[0];

          // Make sure the primary has isProtected: true
          if (!bestPrimary.isProtected) {
            await updateDoc(doc(db, 'appUsers', bestPrimary.userId), {
              isProtected: true,
              updatedAt: new Date().toISOString()
            });
            repairedDetails.push(`تأكيد حماية حساب المسؤول الرئيسي: ${bestPrimary.fullName} (${bestPrimary.email})`);
          }

          // Convert all other super_admins to customer and isProtected: false
          for (let i = 1; i < superAdminsInGroup.length; i++) {
            const secondary = superAdminsInGroup[i];
            await updateDoc(doc(db, 'appUsers', secondary.userId), {
              role: 'customer',
              isProtected: false,
              updatedAt: new Date().toISOString()
            });
            fixedCount++;
            repairedDetails.push(`تم تحويل النسخة المكررة لـ (${secondary.fullName}) من super_admin إلى customer لتمكين تنظيفها.`);
          }
        } else if (superAdminsInGroup.length === 1) {
          // If there is exactly one super_admin, make sure it is marked protected
          const singleAdmin = superAdminsInGroup[0];
          if (!singleAdmin.isProtected) {
            await updateDoc(doc(db, 'appUsers', singleAdmin.userId), {
              isProtected: true,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      // Pass over phone groups (in case they have distinct emails but same phone)
      for (const phone of Object.keys(phoneGroups)) {
        const group = phoneGroups[phone];
        const superAdminsInGroup = group.filter(u => u.role === 'super_admin');
        if (superAdminsInGroup.length > 1) {
          superAdminsInGroup.sort(sortSuperAdminPriority);
          const bestPrimary = superAdminsInGroup[0];

          if (!bestPrimary.isProtected) {
            await updateDoc(doc(db, 'appUsers', bestPrimary.userId), {
              isProtected: true,
              updatedAt: new Date().toISOString()
            });
          }

          for (let i = 1; i < superAdminsInGroup.length; i++) {
            const secondary = superAdminsInGroup[i];
            // Only update if not already converted in the email pass
            const freshDoc = await getDocs(query(collection(db, 'appUsers'), where('userId', '==', secondary.userId)));
            if (!freshDoc.empty && freshDoc.docs[0].data().role === 'super_admin') {
              await updateDoc(doc(db, 'appUsers', secondary.userId), {
                role: 'customer',
                isProtected: false,
                updatedAt: new Date().toISOString()
              });
              fixedCount++;
              repairedDetails.push(`تم تحويل مكرر هاتف لـ (${secondary.fullName}) من super_admin إلى customer لتمكين التطهير.`);
            }
          }
        }
      }

      toast.success(`اكتملت عملية إصلاح الحسابات المعطوبة بنجاح! تم تحويل ${fixedCount} حسابات مكررة إلى رتبة مستخدم لتسهيل إدارتها.`);
      
      // Trigger the report modal
      setCleanupReport({
        scannedCount: allUsers.length,
        duplicatesCount: fixedCount,
        deletedCount: 0,
        disabledCount: fixedCount,
        skippedProtectedCount: allUsers.filter(u => u.role === 'super_admin').length - fixedCount,
        details: repairedDetails.length > 0 ? repairedDetails : ['لم يتم العثور على أي حسابات معطوبة أو أدمن مكررين حاليًا. جميع الحسابات تتبع البنية الصحيحة.']
      });

      fetchUsers();
    } catch (e: any) {
      console.error('Migration failed:', e);
      toast.error('لم نتمكن من إصلاح البيانات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Load all users from firestore
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'appUsers');
      const snap = await getDocs(usersRef);
      const loaded: SaaSUser[] = [];
      snap.forEach((doc) => {
        const u = doc.data() as SaaSUser;
        if (!u.userId) {
          u.userId = doc.id;
        }
        loaded.push(u);
      });
      // Sort users by latest first
      loaded.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      setUsers(loaded);
    } catch (err) {
      console.error('Failed to load SaaS users from Firestore:', err);
      toast.error('فشل في جلب قائمة المستخدمين والتراخيص من السيرفر الرئيسي');
    } finally {
      setLoading(false);
    }
  };

  const fetchKeys = async () => {
    setLoadingKeys(true);
    try {
      const snap = await getDocs(collection(db, 'activationCodes'));
      const loaded: any[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        let formattedDate = d.createdAt;
        if (d.createdAt && typeof d.createdAt.toDate === 'function') {
          formattedDate = d.createdAt.toDate().toISOString();
        } else if (d.createdAt && d.createdAt.seconds) {
          formattedDate = new Date(d.createdAt.seconds * 1000).toISOString();
        }
        loaded.push({
          id: docSnap.id,
          ...d,
          createdAt: formattedDate || new Date().toISOString()
        });
      });
      // Sort keys latest first
      loaded.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
      setKeys(loaded);
    } catch (err) {
      console.error('Failed to load Activation keys from Firestore:', err);
      toast.error('فشل في جلب مفاتيح الترخيص مسبقة الدفع');
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchKeys();
    fetchLicenses();
  }, []);

  const handleGenerateLicenseCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const prefix = 'LIC';
      const randPart1 = Math.random().toString(36).substring(2, 8).toUpperCase();
      const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const generatedCode = `${prefix}-${randPart1}-${randPart2}`;

      const keyId = doc(collection(db, 'activationCodes')).id;

      let dev = genMaxDevices;
      let br = genBranchesCount;
      if (genPlanType === 'advanced') {
        dev = 10;
        br = 5;
      } else if (genPlanType === 'lifetime') {
        dev = 99;
        br = 15;
      }

      await setDoc(doc(db, 'activationCodes', keyId), {
        id: keyId,
        code: generatedCode,
        planType: genPlanType,
        maxDevices: dev,
        branchesCount: br,
        activationStatus: 'active',
        isUsed: false,
        createdAt: new Date(),
        assignedEmail: ''
      });

      toast.success(`تم إنشاء كود الترخيص (${generatedCode}) بنجاح!`);
      setIsGenModalOpen(false);
      fetchKeys();
    } catch (err: any) {
      console.error('Error generating activation code:', err);
      toast.error('حدث خطأ أثناء حفظ كود الترخيص: ' + err.message);
    }
  };

  const handleDeleteLicenseKey = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف مفتاح الترخيص مسبق الدفع هذا؟ لن يتمكن المستخدمون المتطابقون من استخدامه.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'activationCodes', id));
      toast.success('تم حذف مفتاح الترخيص بنجاح من قاعدة البيانات.');
      fetchKeys();
    } catch (err: any) {
      console.error('Failed to delete activation code:', err);
      toast.error('فشل في حذف كود الترخيص: ' + err.message);
    }
  };

  const handleToggleLicenseKeyStatus = async (keyObj: any, newStatus: 'active' | 'blocked' | 'expired') => {
    try {
      await updateDoc(doc(db, 'activationCodes', keyObj.id), {
        activationStatus: newStatus,
        updatedAt: new Date()
      });
      toast.success(`تم تحديث حالة الكود إلى ${newStatus === 'active' ? 'نشط' : newStatus === 'blocked' ? 'محظور' : 'منتهي الصلاحية'}`);
      fetchKeys();
    } catch (err: any) {
      toast.error('فشل تحديث حالة الترخيص: ' + err.message);
    }
  };

  // Filtered users search logic
  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      (u.fullName || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.phone || '').includes(term) ||
      (u.licenseCode || '').toLowerCase().includes(term);
    
    const matchPlan = selectedPlanFilter === 'all' || u.planType === selectedPlanFilter;
    return matchSearch && matchPlan;
  });

  // Calculate high-fidelity metrics
  const totalUsersCount = users.length;
  const verifiedUsersCount = users.filter(u => u.status === 'verified').length;
  const basicCount = users.filter(u => u.planType === 'basic').length;
  const advancedCount = users.filter(u => u.planType === 'advanced').length;
  const lifetimeCount = users.filter(u => u.planType === 'lifetime').length;

  // Handle updates in Firestore
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const userDocRef = doc(db, 'appUsers', selectedUser.userId);
      
      const payload: Partial<SaaSUser> = {
        fullName: selectedUser.fullName,
        phone: selectedUser.phone,
        role: selectedUser.role,
        isActive: selectedUser.isActive,
        planType: selectedUser.planType,
        maxDevices: Number(selectedUser.maxDevices),
        branchesCount: Number(selectedUser.branchesCount),
        licenseCode: selectedUser.licenseCode,
        activationStatus: selectedUser.activationStatus,
        updatedAt: new Date().toISOString(),
        customerName: selectedUser.fullName,
        customerPhone: selectedUser.phone,
        customerEmail: selectedUser.email,
        activatedAt: selectedUser.activatedAt || new Date().toISOString()
      };

      // Instantly update local users state for interactive preview responsiveness
      setUsers(prevUsers => prevUsers.map(u => {
        if ((u.userId || u.id) === selectedUser.userId) {
          const updated = {
            ...u,
            ...payload
          };
          console.log("ADMIN_UPDATED_USER_STATUS", { userId: selectedUser.userId, newStatus: selectedUser.activationStatus, user: updated });
          return updated;
        }
        return u;
      }));

      await updateDoc(userDocRef, payload);
      toast.success('تم حفظ التعديلات وتحديث ترخيص المستخدم بنجاح على قاعدة البيانات السحابية.');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error('Update user failed:', err);
      toast.error('حدث خطأ أثناء حفظ التعديلات: ' + err.message);
    }
  };

  // Create a user manually
  const handleCreateUserManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim() || !newPhone.trim() || !newPassword) {
      toast.error('يرجى تعبئة كافة الحقول لإنشاء الحساب');
      return;
    }

    try {
      // Check duplicate
      const emailLower = newEmail.trim().toLowerCase();
      const phoneClean = newPhone.trim();
      const duplicate = users.find(u => u.email === emailLower || u.phone === phoneClean);
      if (duplicate) {
        toast.error('البريد الإلكتروني أو الهاتف مسجل مسبقاً لمستخدم آخر');
        return;
      }

      const generatedId = 'u_' + Math.random().toString(36).substr(2, 9);
      const hashedPass = await hashPassword(newPassword);

      // Define default limits based on selected plan
      let maxDevices = 2;
      let branchesCount = 1;
      if (newPlanType === 'advanced') {
        maxDevices = 10;
        branchesCount = 5;
      } else if (newPlanType === 'lifetime') {
        maxDevices = 99;
        branchesCount = 15;
      }

      const newUser: SaaSUser = {
        userId: generatedId,
        id: generatedId,
        fullName: newFullName.trim(),
        email: emailLower,
        phone: phoneClean,
        passwordHash: hashedPass,
        isActive: true,
        status: 'active', // Pre-verified via Admin manual onboarding
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: '',
        licenseCode: 'LIC-' + Math.random().toString(36).substring(2, 11).toUpperCase(),
        activationStatus: 'active',
        planType: newPlanType,
        maxDevices,
        branchesCount,
        role: newRole,
        activatedAt: new Date().toISOString(),
        customerName: newFullName.trim(),
        customerPhone: phoneClean,
        customerEmail: emailLower
      };

      await setDoc(doc(db, 'appUsers', newUser.userId), newUser);
      toast.success('تم تفعيل وترخيص الحساب الجديد ورفعه على السحاب بنجاح.');
      
      // Reset form
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user manually:', err);
      toast.error('فشل تفعيل الحساب: ' + err.message);
    }
  };

  // Generate random new license key
  const generateLicenseKey = () => {
    if (selectedUser) {
      const randKey = 'LIC-' + Math.random().toString(36).substring(2, 11).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setSelectedUser({ ...selectedUser, licenseCode: randKey });
      toast.info('تم توليد مفتاح ترخيص جهاز جديد. احفظ التعديلات للتثبيت.');
    }
  };

  return (
    <div className="space-y-6 pt-2 pb-14" dir="rtl">
      {/* Central Header */}
      <div className="bg-gradient-to-r from-purple-900/40 via-primary/5 to-background border border-border p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 blur-3xl -ml-16 -mt-16 animate-pulse" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 text-[10px] bg-red-500/15 text-red-500 rounded-lg font-black tracking-tight animate-pulse flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> لوحة المشرف العام (SaaS Master)
              </span>
              <span className="text-xs text-muted-foreground">• مركزي ومؤمن تلقائياً</span>
            </div>
            <h2 className="text-2xl font-black text-foreground">إدارة العملاء وتراخيص الصيدليات السحابية</h2>
            <p className="text-muted-foreground text-xs font-medium">
              التحكم في الباقات التجارية وقنوات التفعيل وحالة اتصال الأجهزة والفروع لجميع الصيدليات المسجلة.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button 
              onClick={handleRepairBrokenAccounts}
              className="px-4 h-11 bg-amber-500/10 hover:bg-amber-500/15 text-amber-600 border border-amber-500/20 rounded-xl text-xs font-black transition-all flex items-center gap-2"
              title="إصلاح الصلاحيات المتكررة للمسؤولين وحماية حساب المالك الرئيسي وحل مشاكل الحسابات المعطوبة"
            >
              <Wrench className="h-4 w-4 text-amber-600" />
              إصلاح الحسابات المعطوبة
            </button>
            <button 
              onClick={handleCleanupDuplicates}
              className="px-4 h-11 bg-red-500/10 hover:bg-red-500/15 text-red-600 border border-red-500/20 rounded-xl text-xs font-black transition-all flex items-center gap-2"
              title="تجميع الحسابات حسب البريد والهاتف والابقاء على حساب نشط وحيد وحذف الباقي فورياً"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
              تنظيف الحسابات المكررة
            </button>
            <button 
              onClick={handleDeleteTargetEmailDuplicates}
              className="px-4 h-11 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-600 border border-indigo-500/20 rounded-xl text-xs font-black transition-all flex items-center gap-2"
              title="تحديداً حذف حسابات البريد الإلكتروني المكررة للمشرف العام"
            >
              <UserCheck className="h-4 w-4 text-indigo-600" />
              حذف مكررات هذا البريد
            </button>
            <button 
              onClick={fetchUsers}
              className="px-4 h-11 bg-muted/40 text-foreground border border-border rounded-xl hover:bg-muted text-xs font-bold transition-all flex items-center gap-2"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث البيانات
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-primary/15"
            >
              <Plus className="h-4.5 w-4.5" />
              تفعيل حساب تجاري مباشر
            </button>
            {activeTab === 'licenses' && (
              <button 
                onClick={() => setIsCreateLicenseModalOpen(true)}
                className="px-4 h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-violet-600/15"
              >
                <Plus className="h-4.5 w-4.5" />
                توليد ترخيص ذكي جديد
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 border-b-2 text-sm font-black transition-all ${activeTab === 'users' ? 'border-primary text-primary font-boldScale' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>إدارة صيدليات المشتركين ({users.length})</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('keys');
            fetchKeys();
          }}
          className={`px-5 py-3 border-b-2 text-sm font-black transition-all ${activeTab === 'keys' ? 'border-primary text-primary font-boldScale' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span>توليد ومخزن مفاتيح التفعيل المسبقة ({keys.length})</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('licenses');
            fetchLicenses();
          }}
          className={`px-5 py-3 border-b-2 text-sm font-black transition-all ${activeTab === 'licenses' ? 'border-primary text-primary font-boldScale' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-yellow-500" />
            <span>محرك ومدرّج التراخيص الفعالة ({licenses.length})</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('tools');
          }}
          className={`px-5 py-3 border-b-2 text-sm font-black transition-all ${activeTab === 'tools' ? 'border-primary text-primary font-boldScale' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2 border-r border-border/80 pr-4">
            <Wrench className="h-4 w-4 text-amber-500 font-bold" />
            <span>أدوات الصيانة وترحيل البيانات</span>
          </div>
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Central Bento Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Registered */}
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold block">إجمالي رخص الصيدليات</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{totalUsersCount}</span>
                <span className="text-[10px] text-muted-foreground">صيدليات</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-none pt-1">مسجلين في السحابة</p>
            </div>

            {/* Verified Count */}
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-emerald-500 font-semibold block">الحسابات المفعّلة</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-500">{verifiedUsersCount}</span>
                <span className="text-[10px] text-muted-foreground">نشط</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-none pt-1">أكملوا التحقق عبر OTP</p>
            </div>

            {/* Basic plan Users */}
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-primary font-semibold block">الباقة الأساسية</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-primary">{basicCount}</span>
                <span className="text-[10px] text-muted-foreground">حسابات</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-none pt-1">جهازين / فرع واحد</p>
            </div>

            {/* Advanced plan Users */}
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-indigo-500 font-semibold block">الباقة المتقدمة</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-500">{advancedCount}</span>
                <span className="text-[10px] text-muted-foreground">مجموعات</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-none pt-1">10 أجهزة / 5 فروع</p>
            </div>

            {/* Lifetime Users */}
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-amber-500 font-semibold block">باقة مدى الحياة</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-500">{lifetimeCount}</span>
                <span className="text-[10px] text-muted-foreground">مستمر</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-none pt-1">ترخيص دائم للأبد</p>
            </div>
          </div>

          {/* Database Search & Actions */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="ابحث باسم المشترك، البريد، الهاتف، أو مفتاح الترخيص..."
                  className="w-full h-10 pr-9 bg-background text-xs border border-border rounded-xl focus:border-primary focus:outline-none placeholder:text-muted-foreground/60 text-foreground"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-center justify-end">
                <select 
                  value={selectedPlanFilter}
                  onChange={e => setSelectedPlanFilter(e.target.value)}
                  className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none"
                >
                  <option value="all">كل مستويات الرخص التفعيلية</option>
                  <option value="basic">الباقة الأساسية</option>
                  <option value="advanced">الباقة المتقدمة</option>
                  <option value="lifetime">باقة مدى الحياة</option>
                </select>
              </div>
            </div>

            {/* Database List */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-24 text-center space-y-3">
                  <RotateCw className="h-8 w-8 text-primary animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">جاري جلب بيانات التراخيص من السفر السحابي لـ Firebase...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-24 text-center text-muted-foreground space-y-2">
                  <Users className="h-10 w-10 text-muted-foreground opacity-30 mx-auto" />
                  <p className="text-sm font-bold">لا يوجد مستخدمون يطابقون خيارات البحث.</p>
                  <p className="text-xs">تحقق من كتابة الاسم أو الإيميل بشكل صحيح.</p>
                </div>
              ) : (
                <table className="w-full text-right divide-y divide-border text-xs table-auto">
                  <thead className="bg-muted/40 font-bold text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">الاسم / الصيدلية</th>
                      <th className="px-5 py-3.5">الاتصال والتفعيل</th>
                      <th className="px-5 py-3.5">الباقة المعتمدة</th>
                      <th className="px-5 py-3.5">مفتاح الترخيص (License Key)</th>
                      <th className="px-5 py-3.5">الصلاحيات المسموحة</th>
                      <th className="px-5 py-3.5 text-left">أدوات إدارية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((u) => (
                      <tr key={u.userId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-black text-foreground text-sm">{u.fullName || 'بدون اسم'}</div>
                          <div className="text-muted-foreground font-mono text-[10px] break-all max-w-[180px] lg:max-w-none">{u.email}</div>
                        </td>
                        <td className="px-5 py-4 space-y-1">
                          <div className="flex flex-col gap-1 items-start max-w-[120px]">
                            {u.status === 'active' || u.status === 'verified' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-black">
                                <CheckCircle className="w-3 h-3" /> نشط
                              </span>
                            ) : u.status === 'disabled' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-[10px] font-black">
                                <X className="w-3 h-3" /> معطل
                              </span>
                            ) : u.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-black">
                                <Clock className="w-3 h-3" /> قيد التحقق
                              </span>
                            ) : u.status === 'expired' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-500/10 text-zinc-500 text-[10px] font-black">
                                <Clock className="w-3 h-3" /> منتهي
                              </span>
                            ) : u.status === 'deleted' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-950/20 text-red-700 text-[10px] font-black">
                                <X className="w-3 h-3" /> محذوف
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-500/10 text-gray-500 text-[10px] font-black">
                                {u.status || 'مجهول'}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-muted-foreground mt-1">
                            رقم الهاتف: <span className="font-mono">{u.phone || 'غير مدخل'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 space-y-1">
                          <div>
                            {u.planType === 'basic' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-primary/15 text-primary">الباقة الأساسية</span>
                            )}
                            {u.planType === 'advanced' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500">الباقة المتقدمة</span>
                            )}
                            {u.planType === 'lifetime' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/15 text-amber-500">مدى الحياة ✨</span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium">
                            نوع الدفع: <span className="font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] font-black">شراء لمرة واحدة</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs font-black text-primary p-1 bg-primary/5 rounded border border-primary/10 inline-block text-right select-all">
                            {u.licenseCode || 'لا يوجد ترخيص معتمد'}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            حالة التفعيل: {u.activationStatus === 'active' ? (
                              <span className="text-emerald-500 font-bold">نشط ومقبول</span>
                            ) : u.activationStatus === 'blocked' ? (
                              <span className="text-red-500 font-bold">محظور ومستبعد</span>
                            ) : (
                              <span className="text-amber-500 font-bold">منتهي الصلاحية</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 space-y-1 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Laptop className="h-3 w-3 text-muted-foreground" />
                            <span>الأجهزة المتاحة: <span className="font-bold text-foreground">{u.maxDevices || 2}</span></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span>الفروع المسموحة: <span className="font-bold text-foreground">{u.branchesCount || 1}</span></span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            صلاحية الحساب: <span className="font-black text-foreground">
                              {u.role === 'super_admin' ? 'المدير العام الرئيسي (Super Admin)' : u.role === 'admin' ? 'مطور المسؤول العام' : u.role === 'customer' ? 'العميل العادي (Customer)' : u.role === 'manager' ? 'مدير الصيدلية' : 'مساعد كاشير'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5 justify-end max-w-[280px]">
                            {/* View Details */}
                            <button 
                              onClick={() => {
                                setSelectedUser({ ...u });
                                setIsDetailsModalOpen(true);
                              }}
                              className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/15 text-sky-600 border border-sky-500/20 rounded-md font-bold text-[10px] transition-all"
                              title="عرض التفاصيل الكاملة"
                            >
                              عرض التفاصيل
                            </button>

                            {/* Resend OTP */}
                            {u.status === 'pending' && (
                              <button 
                                onClick={() => handleAdminResendOTP(u.email)}
                                className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/15 text-purple-600 border border-purple-500/20 rounded-md font-bold text-[10px] transition-all"
                              >
                                إعادة إرسال OTP
                              </button>
                            )}

                            {/* Disable / Deactivate Account */}
                            {(u.status === 'active' || u.status === 'verified' || u.isActive) ? (
                              <button 
                                onClick={() => handleAdminSetStatus(u.userId, 'disabled')}
                                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/15 text-red-600 border border-red-500/20 rounded-md font-bold text-[10px] transition-all"
                              >
                                تعطيل الحساب
                              </button>
                            ) : (
                              u.status === 'disabled' && (
                                <button 
                                  onClick={() => handleAdminSetStatus(u.userId, 'active')}
                                  className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 rounded-md font-bold text-[10px] transition-all"
                                >
                                  إعادة تفعيل
                                </button>
                              )
                            )}

                            {/* Edit / License Management */}
                            <button 
                              onClick={() => {
                                setSelectedUser({ ...u });
                                setIsEditModalOpen(true);
                              }}
                              className="px-2 py-1 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-md font-bold text-[10px] transition-all"
                            >
                              إدارة الترخيص
                            </button>

                            {/* Delete trial account */}
                            <button 
                              onClick={() => handleAdminDeleteAccount(u)}
                              className="px-2 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-700 border border-red-600/20 rounded-md font-bold text-[10px] transition-all"
                              title="حذف تجريبي نهائياً من قاعدة البيانات"
                            >
                              حذف تجريبي
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : activeTab === 'keys' ? (
        <div className="space-y-6">
          {/* Key Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold block">إجمالي مفاتيح التراخيص</span>
              <div className="text-2xl font-black text-foreground">{keys.length}</div>
              <p className="text-[9px] text-muted-foreground pt-1">المولدة في النظام</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-emerald-500 font-semibold block">مفاتيح تفعيل مستخدمة</span>
              <div className="text-2xl font-black text-emerald-500">{keys.filter(k => k.isUsed).length}</div>
              <p className="text-[9px] text-muted-foreground pt-1 text-emerald-600">تم تفعيلها على أجهزة</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-amber-500 font-semibold block">مفاتيح جاهزة للبيع والتسليم</span>
              <div className="text-2xl font-black text-amber-500">{keys.filter(k => !k.isUsed && k.activationStatus !== 'blocked').length}</div>
              <p className="text-[9px] text-muted-foreground pt-1">بانتظار التحصيل اليدوي</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-red-500 font-semibold block">مفاتيح معطلة أو محظورة</span>
              <div className="text-2xl font-black text-red-500">{keys.filter(k => k.activationStatus === 'blocked').length}</div>
              <p className="text-[9px] text-muted-foreground pt-1">ممنوعة من التنشيط</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-black text-foreground">مولد الترخيص مسبق الدفع (Key Generator)</h3>
                <p className="text-[11px] text-muted-foreground">قم بتوليد كود تفعيل بميزات مخصصة لتقديمه للعميل بعد التحصيل المالي اليدوي.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGenModalOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-primary/10"
              >
                <Plus className="h-4 w-4" />
                توليد كود تفعيل جديد
              </button>
            </div>
          </div>

          {/* Database Keys List */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 bg-muted/30 border-b border-border font-bold text-xs text-foreground">
              مخزن مفاتيح التراخيص المسبقة الدفع
            </div>
            <div className="overflow-x-auto">
              {loadingKeys ? (
                <div className="py-24 text-center space-y-3">
                  <RotateCw className="h-8 w-8 text-primary animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">جاري جلب مفاتيح التراخيص مسبقة الدفع...</p>
                </div>
              ) : keys.length === 0 ? (
                <div className="py-24 text-center text-muted-foreground space-y-2">
                  <KeyRound className="h-10 w-10 text-muted-foreground opacity-30 mx-auto" />
                  <p className="text-sm font-bold">لا يوجد مفاتيح تراخيص مسبقة في قاعدة البيانات.</p>
                  <p className="text-xs">اضغط على زر (توليد كود تفعيل جديد) بالأعلى للبدء.</p>
                </div>
              ) : (
                <table className="w-full text-right divide-y divide-border text-xs table-auto">
                  <thead className="bg-muted/40 font-bold text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">مفتاح الترخيص (License Code)</th>
                      <th className="px-5 py-3.5">باقة الترخيص ومستويات الدعم</th>
                      <th className="px-5 py-3.5">الحالة وسياق الاستخدام</th>
                      <th className="px-5 py-3.5">الحالة الأمنية وتعديلها</th>
                      <th className="px-5 py-3.5">تاريخ الإنشاء</th>
                      <th className="px-5 py-3.5 text-center">خيارات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-primary p-1 px-2 bg-primary/5 rounded border border-primary/10 select-all">
                              {k.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(k.code);
                                toast.success('تم نسخ كود التفعيل إلى الحافظة!');
                              }}
                              className="p-1 hover:bg-muted rounded text-primary hover:text-primary-foreground"
                              title="نسخ الكود"
                            >
                              <Copy className="h-3.5 w-3.5 text-primary" />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 space-y-1">
                          <div>
                            {k.planType === 'basic' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-primary/15 text-primary">الباقة الأساسية</span>
                            )}
                            {k.planType === 'advanced' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500">الباقة المتقدمة</span>
                            )}
                            {k.planType === 'lifetime' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/15 text-amber-500">مدى الحياة ✨</span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            أجهزة: <span className="font-bold text-foreground">{k.maxDevices || 2}</span> • فروع: <span className="font-bold text-foreground">{k.branchesCount || 1}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {k.isUsed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                              <CheckCircle className="w-3 h-3" /> مستعمل ({k.assignedEmail})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                              <Clock className="w-3 h-3" /> جاهز للبيع (غير مستغل)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={k.activationStatus || 'active'}
                            onChange={(e) => handleToggleLicenseKeyStatus(k, e.target.value as any)}
                            className="bg-muted border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                          >
                            <option value="active">نشط وصالح للتفعيل (Active)</option>
                            <option value="blocked">محظور ومعطل (Blocked)</option>
                            <option value="expired">منتهي الصلاحية (Expired)</option>
                          </select>
                        </td>
                        <td className="px-5 py-4 font-mono text-muted-foreground">
                          {new Date(k.createdAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteLicenseKey(k.id!)}
                            className="p-1.5 hover:bg-red-500/15 text-red-500 rounded-lg hover:text-red-600 transition-colors"
                            title="حذف الترخيص"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'licenses' ? (
        <div className="space-y-6 animate-fade-in" dir="rtl">
          {/* Licenses Bento counters */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold block">إجمالي التراخيص</span>
              <div className="text-2xl font-black text-foreground">
                {licenses.length}
              </div>
              <p className="text-[9px] text-muted-foreground pt-1">في السحابة</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-emerald-500 font-semibold block">التراخيص النشطة</span>
              <div className="text-2xl font-black text-emerald-500">
                {licenses.filter(l => l.status === 'active').length}
              </div>
              <p className="text-[9px] text-muted-foreground pt-1">نشط ومستعمل</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-yellow-500 font-semibold block">تراخيص معلّقة</span>
              <div className="text-2xl font-black text-yellow-500">
                {licenses.filter(l => l.status === 'suspended').length}
              </div>
              <p className="text-[9px] text-muted-foreground pt-1">موقوفة مؤقتاً</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-indigo-500 font-semibold block">مدى الحياة</span>
              <div className="text-2xl font-black text-indigo-500">
                {licenses.filter(l => l.planType === 'lifetime').length}
              </div>
              <p className="text-[9px] text-muted-foreground pt-1">لا تنتهي صلاحيتها</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-zinc-500 font-semibold block">التراخيص المنتهية</span>
              <div className="text-2xl font-black text-zinc-500">
                {licenses.filter(l => l.status === 'expired').length}
              </div>
              <p className="text-[9px] text-muted-foreground pt-1">تحتاج لتمديد</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden space-y-1">
              <span className="text-[10px] text-blue-500 font-semibold block">متاحة للتوزيع</span>
              <div className="text-2xl font-black text-blue-500">
                {licenses.filter(l => l.status === 'unused').length}
              </div>
              <p className="text-[9px] text-muted-foreground pt-1">بانتظار تسجيل عميل</p>
            </div>
          </div>

          {/* Licenses Search & Filters */}
          <div className="bg-card border border-border p-4 rounded-2xl space-y-3 font-sans">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث باسم العميل، البريد، الهاتف أو كود الترخيص..."
                  value={licenseSearchTerm}
                  onChange={(e) => setLicenseSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 h-11 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-right py-2 leading-none"
                />
              </div>

              {/* Filters block */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Plan filter */}
                <select
                  value={licensePlanFilter}
                  onChange={(e: any) => setLicensePlanFilter(e.target.value)}
                  className="h-11 px-3 bg-muted/65 border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none text-right"
                >
                  <option value="all">كل باقات التراخيص (All Plans)</option>
                  <option value="basic">الباقة الأساسية (جهازين)</option>
                  <option value="pro">الباقة الاحترافية Pro (10 أجهزة)</option>
                  <option value="lifetime">الباقة اللانهائية مدى الحياة</option>
                </select>

                {/* Status filter */}
                <select
                  value={licenseStatusFilter}
                  onChange={(e: any) => setLicenseStatusFilter(e.target.value)}
                  className="h-11 px-3 bg-muted/65 border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none text-right"
                >
                  <option value="all">كل حالات التراخيص (All Status)</option>
                  <option value="active">نشط (Active)</option>
                  <option value="unused">غير مستخدم (Unused)</option>
                  <option value="suspended">معلّق (Suspended)</option>
                  <option value="expired">منتهي (Expired)</option>
                  <option value="revoked">ملغى نهائياً (Revoked)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setIsCreateLicenseModalOpen(true)}
                  className="h-11 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-violet-600/15"
                >
                  <Plus className="h-4 w-4" />
                  إنشاء ترخيص عميل ذكي
                </button>
              </div>
            </div>
          </div>

          {/* Licenses Table / Cards List */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden font-sans">
            {loadingLicenses ? (
              <div className="p-12 text-center space-y-3">
                <RotateCw className="h-8 w-8 text-primary animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground font-semibold">جاري الحصول على سجل التراخيص الرقمية...</p>
              </div>
            ) : licenses.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Award className="h-12 w-12 text-muted-foreground mx-auto opacity-30 animate-pulse" />
                <p className="text-sm font-bold text-foreground">لا توجد تراخيص مسجلة بعد</p>
                <p className="text-xs text-muted-foreground">اضغط على زر إنشاء ترخيص عميل ذكي للبدء بالترخيص الفوري كمدير نظام.</p>
              </div>
            ) : (() => {
              const term = licenseSearchTerm.trim().toLowerCase();
              const filtered = licenses.filter(l => {
                // Search term
                const matchSearch = !term || 
                  (l.licenseKey || '').toLowerCase().includes(term) ||
                  (l.ownerName || '').toLowerCase().includes(term) ||
                  (l.ownerEmail || '').toLowerCase().includes(term) ||
                  (l.ownerPhone || '').includes(term);

                // Plan filter
                const matchPlan = licensePlanFilter === 'all' || l.planType === licensePlanFilter;

                // Status filter
                const matchStatus = licenseStatusFilter === 'all' || l.status === licenseStatusFilter;

                return matchSearch && matchPlan && matchStatus;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-12 text-center">
                    <p className="text-xs text-muted-foreground">لا توجد تراخيص تطابق خيارات البحث الحالية.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto text-right" dir="rtl">
                  <table className="w-full text-right border-collapse subpixel-antialiased">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                        <th className="px-5 py-3.5 text-right font-black">مفتاح الترخيص</th>
                        <th className="px-5 py-3.5 text-right font-black">نوع الباقة والحدود</th>
                        <th className="px-5 py-3.5 text-right font-black">العميل / المستفيد</th>
                        <th className="px-5 py-3.5 text-right font-black">الحالة وصلاحية التشغيل</th>
                        <th className="px-5 py-3.5 text-right font-black">تاريخ التوليد / الانتهاء</th>
                        <th className="px-5 py-3.5 text-center font-black animate-pulse">كلية الإجراءات المتاحة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {filtered.map((l) => (
                        <tr key={l.id} className="hover:bg-muted/20 transition-all">
                          {/* License key with copy */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-mono text-xs text-foreground bg-muted hover:bg-muted/80 border border-border px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold select-all">
                                {l.licenseKey}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(l.licenseKey);
                                  toast.success('تم نسخ مفتاح الترخيص بنجاح');
                                }}
                                className="p-1.5 bg-muted/60 text-muted-foreground hover:text-foreground rounded-lg border border-border transition-all"
                                title="نسخ المفتاح"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </td>

                          {/* Plan details */}
                          <td className="px-5 py-4">
                            <div>
                              {l.planType === 'basic' ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-500">الباقة الأساسية</span>
                              ) : l.planType === 'pro' ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/10 text-indigo-500">الباقة الاحترافية Pro</span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-500">مدى الحياة ✨</span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              أجهزة: <span className="text-foreground font-black">{l.maxDevices}</span> • فروع: <span className="text-foreground font-black">{l.maxBranches}</span>
                            </div>
                          </td>

                          {/* Client fields */}
                          <td className="px-5 py-4">
                            {l.ownerName ? (
                              <div className="space-y-0.5">
                                <div className="text-foreground font-black">{l.ownerName}</div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <span>{l.ownerEmail || 'بدون إيميل'}</span> • <span>{l.ownerPhone || 'بدون هاتف'}</span>
                                </div>
                                {l.ownerUserId ? (
                                  <span className="text-[9px] inline-flex items-center gap-1 px-1 bg-violet-500/10 text-violet-500 rounded font-bold">● مستخدم مقترن بالسحابة</span>
                                ) : (
                                  <span className="text-[9px] inline-flex items-center gap-1 px-1 bg-amber-500/10 text-amber-600 rounded font-bold">بانتظار الاقتران بالـ ID</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground font-medium text-[11px]">ترخيص مسبق الدفع (غير مرتبط)</span>
                            )}
                          </td>

                          {/* Status and limits */}
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5 items-start">
                              {l.status === 'active' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">نشط</span>
                              ) : l.status === 'suspended' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[10px] font-bold">معلق (موقف)</span>
                              ) : l.status === 'expired' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/15 text-red-500 text-[10px] font-bold">منتهي</span>
                              ) : l.status === 'revoked' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/20 text-rose-500 text-[10px] font-bold">ملغى</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 text-blue-500 text-[10px] font-bold">جاهز للاستخدام</span>
                              )}

                              <span className="text-[9px] text-muted-foreground">طريقة الدفع: {l.paymentStatus === 'paid' ? 'أونلاين مفعّل' : l.paymentStatus === 'pending' ? 'بانتظار التحصيل' : 'يدوي / إداري'}</span>
                            </div>
                          </td>

                          {/* Dates */}
                          <td className="px-5 py-4 text-[10px] text-muted-foreground font-mono">
                            <div>البدء: {new Date(l.createdAt).toLocaleDateString()}</div>
                            <div className="mt-1">
                              الانتهاء: {l.planType === 'lifetime' || !l.expiryDate ? (
                                <span className="text-amber-500 font-bold font-sans">غير محدود (مدى الحياة)</span>
                              ) : (
                                <span className={new Date(l.expiryDate).getTime() < Date.now() ? 'text-red-500 font-bold' : 'text-foreground'}>
                                  {new Date(l.expiryDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions column */}
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap max-w-[220px] mx-auto">
                              <button
                                onClick={() => {
                                  setSelectedLicense(l);
                                  setIsLicenseDetailModalOpen(true);
                                }}
                                className="px-2 py-1 bg-muted hover:bg-muted/80 text-foreground border border-border rounded font-bold text-[10px] transition-all animate-pulse"
                              >
                                التفاصيل واقتران العميل
                              </button>

                              {l.status === 'active' ? (
                                <button
                                  onClick={() => handleSuspendLicense(l)}
                                  className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 rounded font-bold text-[10px] transition-all"
                                >
                                  تعليق
                                </button>
                              ) : (
                                (l.status === 'suspended' || l.status === 'unused' || l.status === 'expired') && (
                                  <button
                                    onClick={() => handleActivateLicense(l)}
                                    className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 rounded font-bold text-[10px] transition-all"
                                  >
                                    تنشيط الحالة
                                  </button>
                                )
                              )}

                              {l.planType !== 'lifetime' && l.status !== 'revoked' && (
                                <button
                                  onClick={() => handleExtendLicense(l)}
                                  className="px-2 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-500 rounded font-bold text-[10px] transition-all"
                                >
                                  تمديد سنة +
                                </button>
                              )}

                              {l.status !== 'revoked' && (
                                <button
                                  onClick={() => handleRevokeLicense(l)}
                                  className="px-2 py-1 bg-red-600/15 hover:bg-red-600/25 text-red-500 rounded font-bold text-[10px] transition-all"
                                >
                                  إلغاء نهائي
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in text-right font-sans" dir="rtl">
          <div className="bg-card border border-border p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16" />
            <div className="space-y-1 relative z-10">
              <span className="px-2.5 py-1 text-[10px] bg-amber-500/15 text-amber-500 rounded-lg font-black uppercase tracking-wider flex items-center gap-1 w-fit">
                <Wrench className="w-3.5 h-3.5 animate-spin" /> مركز صيانة وترحيل البيانات السحابية
              </span>
              <h3 className="text-lg font-black text-foreground">ترحيل بيانات المستخدم التجريبي (demo-user)</h3>
              <p className="text-muted-foreground text-xs font-sans leading-relaxed max-w-2xl">
                هذه الأداة مخصصة لنقل وربط كافة الفروع، الموردين، المعاملات، الفواتير، وحسابات الديون التاريخية التابعة للحساب التجريبي <code className="font-mono text-amber-500 px-1.5 py-0.5 bg-muted rounded">demo-user</code> بالحساب السحابي الموثق والمسجل حالياً (<span className="text-primary font-bold">{currentUserId || 'غير معروف / لم يسجل'}</span>).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel Card */}
            <div className="bg-card border border-border rounded-3xl p-6 space-y-6 self-start">
              <h4 className="text-sm font-black text-foreground flex items-center gap-2 border-b border-border pb-3">
                <Database className="h-4 w-4 text-amber-500" />
                خيارات الترحيل والتحكم
              </h4>
              
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  الرجاء فحص السجلات المعلقة أولاً لمعرفة عدد المستندات المتاحة للترحيل من المستخدم التجريبي القديم.
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={migrationState.scanning || migrationState.migrating}
                    onClick={handleScanDemoData}
                    className="w-full h-11 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {migrationState.scanning ? (
                      <RotateCw className="h-4 w-4 animate-spin text-amber-500" />
                    ) : (
                      <Search className="h-4 w-4 text-amber-500" />
                    )}
                    {migrationState.scanning ? 'جاري فحص السجلات...' : 'الخطوة 1: فحص البيانات المتاحة'}
                  </button>

                  <button
                    type="button"
                    disabled={!migrationState.scanned || migrationState.migrating || migrationState.scanning || !currentUserId}
                    onClick={handleMigrateDemoData}
                    className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {migrationState.migrating ? (
                      <RotateCw className="h-4 w-4 animate-spin text-black" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-black" />
                    )}
                    {migrationState.migrating ? 'جاري الترحيل الآن...' : 'الخطوة 2: بدء الترحيل الشامل'}
                  </button>
                </div>

                {!currentUserId && (
                  <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-[11px] text-red-500 font-bold">
                    * يجب تسجيل الدخول بحساب موثق لتتمكن من ترحيل البيانات إليه.
                  </div>
                )}
              </div>
            </div>

            {/* Collections Status List Card */}
            <div className="lg:col-span-2 bg-card border border-border rounded-3xl overflow-hidden flex flex-col">
              <div className="p-4 bg-muted/30 border-b border-border flex justify-between items-center">
                <span className="text-xs font-black text-foreground">جدول الجداول السحابية والمستندات القابلة للترحيل</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-lg font-bold">حالة المزامنة</span>
              </div>

              <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto">
                {!migrationState.scanned && !migrationState.scanning ? (
                  <div className="py-24 text-center text-muted-foreground space-y-2">
                    <Database className="h-10 w-10 text-muted-foreground opacity-30 mx-auto" />
                    <p className="text-sm font-bold">يرجى فحص المستندات لاستعراض الإحصائيات</p>
                    <p className="text-xs">اضغط على زر (فحص البيانات المتاحة) على اليمين للبدء.</p>
                  </div>
                ) : (
                  collectionsToMigrate.map(col => {
                    const count = migrationState.counts[col.id] ?? 0;
                    const status = migrationState.status[col.id] || 'idle';
                    
                    return (
                      <div key={col.id} className="p-4 flex items-center justify-between text-xs hover:bg-muted/15 transition-all">
                        <div className="space-y-1">
                          <p className="font-black text-foreground">{col.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">Collection: {col.id}</p>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black ${
                            count > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'
                          }`}>
                            {count} مستند معلق
                          </span>

                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold ${
                            status === 'success' ? 'bg-emerald-500/15 text-emerald-500' :
                            status === 'failed' ? 'bg-red-500/15 text-red-500' :
                            status === 'loading' ? 'bg-blue-500/15 text-blue-500 animate-pulse' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {status === 'success' ? 'اكتمل' :
                             status === 'failed' ? 'فشل' :
                             status === 'loading' ? 'جاري...' :
                             'جاهز'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT & RE-LICENSING */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="flex justify-between items-center relative z-10 border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <ShieldCheck className="text-primary h-5 w-5" /> إدارة حساب الصيدلية وتعديل الباقة
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 relative z-10 text-right">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">الاسم الكامل للمشترك</label>
                  <input 
                    type="text"
                    value={selectedUser.fullName}
                    onChange={e => setSelectedUser({ ...selectedUser, fullName: e.target.value })}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">رقم الهاتف للتحقق</label>
                  <input 
                    type="text"
                    value={selectedUser.phone}
                    onChange={e => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">مستوى رخصة التفعيل (Tier)</label>
                  <select 
                    value={selectedUser.planType}
                    onChange={e => {
                      const mode = e.target.value as 'basic' | 'advanced' | 'lifetime';
                      let dev = 2;
                      let br = 1;
                      if (mode === 'advanced') {
                        dev = 10;
                        br = 5;
                      } else if (mode === 'lifetime') {
                        dev = 99;
                        br = 15;
                      }
                      setSelectedUser({ 
                        ...selectedUser, 
                        planType: mode,
                        maxDevices: dev,
                        branchesCount: br
                      });
                    }}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="basic">الباقة الأساسية (جهازين - فرع)</option>
                    <option value="advanced">الباقة المتقدمة (١٠ أجهزة - ٥ فروع)</option>
                    <option value="lifetime">الباقة مدى الحياة (شراء فوري كامل)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">صلاحيات الحساب</label>
                  <select 
                    value={selectedUser.role}
                    onChange={e => setSelectedUser({ ...selectedUser, role: e.target.value })}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="customer">عميل عادي (Customer)</option>
                    <option value="manager">مدير صيدلية (Manager)</option>
                    <option value="user">صيدلي كاشير مساعد (User)</option>
                    <option value="admin">مسؤول معتمد للنظام بأكمله (Admin)</option>
                    <option value="super_admin">مدير النظام السحابي الرئيسي (Super Admin)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black text-amber-600">مفتاح ترخيص الأمان للبيع (License Code)</label>
                  <button 
                    type="button" 
                    onClick={generateLicenseKey}
                    className="text-[10px] text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold hover:bg-amber-500/20"
                  >
                    تجديد وتوليد مفتاح عشوائي جديد
                  </button>
                </div>
                <input 
                  type="text"
                  value={selectedUser.licenseCode}
                  onChange={e => setSelectedUser({ ...selectedUser, licenseCode: e.target.value })}
                  className="w-full h-10 px-3 font-mono tracking-wider bg-card border border-amber-500/40 rounded-xl text-xs text-primary focus:outline-none text-right select-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">الحد الأقصى للأجهزة المتزامنة</label>
                  <input 
                    type="number"
                    value={selectedUser.maxDevices}
                    onChange={e => setSelectedUser({ ...selectedUser, maxDevices: Number(e.target.value) })}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">الحد الأقصى للفروع الصيدلية المسموحة</label>
                  <input 
                    type="number"
                    value={selectedUser.branchesCount}
                    onChange={e => setSelectedUser({ ...selectedUser, branchesCount: Number(e.target.value) })}
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">حالة الحساب</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setSelectedUser({ ...selectedUser, isActive: true })}
                      className={`flex-1 h-9 rounded-lg text-[10px] font-bold ${selectedUser.isActive ? 'bg-emerald-500 text-white' : 'bg-muted border border-border text-foreground hover:bg-muted/80'}`}
                    >
                      مفعّل
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedUser({ ...selectedUser, isActive: false })}
                      className={`flex-1 h-9 rounded-lg text-[10px] font-bold ${!selectedUser.isActive ? 'bg-red-500 text-white' : 'bg-muted border border-border text-foreground hover:bg-muted/80'}`}
                    >
                      معطّل
                    </button>
                  </div>
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-muted-foreground">حالة رخصة التفعيل السحابي (One-Time)</label>
                  <select 
                    value={selectedUser.activationStatus}
                    onChange={e => setSelectedUser({ ...selectedUser, activationStatus: e.target.value as any })}
                    className="w-full h-9 px-2 bg-muted border border-border rounded-lg text-[10px] text-foreground focus:outline-none"
                  >
                    <option value="active">رخصة نشطة ومقبولة (Active)</option>
                    <option value="blocked">رخصة محظورة ومستبعدة (Blocked)</option>
                    <option value="expired">رخصة منتهية الصلاحية (Expired)</option>
                  </select>
                </div>
              </div>

              {/* Display Meta details */}
              <div className="bg-muted/50 p-3 rounded-xl border border-border/80 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>تاريخ الالتحاق بالمشروع:</span>
                  <span className="font-mono">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString('ar-EG') : 'غير محدد'}</span>
                </div>
                {selectedUser.activatedAt && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>تاريخ تفعيل المنتج (One-time):</span>
                    <span className="font-mono text-emerald-600 font-bold">{new Date(selectedUser.activatedAt).toLocaleString('ar-EG')}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>آخر دخول معتمد للنظام:</span>
                  <span className="font-mono text-primary font-bold">{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString('ar-EG') : 'لم يسجل دخول بعد'}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-border mt-5">
                <button 
                  type="submit"
                  className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  <Save className="h-4 w-4" /> حفظ وإقرار البيانات الجديدة
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 h-11 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء التعديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MANUAL CREATE NEW ACCOUNT BY DEV CONTROL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="flex justify-between items-center relative z-10 border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <UserCheck className="text-primary h-5 w-5" /> تسجيل وترخيص حساب عميل صيدلية جديد
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleCreateUserManually} className="space-y-4 relative z-10 text-right">
              <p className="text-muted-foreground text-xs font-medium bg-primary/5 p-3 rounded-xl border border-primary/10 leading-relaxed">
                ملاحظة: تتيح لك لوحة المشغل إمكانية الترخيص الفوري المباشر مع تجاوز التحقق برمز الـ OTP عبر تأكيد مدير النظام فقط. سيتم تنشيط حالة الحساب فورياً.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">الاسم الكامل للعميل / الصيدلية</label>
                <input 
                  type="text"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="مثال: صيدلية الأمل النموذجية"
                  className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground animate-pulse">البريد الإلكتروني للعميل</label>
                  <input 
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="customer@pharmacy.com"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50 text-left"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">رقم الهاتف للدعم والمتابعة</label>
                  <input 
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/50 text-left"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">مستوى رخصة المنتج المفتوحة</label>
                  <select 
                    value={newPlanType}
                    onChange={e => setNewPlanType(e.target.value as any)}
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="basic">الباقة الأساسية (جهازين - فرع)</option>
                    <option value="advanced">الباقة المتقدمة (١٠ أجهزة - ٥ فروع)</option>
                    <option value="lifetime">الباقة مدى الحياة (شراء فوري كامل)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">دور وصلاحية الحساب</label>
                  <select 
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="manager">مدير صيدلية (Manager)</option>
                    <option value="user">صيدلي كاشير (User)</option>
                    <option value="admin">مسؤول معتمد للنظام والترخيص (Admin)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">كلمة المرور المبدئية للعميل</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-5">
                <button 
                  type="submit"
                  className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  <Plus className="h-4.5 w-4.5" /> تفعيل الحساب فورياً وبدء الترخيص السحابي
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 h-11 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء العملية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GENERATE NEW LICENSE KEY FOR PREPAID SALE */}
      {isGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative overflow-hidden" dir="rtl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="flex justify-between items-center relative z-10 border-b border-border pb-3">
              <h3 className="text-md font-black text-foreground flex items-center gap-2">
                <KeyRound className="text-primary h-5 w-5 animate-bounce" /> توليد ترخيص تجاري مسبق الدفع
              </h3>
              <button onClick={() => setIsGenModalOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleGenerateLicenseCode} className="space-y-4 relative z-10 text-right">
              <p className="text-muted-foreground text-[11px] font-medium bg-primary/5 p-3 rounded-xl border border-primary/10 leading-relaxed">
                ملاحظة: سيقوم هذا المولد بإنشاء رمز تفعيل آمن وخاص بالزبائن الذين ينتظرون تنشيط حساباتهم يدويًا. يمكنك تقديم هذا المفتاح بمجرد استلام الدفع الخارجي.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">مستوى الترخيص والباقة المتاحة</label>
                <select 
                  value={genPlanType}
                  onChange={e => {
                    const selection = e.target.value as any;
                    setGenPlanType(selection);
                    if (selection === 'basic') {
                      setGenMaxDevices(2);
                      setGenBranchesCount(1);
                    } else if (selection === 'advanced') {
                      setGenMaxDevices(10);
                      setGenBranchesCount(5);
                    } else if (selection === 'lifetime') {
                      setGenMaxDevices(99);
                      setGenBranchesCount(15);
                    }
                  }}
                  className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                >
                  <option value="basic">الباقة الأساسية (جهازين - فرع واحد)</option>
                  <option value="advanced">الباقة المتقدمة (١٠ أجهزة - ٥ فروع)</option>
                  <option value="lifetime">الباقة مدى الحياة (شراء فوري كامل)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">عدد الأجهزة الأقصى (النشطة)</label>
                  <input 
                    type="number"
                    value={genMaxDevices}
                    onChange={e => setGenMaxDevices(Number(e.target.value))}
                    placeholder="2"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none text-left"
                    min="1"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">عدد الفروع المسموحة</label>
                  <input 
                    type="number"
                    value={genBranchesCount}
                    onChange={e => setGenBranchesCount(Number(e.target.value))}
                    placeholder="1"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none text-left"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-5">
                <button 
                  type="submit"
                  className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  <Plus className="h-4.5 w-4.5" /> توليد وتخزين الترخيص
                </button>
                <button 
                  type="button"
                  onClick={() => setIsGenModalOpen(false)}
                  className="px-5 h-11 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VIEW SYSTEM DETAILS */}
      {isDetailsModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative overflow-hidden" dir="rtl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="flex justify-between items-center relative z-10 border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <ShieldCheck className="text-primary h-5 w-5 animate-bounce" /> تفاصيل الحساب الفنية وربط النظام
              </h3>
              <button onClick={() => { setIsDetailsModalOpen(false); setSelectedUser(null); }} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4 relative z-10 text-right text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] text-muted-foreground font-bold block mb-1">الاسم الكامل للمستفيد:</span>
                  <span className="font-bold text-foreground">{selectedUser.fullName || 'غير مسمى'}</span>
                </div>
                <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] text-muted-foreground font-bold block mb-1">البريد الإلكتروني للتحقق:</span>
                  <span className="font-mono text-primary font-bold break-all">{selectedUser.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] text-muted-foreground font-bold block mb-1">رقم الهاتف للاتصال:</span>
                  <span className="font-mono text-foreground font-bold">{selectedUser.phone || 'غير مسمى'}</span>
                </div>
                <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                  <span className="text-[10px] text-muted-foreground font-bold block mb-1">طبيعة وباقة الاشتراك:</span>
                  <span className="font-bold text-foreground">
                    {selectedUser.planType === 'lifetime' ? 'الباقة لمدى الحياة (Unlimited)' : selectedUser.planType === 'advanced' ? 'الباقة المتقدمة (١٠ أجهزة)' : 'الباقة الأساسية (جهازين)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground font-black block">حالة الحساب</span>
                  <span className="font-black text-sm text-primary block mt-1 uppercase text-amber-500">{selectedUser.status === 'pending' ? 'ملمّق (بريد غير مؤكد)' : selectedUser.status === 'disabled' ? 'موقوف إدارياً' : 'مفعّل ونشط'}</span>
                </div>
                <div className="text-center border-x border-border">
                  <span className="text-[10px] text-muted-foreground font-black block">اتصال الأجهزة</span>
                  <span className="font-black text-sm text-foreground block mt-1">
                    {selectedUser.deviceSessions?.length || 0} / {selectedUser.maxDevices || 2}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground font-black block">الفروع المتزامنة</span>
                  <span className="font-black text-sm text-foreground block mt-1">
                    1 / {selectedUser.branchesCount || 1}
                  </span>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-2xl border border-border/80 space-y-2 font-mono text-[10px]">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>تاريخ إنشاء الحساب (برمجي)</span>
                  <span className="font-bold text-foreground">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString('ar-EG') : 'غير محدد'}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>تاريخ التحقق وتفعيل البريد</span>
                  <span className="font-bold text-emerald-600">
                    {selectedUser.verifiedAt ? new Date(selectedUser.verifiedAt).toLocaleString('ar-EG') : (selectedUser.status === 'active' ? 'تفعيل تلقائي من النظام' : 'لم يتم التحقق بعد')}
                  </span>
                </div>
                {selectedUser.activatedAt && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>تاريخ تنشيط رخصة الأمان</span>
                    <span className="font-bold text-indigo-500">{new Date(selectedUser.activatedAt).toLocaleString('ar-EG')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>آخر تسجيل دخول ناجح</span>
                  <span className="font-bold text-foreground">
                    {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString('ar-EG') : 'لم يسجل دخول بعد'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground border-t border-border/80 pt-2 font-sans text-xs">
                  <span className="font-bold">معرف الحساب الفريد (UID)</span>
                  <span className="font-mono text-[10px] select-all bg-muted border border-border px-2 py-1 rounded text-zinc-600">{selectedUser.userId}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button 
                type="button"
                onClick={() => { setIsDetailsModalOpen(false); setSelectedUser(null); }}
                className="px-5 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-black transition-all"
              >
                إغلاق نافذة التفاصيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW CLEANUP REPORT */}
      {cleanupReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-3xl w-full max-w-xl p-6 space-y-5 shadow-2xl relative overflow-hidden" dir="rtl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="flex justify-between items-center relative z-10 border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Trash2 className="text-red-500 h-5 w-5 animate-pulse" /> تقرير تنظيف الحسابات المكررة الحالية
              </h3>
              <button onClick={() => setCleanupReport(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 relative z-10">
              <div className="bg-muted/40 p-3 rounded-xl border border-border/60 text-center">
                <span className="text-[10px] text-muted-foreground font-bold block mb-1">المفحوصة</span>
                <span className="font-mono text-sm font-black text-foreground">{cleanupReport.scannedCount}</span>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl border border-border/60 text-center">
                <span className="text-[10px] text-muted-foreground font-bold block mb-1">المجموعات المكررة</span>
                <span className="font-mono text-sm font-black text-primary">{cleanupReport.duplicatesCount}</span>
              </div>
              <div className="bg-red-500/5 border-red-500/10 p-3 rounded-xl border text-center">
                <span className="text-[10px] text-red-600 font-bold block mb-1">المحذوفة</span>
                <span className="font-mono text-sm font-black text-red-600">{cleanupReport.deletedCount}</span>
              </div>
              <div className="bg-amber-500/5 border-amber-500/10 p-3 rounded-xl border text-center">
                <span className="text-[10px] text-amber-600 font-bold block mb-1">المعطلة (Status=deleted)</span>
                <span className="font-mono text-sm font-black text-amber-600">{cleanupReport.disabledCount}</span>
              </div>
              <div className="bg-indigo-500/5 border-indigo-500/10 p-3 rounded-xl border text-center">
                <span className="text-[10px] text-indigo-600 font-bold block mb-1">الحسابات المحمية</span>
                <span className="font-mono text-sm font-black text-indigo-600">{cleanupReport.skippedProtectedCount}</span>
              </div>
            </div>

            <div className="space-y-2 relative z-10 text-right text-xs">
              <span className="text-xs font-black text-foreground block">سجل الإجراءات التفصيلي:</span>
              <div className="bg-muted/50 border border-border rounded-2xl p-4 h-60 overflow-y-auto font-sans text-[11px] space-y-1.5 scrollbar-thin">
                {cleanupReport.details.length === 0 ? (
                  <p className="text-muted-foreground text-center py-10 font-bold">لم يتم العثور على أي حسابات مكررة أو معلقة تتطلب التصفية حالياً.</p>
                ) : (
                  cleanupReport.details.map((detail, index) => (
                    <div key={index} className="flex gap-2 items-start text-foreground bg-card p-2 rounded-lg border border-border/60 shadow-sm leading-relaxed">
                      <span className="text-emerald-500 font-black shrink-0">✓</span>
                      <span>{detail}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button 
                type="button"
                onClick={() => setCleanupReport(null)}
                className="px-6 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-black transition-all"
              >
                إغلاق نافذة التقرير
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENERATE NEW INTEL LICENSE FOR CUSTOMER */}
      {isCreateLicenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-right" dir="rtl">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative overflow-hidden font-sans">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="flex justify-between items-center relative z-10 border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Award className="text-violet-500 h-5 w-5" /> توليد ترخيص ذكي جديد للعملاء
              </h3>
              <button onClick={() => setIsCreateLicenseModalOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleCreateLicense} className="space-y-4 relative z-10 text-right">
              <p className="text-muted-foreground text-xs leading-relaxed bg-violet-500/5 border border-violet-500/10 p-3 rounded-xl">
                يقوم هذا المحرّك بإنشاء ترخيص رقمي متكامل ويقترن بالمستخدم تلقائياً فور تسجيله أو من خلال الربط بالبريد/الهاتف.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">اسم الصيدلية / العميل</label>
                  <input 
                    type="text"
                    value={licenseFormOwnerName}
                    onChange={e => setLicenseFormOwnerName(e.target.value)}
                    placeholder="مثال: صيدلية الحكمة الحديثة"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">رقم هاتف العميل</label>
                  <input 
                    type="text"
                    value={licenseFormOwnerPhone}
                    onChange={e => setLicenseFormOwnerPhone(e.target.value)}
                    placeholder="مثال: +9665XXXXXXXX"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">البريد الإلكتروني للعميل</label>
                  <input 
                    type="email"
                    value={licenseFormOwnerEmail}
                    onChange={e => setLicenseFormOwnerEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none text-left"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">نوع الباقة والمزايا الزمنية</label>
                  <select 
                    value={licenseFormPlanType}
                    onChange={e => setLicenseFormPlanType(e.target.value as any)}
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="basic">الباقة الأساسية (جهازين - فرع واحد - ١ سنة)</option>
                    <option value="pro">الباقة الاحترافية Pro (١٠ أجهزة - ٥ فروع - ١ سنة)</option>
                    <option value="lifetime">الباقة مدى الحياة (٩٩ جهاز - ١٥ فرعًا - دائم)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">حالة السداد والتحصيل</label>
                  <select
                    value={licenseFormPaymentStatus}
                    onChange={e => setLicenseFormPaymentStatus(e.target.value as any)}
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="manual">يدوي / إداري (Default)</option>
                    <option value="paid">مدفوع بالكامل (Paid)</option>
                    <option value="pending">بانتظار التحصيل (Pending)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">ملاحظات الترخيص الإدارية</label>
                  <input 
                    type="text"
                    value={licenseFormNotes}
                    onChange={e => setLicenseFormNotes(e.target.value)}
                    placeholder="ملاحظات سريعة لتسوية الفواتير..."
                    className="w-full h-11 px-3 bg-muted border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-5">
                <button 
                  type="submit"
                  className="flex-1 h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/10"
                >
                  <Plus className="h-4 w-4" /> توليد وتفعيل كود الترخيص
                </button>
                <button 
                  type="button"
                  onClick={() => setIsCreateLicenseModalOpen(false)}
                  className="px-5 h-11 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء الإجراء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VIEW LICENSE DETAILS & LINKING WORKFLOW */}
      {isLicenseDetailModalOpen && selectedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-right font-sans" dir="rtl">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="flex justify-between items-center relative z-10 border-b border-border pb-3">
              <h3 className="text-md font-black text-foreground flex items-center gap-2">
                <Award className="text-primary h-5 w-5" /> تفاصيل الترخيص الرقمي وتقاطعات السحابة
              </h3>
              <button onClick={() => {
                setIsLicenseDetailModalOpen(false);
                setSelectedLicense(null);
              }} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              {/* License specification details */}
              <div className="bg-muted/50 p-4 rounded-2xl border border-border/80 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">كود مفتاح الترخيص:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary bg-card/80 border border-border px-3 py-1.5 rounded-lg select-all text-center">
                      {selectedLicense.licenseKey}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedLicense.licenseKey);
                        toast.success('تم نسخ رمز الترخيص');
                      }}
                      className="p-1.5 bg-muted text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors text-xs"
                      title="نسخ مفتاح الترخيص"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">نوع الباقة السحابية:</span>
                    <span className="font-black text-foreground">
                      {selectedLicense.planType === 'basic' ? 'الباقة الأساسية' : selectedLicense.planType === 'pro' ? 'الباقة الاحترافية Pro' : 'باقة مدى الحياة ✨'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">حالة السداد المالي:</span>
                    <span className="font-bold text-foreground">
                      {selectedLicense.paymentStatus === 'paid' ? 'خالص / مدفوع' : selectedLicense.paymentStatus === 'pending' ? 'معلق السداد' : 'تسوية يدوية / تجريبية'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">تاريخ الشراء والبدء:</span>
                    <span className="font-mono text-muted-foreground">{new Date(selectedLicense.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">تاريخ انتهاء الترخيص:</span>
                    <span className="font-sans font-mono font-bold text-foreground">
                      {selectedLicense.planType === 'lifetime' ? 'لا ينتهي أبداً (دائم)' : selectedLicense.expiryDate ? new Date(selectedLicense.expiryDate).toLocaleDateString() : 'غير محدد'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">حد الأجهزة المتصلة:</span>
                    <span className="font-bold text-foreground">{selectedLicense.maxDevices} جهاز نشط بالتزامن</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">حد الفروع المسموحة:</span>
                    <span className="font-bold text-foreground">{selectedLicense.maxBranches} فرع صيدلية</span>
                  </div>
                </div>

                {selectedLicense.notes && (
                  <div className="bg-card p-2.5 rounded-xl border border-border/60 text-[11px] text-muted-foreground font-sans">
                    <span className="font-bold text-foreground block mb-0.5">ملاحظات مضافة:</span>
                    {selectedLicense.notes}
                  </div>
                )}
              </div>

              {/* Linking component container */}
              <div className="border border-border rounded-2xl p-4 bg-muted/25 space-y-3 font-sans">
                <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="text-primary h-4 w-4" /> حالة الربط الفعلي بمستخدمي السحابة
                </h4>

                {selectedLicense.ownerUserId ? (
                  <div className="space-y-2">
                    <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-black text-emerald-500">تم الاقتران والربط بنجاح</p>
                        <p className="text-[10px] text-muted-foreground pb-0.5 mt-0.5">المستفيد الحالي: {selectedLicense.ownerName}</p>
                        <p className="text-[10px] text-muted-foreground">بريد العميل: {selectedLicense.ownerEmail || 'لا يوجد'}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500 text-white text-[10px] font-bold">
                        نشط (Linked ID)
                      </span>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-relaxed font-sans">
                      أي تحديث على حالة الترخيص (تعديل الأجهزة، تمديد، تعليق) سوف ينعكس فوراً على الصيدلية المستهدفة عند فتح البرنامج أو التحقق من الترخيص.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/15 text-xs">
                      <p className="font-bold text-amber-600">هذا الترخيص مسبق الدفع (غير مقترن بأي حساب حالياً)</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                        يمكنك تسليم الـ License Key للعميل ليقوم بإدخاله كـ ONE-TIME أثناء إعداد صيدليته السحابية، أو يمكنك إسناد الترخيص يدوياً وفورياً إلى أي عميل مسجل بالأسفل:
                      </p>
                    </div>

                    {/* Users dropdown to assign manually */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground block">اختر مستخدم من صيدليات النظام للربط الفوري المباشر:</label>
                      <select
                        onChange={(e) => {
                          const targetUserIdx = e.target.selectedIndex - 1;
                          if (targetUserIdx < 0) return;
                          
                          // Filter users without license codes
                          const availableUsers = users.filter(u => !u.licenseCode);
                          const targetUser = availableUsers[targetUserIdx];
                          if (targetUser) {
                            if (window.confirm(`هل أنت متأكد من ربط هذا الكود تلقائياً بمستخدم "${targetUser.fullName}"؟`)) {
                              handleLinkLicenseToUser(selectedLicense.id, targetUser);
                              setIsLicenseDetailModalOpen(false);
                            }
                          }
                          e.target.value = '';
                        }}
                        className="w-full h-10 px-3 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none"
                      >
                        <option value="">-- اختر صيدلية مسجلة للاقتران المباشر --</option>
                        {users.filter(u => !u.licenseCode).map((u) => (
                          <option key={u.id || u.userId} value={u.id}>
                            {u.fullName} ({u.email || u.phone}) - {u.planType === 'advanced' ? 'متقدم' : u.planType === 'lifetime' ? 'مدى الحياة' : 'أساسي'}
                          </option>
                        ))}
                      </select>
                      {users.filter(u => !u.licenseCode).length === 0 && (
                        <span className="text-[10px] text-muted-foreground font-semibold block pt-0.5">كل مستخدمي صيدليات السحابة مقترنون بتراخيص نشطة بالفعل.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* B3 Device Fingerprint & Security Management Panel */}
              <div className="border border-border rounded-2xl p-4 bg-muted/20 space-y-3 font-sans text-right">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Laptop className="text-violet-500 h-4 w-4" /> إدارة الأجهزة المرتبطة بالترخيص ({selectedLicense.activatedDevices?.length || 0} / {selectedLicense.maxDevices || 2})
                  </h4>
                  {selectedLicense.activatedDevices?.length > 0 && (
                    <button
                      onClick={() => handleResetDevices(selectedLicense.id)}
                      className="px-2 py-1 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded font-black text-[10px] transition-all flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> تصفير الأجهزة
                    </button>
                  )}
                </div>

                {(!selectedLicense.activatedDevices || selectedLicense.activatedDevices.length === 0) ? (
                  <p className="text-[10px] text-muted-foreground bg-card p-3 rounded-xl border border-border text-center">
                    لا توجد أجهزة نشطة مقترنة بهذا الترخيص حتى الآن. سيتم تسجيل وتثبيت أول جهاز تلقائياً عند تسجيل الدخول من العميل.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {selectedLicense.activatedDevices.map((d: any, index: number) => (
                      <div key={d.deviceId || index} className="bg-card p-2.5 rounded-xl border border-border/80 flex items-center justify-between text-xs transition-all hover:border-violet-500/30">
                        <div className="space-y-0.5">
                          <p className="font-black text-foreground flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                            {d.name || 'جهاز مجهول'}
                          </p>
                          <p className="text-[9px] text-muted-foreground font-mono select-all">
                            ID: {d.deviceId}
                          </p>
                          <div className="text-[9px] text-muted-foreground flex items-center gap-1.5">
                            <span>الإضافة: {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'غير معروف'}</span>
                            <span>•</span>
                            <span className="text-violet-500 font-medium">آخر نشاط: {d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString() : 'غير معروف'}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteDevice(selectedLicense.id, d.deviceId)}
                          className="p-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-lg transition-colors border border-rose-600/10"
                          title="حذف الجهاز وسحب رخصته"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button 
                type="button"
                onClick={() => {
                  setIsLicenseDetailModalOpen(false);
                  setSelectedLicense(null);
                }}
                className="px-6 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-black transition-all"
              >
                إغلاق التفاصيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
