import { tokenStorage } from '@/lib/storage';
import { API_BASE } from '@/lib/config';

type UploadFields = {
  title: string;
  description?: string;
  format: string;   // FULL | CLIP | REEL | PODCAST
  category: string; // MOVIE | PODCAST | ...
};

type PickedFile = { uri: string; name: string; type: string };

// Returns the created content object from the backend.
export async function uploadVideoFile(
  file: PickedFile,
  fields: UploadFields,
  onProgress?: (pct: number) => void,
): Promise<any> {
  const token = await tokenStorage.getAccessToken();

  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  form.append('title', fields.title);
  if (fields.description) form.append('description', fields.description);
  form.append('format', fields.format);
  form.append('category', fields.category);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/creators/me/content/upload-file`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // NOTE: do NOT set Content-Type — RN sets the multipart boundary itself.

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          resolve(json?.data ?? json);
        } catch {
          resolve(null);
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const j = JSON.parse(xhr.responseText);
          msg = j?.error?.message || msg;
        } catch { /* ignore */ }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out.'));
    xhr.timeout = 30 * 60 * 1000; // 30 min for long movies

    xhr.send(form);
  });
}