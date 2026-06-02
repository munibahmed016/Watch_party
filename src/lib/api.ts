// src/lib/api.ts
// Typed fetch-based API client for ALL Phase 1 + Phase 2 endpoints.
// Auto-refresh on 401, friendly errors, FormData support for uploads.

import { API_BASE } from './config';
import { tokenStorage } from './storage';

// =====================================================================
// Response shapes
// =====================================================================

export type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
};

export type ApiErrorBody = {
  success: false;
  error: { message: string; code: string; details?: unknown };
};

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// =====================================================================
// Request internals
// =====================================================================

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  retryOn401?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;
const authFailureListeners = new Set<() => void>();

export const onAuthFailure = (fn: () => void): (() => void) => {
  authFailureListeners.add(fn);
  return () => authFailureListeners.delete(fn);
};

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) return null;
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as ApiSuccess<{
        accessToken: string;
        refreshToken: string;
      }>;
      await tokenStorage.setTokens(json.data.accessToken, json.data.refreshToken);
      return json.data.accessToken;
    } catch {
      return null;
    } finally {
      setTimeout(() => { refreshPromise = null; }, 50);
    }
  })();
  return refreshPromise;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, auth = true, retryOn401 = true } = opts;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const finalHeaders: Record<string, string> = { ...headers };
  if (body !== undefined && !isFormData) finalHeaders['Content-Type'] = 'application/json';
  finalHeaders['Accept'] = 'application/json';

  if (auth) {
    const token = await tokenStorage.getAccessToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch (err) {
    throw new ApiError(0, {
      message: 'Network error. Please check your connection and that the server is reachable.',
      code: 'NETWORK_ERROR',
      details: String(err),
    });
  }

  if (res.status === 401 && retryOn401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(path, { ...opts, retryOn401: false });
    await tokenStorage.clear();
    authFailureListeners.forEach((fn) => fn());
  }

  let payload: ApiSuccess<T> | ApiErrorBody;
  try {
    payload = await res.json();
  } catch {
    throw new ApiError(res.status, {
      message: `Server returned ${res.status} with no JSON body`,
      code: 'INVALID_RESPONSE',
    });
  }

  if (!res.ok || !payload.success) {
    const errBody = 'error' in payload ? payload.error : { message: 'Unknown error', code: 'UNKNOWN' };
    throw new ApiError(res.status, errBody);
  }

  return (payload as ApiSuccess<T>).data;
}

// =====================================================================
// Domain types (mirror backend)
// =====================================================================

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  phoneNumber: string | null;
};

export type AuthTokens = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type PublicUser = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  isOnline?: boolean;
  lastSeenAt?: string | null;
};

export type FriendRequestSummary = {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';
  createdAt: string;
  sender?: PublicUser;
  receiver?: PublicUser;
};

// ---- Posts (News & Events) ----

export type PostKind = 'NEWS' | 'EVENT';
export type PostVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
export type RsvpStatus = 'GOING' | 'MAYBE' | 'NOT_GOING';

export type Post = {
  id: string;
  kind: PostKind;
  visibility: PostVisibility;
  title: string;
  body: string | null;
  coverUrl: string | null;
  eventAt: string | null;       // ISO date, EVENT only
  eventEndAt: string | null;
  location: string | null;
  rsvpLimit: number | null;
  likeCount: number;
  rsvpCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  isLikedByMe: boolean;
  myRsvpStatus: RsvpStatus | null;
};

export type RoomVideoProvider = 'YOUTUBE' | 'VIMEO' | 'ARCHIVE' | 'CUSTOM' | null;
export type RoomStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';

export type Room = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  ownerId: string;
  isPrivate: boolean;
  maxMembers: number;
  videoUrl: string | null;
  videoProvider: RoomVideoProvider;
  videoId: string | null;
  videoTitle: string | null;
  videoPosition: number;
  isPlaying: boolean;
  lastSyncAt: string;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
  owner: PublicUser;
  memberCount: number;
  members: Array<{
    id: string;
    role: 'OWNER' | 'MODERATOR' | 'MEMBER';
    joinedAt: string;
    user: PublicUser;
  }>;
};

export type RoomPreview = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  isPrivate: boolean;
  owner: PublicUser;
  memberCount: number;
};

export type RoomSyncState = {
  videoUrl: string | null;
  videoProvider: RoomVideoProvider;
  videoId: string | null;
  position: number;
  isPlaying: boolean;
  serverTime: number;
};

export type Message = {
  id: string;
  chatId: string | null;
  roomId: string | null;
  senderId: string;
  sender: PublicUser;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'SYSTEM';
  mediaUrl: string | null;
  replyToId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
};

export type Chat = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  avatarUrl: string | null;
  otherUser: { id: string; username: string } | null;
  members: PublicUser[];
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
};

