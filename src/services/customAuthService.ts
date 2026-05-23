import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { emailjsService } from './emailjsService';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

export interface CustomUser {
  userId: string;
  id: string; // for compatibility with requesting user model fields
  fullName: string;
  pharmacyName?: string;
  email: string;
  phone: string;
  passwordHash: string;
  isActive: boolean;
  status: 'pending' | 'verified';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;

  // Real-world Security Upgrades
  otpCodeHash?: string | null;
  otpExpiresAt?: number | null; // epoch timestamp ms
  otpAttempts?: number; // failed OTP verification count
  
  failedLoginAttempts?: number; // failed login count
  lockUntil?: string | null; // ISO Date String representing lock release time
  
  deviceSessions?: string[]; // list of active device fingerprint session tokens

  // One-time Purchase Licensing
  licenseCode: string;
  activationStatus: 'active' | 'blocked' | 'expired';
  planType: 'basic' | 'advanced' | 'lifetime';
  maxDevices: number;
  branchesCount: number;
  role: string;

  // One-time Licensing Parameters
  activatedAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

/**
 * Bcrypt salted password hashing with 10 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Helper to generate a secure random 6-digit verification code.
 */
export function generate6DigitOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const customAuthService = {
  /**
   * Checks if email or phone is already registered in 'appUsers' database.
   */
  async checkDuplicate(email: string, phone: string): Promise<{ emailExists: boolean; phoneExists: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    const usersRef = collection(db, 'appUsers');
    
    // Check Email
    const emailQuery = query(usersRef, where('email', '==', cleanEmail));
    const emailSnap = await getDocs(emailQuery);
    const emailExists = emailSnap.docs.some(doc => {
      const data = doc.data();
      return data.status === 'verified' || (data.status === 'pending' && Date.now() - new Date(data.createdAt).getTime() < 30 * 60 * 1000); // within 30 mins
    });

    // Check Phone
    const phoneQuery = query(usersRef, where('phone', '==', cleanPhone));
    const phoneSnap = await getDocs(phoneQuery);
    const phoneExists = phoneSnap.docs.some(doc => {
      const data = doc.data();
      return data.status === 'verified' || (data.status === 'pending' && Date.now() - new Date(data.createdAt).getTime() < 30 * 60 * 1000);
    });

    return { emailExists, phoneExists };
  },

  /**
   * Registers a brand-new user in PENDING status, generates hashed OTP, and triggers EmailJS delivery.
   */
  async registerPendingUser(
    fullName: string, 
    pharmacyName: string,
    email: string, 
    phone: string, 
    passwordPlain: string,
    planType: 'basic' | 'advanced' | 'lifetime' = 'basic'
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const { emailExists, phoneExists } = await this.checkDuplicate(email, phone);
      if (emailExists) {
        return { success: false, error: 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر' };
      }
      if (phoneExists) {
        return { success: false, error: 'رقم الهاتف مسجل بالفعل لمستخدم آخر' };
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();
      const passwordHashVal = await hashPassword(passwordPlain);
      
      const otp = generate6DigitOTP();
      const otpCodeHashVal = await bcrypt.hash(otp, 10);
      const tenMinutesFromNow = Date.now() + 10 * 60 * 1000; // exactly 10 minutes validation
      
      const newUserId = 'u_' + Math.random().toString(36).substr(2, 9);

      // Tier definitions
      let maxDevices = 2;
      let branchesCount = 1;
      
      if (planType === 'advanced') {
        maxDevices = 10;
        branchesCount = 5;
      } else if (planType === 'lifetime') {
        maxDevices = 99;
        branchesCount = 15;
      }

      const pendingUser: CustomUser = {
        userId: newUserId,
        id: newUserId,
        fullName: fullName.trim(),
        pharmacyName: pharmacyName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash: passwordHashVal,
        isActive: false,
        status: 'pending',
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: '',
        
        // Hashed OTP security upgrades
        otpCodeHash: otpCodeHashVal,
        otpExpiresAt: tenMinutesFromNow,
        otpAttempts: 0,
        
        failedLoginAttempts: 0,
        lockUntil: null,
        deviceSessions: [],

        // One-time Licensing Parameters
        licenseCode: '',
        activationStatus: 'expired', // Forces license activation after email verification
        planType,
        maxDevices,
        branchesCount,
        role: cleanEmail === (import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'mustafaenginerr35@gmail.com').trim().toLowerCase() ? 'super_admin' : 'customer', // Auto-bootstrap super_admin role if matches custom email, otherwise register as customer
        activatedAt: '',
        customerName: fullName.trim(),
        customerPhone: cleanPhone,
        customerEmail: cleanEmail
      };

      const docRef = doc(db, 'appUsers', pendingUser.userId);
      await setDoc(docRef, pendingUser);

      // Send verification code
      const sent = await emailjsService.sendOTP(cleanEmail, pendingUser.fullName, otp, 'register');
      if (!sent) {
        throw new Error('فشل إرسال رمز التحقق (OTP) للبريد الإلكتروني. الرجاء التأكد من صحة البريد أو إعداد الخدمة بشكل صحيح.');
      }

      return { success: true, userId: newUserId };
    } catch (err: any) {
      console.error('Registration failed:', err);
      return { success: false, error: err.message || 'فشل تسجيل الحساب، يرجى المحاولة لاحقاً' };
    }
  },

  /**
   * Resends hashed OTP to a pending user.
   */
  async resendOTP(email: string, purpose: 'register' | 'reset' = 'register'): Promise<boolean> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const usersRef = collection(db, 'appUsers');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error('البريد الإلكتروني غير مسجل.');
        return false;
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as CustomUser;
      
      const otp = generate6DigitOTP();
      const otpCodeHashVal = await bcrypt.hash(otp, 10);
      const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

      await updateDoc(doc(db, 'appUsers', userData.userId), {
        otpCodeHash: otpCodeHashVal,
        otpExpiresAt: tenMinutesFromNow,
        otpAttempts: 0,
        updatedAt: new Date().toISOString()
      });

      const sent = await emailjsService.sendOTP(cleanEmail, userData.fullName, otp, purpose);
      if (sent) {
        toast.success('تم إرسال رمز تحقق جديد إلى بريدك مع صلاحية 10 دقائق.');
      }
      return sent;
    } catch (error) {
      console.error('Error resending OTP:', error);
      toast.error('حدث خطأ أثناء محاولة إرسال الرمز مجدداً.');
      return false;
    }
  },

