import React, { createContext, useContext, useEffect, useState } from 'react';
import { googleDriveService } from '../services/googleDriveService';
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
  const [isLinked, setIsLinked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'GOOGLE_OAUTH_TOKEN' && event.data.token) {
        console.log('Received OAuth token from popup');
        setUser({
          uid: 'google-drive-user',
          email: 'Google Drive',
          displayName: 'حساب مرتبط',
        });
        setIsLinked(true);
        setLoading(false);
        toast.success("تم ربط حساب Google Drive بنجاح");
      }
    };

    window.addEventListener('message', handleOAuthMessage);

    const initGoogleAuth = async () => {
      console.log('Initializing Google Auth check...');
      // Check for token in URL hash (in case redirect flow was used)
      const redirectToken = googleDriveService.handleRedirectCallback();
      
      const token = redirectToken || googleDriveService.getAccessToken();
      if (token) {
        // Validate the token actually works
        const isValid = await googleDriveService.validateToken();
        
        if (isValid) {
          setUser({
            uid: 'google-drive-user',
            email: 'Google Drive',
            displayName: 'حساب مرتبط',
          });
          setIsLinked(true);
          if (redirectToken && !window.opener) {
            toast.success("تم ربط حساب Google Drive بنجاح");
          }
        } else {
          setIsLinked(false);
          setUser(null);
        }
      } else {
        setIsLinked(false);
        setUser(null);
      }
      setLoading(false);
    };
    initGoogleAuth();

    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const linkDrive = async () => {
    console.log('Link Drive clicked, clearing old state and initiating popup...');
    try {
      // Clear old state before starting fresh link
      googleDriveService.logout();
      setUser(null);
      setIsLinked(false);
      
      await googleDriveService.initiatePopupAuth();
    } catch (error: any) {
      console.error('Link Drive error:', error);
      toast.error("حدث خطأ أثناء محاولة فتح نافذة تسجيل الدخول");
    }
  };

  const unlinkDrive = async () => {
    googleDriveService.logout();
    setUser(null);
    setIsLinked(false);
    toast.success("تم فصل حساب Google Drive");
  };

  return (
    <GoogleAuthContext.Provider value={{ 
      user, 
      isDriveLinked: isLinked, 
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
