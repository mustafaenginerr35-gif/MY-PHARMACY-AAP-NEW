import React, { createContext, useContext, useEffect, useState } from 'react';
import { googleDriveService } from '@/src/services/googleDriveService';
import { toast } from 'sonner';

interface GoogleUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface GoogleAuthContextType {
  user: GoogleUser | null;
  isDriveLinked: boolean;
  loading: boolean;
  linkDrive: () => Promise<void>;
  unlinkDrive: () => Promise<void>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGoogleUserInfo = async (token: string) => {
    try {
      const userInfo = await googleDriveService.fetchUserInfo();
      setUser({
        uid: userInfo.sub,
        email: userInfo.email,
        displayName: userInfo.name,
        photoURL: userInfo.picture
      });
    } catch (error) {
      console.error('Failed to fetch Google user info:', error);
      googleDriveService.logout();
      setUser(null);
    }
  };

  useEffect(() => {
    const initGoogleAuth = async () => {
      console.log('Initializing Google Auth for Drive...');
      // Check for token in URL hash (redirect callback)
      const redirectToken = googleDriveService.handleRedirectCallback();
      
      const token = redirectToken || googleDriveService.getAccessToken();
      if (token) {
        await fetchGoogleUserInfo(token);
        if (redirectToken) {
          toast.success("تم ربط حساب Google Drive بنجاح");
        }
      }
      setLoading(false);
    };
    initGoogleAuth();
  }, []);

  const linkDrive = async () => {
    console.log('Link Drive clicked, initiating redirect...');
    try {
      await googleDriveService.initiateRedirectAuth();
    } catch (error: any) {
      console.error('Link Drive error:', error);
      toast.error(`فشل ربط Google Drive: ${error.message || 'خطأ غير معروف'}`);
    }
  };

  const unlinkDrive = async () => {
    googleDriveService.logout();
    setUser(null);
    toast.success("تم فصل حساب Google Drive");
  };

  return (
    <GoogleAuthContext.Provider value={{ 
      user, 
      isDriveLinked: !!user, 
      loading, 
      linkDrive, 
      unlinkDrive 
    }}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (context === undefined) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
}
