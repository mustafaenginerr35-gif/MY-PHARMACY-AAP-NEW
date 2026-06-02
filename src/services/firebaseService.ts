import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  type DocumentData,
  type QueryConstraint
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import { toValidDate } from '../lib/formatters';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error Instance: ', JSON.stringify(errInfo));
  
  // For read operations (List/Get), we log but don't necessarily want to crash the caller 
  // with a hard throw if it's used in a listener.
  if (operationType === OperationType.GET || operationType === OperationType.LIST) {
     return; // Silent fail after logging
  }
  
  throw new Error(JSON.stringify(errInfo));
}

export function getEffectiveUserInfo() {
  // Check for our custom user from CustomAuthService first
  const customUserString = localStorage.getItem('pharma-auth-user');
  if (customUserString) {
    try {
      const customUser = JSON.parse(customUserString);
      if (customUser && customUser.userId) {
        return { uid: customUser.userId, authenticated: true };
      }
    } catch (e) {
      console.error('Error parsing custom user session from localStorage', e);
    }
  }

  const user = auth.currentUser;
  if (user) return { uid: user.uid, authenticated: true };
  
  return { uid: null, authenticated: false };
}

function cleanData(data: any): any {
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => cleanData(item));
  }
  
  const cleaned: any = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== undefined) {
      cleaned[key] = cleanData(value);
    }
  });
  return cleaned;
}

// Memory lock to prevent redundant concurrent operations
const activeOperations = new Set<string>();
const globalSavingLock = new Map<string, number>();

const collectionListeners = new Set<(collectionName: string) => void>();

