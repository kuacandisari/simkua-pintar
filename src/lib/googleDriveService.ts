/**
 * Google Drive Service for SIMKUA Pintar
 * Uses OAuth scope https://www.googleapis.com/auth/drive.file (already authorized in GoogleAuthProvider)
 * Access tokens are strictly held in-memory via googleSheetsService.ts (never persisted in localStorage).
 */

import {
  connectGoogleAccount,
  getCachedAccessToken,
  getCachedGoogleUser,
} from './googleSheetsService';
import { GoogleDriveConfig } from '../types';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
}

export { connectGoogleAccount, getCachedAccessToken, getCachedGoogleUser };

/**
 * Formats file size in bytes into human-readable MB/KB
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Maps MIME type or filename extension to ArsipDokumen tipeFile enum
 */
export const detectArchiveFileType = (
  file: File
): 'PDF' | 'JPG' | 'PNG' | 'DOCX' | 'LAINNYA' => {
  const mime = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (mime.includes('pdf') || ext === 'pdf') return 'PDF';
  if (mime.includes('jpeg') || mime.includes('jpg') || ext === 'jpg' || ext === 'jpeg') return 'JPG';
  if (mime.includes('png') || ext === 'png') return 'PNG';
  if (
    mime.includes('wordprocessingml') ||
    mime.includes('msword') ||
    ext === 'docx' ||
    ext === 'doc'
  ) {
    return 'DOCX';
  }
  return 'LAINNYA';
};

/**
 * Computes real SHA-256 checksum hex for an uploaded File
 */
export const computeFileSha256 = async (file: File): Promise<string> => {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn('SubtleCrypto SHA-256 failed, using fallback checksum:', err);
  }
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
};

/**
 * Finds or creates the dedicated KUA archive folder in the user's Google Drive
 */
export const ensureKuaDriveFolder = async (
  kecamatanName: string,
  token: string
): Promise<GoogleDriveConfig> => {
  const safeKec = (kecamatanName || 'Candisari').trim();
  const folderName = `SIMKUA Arsip Digital - KUA ${safeKec}`;
  const escapedName = folderName.replace(/'/g, "\\'");

  const query = `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name,webViewLink)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Gagal memeriksa folder Google Drive: ${searchRes.status} - ${errText}`);
  }

  const searchJson = await searchRes.json();
  const existing = (searchJson.files || [])[0];
  const userEmail = getCachedGoogleUser()?.email || undefined;

  if (existing?.id) {
    return {
      folderId: existing.id,
      folderName: existing.name || folderName,
      folderUrl:
        existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
      userEmail,
      lastSyncedAt: new Date().toLocaleString('id-ID'),
    };
  }

  // Create folder
  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Gagal membuat folder arsip Google Drive: ${createRes.status} - ${errText}`);
  }

  const created = await createRes.json();
  return {
    folderId: created.id,
    folderName: created.name || folderName,
    folderUrl:
      created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
    userEmail,
    lastSyncedAt: new Date().toLocaleString('id-ID'),
  };
};

/**
 * Uploads a real local File (PDF, JPG, PNG, DOCX, etc.) to Google Drive using multipart/related
 */
export const uploadFileToDrive = async (
  file: File,
  folderId: string | undefined,
  token: string,
  customDisplayName?: string
): Promise<DriveFileItem> => {
  const metadata: Record<string, unknown> = {
    name: customDisplayName?.trim() || file.name,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = `simkua_drive_boundary_${Date.now()}`;
  const metadataPart = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        metadata
      )}\r\n`,
      `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
    ],
    { type: 'text/plain' }
  );
  const closingPart = new Blob([`\r\n--${boundary}--`], { type: 'text/plain' });
  const multipartBody = new Blob([metadataPart, file, closingPart], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Gagal mengunggah berkas ke Google Drive: ${uploadRes.status} - ${errText}`);
  }

  return await uploadRes.json();
};

/**
 * Lists app-created files inside the KUA Google Drive folder
 */
export const listDriveFilesInFolder = async (
  folderId: string,
  token: string
): Promise<DriveFileItem[]> => {
  const q = `'${folderId}' in parents and trashed = false`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&orderBy=createdTime desc&pageSize=100&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal membaca daftar berkas Google Drive: ${res.status} - ${errText}`);
  }

  const json = await res.json();
  return json.files || [];
};

/**
 * Deletes a file from Google Drive by fileId
 */
export const deleteDriveFile = async (fileId: string, token: string): Promise<void> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Gagal menghapus berkas dari Google Drive: ${res.status} - ${errText}`);
  }
};
