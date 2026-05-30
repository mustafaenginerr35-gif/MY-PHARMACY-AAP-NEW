import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { QueryConstraint } from 'firebase/firestore';

const DEFAULT_CONSTRAINTS: QueryConstraint[] = [];

export function useFirebaseQuery<T>(collectionName: string, constraints: QueryConstraint[] = DEFAULT_CONSTRAINTS) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  const isLocallyAuth = localStorage.getItem('pharma-is-authenticated') === 'true';

  useEffect(() => {
    const isPublicCollection = ['system', 'branches', 'announcements', 'activationCodes'].includes(collectionName);
    
    if (!user && !isLocallyAuth && !isPublicCollection) {
      setData([]);
      setLoading(false);
      return;
    }

    console.log(`[useFirebaseQuery] Subscribed to "${collectionName}" (trigger: ${refreshTrigger})`, { isPublicCollection, hasUser: !!user });
    const unsubscribe = firebaseService.listenCollection(
      collectionName, 
      (newData) => {
        console.log(`[useFirebaseQuery] Success! Received ${newData.length} docs from "${collectionName}":`, newData);
        if (newData.length > 0) {
           console.log(`[useFirebaseQuery] All IDs in "${collectionName}":`, newData.map(d => d.id));
        }
        setData(newData);
        setLoading(false);
      },
      constraints
    );

    return () => unsubscribe();
  }, [collectionName, user, isLocallyAuth, constraints, refreshTrigger]);

  useEffect(() => {
    const unsubscribe = (firebaseService as any).onCollectionChange?.((changedCollectionName: string) => {
      // Re-fetch triggers for related entities and states to keep lists cohesive
      const isRelated = 
        changedCollectionName === collectionName ||
        (collectionName === 'ledgerEntries' && ['ledgerEntries', 'transactions', 'invoices', 'revenues', 'expenses'].includes(changedCollectionName)) ||
        (collectionName === 'entities' && ['entities', 'suppliers', 'ledgerEntries'].includes(changedCollectionName)) ||
        (collectionName === 'transactions' && ['transactions', 'ledgerEntries'].includes(changedCollectionName)) ||
        (collectionName === 'deadlines' && ['deadlines', 'ledgerEntries'].includes(changedCollectionName));

      if (isRelated) {
        console.log(`[useFirebaseQuery] Refetching collection "${collectionName}" because "${changedCollectionName}" was updated`);
        setRefreshTrigger(prev => prev + 1);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [collectionName]);

  const refetch = () => setRefreshTrigger(prev => prev + 1);

  return { data, loading, refetch };
}