export type Notification = {
  id: string;
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'ROOM_INVITE' | 'NEW_MESSAGE' | 'SYSTEM';
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
};

export type DiscoverMovie = {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string;
  rating: number;
};

export type CuratedFilm = {
  id: string;
  title: string;
  year: number;
  genre: string[];
  description: string;
  posterUrl: string;
  videoUrl: string;
  duration: number;
  rating?: number;
};

export type ArchiveMovie = {
  identifier: string;
  title: string;
  description: string | null;
  year: number | null;
  posterUrl: string;
  videoUrl: string;
  watchUrl: string;
  creator: string | null;
  duration: number | null;
};

// =====================================================================
// API namespaces
// =====================================================================

export const authApi = {
  register: (input: {
    email: string;
    password: string;
    confirmPassword?: string;
    phoneNumber?: string;
    username?: string;
    fullName?: string;
  }) => request<AuthTokens>('/auth/register', { method: 'POST', body: input, auth: false }),

  login: (identifier: string, password: string) =>
    request<AuthTokens>('/auth/login', { method: 'POST', body: { identifier, password }, auth: false }),

  refresh: (refreshToken: string) =>
    request<AuthTokens>('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false }),

  logout: (refreshToken?: string) =>
    request<null>('/auth/logout', { method: 'POST', body: refreshToken ? { refreshToken } : {} }),

  forgotPassword: (email: string) =>
    request<null>('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<null>('/auth/reset-password', { method: 'POST', body: { email, code, newPassword }, auth: false }),

  verifyCode: (email: string, code: string) =>
    request<{ user: AuthUser }>('/auth/verify-code', { method: 'POST', body: { email, code }, auth: false }),

  resendCode: (email: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' = 'EMAIL_VERIFICATION') =>
    request<null>('/auth/resend-code', { method: 'POST', body: { email, type }, auth: false }),

  me: () => request<{ user: AuthUser }>('/auth/me'),
};

export const usersApi = {
  getMe: () => request<{ user: AuthUser }>('/users/me'),

  updateMe: (input: { fullName?: string; username?: string; bio?: string }) =>
    request<{ user: AuthUser }>('/users/me', { method: 'PATCH', body: input }),

  deleteMe: () => request<null>('/users/me', { method: 'DELETE' }),

  search: (q: string, limit = 20, offset = 0) =>
    request<{ users: PublicUser[] }>(`/users/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`),

  getByUsername: (username: string) =>
    request<{ user: PublicUser & { friendsCount: number; friendshipStatus: string } }>(
      `/users/${encodeURIComponent(username)}`
    ),

  uploadAvatar: async (uri: string, mimeType = 'image/jpeg'): Promise<{ user: AuthUser }> => {
    const fd = new FormData();
    fd.append('avatar', { uri, name: 'avatar.jpg', type: mimeType } as unknown as Blob);
    return request<{ user: AuthUser }>('/users/me/avatar', { method: 'POST', body: fd });
  },

  deleteAvatar: () => request<{ user: AuthUser }>('/users/me/avatar', { method: 'DELETE' }),

  updatePushTokens: (input: { fcmToken?: string; apnsToken?: string }) =>
    request<null>('/users/me/push-tokens', { method: 'POST', body: input }),
};

export const friendsApi = {
  list: (limit = 50, offset = 0) =>
    request<{ friends: PublicUser[] }>(`/friends?limit=${limit}&offset=${offset}`),

  suggestions: (limit = 30, offset = 0) =>
    request<{ users: PublicUser[] }>(`/friends/suggestions?limit=${limit}&offset=${offset}`),

  unfriend: (friendId: string) =>
    request<null>(`/friends/${friendId}`, { method: 'DELETE' }),

  incoming: () => request<{ requests: FriendRequestSummary[] }>('/friends/requests/incoming'),
  outgoing: () => request<{ requests: FriendRequestSummary[] }>('/friends/requests/outgoing'),

  sendRequest: (receiverId: string) =>
    request<{ request: FriendRequestSummary }>('/friends/requests', { method: 'POST', body: { receiverId } }),

  acceptRequest: (requestId: string) =>
    request<{ friend: PublicUser }>(`/friends/requests/${requestId}/accept`, { method: 'POST' }),

  rejectRequest: (requestId: string) =>
    request<null>(`/friends/requests/${requestId}/reject`, { method: 'POST' }),

  cancelRequest: (requestId: string) =>
    request<null>(`/friends/requests/${requestId}`, { method: 'DELETE' }),
};

export const roomsApi = {
  create: (input: {
    name: string;
    description?: string;
    isPrivate: boolean;
    password?: string;
    maxMembers?: number;
    videoUrl?: string;
  }) => request<{ room: Room }>('/rooms', { method: 'POST', body: input }),

  list: (params?: {
    filter?: 'all' | 'public' | 'private' | 'mine' | 'joined';
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.filter) qs.set('filter', params.filter);
    if (params?.search) qs.set('search', params.search);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const q = qs.toString();
    return request<{ rooms: Room[]; total: number }>(`/rooms${q ? `?${q}` : ''}`);
  },

  get: (id: string) => request<{ room: Room }>(`/rooms/${id}`),
  getByCode: (code: string) => request<{ room: RoomPreview }>(`/rooms/by-code/${code}`),

  update: (id: string, input: Partial<{ name: string; description: string; password: string; isPrivate: boolean; maxMembers: number }>) =>
    request<{ room: Room }>(`/rooms/${id}`, { method: 'PATCH', body: input }),

  end: (id: string) => request<null>(`/rooms/${id}`, { method: 'DELETE' }),

  join: (id: string, password?: string) =>
    request<{ room: Room }>(`/rooms/${id}/join`, { method: 'POST', body: password ? { password } : {} }),

  joinByCode: (code: string, password?: string) =>
    request<{ room: Room }>('/rooms/join-by-code', { method: 'POST', body: { code, password } }),

  leave: (id: string) => request<null>(`/rooms/${id}/leave`, { method: 'POST' }),

  updateVideo: (id: string, videoUrl: string) =>
    request<{ room: Room }>(`/rooms/${id}/video`, { method: 'PATCH', body: { videoUrl } }),

  getSync: (id: string) =>
    request<{ sync: RoomSyncState | null }>(`/rooms/${id}/sync`),

  createInvite: (id: string, expiresInMinutes = 1440, maxUses?: number) =>
    request<{ invite: { token: string; url: string; deepLink: string; expiresAt: string } }>(
      `/rooms/${id}/invites`,
      { method: 'POST', body: { expiresInMinutes, maxUses } }
    ),

  previewInvite: (token: string) =>
    request<{ token: string; expiresAt: string; room: RoomPreview }>(
      `/rooms/invites/${token}/preview`
    ),

  acceptInvite: (token: string, password?: string) =>
    request<{ room: Room }>('/rooms/invites/accept', { method: 'POST', body: { token, password } }),

  inviteFriends: (id: string, friendIds: string[]) =>
    request<null>(`/rooms/${id}/invite-friends`, { method: 'POST', body: { friendIds } }),
};

export const chatsApi = {
  list: () => request<{ chats: Chat[] }>('/chats'),

  openDirect: (userId: string) =>
    request<{ chat: Chat }>('/chats/direct', { method: 'POST', body: { userId } }),

  get: (id: string) => request<{ chat: Chat }>(`/chats/${id}`),

  listMessages: (id: string, before?: string, limit = 50) => {
    const qs = new URLSearchParams();
    if (before) qs.set('before', before);
    qs.set('limit', String(limit));
    return request<{ messages: Message[] }>(`/chats/${id}/messages?${qs}`);
  },

  send: (id: string, input: { content: string; type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO'; mediaUrl?: string; replyToId?: string }) =>
    request<{ message: Message }>(`/chats/${id}/messages`, { method: 'POST', body: input }),

  markRead: (id: string) =>
    request<null>(`/chats/${id}/read`, { method: 'POST' }),

  deleteMessage: (chatId: string, messageId: string) =>
    request<null>(`/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' }),
};

export const discoverApi = {
  home: () =>
    request<{
      trending: DiscoverMovie[];
      curated: CuratedFilm[];
      archiveFeatured: ArchiveMovie[];
      tmdbAvailable: boolean;
    }>('/discover/home'),

  trending: (window: 'day' | 'week' = 'week') =>
    request<{ items: DiscoverMovie[] }>(`/discover/trending?window=${window}`),

  popular: () => request<{ items: DiscoverMovie[] }>('/discover/popular'),
  topRated: () => request<{ items: DiscoverMovie[] }>('/discover/top-rated'),

  search: (q: string) =>
    request<{ tmdb: DiscoverMovie[]; archive: ArchiveMovie[]; curated: CuratedFilm[] }>(
      `/discover/search?q=${encodeURIComponent(q)}`
    ),

  tmdbDetail: (id: number) =>
    request<{
      movie: (DiscoverMovie & {
        runtime: number | null;
        genres: { id: number; name: string }[];
        trailerYoutubeId: string | null;
      }) | null;
    }>(`/discover/tmdb/${id}`),

  archiveDetail: (identifier: string) =>
    request<{ movie: (ArchiveMovie & { directVideoUrl?: string }) | null }>(
      `/discover/archive/${encodeURIComponent(identifier)}`
    ),

  curated: (genre?: string) => {
    const q = genre ? `?genre=${encodeURIComponent(genre)}` : '';
    return request<{ items: CuratedFilm[] }>(`/discover/curated${q}`);
  },

  genres: () => request<{ genres: string[] }>('/discover/genres'),
  // Inside discoverApi = { ... }, alongside the existing methods:

  youtubeSearch: (q: string) =>
    request<{ items: Array<{
      videoId: string;
      title: string;
      channelTitle: string;
      thumbnailUrl: string;
      publishedAt: string;
    }> }>(`/discover/youtube/search?q=${encodeURIComponent(q)}`),

  vimeoSearch: (q: string) =>
    request<{ items: Array<{
      videoId: string;
      title: string;
      channelTitle: string;
      thumbnailUrl: string;
      publishedAt: string;
    }> }>(`/discover/vimeo/search?q=${encodeURIComponent(q)}`),
};

export const notificationsApi = {
  list: (params?: { limit?: number; offset?: number; unread?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.unread) qs.set('unread', 'true');
    const q = qs.toString();
    return request<{ items: Notification[]; total: number; unreadCount: number }>(
      `/notifications${q ? `?${q}` : ''}`
    );
  },
  markRead: (id: string) => request<null>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request<null>('/notifications/read-all', { method: 'POST' }),
  delete: (id: string) => request<null>(`/notifications/${id}`, { method: 'DELETE' }),
};

// =====================================================================
// Posts API (News & Events)
// =====================================================================

export const postsApi = {
  /**
   * List posts.
   * - kind: filter NEWS or EVENT
   * - upcoming: events only, eventAt >= now, ordered soonest first
   * - authorUsername: posts from a specific user (for profile pages)
   */
  list: (params?: {
    kind?: PostKind;
    upcoming?: boolean;
    authorUsername?: string;
    authorId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.kind) qs.set('kind', params.kind);
    if (params?.upcoming) qs.set('upcoming', 'true');
    if (params?.authorUsername) qs.set('authorUsername', params.authorUsername);
    if (params?.authorId) qs.set('authorId', params.authorId);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const q = qs.toString();
    return request<{ posts: Post[]; total: number }>(`/posts${q ? `?${q}` : ''}`);
  },

  getOne: (id: string) =>
    request<{ post: Post }>(`/posts/${id}`),

  create: (input: {
    kind: PostKind;
    title: string;
    body?: string | null;
    coverUrl?: string | null;
    visibility?: PostVisibility;
    eventAt?: string | null;        // ISO 8601, required for EVENT
    eventEndAt?: string | null;
    location?: string | null;
    rsvpLimit?: number | null;
  }) =>
    request<{ post: Post }>('/posts', { method: 'POST', body: input }),

  update: (
    id: string,
    input: Partial<{
      title: string;
      body: string | null;
      coverUrl: string | null;
      visibility: PostVisibility;
      eventAt: string | null;
      eventEndAt: string | null;
      location: string | null;
      rsvpLimit: number | null;
    }>,
  ) =>
    request<{ post: Post }>(`/posts/${id}`, { method: 'PATCH', body: input }),

  delete: (id: string) =>
    request<null>(`/posts/${id}`, { method: 'DELETE' }),

  toggleLike: (id: string) =>
    request<{ liked: boolean; likeCount: number }>(`/posts/${id}/like`, {
      method: 'POST',
    }),

  rsvp: (id: string, status: RsvpStatus) =>
    request<{ status: RsvpStatus; rsvpCount: number }>(`/posts/${id}/rsvp`, {
      method: 'POST',
      body: { status },
    }),
};

export type ContentCategory =
  | 'MOVIE' | 'COMEDY' | 'NEWS' | 'CARTOON' | 'ANIME'
  | 'DRAMA' | 'SPORTS' | 'PODCAST' | 'TVSHOW';
 
export type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  category: ContentCategory;
  videoProvider: string;
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string;
  year: number | null;
  rating: number | null;
  viewCount: number;
  isFeatured: boolean;
};
 
export const contentApi = {
  list: (params?: {
    category?: ContentCategory;
    search?: string;
    page?: number;
    limit?: number;
    featured?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.featured) qs.set('featured', 'true');
    const q = qs.toString();
    return request<{
      items: ContentItem[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    }>(`/content${q ? `?${q}` : ''}`);
  },
 
  categories: () =>
    request<{ categories: Array<{ category: ContentCategory; count: number }> }>(
      '/content/categories'
    ),
 
  featured: (limit = 10) =>
    request<{ items: ContentItem[] }>(`/content/featured?limit=${limit}`),
 
  landing: (perCategory = 12) =>
    request<{ sections: Array<{ category: ContentCategory; items: ContentItem[] }> }>(
      `/content/landing?perCategory=${perCategory}`
    ),
 
  getById: (id: string) =>
    request<{ item: ContentItem | null }>(`/content/${id}`),
};
 