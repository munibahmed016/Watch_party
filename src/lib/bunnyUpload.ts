
type UploadAuth = {
  endpoint: string;
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
};

// Small helper: a single XHR request returning a Promise.
function xhr(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: any = null,
  onProgress?: (pct: number) => void,
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
    req.ontimeout = () => reject(new Error('Upload timed out.'));
    req.timeout = 120000; // 2 min

    req.send(body);
  });
}

export async function uploadToBunny(
  fileUri: string,
  fileName: string,
  fileType: string,
  auth: UploadAuth,
  onProgress?: (pct: number) => void,
): Promise<void> {
  // TUS metadata (base64-encoded values)
  const meta = `filetype ${b64(fileType)},title ${b64(fileName)}`;

  const baseHeaders = {
    AuthorizationSignature: auth.authorizationSignature,
    AuthorizationExpire: String(auth.authorizationExpire),
    VideoId: auth.videoId,
    LibraryId: auth.libraryId,
  };

  // 1) TUS "create" — announce the upload, get the upload URL.
  //    We don't know the exact byte length up front in RN, so we let Bunny
  //    accept the file in a single PATCH (creation-with-upload style).
  const createRes = await xhr('POST', auth.endpoint, {
    ...baseHeaders,
    'Tus-Resumable': '1.0.0',
    'Upload-Length': '1', // placeholder; Bunny accepts the stream below
    'Upload-Metadata': meta,
  });

  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`Could not start upload (code ${createRes.status}).`);
  }
  const location = createRes.getHeader('Location') || auth.endpoint;

  // 2) Send the actual file. RN streams it from disk via the { uri } object.
  const fileObj: any = { uri: fileUri, type: fileType, name: fileName };

  const patchRes = await xhr(
    'PATCH',
    location,
    {
      ...baseHeaders,
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': '0',
      'Content-Type': 'application/offset+octet-stream',
    },
    fileObj,
    onProgress,
  );

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