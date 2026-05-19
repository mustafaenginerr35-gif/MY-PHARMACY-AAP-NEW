import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VERSION_INFO } from '../constants/version';

export const migrationService = {
  async checkAndRunMigrations() {
    console.log("[MigrationService] Checking migrations...");
    const configPath = 'system/config';
    const configRef = doc(db, 'system', 'config');
    console.log("[MigrationService] START - VERSION PATH:", configPath);
    
    try {
      const configSnap = await getDoc(configRef);
      console.log("[MigrationService] SNAP EXISTS:", configSnap.exists());

      if (!configSnap.exists()) {
        console.log("[MigrationService] Initializing system doc at path:", configPath);
        // First time initialization with new structure
        // Using 1.2.1 to ensure update banner shows up on initial setup
        await setDoc(configRef, {
          appVersion: '1.2.1',
          schemaVersion: VERSION_INFO.schemaVersion,
          updatedAt: serverTimestamp(),
          forceUpdate: false
        });
        console.log("[MigrationService] System doc CREATED successfully.");
        return;
      }

      const currentData = configSnap.data();
      console.log("[MigrationService] System doc FOUND. SNAP DATA:", currentData);
      
      // Repair if needed
      if (currentData && !currentData.appVersion) {
        console.warn("[MigrationService] System doc is missing appVersion. Repairing...");
        await updateDoc(configRef, {
          appVersion: '1.2.1',
          schemaVersion: VERSION_INFO.schemaVersion,
          updatedAt: serverTimestamp()
        });
        console.log("[MigrationService] System doc repaired successfully.");
      }
      
      // Future migration logic based on schemaVersion
      // if (currentData.schemaVersion < '1.1.0') { ... }
    } catch (e) {
      console.error("[MigrationService] Error during migrations/init:", e);
    }
  },

  async updateSystemVersion(newAppVersion: string, newSchemaVersion: string, forceUpdate = false) {
    const configRef = doc(db, 'system', 'config');
    await updateDoc(configRef, {
      appVersion: newAppVersion,
      schemaVersion: newSchemaVersion,
      updatedAt: serverTimestamp(),
      forceUpdate
    });
  }
};