  /**
   * Verifies the OTP code sent to the email. If valid, changes user state to verified.
   * Leverages strict attempt counting (max 5) and auto-invalidates logic.
   */
  async verifyUserOTP(email: string, otpInput: string): Promise<{ success: boolean; user?: CustomUser; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const usersRef = collection(db, 'appUsers');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل' };
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as CustomUser;

      // Checking validity constraints
      if (!userData.otpCodeHash || !userData.otpExpiresAt) {
        return { success: false, error: 'لا يوجد رمز تحقق نشط في السجل. يرجى طلب رمز جديد.' };
      }

      const now = Date.now();
      if (now > userData.otpExpiresAt) {
        return { success: false, error: 'انتهت صلاحية رمز التحقق (صلاحيته 10 دقائق). يرجى طلب رمز جديد.' };
      }

      // Check OTP Attempts Limit
      const attempts = userData.otpAttempts || 0;
      if (attempts >= 5) {
        // Exceeded 5, regenerate automatically and notify
        const newOtp = generate6DigitOTP();
        const newOtpHash = await bcrypt.hash(newOtp, 10);
        await updateDoc(doc(db, 'appUsers', userData.userId), {
          otpCodeHash: newOtpHash,
          otpExpiresAt: Date.now() + 10 * 60 * 1000,
          otpAttempts: 0,
          updatedAt: new Date().toISOString()
        });
        await emailjsService.sendOTP(cleanEmail, userData.fullName, newOtp, 'register');
        return { 
          success: false, 
          error: 'تجاوزت الحد الأقصى للمحاولات (5 محاولات). تم إبطال الرمز القديم تلقائياً وإرسال رمز تحقق عشوائي جديد لبريدك.' 
        };
      }

      // Secure validation comparison
      const isOtpValid = await bcrypt.compare(otpInput.trim(), userData.otpCodeHash);
      if (!isOtpValid) {
        const nextAttempts = attempts + 1;
        
        if (nextAttempts >= 5) {
          // Automatic renewal upon hitting 5th concurrent failure
          const newOtp = generate6DigitOTP();
          const newOtpHash = await bcrypt.hash(newOtp, 10);
          await updateDoc(doc(db, 'appUsers', userData.userId), {
            otpCodeHash: newOtpHash,
            otpExpiresAt: Date.now() + 10 * 60 * 1000,
            otpAttempts: 0,
            updatedAt: new Date().toISOString()
          });
          await emailjsService.sendOTP(cleanEmail, userData.fullName, newOtp, 'register');
          return { 
            success: false, 
            error: 'تجاوزت الحد الأقصى لمحاولات الإدخال (5 محاولات). تم توليد وإرسال رمز تحقق جديد إلى بريدك مع تصفير محاولاتك.' 
          };
        } else {
          await updateDoc(doc(db, 'appUsers', userData.userId), {
            otpAttempts: nextAttempts,
            updatedAt: new Date().toISOString()
          });
          return { success: false, error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${5 - nextAttempts}` };
        }
      }

      // Correct OTP entry! Promote user to active state & clear security variables
      const updatedUser: Partial<CustomUser> = {
        status: 'verified',
        isVerified: true,
        isActive: true, // Account itself is active, but license is expired/needs activation
        activationStatus: 'expired',
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        otpCodeHash: null, // Clear otp metadata from Firestore
        otpExpiresAt: null,
        otpAttempts: 0
      };

      await updateDoc(doc(db, 'appUsers', userData.userId), updatedUser);
      
      const fullUser = { ...userData, ...updatedUser } as CustomUser;
      return { success: true, user: fullUser };
    } catch (err: any) {
      console.error('OTP Verification failed:', err);
      return { success: false, error: err.message || 'فشل التحقق من رمز OTP' };
    }
  },

  /**
   * Activates a license key for a verified user, including multiple validation checks.
   */
  async activateLicenseKey(
    userId: string,
    licenseKey: string,
    deviceFingerprint: string
  ): Promise<{ success: boolean; error?: string; user?: CustomUser }> {
    try {
      const cleanKey = licenseKey.trim().toUpperCase();
      if (!cleanKey) {
        return { success: false, error: 'يرجى إدخال مفتاح رخصة التفعيل.' };
      }

      // Check if user exists
      const userRef = doc(db, 'appUsers', userId);
      const userSnap = await getDocs(query(collection(db, 'appUsers'), where('userId', '==', userId)));
      if (userSnap.empty) {
        return { success: false, error: 'المستخدم غير موجود في النظام.' };
      }
      const userData = userSnap.docs[0].data() as CustomUser;

      let planType: 'basic' | 'advanced' | 'lifetime' = 'basic';
      let maxDevices = 2;
      let branchesCount = 1;
      let isValidLicense = false;

      // 1. Check if the entered key exists in the activationCodes collection
      const codesRef = collection(db, 'activationCodes');
      const q = query(codesRef, where('code', '==', cleanKey));
      const codeSnap = await getDocs(q);

      if (!codeSnap.empty) {
        const codeDoc = codeSnap.docs[0];
        const codeData = codeDoc.data();

        if (codeData.isUsed) {
          if (codeData.assignedEmail && codeData.assignedEmail.toLowerCase() !== userData.email.toLowerCase()) {
            return { success: false, error: 'مفتاح الترخيص هذا تم استخدامه لتفعيل حساب آخر.' };
          }
        }

        if (codeData.activationStatus === 'blocked') {
          return { success: false, error: 'مفتاح الترخيص هذا معطّل أو محظور من قبل المشرف.' };
        }

        planType = codeData.planType || 'basic';
        maxDevices = codeData.maxDevices || (planType === 'advanced' ? 10 : planType === 'lifetime' ? 99 : 2);
        branchesCount = codeData.branchesCount || (planType === 'advanced' ? 5 : planType === 'lifetime' ? 15 : 1);

        // Mark as used
        await updateDoc(doc(db, 'activationCodes', codeDoc.id), {
          isUsed: true,
          assignedEmail: userData.email,
          updatedAt: new Date()
        });
        isValidLicense = true;
      } else {
        // 2. Alternatively, check if the admin has manually set key and set status to active via Admin Panel
        if (userData.licenseCode && userData.licenseCode.trim().toUpperCase() === cleanKey) {
          planType = userData.planType || 'basic';
          maxDevices = userData.maxDevices || 2;
          branchesCount = userData.branchesCount || 1;
          isValidLicense = true;
        } else {
          return { success: false, error: 'مفتاح الترخيص غير متطابق أو غير موجود بسجلات النظام.' };
        }
      }

      // Check account/license status checks
      if (userData.activationStatus === 'blocked') {
        return { success: false, error: 'رخصة الاستخدام محظورة ومستبعدة بسبب سوء الاستخدام.' };
      }

      // 3. Multi-device count limit
      const activeSessions = userData.deviceSessions || [];
      const fp = deviceFingerprint || 'generic_device_id';

      if (!activeSessions.includes(fp)) {
        if (activeSessions.length >= maxDevices) {
          return {
            success: false,
            error: `فشل التفعيل: لا يمكن ربط جهاز إضافي. الباقة تتيح فقط ${maxDevices} أجهزة.`
          };
        }
      }

      const updatedSessions = activeSessions.includes(fp) ? activeSessions : [...activeSessions, fp];

      // Update user doc
      const updatedUserFields: Partial<CustomUser> = {
        licenseCode: cleanKey,
        activationStatus: 'active',
        planType,
        maxDevices,
        branchesCount,
        activatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deviceSessions: updatedSessions
      };

      await updateDoc(userRef, updatedUserFields);

      return {
        success: true,
        user: { ...userData, ...updatedUserFields } as CustomUser
      };
    } catch (e: any) {
      console.error('License key activation error:', e);
      return { success: false, error: 'خطأ أثناء فك التشفير والتنشيط: ' + e.message };
    }
  },

  /**
   * Verifies credentials and logs the user in.
   * Includes rate limiting (5 failures -> 15 min lock) and device fingerprint verification.
   */
  async loginUser(
    email: string, 
    passwordPlain: string,
    deviceFingerprint?: string
  ): Promise<{ success: boolean; user?: CustomUser; error?: string; needVerification?: boolean }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const usersRef = collection(db, 'appUsers');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل في النظام' };
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as CustomUser;

      // 1. Rate Limiting Check
      if (userData.lockUntil) {
        const lockTime = new Date(userData.lockUntil).getTime();
        if (Date.now() < lockTime) {
          const remainingMs = lockTime - Date.now();
          const mins = Math.ceil(remainingMs / 1000 / 60);
          return { 
            success: false, 
            error: `تم قفل هذا الحساب مؤقتاً بسبب تكرار المحاولات الفاشلة. يرجى الانتظار والتحقق مرة أخرى بعد ${mins} دقيقة.` 
          };
        } else {
          // Lock duration elapsed. Let's reset lock fields on userDoc in memory for this flow
          userData.failedLoginAttempts = 0;
          userData.lockUntil = null;
        }
      }

      // 2. Salted bcrypt password matching
      const isMatch = await bcrypt.compare(passwordPlain, userData.passwordHash);
      if (!isMatch) {
        const nextFailed = (userData.failedLoginAttempts || 0) + 1;
        let lockUntilVal: string | null = null;
        
        if (nextFailed >= 5) {
          const lockEndEpoch = Date.now() + 15 * 60 * 1000; // exact 15 minutes lock
          lockUntilVal = new Date(lockEndEpoch).toISOString();
        }

        await updateDoc(doc(db, 'appUsers', userData.userId), {
          failedLoginAttempts: nextFailed,
          lockUntil: lockUntilVal,
          updatedAt: new Date().toISOString()
        });

        if (nextFailed >= 5) {
          return { 
            success: false, 
            error: 'تم قفل الحساب بشكل مؤمن لمدة 15 دقيقة بعد 5 محاولات خاطئة متتالية تماشياً مع أمان SaaS.' 
          };
        } else {
          return { 
            success: false, 
            error: `كلمة المرور غير صحيحة. المحاولات المتبقية قبل إقفال الحساب: ${5 - nextFailed}` 
          };
        }
      }

      // Check verification status
      if (userData.status !== 'verified') {
        return { 
          success: false, 
          error: 'الحساب غير مفعّل بعد. يرجى إدخال رمز التحقق لتفعيل الحساب أولاً.',
          needVerification: true 
        };
      }

      if (!userData.isActive) {
        return { success: false, error: 'تم تعطيل هذا الحساب من قبل الإدارة' };
      }

      // 3. Multi-device Session Control (Prevent exceeding maxDevices)
      const maxD = userData.maxDevices || 2;
      const activeSessions = userData.deviceSessions || [];
      const fp = deviceFingerprint || 'generic_device_id';

      if (!activeSessions.includes(fp)) {
        if (activeSessions.length >= maxD) {
          return {
            success: false,
            error: `خطأ أمني: لقد تجاوزت الحد الأقصى للجلسات المتزامنة لهذه الباقة مسبقاً (${maxD} أجهزة). يرجى تسجيل الخروج من الأجهزة الأخرى أو الترقية لباقة أعلى.`
          };
        }
      }

      // Update Device session queue
      const updatedSessions = activeSessions.includes(fp) 
        ? activeSessions 
        : [...activeSessions, fp];

      // Successful login reset
      const currentLoginStr = new Date().toISOString();
      await updateDoc(doc(db, 'appUsers', userData.userId), {
        lastLogin: currentLoginStr,
        updatedAt: currentLoginStr,
        failedLoginAttempts: 0,
        lockUntil: null,
        deviceSessions: updatedSessions
      });

      const fullUser = { 
        ...userData, 
        lastLogin: currentLoginStr,
        isVerified: true,
        deviceSessions: updatedSessions,
        failedLoginAttempts: 0,
        lockUntil: null
      } as CustomUser;

      return { success: true, user: fullUser };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء محاولة تسجيل الدخول' };
    }
  },

  /**
   * Log out device session cleanly. Removes user's device fingerprint token.
   */
  async logoutDevice(userId: string, deviceFingerprint: string): Promise<void> {
    try {
      const userRef = doc(db, 'appUsers', userId);
      const snap = await getDocs(query(collection(db, 'appUsers'), where('userId', '==', userId)));
      if (!snap.empty) {
        const userData = snap.docs[0].data() as CustomUser;
        const currentSessions = userData.deviceSessions || [];
        const updated = currentSessions.filter(fp => fp !== deviceFingerprint);
        await updateDoc(userRef, {
          deviceSessions: updated,
          updatedAt: new Date().toISOString()
        });
        console.log(`[Device Control] Cleaned fingerprint session: ${deviceFingerprint}`);
      }
    } catch (e) {
      console.error('Error releasing device session layout:', e);
    }
  },

  /**
   * Initiates forgot password flow; checks if email is active, generates and sends salted reset OTP.
   */
  async requestPasswordResetOTP(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const usersRef = collection(db, 'appUsers');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل بالنظام' };
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as CustomUser;

      const otp = generate6DigitOTP();
      const otpCodeHashVal = await bcrypt.hash(otp, 10);
      const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

      await updateDoc(doc(db, 'appUsers', userData.userId), {
        otpCodeHash: otpCodeHashVal,
        otpExpiresAt: tenMinutesFromNow,
        otpAttempts: 0,
        updatedAt: new Date().toISOString()
      });

      const sent = await emailjsService.sendOTP(cleanEmail, userData.fullName, otp, 'reset');
      if (sent) {
        return { success: true };
      } else {
        return { success: false, error: 'فشل إرسال البريد الإلكتروني. يرجى محاولة الحصول على رمز OTP لاحقاً' };
      }
    } catch (err: any) {
      console.error('Password reset request error:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء طلب إعادة تعيين كلمة المرور' };
    }
  },

  /**
   * Verifies the reset OTP and assigns a new password to the user.
   */
  async resetPasswordWithOTP(email: string, otpInput: string, newPasswordPlain: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const usersRef = collection(db, 'appUsers');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'البريد الإلكتروني غير مسجل بالنظام' };
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as CustomUser;

      if (!userData.otpCodeHash || !userData.otpExpiresAt) {
        return { success: false, error: 'لا يوجد رمز نشط لهذا الإجراء حالياً.' };
      }

      const now = Date.now();
      if (now > userData.otpExpiresAt) {
        return { success: false, error: 'انتهت صلاحية رمز التحقق OTP. يرجى طلب الرمز مجدداً.' };
      }

      // Check OTP limit
      const attempts = userData.otpAttempts || 0;
      if (attempts >= 5) {
        const newOtp = generate6DigitOTP();
        const newOtpHash = await bcrypt.hash(newOtp, 10);
        await updateDoc(doc(db, 'appUsers', userData.userId), {
          otpCodeHash: newOtpHash,
          otpExpiresAt: Date.now() + 10 * 60 * 1000,
          otpAttempts: 0,
          updatedAt: new Date().toISOString()
        });
        await emailjsService.sendOTP(cleanEmail, userData.fullName, newOtp, 'reset');
        return { 
          success: false, 
          error: 'تم تجاوز الحد الأقصى للمحاولات لتعيين الرمز. تم إرسال رمز OTP عشوائي جديد لبريدك لتعيد المحاولة.' 
        };
      }

      const isOtpValid = await bcrypt.compare(otpInput.trim(), userData.otpCodeHash);
      if (!isOtpValid) {
        const nextAttempts = attempts + 1;
        if (nextAttempts >= 5) {
          const newOtp = generate6DigitOTP();
          const newOtpHash = await bcrypt.hash(newOtp, 10);
          await updateDoc(doc(db, 'appUsers', userData.userId), {
            otpCodeHash: newOtpHash,
            otpExpiresAt: Date.now() + 10 * 60 * 1000,
            otpAttempts: 0,
            updatedAt: new Date().toISOString()
          });
          await emailjsService.sendOTP(cleanEmail, userData.fullName, newOtp, 'reset');
          return { success: false, error: 'تم إدخال رمز خاطئ 5 مرات. تم توليد وإرسال رمز OTP جديد فوري إلى بريدك.' };
        } else {
          await updateDoc(doc(db, 'appUsers', userData.userId), {
            otpAttempts: nextAttempts,
            updatedAt: new Date().toISOString()
          });
          return { success: false, error: `رمز التحقق غير صحيح. المحاولات المتبقية: ${5 - nextAttempts}` };
        }
      }

      // Clear code and update password using bcrypt
      const newPasswordHashVal = await hashPassword(newPasswordPlain);

      await updateDoc(doc(db, 'appUsers', userData.userId), {
        passwordHash: newPasswordHashVal,
        otpCodeHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        status: 'verified', // Set to verified in case they reset from pending
        isActive: true,
        updatedAt: new Date().toISOString(),
        failedLoginAttempts: 0,
        lockUntil: null
      });

      return { success: true };
    } catch (err: any) {
      console.error('Password reset apply error:', err);
      return { success: false, error: err.message || 'فشل تحديث كلمة المرور الجديدة' };
    }
  }
};
