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
  isAdmin: boolean;
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

// ---- Content library ----

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
  creator?: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
    isLive: boolean;
  } | null;
};

// ---- Admin ----

export type AdminStats = {
  users: number;
  verifiedUsers: number;
  bannedUsers: number;
  subscribedUsers: number;
  rooms: number;
  posts: number;
  content: number;
  contentByCategory: { category: string; count: number }[];
};

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  planId: string | null;
  subscriptionExpiresAt: string | null;
  plan?: { name: string } | null;
  createdAt: string;
};

export type AdminAnalytics = {
  series: { date: string; signups: number; rooms: number }[];
  subscriptionsByPlan: { plan: string; count: number }[];
};

export type AdminPlan = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
  subscriberCount: number;
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
    eventAt?: string | null;
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

// =====================================================================
// Content API (Browse / Discover catalog)
// =====================================================================

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

// =====================================================================
// Admin API (master access — requires isAdmin)
// =====================================================================

export const adminApi = {
  stats: () => request<AdminStats>('/admin/stats'),
  analytics: () => request<AdminAnalytics>('/admin/analytics'),

  listUsers: (search = '', page = 1, limit = 100) =>
    request<{ users: AdminUser[]; total: number; page: number; totalPages: number }>(
      `/admin/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    ),

  updateUser: (id: string, body: { isAdmin?: boolean; isVerified?: boolean; isBanned?: boolean }) =>
    request<{ user: AdminUser }>(`/admin/users/${id}`, { method: 'PATCH', body }),

  deleteUser: (id: string) =>
    request<{ deleted: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),

  createContent: (body: { title: string; videoUrl: string; category: string; year?: number; description?: string; isFeatured?: boolean }) =>
    request<{ content: ContentItem }>('/admin/content', { method: 'POST', body }),

  updateContent: (id: string, body: Partial<{ title: string; videoUrl: string; category: string; year: number; description: string; isFeatured: boolean }>) =>
    request<{ content: ContentItem }>(`/admin/content/${id}`, { method: 'PATCH', body }),

  deleteContent: (id: string) =>
    request<{ deleted: boolean }>(`/admin/content/${id}`, { method: 'DELETE' }),

  // Plans
  listPlans: () => request<{ plans: AdminPlan[] }>('/admin/plans'),
  createPlan: (body: { name: string; price?: number; durationDays?: number; features?: string[]; isActive?: boolean }) =>
    request<{ plan: AdminPlan }>('/admin/plans', { method: 'POST', body }),
  deletePlan: (id: string) =>
    request<{ deleted: boolean }>(`/admin/plans/${id}`, { method: 'DELETE' }),

  // Subscriptions (manual)
  assignSubscription: (userId: string, planId: string) =>
    request<{ user: AdminUser }>('/admin/subscriptions/assign', { method: 'POST', body: { userId, planId } }),
  removeSubscription: (userId: string) =>
    request<{ user: AdminUser }>('/admin/subscriptions/remove', { method: 'POST', body: { userId } }),
};

// =====================================================================
// CREATORS API (Phase 1+2+3) — profile, follow/subscribe, content, live, events
// =====================================================================

export type CreatorCategory =
  | 'PODCASTER' | 'FILMMAKER' | 'MUSICIAN' | 'GAMER' | 'EDUCATOR' | 'OTHER';

export type CreatorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type Creator = {
  id: string;
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  displayName: string;
  tagline: string | null;
  bio: string | null;
  bannerUrl: string | null;
  category: CreatorCategory;
  status: CreatorStatus;
  isLive: boolean;
  followerCount: number;
  subscriberCount: number;
  socials: Record<string, string> | null;
  approvedAt: string | null;
  isFollowing?: boolean;
  isSubscribed?: boolean;
};

export type CreatorContentFormat = 'FULL' | 'CLIP' | 'REEL' | 'PODCAST';
export type UploadStatus =
  | 'DRAFT' | 'PROCESSING' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type CreatorContent = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  format: CreatorContentFormat;
  source: 'YOUTUBE' | 'BUNNY';
  uploadStatus: UploadStatus;
  thumbnailUrl: string | null;
  hlsUrl: string | null;
  videoUrl: string | null;
  durationSec: number | null;
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  isPremium: boolean;
  isFeatured: boolean;
  rejectionReason: string | null;
  creatorId: string | null;
  createdAt: string;
};

export type LiveSession = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string;
  status: 'LIVE' | 'ENDED';
  viewerCount: number;
  peakViewers: number;
  livekitRoom: string;
  startedAt: string;
  endedAt: string | null;
  creatorId: string;
  creator?: { displayName: string; username: string; avatarUrl: string | null };
};

export type LiveKitJoin = { token: string; url: string; room: string };

export type CreatorEvent = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  scheduledAt: string;
  endsAt: string | null;
  status: 'UPCOMING' | 'LIVE' | 'PAST' | 'CANCELED';
  creatorId: string;
  creator?: { displayName: string; username: string; avatarUrl: string | null };
};

type CreatorsPaged<T> = { items: T[]; page: number; limit: number; total: number; hasMore?: boolean };

export const creatorsApi = {
  // Become / manage my creator profile
  apply: (input: {
    displayName: string; tagline?: string; bio?: string;
    category?: CreatorCategory; socials?: Record<string, string>;
  }) => request<{ creator: Creator }>('/creators/apply', { method: 'POST', body: input }),

  getMine: () => request<{ creator: Creator | null }>('/creators/me'),

  updateMine: (input: Partial<{
    displayName: string; tagline: string; bio: string;
    bannerUrl: string; bannerPublicId: string;
    category: CreatorCategory; socials: Record<string, string>;
  }>) => request<{ creator: Creator }>('/creators/me', { method: 'PATCH', body: input }),

  uploadBanner: async (uri: string, mimeType = 'image/jpeg'): Promise<{ bannerUrl: string | null }> => {
    const fd = new FormData();
    fd.append('banner', { uri, name: 'banner.jpg', type: mimeType } as unknown as Blob);
    return request<{ bannerUrl: string | null }>('/creators/me/banner', { method: 'POST', body: fd });
  },
  // Discovery
  list: (params: { category?: CreatorCategory; search?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const s = q.toString();
    return request<CreatorsPaged<Creator>>(`/creators${s ? `?${s}` : ''}`);
  },

  liveCreators: (limit = 20) => request<{ items: Creator[] }>(`/creators/live?limit=${limit}`),

  getByUsername: (username: string) =>
    request<{ creator: Creator }>(`/creators/${encodeURIComponent(username)}`),

  // Follow / Subscribe (by creatorProfile id)
  follow: (creatorId: string) =>
    request<{ following: boolean }>(`/creators/${creatorId}/follow`, { method: 'POST' }),
  unfollow: (creatorId: string) =>
    request<{ following: boolean }>(`/creators/${creatorId}/follow`, { method: 'DELETE' }),
  subscribe: (creatorId: string) =>
    request<{ subscribed: boolean }>(`/creators/${creatorId}/subscribe`, { method: 'POST' }),
  unsubscribe: (creatorId: string) =>
    request<{ subscribed: boolean }>(`/creators/${creatorId}/subscribe`, { method: 'DELETE' }),

  // A creator's public content / events
  contentByUsername: (username: string, format?: CreatorContentFormat) =>
    request<{ items: CreatorContent[] }>(
      `/creators/${encodeURIComponent(username)}/content${format ? `?format=${format}` : ''}`
    ),
  eventsByUsername: (username: string) =>
    request<{ items: CreatorEvent[] }>(`/creators/${encodeURIComponent(username)}/events`),

  // My content (creator)
  myContent: (format?: CreatorContentFormat) =>
    request<{ items: CreatorContent[] }>(`/creators/me/content${format ? `?format=${format}` : ''}`),
  syncStatus: (contentId: string) =>
    request<{ content: CreatorContent }>(`/creators/me/content/${contentId}/sync`, { method: 'POST' }),
  createUpload: (input: {
    title: string; description?: string; category?: string;
    format?: CreatorContentFormat; isPremium?: boolean;
  }) => request<{ content: CreatorContent; upload: {
    endpoint: string; libraryId: string; videoId: string;
    authorizationSignature: string; authorizationExpire: number;
  } }>('/creators/me/content', { method: 'POST', body: input }),
  createFromUrl: (input: {
    title: string; description?: string; category?: string;
    format?: CreatorContentFormat; url: string; isPremium?: boolean;
  }) => request<{ content: CreatorContent }>('/creators/me/content/from-url', { method: 'POST', body: input }),
  syncContent: (id: string) =>
    request<{ content: CreatorContent; ready: boolean; bunnyStatus: number; encodeProgress: number | null }>(
      `/creators/me/content/${id}/sync`, { method: 'POST' }
    ),
  deleteContent: (id: string) =>
    request<{ deleted: boolean }>(`/creators/me/content/${id}`, { method: 'DELETE' }),

  // Live
  liveSessions: (limit = 20) => request<{ items: LiveSession[] }>(`/creators/live/sessions?limit=${limit}`),
  startLive: (input: { title: string; description?: string; thumbnailUrl?: string; category?: string }) =>
    request<{ session: LiveSession; livekit: LiveKitJoin }>('/creators/me/live/start', { method: 'POST', body: input }),
  endLive: (sessionId: string) =>
    request<{ session: LiveSession }>(`/creators/me/live/${sessionId}/end`, { method: 'POST' }),
  joinLive: (sessionId: string) =>
    request<{ session: LiveSession; livekit: LiveKitJoin }>(`/creators/live/${sessionId}/join`, { method: 'POST' }),
  leaveLive: (sessionId: string) =>
    request<{ ok: boolean }>(`/creators/live/${sessionId}/leave`, { method: 'POST' }),

  // Events
  upcomingEvents: (limit = 20) => request<{ items: CreatorEvent[] }>(`/creators/events/upcoming?limit=${limit}`),
  createEvent: (input: { title: string; description?: string; thumbnailUrl?: string; scheduledAt: string; endsAt?: string }) =>
    request<{ event: CreatorEvent }>('/creators/me/events', { method: 'POST', body: input }),
  updateEvent: (id: string, input: Partial<{ title: string; description: string; thumbnailUrl: string; scheduledAt: string; endsAt: string; status: string }>) =>
    request<{ event: CreatorEvent }>(`/creators/me/events/${id}`, { method: 'PATCH', body: input }),
  deleteEvent: (id: string) =>
    request<{ deleted: boolean }>(`/creators/me/events/${id}`, { method: 'DELETE' }),

  // Admin
  adminPendingCreators: (page = 1, limit = 24) =>
    request<CreatorsPaged<Creator>>(`/creators/admin/pending?page=${page}&limit=${limit}`),
  adminApproveCreator: (id: string) =>
    request<{ creator: Creator }>(`/creators/admin/${id}/approve`, { method: 'POST' }),
  adminRejectCreator: (id: string, reason?: string) =>
    request<{ creator: Creator }>(`/creators/admin/${id}/reject`, { method: 'POST', body: { reason } }),
  adminPendingContent: (page = 1, limit = 24) =>
    request<CreatorsPaged<CreatorContent & { creatorName?: string; creatorUsername?: string }>>(
      `/creators/admin/content/pending?page=${page}&limit=${limit}`
    ),
  adminApproveContent: (id: string, isFeatured?: boolean) =>
    request<{ content: CreatorContent }>(`/creators/admin/content/${id}/approve`, { method: 'POST', body: { isFeatured } }),
  adminRejectContent: (id: string, reason?: string) =>
    request<{ content: CreatorContent }>(`/creators/admin/content/${id}/reject`, { method: 'POST', body: { reason } }),
};

// ---- Subscriptions ----
export type SubscriptionTier = 'BASIC' | 'PRO' | 'ADVANCE';

export type Plan = {
  tier: SubscriptionTier;
  name: string;
  price: number;
  durationDays: number;
  color: string;        // hex (silver/gold/platinum)
  colorName: string;    // 'silver' | 'gold' | 'platinum'
  gradient: string[];
  features: string[];
};

export type MySubscription = {
  tier: SubscriptionTier;
  planName: string;
  color: string;
  colorName: string;
  gradient: string[];
  expiresAt: string | null;
  isActive: boolean;
  canCreate: boolean;
  canGoLive: boolean;
};

export const subscriptionsApi = {
  plans: () => request<{ plans: Plan[] }>('/subscriptions/plans'),
  me: () => request<MySubscription>('/subscriptions/me'),
  upgrade: (tier: SubscriptionTier) =>
    request<MySubscription>('/subscriptions/upgrade', { method: 'POST', body: { tier } }),
  cancel: () => request<MySubscription>('/subscriptions/cancel', { method: 'POST' }),
};

// ---- Analytics ----
export type CreatorAnalytics = {
  creator: string;
  totals: {
    followers: number; subscribers: number; content: number;
    totalViews: number; totalLikes: number; totalComments: number; totalShares: number;
    liveSessions: number; events: number; rooms: number; roomChats: number;
  };
  topContent: Array<{
    id: string; title: string; format: string; thumbnailUrl: string | null;
    viewCount: number; likeCount: number; commentCount: number; shareCount: number;
  }>;
  events: Array<{ id: string; title: string; status: string; scheduledAt: string; thumbnailUrl: string | null }>;
  rooms: Array<{ id: string; name: string; code: string; status: string; createdAt: string; memberCount: number; messageCount: number }>;
  viewsSeries: Array<{ date: string; count: number }>;
};

export type AdminAnalyticsFull = {
  users: { total: number; creators: number; pendingCreators: number };
  subscriptionsByTier: Array<{ tier: string; count: number }>;
  content: { total: number; approved: number; totalViews: number; totalLikes: number; totalComments: number; totalShares: number };
  rooms: { total: number; active: number; messages: number };
  live: { total: number; liveNow: number };
  events: { total: number };
  signupsSeries: Array<{ date: string; count: number }>;
};

export const analyticsApi = {
  trackView: (contentId: string) =>
    request<{ ok: boolean }>(`/analytics/view/${contentId}`, { method: 'POST' }),
  creatorMe: () => request<CreatorAnalytics>('/analytics/creator/me'),
  creatorFollowers: (page = 1, limit = 50) =>
    request<{ items: any[]; page: number; limit: number; total: number }>(`/analytics/creator/me/followers?page=${page}&limit=${limit}`),
  creatorSubscribers: (page = 1, limit = 50) =>
    request<{ items: any[]; page: number; limit: number; total: number }>(`/analytics/creator/me/subscribers?page=${page}&limit=${limit}`),
  admin: () => request<AdminAnalyticsFull>('/analytics/admin'),
  adminCreators: (page = 1, limit = 50) =>
    request<{ items: any[]; page: number; limit: number; total: number }>(`/analytics/admin/creators?page=${page}&limit=${limit}`),
};

// ---- My stuff (history) ----
export type MyRoom = {
  id: string; code: string; name: string; thumbnailUrl: string | null;
  status: string; role: string; joinedAt: string; isOwner: boolean;
  owner: { id: string; username: string; avatarUrl: string | null };
  memberCount: number; messageCount: number;
};
export type MyCreatorLink = {
  creatorId: string; displayName: string; username: string; avatarUrl: string | null;
  isLive: boolean; followerCount?: number; tier?: string; followedAt?: string; subscribedAt?: string;
};

export const meApi = {
  overview: () => request<{
    counts: { rooms: number; following: number; subscriptions: number };
    rooms: MyRoom[]; following: MyCreatorLink[]; subscriptions: MyCreatorLink[];
  }>('/me/overview'),
  rooms: () => request<{ items: MyRoom[] }>('/me/rooms'),
  following: () => request<{ items: MyCreatorLink[] }>('/me/following'),
  subscriptions: () => request<{ items: MyCreatorLink[] }>('/me/subscriptions'),
};

// ---- Content social (like / comment / share) ----
export type ContentComment = {
  id: string; body: string; createdAt: string;
  user: { id: string; username: string; fullName: string | null; avatarUrl: string | null } | null;
};

export const contentSocialApi = {
  toggleLike: (contentId: string) =>
    request<{ liked: boolean; likeCount: number }>(`/content/${contentId}/like`, { method: 'POST' }),
  listComments: (contentId: string, page = 1, limit = 30) =>
    request<{ items: ContentComment[]; page: number; limit: number; total: number }>(
      `/content/${contentId}/comments?page=${page}&limit=${limit}`
    ),
  addComment: (contentId: string, body: string) =>
    request<{ comment: ContentComment }>(`/content/${contentId}/comments`, { method: 'POST', body: { body } }),
  deleteComment: (contentId: string, commentId: string) =>
    request<{ deleted: boolean }>(`/content/${contentId}/comments/${commentId}`, { method: 'DELETE' }),
  share: (contentId: string, channel?: string) =>
    request<{ shared: boolean; shareCount: number }>(`/content/${contentId}/share`, { method: 'POST', body: { channel } }),
};