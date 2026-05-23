/// <reference types="vite/client" />

/**
 * Google Drive Sync Service
 * Handles backup of local Firestore data to Google Drive
 */

import { toast } from 'sonner';

const DRIVE_FOLDER_NAME = 'PharmacySystemBackups';
const IMAGES_FOLDER_NAME = 'PharmacySystemImages';
const ARCHIVE_FOLDER_NAME = 'archive_old_images';

export interface SyncSettings {
  enabled: boolean;
  interval: number; // in minutes
  lastSync: string | null;
}

export interface ImageManagementSettings {
  retentionYears: number; // 0 for no delete, 1, 3, 5
  autoDelete: boolean;
  lastCleanup: string | null;
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  mimeType: string;
  size?: string;
}

class GoogleDriveService {
  private accessToken: string | null = localStorage.getItem('google_drive_access_token');
  private clientId: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  isConfigured() {
    return !!this.clientId;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    localStorage.setItem('google_drive_access_token', token);
  }

  getAccessToken() {
    return this.accessToken;
  }

  logout() {
    this.accessToken = null;
    localStorage.removeItem('google_drive_access_token');
  }

  async initiatePopupAuth() {
    console.log('Initiating Google OAuth popup...');
    if (!this.clientId) {
      console.error('Google Client ID is missing!');
      toast.error('Google Client ID is missing. Please configure VITE_GOOGLE_CLIENT_ID in your settings.');
      return;
    }

    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const redirectUri = appUrl.endsWith('/') ? appUrl : `${appUrl}/`;
    
    console.log('OAuth Redirect URI:', redirectUri);
    // Strictly limited scope for app-specific data only
    const scopes = [
      'https://www.googleapis.com/auth/drive.appdata'
    ].join(' ');

    // response_type=token for implicit flow (no refresh token without secret)
    // prompt=select_account forces account selection
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&include_granted_scopes=true&prompt=select_account%20consent`;
    
    console.log('Opening Google OAuth popup...');
    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl, 
      'google-oauth', 
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      toast.error('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة للمتصفح لتتمكن من ربط الحساب.');
    }
  }

  handleRedirectCallback(): string | null {
    const hash = window.location.hash;
    if (!hash) return null;

    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    const error = params.get('error');

    if (token) {
      this.setAccessToken(token);
      
      // If we are in a popup, notify the opener and close
      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'GOOGLE_OAUTH_TOKEN', token }, window.location.origin);
          window.close();
        } catch (e) {
          console.error('Failed to notify opener:', e);
        }
      }

      // Clean up the URL hash without reloading
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return token;
    }

    if (error) {
      console.error('OAuth error detected in URL hash:', error);
      toast.error(`فشل تسجيل الدخول: ${error}`);
      
      if (window.opener) {
        window.close();
      }
      
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    
    return null;
  }

  async validateToken(): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      // Try a simple list request to the appDataFolder to verify token
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?pageSize=1&spaces=appDataFolder`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );

      if (response.status === 401) {
        console.warn('Token expired or invalid, logging out...');
        this.logout();
        return false;
      }

      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  async authenticate(): Promise<string> {
    // This method is now deprecated in favor of popup auth
    // but kept for compatibility if needed elsewhere.
    this.initiatePopupAuth();
    return new Promise(() => {}); // Never resolves as page may reload or popup open
  }

  async fetchUserInfo(): Promise<any> {
    // User info is unavailable with limited appdata scope (privacy-friendly)
    return null;
  }

  async uploadBackup(data: any): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const fileName = `pharmacy_backup.json`;
    const content = JSON.stringify(data, null, 2);

    // Search for existing backup file in appDataFolder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and 'appDataFolder' in parents and trashed=false&spaces=appDataFolder`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      }
    );
    const searchData = await searchResponse.json();
    const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

    const metadata = {
      name: fileName,
      parents: existingFile ? undefined : ['appDataFolder'],
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    let response;
    if (existingFile) {
      // Update existing file
      response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${this.accessToken}` },
          body: form,
        }
      );
    } else {
      // Create new file
      response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.accessToken}` },
          body: form,
        }
      );
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${error.error?.message || response.statusText}`);
    }
  }

  async restoreFromDrive(): Promise<any | null> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const fileName = `pharmacy_backup.json`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and 'appDataFolder' in parents and trashed=false&spaces=appDataFolder&fields=files(id, name)`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      }
    );

    if (!response.ok) throw new Error('Failed to list backup files');
    const data = await response.json();
    
    if (!data.files || data.files.length === 0) {
      return null;
    }

    const fileId = data.files[0].id;
    
    // Download the file content
    const downloadResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      }
    );

    if (!downloadResponse.ok) throw new Error('Failed to download backup file');
    return await downloadResponse.json();
  }

  // Helper to find or create folders - now simplified or removed for appData
  private async findOrCreateFolder(folderName: string): Promise<string> {
    // This now returns 'appDataFolder' directly for internal uses if needed
    // But we prefer explicit 'appDataFolder' in parents array.
    return 'appDataFolder';
  }
}

export const googleDriveService = new GoogleDriveService();
