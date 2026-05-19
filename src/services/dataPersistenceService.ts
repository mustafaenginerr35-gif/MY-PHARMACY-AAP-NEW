import { db } from '../db';
import { toast } from 'sonner';

/**
 * DataPersistenceService
 * Handles core data operations for export, import, and health checks
 */
export const DataPersistenceService = {
  /**
   * Export all indexedDB tables to a single JSON file
   */
  async exportToJSON() {
    try {
      const data: Record<string, any[]> = {};
      const tables = db.tables;
      
      for (const table of tables) {
        data[table.name] = await table.toArray();
      }
      
      const exportObj = {
        version: db.verno,
        timestamp: new Date().toISOString(),
        data: data,
        deviceInfo: navigator.userAgent,
        app: 'PharmaSystem'
      };
      
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `pharma_backup_${new Date().toISOString().split('T')[0]}_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('تم تصدير نسخة احتياطية من جميع البيانات بنجاح');
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('فشل في تصدير البيانات: ' + (error instanceof Error ? error.message : 'خطأ غير معروف'));
      return false;
    }
  },

  /**
   * Import data from a JSON file into indexedDB
   * WARNING: This replaces current data
   */
  async importFromJSON(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          
          if (!parsed.data || typeof parsed.data !== 'object') {
            throw new Error('ملف النسخة الاحتياطية غير صالح');
          }
          
          const confirmImport = window.confirm('تحذير: سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في الملف. هل تريد الاستمرار؟');
          if (!confirmImport) {
            resolve(false);
            return;
          }
          
          toast.loading('جاري استيراد البيانات...');
          
          for (const tableName in parsed.data) {
            const table = (db as any)[tableName];
            if (table) {
              await table.clear();
              // Handle potential empty tables in backup
              if (parsed.data[tableName] && parsed.data[tableName].length > 0) {
                await table.bulkAdd(parsed.data[tableName]);
              }
            }
          }
          
          toast.dismiss();
          toast.success('تم استعادة البيانات بنجاح! سيتم إعادة تحميل التطبيق...');
          setTimeout(() => window.location.reload(), 2000);
          resolve(true);
        } catch (error) {
          console.error('Import failed:', error);
          toast.dismiss();
          toast.error('فشل في استيراد البيانات: ' + (error instanceof Error ? error.message : 'تنسيق الملف غير مدعوم'));
          reject(error);
        }
      };
      
      reader.onerror = () => {
        toast.error('فشل في قراءة الملف');
        reject(new Error('File reading failed'));
      };
      
      reader.readAsText(file);
    });
  },

  /**
   * Check database health and item counts
   */
  async getDatabaseStats() {
    try {
      const stats: Record<string, number> = {};
      for (const table of db.tables) {
        stats[table.name] = await table.count();
      }
      return stats;
    } catch (error) {
      console.error('Stats failed:', error);
      return null;
    }
  },

  /**
   * Clear all local storage and indexedDB (Factory Reset)
   */
  async factoryReset() {
    const confirmed = window.confirm('خطر: سيتم حذف جميع البيانات والإعدادات نهائياً. هل أنت متأكد؟');
    if (!confirmed) return;
    
    try {
      localStorage.clear();
      await db.delete();
      toast.success('تم مسح جميع البيانات، جاري إعادة التشغيل...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error('فشل في مسح البيانات');
    }
  },

  /**
   * Reset all test data across Local (IndexedDB) and Remote (Firebase)
   * while preserving user account and settings.
   */
  async resetTestData() {
    try {
      // 1. Clear Local Tables (IndexedDB)
      const tables = [
        'transactions', 'entities', 'ledgerEntries', 'notifications', 
        'systemLogs', 'customerDebts', 'deadlines', 'bonuses', 
        'employees', 'employeeAttendance', 'branches', 'historicalRecords', 
        'medicineRequests', 'expiredDamagedLosses', 'entityActivities', 
        'openingCash', 'supplierOpeningBalances', 'announcementReads'
      ];
      
      console.log(`[Reset] Starting cleanup for ${tables.length} tables...`);
      
      for (const tableName of tables) {
        const table = (db as any)[tableName];
        if (table) {
          await table.clear();
          console.log(`[Persistence] Cleared local table: ${tableName}`);
        }
      }

      // 2. Clear Firebase Collections
      try {
        const { firebaseService } = await import('./firebaseService');
        
        // Before deleting, try to collect image URLs for storage cleanup
        const collectionsWithImages = ['ledgerEntries', 'entities', 'expiredDamagedLosses'];
        for (const col of collectionsWithImages) {
          const docs = await firebaseService.queryDocuments(col);
          for (const d of docs) {
            const docData = d as any;
            if (docData.imageUrl) await firebaseService.deleteImage(docData.imageUrl);
            if (docData.attachments && Array.isArray(docData.attachments)) {
              for (const att of docData.attachments) {
                if ((att as any).url) await firebaseService.deleteImage((att as any).url);
              }
            }
          }
        }

        // Clear all collections in Firebase
        await firebaseService.clearCollections(tables);
        
        // 3. Create default branch "الفرع الرئيسي"
        const defaultBranchId = await firebaseService.addDocument('branches', {
          name: 'الفرع الرئيسي',
          status: 'active',
          type: 'main',
          isDefault: true,
          createdAt: new Date().toISOString()
        });

        // Add to Local DB as well for immediate sync
        if ((db as any).branches) {
           await (db as any).branches.add({
             id: defaultBranchId,
             name: 'الفرع الرئيسي',
             status: 'active',
             type: 'main',
             isDefault: true,
             createdAt: new Date().toISOString()
           });
        }
        
      } catch (fbError) {
        console.warn("[Reset] Firebase clear failed or not authenticated:", fbError);
      }

      // 4. Partial LocalStorage cleanup
      const keysToKeep = [
        'pharma-is-authenticated', 
        'pharma-auth-user', 
        'pharma-theme', 
        'pharma-access-code', 
        'firebase:auth:host',
        'pharma-active-tab'
      ];
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.some(k => key.includes(k))) {
          localStorage.removeItem(key);
        }
      });

      console.log("[Reset] All test data has been cleared successfully.");
      return true;
    } catch (error) {
      console.error('Reset failed:', error);
      throw error;
    }
  },

  /**
   * Financial Reset (Requirement: Clear transactions/ledger but keep entity names)
   */
  async resetFinancialAccounts() {
    try {
      const financialTables = [
        'transactions', 'ledgerEntries', 'historicalRecords', 
        'expiredDamagedLosses', 'openingCash', 'supplierOpeningBalances', 
        'employeeAttendance', 'customerDebts', 'bonuses', 
        'entityActivities', 'notifications', 'systemLogs',
        'deadlines', 'medicineRequests'
      ];
      
      console.log(`[Financial Reset] Clearing ${financialTables.length} financial tables...`);
      
      // 1. Clear Local Tables
      for (const tableName of financialTables) {
        const table = (db as any)[tableName];
        if (table) await table.clear();
      }

      // 2. Clear Firebase Collections
      try {
        const { firebaseService } = await import('./firebaseService');
        await firebaseService.clearCollections(financialTables);
        
        // 3. Reset balances for all entities (Suppliers/Customers)
        const entities = await firebaseService.queryDocuments('entities');
        for (const entity of entities) {
          await firebaseService.updateDocument('entities', entity.id!, { 
            balance: 0,
            openingBalance: 0,
            remainingBalance: 0
          });
        }

        // 4. Update local entities as well
        if ((db as any).entities) {
          const localEntities = await (db as any).entities.toArray();
          for (const le of localEntities) {
            await (db as any).entities.update(le.id, { 
              balance: 0,
              openingBalance: 0,
              remainingBalance: 0
            });
          }
        }

      } catch (fbError) {
        console.warn("[Financial Reset] Firebase operations failed:", fbError);
      }

      // 5. Clear specific LocalStorage keys related to reports
      const reportKeys = ['stats-cache', 'report-last-result'];
      Object.keys(localStorage).forEach(key => {
        if (reportKeys.some(rk => key.includes(rk))) {
          localStorage.removeItem(key);
        }
      });

      console.log("[Financial Reset] Completed successfully.");
      return true;
    } catch (error) {
      console.error('Financial Reset failed:', error);
      throw error;
    }
  }
};
