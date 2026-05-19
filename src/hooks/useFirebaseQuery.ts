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

    console.log(`[useFirebaseQuery] Subscribed to "${collectionName}"`, { isPublicCollection, hasUser: !!user });
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
  }, [collectionName, user, isLocallyAuth, constraints]);

  return { data, loading };
}