function checkIsReadOnlyBlocked(collectionName?: string) {
  if (['appUsers', 'licenses', 'notifications', 'announcementReads', 'admins', 'sales'].includes(collectionName || '')) {
    return;
  }
  const customUserString = localStorage.getItem('pharma-auth-user');
  if (customUserString) {
    try {
      const customUser = JSON.parse(customUserString);
      if (customUser && customUser.role !== 'admin' && customUser.role !== 'super_admin') {
        if (customUser.activationStatus === 'expired') {
          const isReadOnlyActive = localStorage.getItem('pharma-read-only-expired-override') === 'true';
          if (isReadOnlyActive) {
            throw new Error('READ_ONLY_MODE_BLOCKED');
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'READ_ONLY_MODE_BLOCKED') {
        throw e;
      }
      console.error(e);
    }
  }
}

export const firebaseService = {
  onCollectionChange(listener: (collectionName: string) => void) {
    collectionListeners.add(listener);
    return () => {
      collectionListeners.delete(listener);
    };
  },

  notifyCollectionChange(collectionName: string) {
    console.log(`[FirebaseService] Notifying change in collection: ${collectionName}`);
    collectionListeners.forEach(listener => {
      try {
        listener(collectionName);
      } catch (e) {
        console.error("Change listener error:", e);
      }
    });
  },

  // Centralized Financial Save Operation
  async saveFinancialRecordOnce(data: any) {
    checkIsReadOnlyBlocked('ledgerEntries');
    const { uid, authenticated } = getEffectiveUserInfo();
    if (!authenticated) throw new Error('يرجى تسجيل الدخول أولاً');

    const amount = Number(data.amount || data.saleAmount || data.netAmount || 0);
    const date = toValidDate(data.date || data.invoiceDate || new Date());
    const dateStr = date.toISOString().split('T')[0];
    const type = data.type || data.operationType || 'other';
    const branchId = data.branchId || 'main';
    const entityId = data.entityId || data.accountId || 'none';
    const group = data.group || 'general';

    // 1. Generate unique operation key for blocking
    const operationKey = `${type}_${amount}_${dateStr}_${branchId}_${entityId}_${group}`;
    const now = Date.now();

    // Check Memory Lock (Rapid double clicks in same session)
    if (globalSavingLock.has(operationKey)) {
      const lockTime = globalSavingLock.get(operationKey);
      if (now - (lockTime || 0) < 5000) { // 5 second lock
        console.warn("[Firebase] SAVE BLOCKED DUPLICATE (Lock):", operationKey);
        return { blocked: true, id: 'lock' };
      }
    }
    globalSavingLock.set(operationKey, now);

    console.log("SAVE START:", operationKey);

    try {
      // 2. Database Duplicate Check (Existing record in Firestore)
      // Check ledgerEntries primarily
      const q = query(
        collection(db, 'ledgerEntries'),
        where('ownerId', '==', uid),
        where('type', '==', type),
        where('amount', '==', amount)
      );
      
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(d => {
        const dData = d.data();
        const dDate = toValidDate(dData.date || dData.invoiceDate);
        const dDateStr = dDate.toISOString().split('T')[0];
        const dBranch = dData.branchId || 'main';
        const dEntity = dData.entityId || dData.accountId || 'none';
        
        return dDateStr === dateStr && dBranch === branchId && dEntity === entityId;
      });

      if (existing) {
        console.warn("[Firebase] SAVE BLOCKED DUPLICATE (Firestore):", existing.id);
        return { blocked: true, id: existing.id, isUpdate: true };
      }

      // 3. Save purely to ledgerEntries (Single Source of Truth)
      const docRef = doc(collection(db, 'ledgerEntries'));
      const finalRecord = cleanData({
        ...data,
        id: docRef.id,
        ownerId: uid,
        date: date,
        amount: amount,
        type: type,
        operationType: type, // compatibility
        isCommitted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await setDoc(docRef, finalRecord);
      
      console.log("SAVE SUCCESS:", docRef.id);
      firebaseService.notifyCollectionChange('ledgerEntries');
      return { success: true, id: docRef.id };
    } catch (error) {
      globalSavingLock.delete(operationKey);
      console.error("[Firebase] SAVE FAILED:", error);
      throw error;
    }
  },

  // Generic collection operations
  async addDocument(collectionName: string, data: any) {
    checkIsReadOnlyBlocked(collectionName);
    const { uid, authenticated } = getEffectiveUserInfo();
    if (!authenticated) throw new Error('يرجى تسجيل الدخول أولاً');
    
    const docRef = doc(collection(db, collectionName));
    const now = new Date();
    
    const preparedData = cleanData({
      ...data,
      id: docRef.id,
      ownerId: uid,
      createdAt: now,
      updatedAt: now,
    });

    try {
      await setDoc(docRef, preparedData);
      console.log(`[Firebase] Successfully added to ${collectionName}:`, docRef.id);
      firebaseService.notifyCollectionChange(collectionName);
      return docRef.id;
    } catch (error) {
      console.error(`[Firebase] Error adding to ${collectionName}:`, error);
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docRef.id}`);
    }
  },

  async updateDocument(collectionName: string, id: string, data: any) {
    checkIsReadOnlyBlocked(collectionName);
    const { authenticated } = getEffectiveUserInfo();
    if (!authenticated) throw new Error('يرجى تسجيل الدخول أولاً');

    const docRef = doc(db, collectionName, id);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        console.warn(`[Firebase] Document ${collectionName}/${id} does not exist. Creating it using setDoc with merge: true.`);
        await setDoc(docRef, cleanData({
          ...data,
          id,
          createdAt: new Date(),
          updatedAt: new Date()
        }), { merge: true });
        firebaseService.notifyCollectionChange(collectionName);
        return;
      }
      await updateDoc(docRef, cleanData({
        ...data,
        updatedAt: new Date()
      }));
      console.log(`[Firebase] Successfully updated ${collectionName}/${id}`);
      firebaseService.notifyCollectionChange(collectionName);
    } catch (error) {
      console.error(`[Firebase] Error updating ${collectionName}/${id}:`, error);
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    }
  },

  async deleteDocument(collectionName: string, id: string) {
    checkIsReadOnlyBlocked(collectionName);
    const { authenticated } = getEffectiveUserInfo();
    if (!authenticated) throw new Error('يرجى تسجيل الدخول أولاً');

    try {
      console.log("Deleting from Firestore:", collectionName, id);
      const docRef = doc(db, collectionName, id);
      
      // Get data first for storage cleanup metadata
      const snapshot = await getDoc(docRef);
      const data = snapshot.data();

      // Delete the main document
      await deleteDoc(docRef);
      console.log("Firestore delete success");
      
      // Cascade-delete related records with this as sourceId using direct deleteDoc to ensure logs for each
      const relatedCols = ['ledgerEntries', 'transactions', 'entityActivities', 'notifications', 'historicalRecords'];
      for (const col of relatedCols) {
        try {
          const related = await this.queryDocuments(col, [
            { field: 'sourceId', operator: '==', value: id }
          ]);
          if (related && related.length > 0) {
            for (const item of related) {
              console.log("Deleting from Firestore:", col, item.id);
              await deleteDoc(doc(db, col, item.id!));
              console.log("Firestore delete success");
            }
          }
        } catch (relatedErr) {
          console.warn(`[Firebase] Could not cascade-delete related ${col} for ${id}:`, relatedErr);
        }
      }

      // If it's an entity, delete related by accountId or entityId too
      if (collectionName === 'entities' || collectionName === 'suppliers' || collectionName === 'customers') {
        const entityRelatedWays = [
          { col: 'ledgerEntries', field: 'accountId' },
          { col: 'entityActivities', field: 'entityId' },
          { col: 'transactions', field: 'entityId' }
        ];
        for (const way of entityRelatedWays) {
          try {
            const related = await this.queryDocuments(way.col, [
              { field: way.field, operator: '==', value: id }
            ]);
            if (related && related.length > 0) {
              for (const item of related) {
                console.log("Deleting from Firestore:", way.col, item.id);
                await deleteDoc(doc(db, way.col, item.id!));
                console.log("Firestore delete success");
              }
            }
          } catch (e) {}
        }
      }

      firebaseService.notifyCollectionChange(collectionName);
      // Notify other collections that might have been cascade-deleted
      ['ledgerEntries', 'transactions', 'entityActivities', 'notifications', 'historicalRecords'].forEach(col => 
        firebaseService.notifyCollectionChange(col)
      );

      // Clean up storage (cannot be part of Firestore delete)
      if (data && data.imageUrl) {
        try {
          await this.deleteImage(data.imageUrl);
        } catch (storageErr) {
          console.warn(`[Firebase] Storage cleanup failed for ${id}:`, storageErr);
        }
      }
      
      if (data && data.attachments && Array.isArray(data.attachments)) {
        for (const attachment of data.attachments) {
          if (attachment.url) {
            try {
              await this.deleteImage(attachment.url);
            } catch (storageErr) {
              console.warn(`[Firebase] Attachment cleanup failed for ${id}:`, storageErr);
            }
          }
        }
      }

    } catch (error) {
      console.error("Firestore delete failed:", error);
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  },

  async syncLedger(data: any) {
    // [DEPRECATED] All financial records now go through saveFinancialRecordOnce 
    // which handles unified storage in ledgerEntries.
    console.log("[Firebase] syncLedger skipped - using unified saving");
    return null;
  },

  async syncTransaction(data: any) {
    // [DEPRECATED] 
    console.log("[Firebase] syncTransaction skipped - using unified saving");
    return null;
  },

  async setDocument(collectionName: string, id: string, data: any, options: { merge?: boolean } = {}) {
    checkIsReadOnlyBlocked(collectionName);
    const { authenticated } = getEffectiveUserInfo();
    if (!authenticated) throw new Error('يرجى تسجيل الدخول أولاً');

    const docRef = doc(db, collectionName, id);
    try {
      await setDoc(docRef, cleanData({ ...data, updatedAt: new Date() }), options);
      console.log(`[Firebase] Successfully set ${collectionName}/${id}`);
      firebaseService.notifyCollectionChange(collectionName);
    } catch (error) {
      console.error(`[Firebase] Error setting ${collectionName}/${id}:`, error);
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    }
  },

  listenDocument(collectionName: string, id: string, callback: (data: any) => void) {
    const { authenticated } = getEffectiveUserInfo();
    const isGlobal = ['system', 'announcements', 'activationCodes', 'test_connection'].includes(collectionName);
    
    if (!authenticated && !isGlobal) {
      callback(null);
      return () => {};
    }

    if (!this.shouldUseRealtime()) {
      console.log(`[FirebaseService] Realtime disabled for ${collectionName}/${id}. Performing one-time fetch.`);
      getDoc(doc(db, collectionName, id)).then(snap => {
        if (snap.exists()) {
          callback({ ...snap.data(), id: snap.id });
        } else {
          callback(null);
        }
      }).catch(e => console.error(`[FirebaseService] Fetch failed for ${collectionName}/${id}:`, e));
      return () => {};
    }

    const docRef = doc(db, collectionName, id);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback({ ...doc.data(), id: doc.id });
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
    });
  },

  listenCollection(collectionName: string, callback: (data: any[]) => void, constraints: QueryConstraint[] = [], overrideOwnerId?: string | 'all') {
    const { uid, authenticated } = getEffectiveUserInfo();
    const isGlobal = ['system', 'announcements', 'activationCodes', 'test_connection'].includes(collectionName);
    
    if (!authenticated && !isGlobal) {
      callback([]);
      return () => {};
    }

    const queryConstraints = [...constraints];
    if (!isGlobal) {
      const targetOwnerId = overrideOwnerId !== undefined ? overrideOwnerId : uid;
      if (targetOwnerId !== 'all') {
        queryConstraints.push(where('ownerId', '==', targetOwnerId));
      }
    }

    const q = query(
      collection(db, collectionName),
      ...queryConstraints
    );

    if (!this.shouldUseRealtime()) {
      console.log(`[FirebaseService] Realtime disabled for collection ${collectionName}. Performing one-time fetch.`);
      getDocs(q).then(snap => {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        callback(data);
      }).catch(e => {
        console.error(`[FirebaseService] Fetch failed for collection ${collectionName}:`, e);
        callback([]);
      });
      return () => {};
    }

    console.log(`[FirebaseService] Listening to "${collectionName}"`, { isGlobal, uid, constraintsCount: queryConstraints.length });

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      callback(data);
    }, (error) => {
      console.error(`[FirebaseService] Error in listenCollection (${collectionName}):`, error);
      callback([]); // Call with empty data to stop loading state in UI
      // Optional: still report to diagnostic handler but don't let it crash the app flow
      try {
        handleFirestoreError(error, OperationType.LIST, collectionName);
      } catch (e) {
        // Already logged
      }
    });
  },
  
  async queryDocuments(collectionName: string, filters: { field: string, operator: any, value: any }[] = [], overrideOwnerId?: string | 'all') {
    const { uid, authenticated } = getEffectiveUserInfo();
    const isGlobal = ['system', 'announcements', 'activationCodes', 'test_connection'].includes(collectionName);
    
    if (!authenticated && !isGlobal) throw new Error('يرجى تسجيل الدخول أولاً');

    try {
      const constraints = filters.map(f => where(f.field, f.operator, f.value));
      const queryConstraints = [...constraints];
      if (!isGlobal) {
        const targetOwnerId = overrideOwnerId !== undefined ? overrideOwnerId : uid;
        if (targetOwnerId !== 'all') {
          queryConstraints.push(where('ownerId', '==', targetOwnerId));
        }
      }

      const q = query(
        collection(db, collectionName),
        ...queryConstraints
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.error(`[Firebase] Error querying ${collectionName}:`, error);
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  },

  async testFirebaseConnection() {
    try {
      const testRef = doc(db, "system", "config");
      
      // Add timeout to the connection test as well
      const fetchPromise = getDoc(testRef);
      const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Test connection timeout")), 15000));
      
      const snap = await Promise.race([fetchPromise, timeoutPromise]) as any;
      console.log("Firebase test success:", snap && snap.exists());
      return true;
    } catch (error) {
      console.error("Firebase test failed:", error);
      return false;
    }
  },

  shouldUseRealtime() {
    // In preview/iframe environments, real-time listeners often fail due to transport errors.
    const isIframe = window.self !== window.top;
    const isPreview = window.location.hostname.includes('ais-dev') || window.location.hostname.includes('ais-pre');
    return !(isIframe || isPreview);
  },

  async uploadImage(path: string, base64String: string) {
    const { uid, authenticated } = getEffectiveUserInfo();
    if (!authenticated) throw new Error('يرجى تسجيل الدخول أولاً');
    
    try {
      const storageRef = ref(storage, `${path}/${uid}_${Date.now()}_${Math.random().toString(36).substring(7)}`);
      // Clean base64 string (remove data:image/png;base64, if present)
      const cleanBase64 = base64String.includes(',') ? base64String.split(',')[1] : base64String;
      
      const snapshot = await uploadString(storageRef, cleanBase64, 'base64');
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('[Firebase] Error uploading image:', error);
      throw error;
    }
  },

  async uploadFileWithProgress(path: string, file: File, onProgress?: (percent: number) => void) {
    console.log(`[Firebase Storage] Starting upload to ${path}/${file.name}`);
    console.log(`[Firebase Storage] File type: ${file.type}, size: ${file.size} bytes`);
    
    const { uid, authenticated } = getEffectiveUserInfo();
    if (!authenticated) {
      console.error('[Firebase Storage] Upload failed: User not authenticated');
      throw new Error('يرجى تسجيل الدخول أولاً');
    }

    try {
      const fullPath = `${path}/${uid}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      console.log(`[Firebase Storage] Full storage path: ${fullPath}`);
      
      const storageRef = ref(storage, fullPath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`[Firebase Storage] Upload progress: ${progress.toFixed(2)}%`);
            onProgress?.(progress);
          }, 
          (error) => {
            console.error('[Firebase Storage] Upload task error:', error);
            reject(error);
          }, 
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log(`[Firebase Storage] Upload complete. Download URL: ${downloadURL}`);
              resolve(downloadURL);
            } catch (urlError) {
              console.error('[Firebase Storage] Error getting download URL:', urlError);
              reject(urlError);
            }
          }
        );
      });
    } catch (err) {
      console.error('[Firebase Storage] Error initializing upload:', err);
      throw err;
    }
  },

  async deleteImage(url: string) {
    try {
      const { ref, deleteObject } = await import('firebase/storage');
      const imageRef = ref(storage, url);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('[Firebase] Error deleting image:', error);
    }
  },

  async saveInvoice(invoiceData: any) {
    console.log("[Firebase] saveInvoice (via unified save) for:", invoiceData.invoiceNumber);

    const amount = Number(invoiceData.netAmount || invoiceData.totalAmount || invoiceData.amount || 0);
    const date = toValidDate(invoiceData.invoiceDate || invoiceData.date || new Date());
    
    const result = await this.saveFinancialRecordOnce({
      ...invoiceData,
      amount,
      date,
      type: 'invoice',
      operationType: 'invoice',
      subtype: invoiceData.isHistorical ? 'historical' : 'normal',
      debit: amount,
      credit: 0
    });

    return result as any;
  },

  async saveRevenue(data: any) {
    console.log("[Firebase] saveRevenue (via unified save)");
    
    const amount = Number(data.saleAmount || data.amount || 0);
    const date = toValidDate(data.date || new Date());
    
    const result = await this.saveFinancialRecordOnce({
      ...data,
      amount,
      date,
      type: 'revenue',
      operationType: 'revenue',
      debit: 0,
      credit: amount,
      category: 'إيرادات مبيعات',
      description: data.description || `${data.incomeTypeCustom || 'مبيعات'} - ${data.incomeType === 'cash' ? 'نقدي' : 'دين'}`
    });

    return result as any;
  },

  async saveExpense(data: any) {
    console.log("[Firebase] saveExpense (via unified save)");
    
    const amount = Number(data.amount || 0);
    const date = toValidDate(data.date || new Date());
    
    const result = await this.saveFinancialRecordOnce({
      ...data,
      amount,
      date,
      type: 'expense',
      operationType: 'expense',
      debit: amount,
      credit: 0,
      category: data.category || 'المصاريف التشغيلية',
      description: data.description || data.statement || 'مصروف'
    });

    return result as any;
  },

  async cleanupDuplicateFinancialRecords() {
    const { uid, authenticated } = getEffectiveUserInfo();
    if (!authenticated) throw new Error('يرجى تسجيل الدخول أولاً');

    try {
      let totalDeleted = 0;
      totalDeleted += await this.cleanupCollection('ledgerEntries');
      totalDeleted += await this.cleanupCollection('transactions');
      return totalDeleted;
    } catch (error) {
      console.error("[Cleanup] Error:", error);
    }
  },

  async cleanupCollection(collectionName: string) {
    const { uid } = getEffectiveUserInfo();
    const q = query(collection(db, collectionName), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const seen = new Map();
    const toDelete: string[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      const amount = Number(data.amount || data.netAmount || (data.debit > 0 ? (data as any).debit : (data as any).credit) || 0);
      if (amount === 0) continue;

      const date = toValidDate(data.date || data.invoiceDate);
      const dateStr = date.toISOString().split('T')[0];
      const type = data.type || data.operationType;
      const entityId = data.entityId || data.accountId || 'none';
      const key = `${type}_${amount}_${dateStr}_${entityId}_${(data as any).invoiceNumber || 'none'}`;

      if (seen.has(key)) {
        toDelete.push(d.id);
      } else {
        seen.set(key, d.id);
      }
    }

    if (toDelete.length > 0) {
      for (let i = 0; i < toDelete.length; i += 500) {
        await this.clearCollectionsByIds(collectionName, toDelete.slice(i, i + 500));
      }
    }
    return toDelete.length;
  },

  async cleanupDuplicateInvoices() {
    console.log("[Firebase] Starting deep cleanup for both collections...");
    const ledgerDeleted = await this.cleanupCollection('ledgerEntries');
    const txDeleted = await this.cleanupCollection('transactions');
    return ledgerDeleted + txDeleted;
  },

  async clearCollectionsByIds(collectionName: string, ids: string[]) {
    const { writeBatch, doc: docRef } = await import('firebase/firestore');
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.delete(docRef(db, collectionName, id));
    });
    await batch.commit();
  },

  async clearCollections(collectionNames: string[]) {
    const { uid, authenticated } = getEffectiveUserInfo();
    if (!authenticated) throw new Error('يرجى تسجيل الدخول أولاً');

    const { writeBatch, getDocs, collection, query, where, doc } = await import('firebase/firestore');

    for (const colName of collectionNames) {
      try {
        const q = query(collection(db, colName), where('ownerId', '==', uid));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) continue;

        // Firestore batches are limited to 500 operations
        const chunks = [];
        for (let i = 0; i < snapshot.docs.length; i += 500) {
          chunks.push(snapshot.docs.slice(i, i + 500));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(d => {
            batch.delete(doc(db, colName, d.id));
          });
          await batch.commit();
        }
        console.log(`[Firebase] Cleared collection: ${colName}`);
      } catch (error) {
        console.error(`[Firebase] Error clearing collection ${colName}:`, error);
        handleFirestoreError(error, OperationType.DELETE, colName);
      }
    }
  }
};
