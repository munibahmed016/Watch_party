// TUS upload client for Bunny Stream
type UploadAuth = {
  endpoint: string;            // https://video.bunnycdn.com/tusupload
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
};

// XHR request helper with upload progress tracking
function xhr(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: any = null,
  onProgress?: (pct: number) => void,
  timeoutMs = 0,
): Promise<{ status: number; getHeader: (h: string) => string | null }> {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open(method, url);
    Object.entries(headers).forEach(([k, v]) => req.setRequestHeader(k, v));

    if (onProgress && req.upload) {
      req.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    req.onload = () => resolve({ status: req.status, getHeader: (h) => req.getResponseHeader(h) });
    req.onerror = () => reject(new Error('Network request failed during upload.'));
    req.ontimeout = () => reject(new Error('Upload timed out. Please check your connection and try again.'));
    if (timeoutMs > 0) req.timeout = timeoutMs;

    req.send(body);
  });
}

export async function uploadToBunny(
  fileUri: string,
  fileName: string,
  fileType: string,
  auth: UploadAuth,
  onProgress?: (pct: number) => void,
  fileSize?: number,
): Promise<void> {
  const meta = `filetype ${b64(fileType)},title ${b64(fileName)}`;

  const baseHeaders = {
    AuthorizationSignature: auth.authorizationSignature,
    AuthorizationExpire: String(auth.authorizationExpire),
    VideoId: auth.videoId,
    LibraryId: auth.libraryId,
  };

  // 1) TUS initialization request
  const createHeaders: Record<string, string> = {
    ...baseHeaders,
    'Tus-Resumable': '1.0.0',
    'Upload-Metadata': meta,
  };
  if (fileSize && fileSize > 0) {
    createHeaders['Upload-Length'] = String(fileSize);
  } else {
    createHeaders['Upload-Defer-Length'] = '1';
  }

  const createRes = await xhr('POST', auth.endpoint, createHeaders, null, undefined, 120000);

  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`Could not start upload (code ${createRes.status}).`);
  }
  const location = createRes.getHeader('Location') || auth.endpoint;

  // 2) Send file data via PATCH
  const fileObj: any = { uri: fileUri, type: fileType, name: fileName };

  const patchHeaders: Record<string, string> = {
    ...baseHeaders,
    'Tus-Resumable': '1.0.0',
    'Upload-Offset': '0',
    'Content-Type': 'application/offset+octet-stream',
  };
  if (fileSize && fileSize > 0) {
    patchHeaders['Upload-Length'] = String(fileSize);
  }

  const patchRes = await xhr('PATCH', location, patchHeaders, fileObj, onProgress, 0);

  if (patchRes.status !== 204 && patchRes.status !== 200) {
    throw new Error(`Upload failed (code ${patchRes.status}).`);
  }
  onProgress?.(100);
}

// base64 for short ASCII strings (RN has global btoa in most setups; fallback included)
function b64(s: string): string {
  try {
    // eslint-disable-next-line no-undef
    if (typeof btoa === 'function') return btoa(s);
  } catch { /* fall through */ }
  // minimal fallback
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let out = '', i = 0;
  while (i < s.length) {
    const c1 = s.charCodeAt(i++), c2 = s.charCodeAt(i++), c3 = s.charCodeAt(i++);
    const e1 = c1 >> 2, e2 = ((c1 & 3) << 4) | (c2 >> 4);
    const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (c3 >> 6);
    const e4 = isNaN(c3) ? 64 : c3 & 63;
    out += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }
  return out;
}