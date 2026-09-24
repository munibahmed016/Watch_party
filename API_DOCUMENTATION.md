# WatchParty Live — API Documentation

Technical specification and API reference for the WatchParty Live services, covering REST endpoints, Socket.IO real-time synchronization, LiveKit WebRTC audio/video streaming, and Bunny Stream video delivery infrastructure.

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Environments & Base URLs](#2-environments--base-urls)
3. [Authentication & Authorization](#3-authentication--authorization)
   - [Bearer Token Authentication](#bearer-token-authentication)
   - [Token Refresh Flow](#token-refresh-flow)
   - [Standard Response & Error Formats](#standard-response--error-formats)
4. [REST API Reference](#4-rest-api-reference)
   - [1. Authentication (`/api/auth`)](#1-authentication-apiauth)
   - [2. User Management & Profile (`/api/users`)](#2-user-management--profile-apiusers)
   - [3. Friends & Social Graph (`/api/friends`)](#3-friends--social-graph-apifriends)
   - [4. Watch Party Rooms (`/api/rooms`)](#4-watch-party-rooms-apirooms)
   - [5. Direct & Group Chats (`/api/chats`)](#5-direct--group-chats-apichats)
   - [6. Media Discovery & External Feeds (`/api/discover`)](#6-media-discovery--external-feeds-apidiscover)
   - [7. Community Posts & Events (`/api/posts`)](#7-community-posts--events-apiposts)
   - [8. Content Catalog & Library (`/api/content`)](#8-content-catalog--library-apicontent)
   - [9. Content Social Interactions (`/api/content/:id/...`)](#9-content-social-interactions-apicontentid)
   - [10. Creator Platform (`/api/creators`)](#10-creator-platform-apicreators)
   - [11. Subscriptions & Tier Entitlements (`/api/subscriptions`)](#11-subscriptions--tier-entitlements-apisubscriptions)
   - [12. Analytics & Tracking (`/api/analytics`)](#12-analytics--tracking-apianalytics)
   - [13. Personal Activity & History (`/api/me`)](#13-personal-activity--history-apime)
   - [14. Notifications (`/api/notifications`)](#14-notifications-apinotifications)
   - [15. Admin Portal (`/api/admin`)](#15-admin-portal-apiadmin)
5. [Real-Time Socket.IO Protocol](#5-real-time-socketio-protocol)
   - [Connection Handshake & Reconnection](#connection-handshake--reconnection)
   - [Watch Party Room Events](#watch-party-room-events)
   - [Chat Events](#chat-events)
6. [LiveKit WebRTC Live Streaming](#6-livekit-webrtc-live-streaming)
7. [Video Ingestion & Bunny Stream (TUS Protocol)](#7-video-ingestion--bunny-stream-tus-protocol)
8. [Deep Linking Schema](#8-deep-linking-schema)

---

## 1. Overview & Architecture

WatchParty Live coordinates real-time video playback synchronization, direct messaging, live creator broadcasts, and community media distribution.

```
┌────────────────────────────────────────────────────────┐
│                   Mobile Client                        │
│          (React Native 0.81 + TypeScript)              │
└────────┬───────────────┬────────────────┬──────────────┘
         │ REST API      │ Socket.IO      │ WebRTC
         ▼               ▼                ▼
┌──────────────────┐ ┌────────────────┐ ┌────────────────┐
│  Node / Express  │ │ Socket.IO Hub  │ │ LiveKit Server │
│  Backend Engine  │ │ (Sync Engine)  │ │ (Live Video/   │
│  (Render Cloud)  │ │                │ │  Audio Mesh)   │
└────────┬─────────┘ └────────────────┘ └────────────────┘
         │
         ├─── PostgreSQL (Prisma ORM)
         ├─── TMDB / YouTube / Vimeo / Internet Archive APIs
         └─── Bunny Stream CDN (TUS Ingest & HLS Delivery)
```

---

## 2. Environments & Base URLs

| Service | Environment | URL |
| :--- | :--- | :--- |
| **REST API Base** | Production | `https://watch-party-backend-x9wl.onrender.com/api` |
| **Socket.IO Endpoint** | Production | `https://watch-party-backend-x9wl.onrender.com` |
| **LiveKit Gateway** | Production | Provisioned dynamically per session (via LiveKit Cloud) |
| **Bunny Stream Ingest**| Production | `https://video.bunnycdn.com/tusupload` |

---

## 3. Authentication & Authorization

### Bearer Token Authentication
Authenticated endpoints require a standard JSON Web Token passed in the `Authorization` header:

```http
Authorization: Bearer <accessToken>
```

### Token Refresh Flow
Access tokens have a short time-to-live. When an HTTP request returns `401 Unauthorized`, the client uses the persistent `refreshToken` to acquire a fresh access token without interrupting the user session.

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1Ni..."
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

### Standard Response & Error Formats

#### Success Envelope (`2xx`)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Error Envelope (`4xx / 5xx`)
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE_STRING",
    "details": {}
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` (401): Missing, expired, or invalid token.
- `FORBIDDEN` (403): User lacks permissions (e.g. requires `isAdmin` or creator status).
- `NOT_FOUND` (404): Resource not found.
- `NETWORK_ERROR` (0): Client unreachable / connection dropped.
- `INVALID_RESPONSE` (502/500): Server returned non-JSON or invalid data.

---

## 4. REST API Reference

---

### 1. Authentication (`/api/auth`)

#### `POST /api/auth/register`
Creates a new user account.
- **Auth required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "confirmPassword": "SecurePassword123!",
    "username": "moviefan99",
    "fullName": "Jane Doe",
    "phoneNumber": "+1234567890"
  }
  ```
- **Response**: `{ user: AuthUser, accessToken: string, refreshToken: string }`

#### `POST /api/auth/login`
Authenticates a user via email or username.
- **Auth required**: No
- **Request Body**:
  ```json
  {
    "identifier": "user@example.com", // email or username
    "password": "SecurePassword123!"
  }
  ```
- **Response**: `{ user: AuthUser, accessToken: string, refreshToken: string }`

#### `POST /api/auth/refresh`
Exchanges a valid refresh token for a new token pair.
- **Auth required**: No
- **Request Body**: `{ "refreshToken": "string" }`
- **Response**: `{ user: AuthUser, accessToken: string, refreshToken: string }`

#### `POST /api/auth/logout`
Revokes the refresh token and terminates the active session.
- **Auth required**: Yes
- **Request Body**: `{ "refreshToken": "string" }` (optional)
- **Response**: `null`

#### `POST /api/auth/forgot-password`
Sends a 6-digit password reset OTP to the given email.
- **Auth required**: No
- **Request Body**: `{ "email": "user@example.com" }`
- **Response**: `null`

#### `POST /api/auth/reset-password`
Resets password using the received OTP code.
- **Auth required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "code": "123456",
    "newPassword": "NewPassword123!"
  }
  ```
- **Response**: `null`

#### `POST /api/auth/verify-code`
Verifies an email verification OTP code.
- **Auth required**: No
- **Request Body**: `{ "email": "user@example.com", "code": "123456" }`
- **Response**: `{ user: AuthUser }`

#### `POST /api/auth/resend-code`
Resends a verification or reset code.
- **Auth required**: No
- **Request Body**: `{ "email": "user@example.com", "type": "EMAIL_VERIFICATION" | "PASSWORD_RESET" }`
- **Response**: `null`

#### `GET /api/auth/me`
Fetches the currently authenticated user's session.
- **Auth required**: Yes
- **Response**: `{ user: AuthUser }`

---

### 2. User Management & Profile (`/api/users`)

#### `GET /api/users/me`
Retrieves full user profile.
- **Auth required**: Yes
- **Response**: `{ user: AuthUser }`

#### `PATCH /api/users/me`
Updates user profile information.
- **Auth required**: Yes
- **Request Body**:
  ```json
  {
    "fullName": "Jane Smith",
    "username": "janesmith",
    "bio": "Cinema lover & streamer"
  }
  ```
- **Response**: `{ user: AuthUser }`

#### `DELETE /api/users/me`
Permanently deletes the authenticated user's account.
- **Auth required**: Yes
- **Response**: `null`

#### `GET /api/users/search`
Searches users by username or full name.
- **Auth required**: Yes
- **Query Parameters**:
  - `q`: Search query string
  - `limit`: Default `20`
  - `offset`: Default `0`
- **Response**: `{ users: PublicUser[] }`

#### `GET /api/users/:username`
Fetches a public user profile by username.
- **Auth required**: Yes
- **Response**: `{ user: PublicUser & { friendsCount: number, friendshipStatus: string } }`

#### `POST /api/users/me/avatar`
Uploads profile avatar photo.
- **Auth required**: Yes
- **Headers**: `Content-Type: multipart/form-data`
- **Body**: `avatar: <binary file>`
- **Response**: `{ user: AuthUser }`

#### `DELETE /api/users/me/avatar`
Removes current avatar.
- **Auth required**: Yes
- **Response**: `{ user: AuthUser }`

#### `POST /api/users/me/push-tokens`
Registers device push notification tokens.
- **Auth required**: Yes
- **Request Body**: `{ "fcmToken": "...", "apnsToken": "..." }`
- **Response**: `null`

#### `GET /api/users/me/notification-prefs`
Retrieves notification preferences toggles.
- **Auth required**: Yes
- **Response**: `{ prefs: Record<string, boolean> }`

#### `PATCH /api/users/me/notification-prefs`
Updates notification preferences.
- **Auth required**: Yes
- **Request Body**: `{ "prefs": { "roomInvites": true, "directMessages": true, "liveAlerts": true } }`
- **Response**: `{ prefs: Record<string, boolean> }`

---

### 3. Friends & Social Graph (`/api/friends`)

#### `GET /api/friends`
Lists accepted friends for current user.
- **Auth required**: Yes
- **Query Parameters**: `limit` (default 50), `offset` (default 0)
- **Response**: `{ friends: PublicUser[] }`

#### `GET /api/friends/suggestions`
Returns suggested connections based on mutual connections/activity.
- **Auth required**: Yes
- **Query Parameters**: `limit` (default 30), `offset` (default 0)
- **Response**: `{ users: PublicUser[] }`

#### `DELETE /api/friends/:friendId`
Removes friend relationship.
- **Auth required**: Yes
- **Response**: `null`

#### `GET /api/friends/requests/incoming`
Lists received friend requests.
- **Auth required**: Yes
- **Response**: `{ requests: FriendRequestSummary[] }`

#### `GET /api/friends/requests/outgoing`
Lists sent friend requests.
- **Auth required**: Yes
- **Response**: `{ requests: FriendRequestSummary[] }`

#### `POST /api/friends/requests`
Sends a friend request to target user.
- **Auth required**: Yes
- **Request Body**: `{ "receiverId": "uuid" }`
- **Response**: `{ request: FriendRequestSummary }`

#### `POST /api/friends/requests/:requestId/accept`
Accepts an incoming friend request.
- **Auth required**: Yes
- **Response**: `{ friend: PublicUser }`

#### `POST /api/friends/requests/:requestId/reject`
Rejects an incoming friend request.
- **Auth required**: Yes
- **Response**: `null`

#### `DELETE /api/friends/requests/:requestId`
Cancels a previously sent friend request.
- **Auth required**: Yes
- **Response**: `null`

---

### 4. Watch Party Rooms (`/api/rooms`)

#### `POST /api/rooms`
Creates a new synchronized watch party room.
- **Auth required**: Yes
- **Request Body**:
  ```json
  {
    "name": "Friday Sci-Fi Night",
    "description": "Watching classic sci-fi together",
    "isPrivate": false,
    "password": "optionalPassword",
    "maxMembers": 20,
    "videoUrl": "https://www.youtube.com/watch?v=..."
  }
  ```
- **Response**: `{ room: Room }`

#### `GET /api/rooms`
Lists rooms with filter and search.
- **Auth required**: Yes
- **Query Parameters**:
  - `filter`: `'all' | 'public' | 'private' | 'mine' | 'joined'`
  - `search`: Search term string
  - `limit`: Default 20
  - `offset`: Default 0
- **Response**: `{ rooms: Room[], total: number }`

#### `GET /api/rooms/:id`
Fetches room details and member list.
- **Auth required**: Yes
- **Response**: `{ room: Room }`

#### `GET /api/rooms/by-code/:code`
Fetches lightweight room preview by 6-character room code.
- **Auth required**: Yes
- **Response**: `{ room: RoomPreview }`

#### `PATCH /api/rooms/:id`
Updates room configuration (Owner/Mod only).
- **Auth required**: Yes
- **Request Body**: `{ name?, description?, password?, isPrivate?, maxMembers? }`
- **Response**: `{ room: Room }`

#### `DELETE /api/rooms/:id`
Ends and terminates the room (Owner only).
- **Auth required**: Yes
- **Response**: `null`

#### `POST /api/rooms/:id/join`
Joins room by ID (optional password).
- **Auth required**: Yes
- **Request Body**: `{ "password": "..." }` (optional)
- **Response**: `{ room: Room }`

#### `POST /api/rooms/join-by-code`
Joins room using room code.
- **Auth required**: Yes
- **Request Body**: `{ "code": "ABC123", "password": "..." }`
- **Response**: `{ room: Room }`

#### `POST /api/rooms/:id/leave`
Leaves the room.
- **Auth required**: Yes
- **Response**: `null`

#### `PATCH /api/rooms/:id/video`
Changes the active playing video for all participants.
- **Auth required**: Yes
- **Request Body**: `{ "videoUrl": "https://..." }`
- **Response**: `{ room: Room }`

#### `GET /api/rooms/:id/sync`
Fetches current video playback synchronization state.
- **Auth required**: Yes
- **Response**:
  ```json
  {
    "sync": {
      "videoUrl": "https://...",
      "videoProvider": "YOUTUBE",
      "videoId": "...",
      "position": 142.5,
      "isPlaying": true,
      "serverTime": 1727125900000
    }
  }
  ```

#### `POST /api/rooms/:id/invites`
Generates shareable room invite link and deep link token.
- **Auth required**: Yes
- **Request Body**: `{ "expiresInMinutes": 1440, "maxUses": 10 }`
- **Response**:
  ```json
  {
    "invite": {
      "token": "inv_9a8f...",
      "url": "https://watchpartylive.app/r/inv_9a8f...",
      "deepLink": "watchpartylive://room/invite/inv_9a8f...",
      "expiresAt": "2026-09-24T14:15:00Z"
    }
  }
  ```

#### `GET /api/rooms/invites/:token/preview`
Inspects an invite token without immediately joining.
- **Auth required**: Yes
- **Response**: `{ token: string, expiresAt: string, room: RoomPreview }`

#### `POST /api/rooms/invites/accept`
Accepts an invite token to enter the room.
- **Auth required**: Yes
- **Request Body**: `{ "token": "inv_...", "password": "..." }`
- **Response**: `{ room: Room }`

#### `POST /api/rooms/:id/invite-friends`
Sends in-app push invitations to specified friends.
- **Auth required**: Yes
- **Request Body**: `{ "friendIds": ["uuid1", "uuid2"] }`
- **Response**: `null`

---

### 5. Direct & Group Chats (`/api/chats`)

#### `GET /api/chats`
Lists all active chats for user with last message and unread count.
- **Auth required**: Yes
- **Response**: `{ chats: Chat[] }`

#### `POST /api/chats/direct`
Opens or creates a 1-on-1 direct conversation.
- **Auth required**: Yes
- **Request Body**: `{ "userId": "uuid" }`
- **Response**: `{ chat: Chat }`

#### `GET /api/chats/:id`
Retrieves conversation details and member roster.
- **Auth required**: Yes
- **Response**: `{ chat: Chat }`

#### `GET /api/chats/:id/messages`
Fetches message history with cursor-based pagination.
- **Auth required**: Yes
- **Query Parameters**:
  - `before`: Message ID or ISO timestamp cursor
  - `limit`: Default `50`
- **Response**: `{ messages: Message[] }`

#### `POST /api/chats/:id/messages`
Sends a message to the conversation.
- **Auth required**: Yes
- **Request Body**:
  ```json
  {
    "content": "Check out this movie!",
    "type": "TEXT", // 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO'
    "mediaUrl": null,
    "replyToId": null
  }
  ```
- **Response**: `{ message: Message }`

#### `POST /api/chats/media`
Uploads image or attachment for chat.
- **Auth required**: Yes
- **Headers**: `multipart/form-data`
- **Body**: `file: <binary image>`
- **Response**: `{ url: "https://...", type: "IMAGE" }`

#### `POST /api/chats/:id/read`
Marks all messages in the conversation as read.
- **Auth required**: Yes
- **Response**: `null`

#### `DELETE /api/chats/:chatId/messages/:messageId`
Deletes a message sent by user.
- **Auth required**: Yes
- **Response**: `null`

---

### 6. Media Discovery & External Feeds (`/api/discover`)

#### `GET /api/discover/home`
Main discovery feed aggregation (trending movies, curated catalog, internet archive featured items).
- **Auth required**: Yes
- **Response**:
  ```json
  {
    "trending": DiscoverMovie[],
    "curated": CuratedFilm[],
    "archiveFeatured": ArchiveMovie[],
    "tmdbAvailable": true
  }
  ```

#### `GET /api/discover/trending`
Trending media via TMDB.
- **Auth required**: Yes
- **Query Parameters**: `window` (`'day' | 'week'`)
- **Response**: `{ items: DiscoverMovie[] }`

#### `GET /api/discover/popular` & `GET /api/discover/top-rated`
Popular and top-rated media.
- **Auth required**: Yes
- **Response**: `{ items: DiscoverMovie[] }`

#### `GET /api/discover/search`
Unified cross-provider search (TMDB, Internet Archive, Curated Catalog).
- **Auth required**: Yes
- **Query Parameters**: `q` (search query)
- **Response**: `{ tmdb: DiscoverMovie[], archive: ArchiveMovie[], curated: CuratedFilm[] }`

#### `GET /api/discover/tmdb/:id`
Retrieves detailed metadata, runtime, genres, and YouTube trailer IDs.
- **Auth required**: Yes
- **Response**: `{ movie: DiscoverMovie & { runtime, genres, trailerYoutubeId } }`

#### `GET /api/discover/archive/:identifier`
Internet Archive public domain item details and streamable MP4 URL.
- **Auth required**: Yes
- **Response**: `{ movie: ArchiveMovie & { directVideoUrl } }`

#### `GET /api/discover/curated`
Curated public domain and licensed film library filtered by genre.
- **Auth required**: Yes
- **Query Parameters**: `genre` (optional)
- **Response**: `{ items: CuratedFilm[] }`

#### `GET /api/discover/youtube/search` & `GET /api/discover/vimeo/search`
Direct video searches for watch party room playback.
- **Auth required**: Yes
- **Query Parameters**: `q`
- **Response**: `{ items: Array<{ videoId, title, channelTitle, thumbnailUrl, publishedAt }> }`

---

### 7. Community Posts & Events (`/api/posts`)

#### `GET /api/posts`
Lists feed posts (News and Events).
- **Auth required**: Yes
- **Query Parameters**:
  - `kind`: `'NEWS' | 'EVENT'`
  - `upcoming`: `true`
  - `authorUsername`: string
  - `authorId`: string
  - `limit`: default 20
  - `offset`: default 0
- **Response**: `{ posts: Post[], total: number }`

#### `GET /api/posts/:id`
Fetches a single post or event with RSVP status and like counts.
- **Auth required**: Yes
- **Response**: `{ post: Post }`

#### `POST /api/posts`
Publishes a new news post or event.
- **Auth required**: Yes
- **Request Body**:
  ```json
  {
    "kind": "EVENT",
    "title": "Movie Marathon",
    "body": "Join us this Saturday",
    "coverUrl": "https://...",
    "visibility": "PUBLIC",
    "eventAt": "2026-09-27T18:00:00Z",
    "eventEndAt": "2026-09-27T22:00:00Z",
    "location": "Virtual Room #1",
    "rsvpLimit": 50
  }
  ```
- **Response**: `{ post: Post }`

#### `PATCH /api/posts/:id`
Updates an existing post.
- **Auth required**: Yes
- **Response**: `{ post: Post }`

#### `DELETE /api/posts/:id`
Removes a post.
- **Auth required**: Yes
- **Response**: `null`

#### `POST /api/posts/:id/like`
Toggles like status on a post.
- **Auth required**: Yes
- **Response**: `{ liked: boolean, likeCount: number }`

#### `POST /api/posts/:id/rsvp`
Submits RSVP response for an event.
- **Auth required**: Yes
- **Request Body**: `{ "status": "GOING" | "MAYBE" | "NOT_GOING" }`
- **Response**: `{ status: RsvpStatus, rsvpCount: number }`

---

### 8. Content Catalog & Library (`/api/content`)

#### `GET /api/content`
Paginated browse catalog for all available videos.
- **Auth required**: Yes
- **Query Parameters**:
  - `category`: `'MOVIE' | 'COMEDY' | 'NEWS' | 'CARTOON' | 'ANIME' | 'DRAMA' | 'SPORTS' | 'PODCAST' | 'TVSHOW'`
  - `search`: string
  - `page`: default 1
  - `limit`: default 20
  - `featured`: boolean
  - `adminOnly`: boolean
- **Response**: `{ items: ContentItem[], page, limit, total, totalPages, hasMore: boolean }`

#### `GET /api/content/categories`
Returns categories with active item counts.
- **Auth required**: Yes
- **Query Parameters**: `adminOnly` (`true | false`)
- **Response**: `{ categories: Array<{ category: ContentCategory, count: number }> }`

#### `GET /api/content/featured`
Returns featured carousel items.
- **Auth required**: Yes
- **Query Parameters**: `limit`
- **Response**: `{ items: ContentItem[] }`

#### `GET /api/content/landing`
Grouped content sections by category for the browse landing page.
- **Auth required**: Yes
- **Query Parameters**: `perCategory` (default 12)
- **Response**: `{ sections: Array<{ category: ContentCategory, items: ContentItem[] }> }`

#### `GET /api/content/:id`
Retrieves a single content item with creator profile info.
- **Auth required**: Yes
- **Response**: `{ item: ContentItem }`

---

### 9. Content Social Interactions (`/api/content/:id/...`)

#### `POST /api/content/:id/like`
Likes/unlikes a video content item.
- **Auth required**: Yes
- **Response**: `{ liked: boolean, likeCount: number }`

#### `GET /api/content/:id/comments`
Fetches paginated user comments for a video.
- **Auth required**: Yes
- **Query Parameters**: `page`, `limit`
- **Response**: `{ items: ContentComment[], page, limit, total }`

#### `POST /api/content/:id/comments`
Posts a comment on a video.
- **Auth required**: Yes
- **Request Body**: `{ "body": "Incredible scene!" }`
- **Response**: `{ comment: ContentComment }`

#### `DELETE /api/content/:id/comments/:commentId`
Deletes a comment (Author or Admin).
- **Auth required**: Yes
- **Response**: `{ deleted: boolean }`

#### `POST /api/content/:id/share`
Logs a share action for metrics tracking.
- **Auth required**: Yes
- **Request Body**: `{ "channel": "twitter" | "clipboard" | "whatsapp" }`
- **Response**: `{ shared: boolean, shareCount: number }`

---

### 10. Creator Platform (`/api/creators`)

#### Creator Onboarding & Profile
- `POST /api/creators/apply`: Submit creator application (`{ displayName, tagline, bio, category, socials }`).
- `GET /api/creators/me`: Get authenticated user's creator profile.
- `PATCH /api/creators/me`: Update creator profile (`{ displayName, tagline, bio, bannerUrl, category, socials }`).
- `POST /api/creators/me/banner`: Multipart image upload for creator banner (`banner: <binary>`).
- `GET /api/creators`: Public directory of approved creators (`?category=&search=&page=&limit=`).
- `GET /api/creators/live`: Creators currently broadcasting live streams.
- `GET /api/creators/:username`: Public creator profile by handle.

#### Follow & Subscribe
- `POST /api/creators/:creatorId/follow`: Follow creator.
- `DELETE /api/creators/:creatorId/follow`: Unfollow creator.
- `POST /api/creators/:creatorId/subscribe`: Subscribe to creator channel.
- `DELETE /api/creators/:creatorId/subscribe`: Cancel creator subscription.

#### Creator Dashboard & Analytics Lists
- `GET /api/creators/me/followers`: Paginated follower list (`{ items: PublicUser[], total }`).
- `GET /api/creators/me/subscribers`: Paginated subscriber list with tier and dates.
- `GET /api/creators/me/likes`: Paginated list of received likes on content.
- `GET /api/creators/me/comments`: Paginated list of received comments.
- `GET /api/creators/me/shares`: Paginated share breakdown.
- `GET /api/creators/me/live-sessions`: Past and ongoing broadcast logs.

#### Content Publishing & Processing
- `GET /api/creators/me/content`: List creator's uploaded videos (`?format=FULL|CLIP|REEL|PODCAST`).
- `POST /api/creators/me/content`: Initiates video upload. Returns TUS credentials for Bunny Stream:
  ```json
  {
    "content": { "id": "uuid", "uploadStatus": "PROCESSING" },
    "upload": {
      "endpoint": "https://video.bunnycdn.com/tusupload",
      "libraryId": "...",
      "videoId": "...",
      "authorizationSignature": "...",
      "authorizationExpire": 1727130000
    }
  }
  ```
- `POST /api/creators/me/content/upload-file`: Direct multipart fallback upload for video files (`file: <binary>, title, format, category`).
- `POST /api/creators/me/content/from-url`: Ingests video directly from a remote URL.
- `POST /api/creators/me/content/:id/sync`: Checks Bunny Stream encoding progress (`ready: boolean, encodeProgress: number`).
- `DELETE /api/creators/me/content/:id`: Deletes creator video.

#### Live Broadcasts (LiveKit)
- `GET /api/creators/live/sessions`: List active live streams.
- `POST /api/creators/me/live/start`: Starts a live broadcast session. Returns host LiveKit token.
  - **Request Body**: `{ "title": "...", "description": "...", "thumbnailUrl": "...", "category": "..." }`
  - **Response**: `{ session: LiveSession, livekit: { token: string, url: string, room: string } }`
- `POST /api/creators/me/live/:sessionId/end`: Concludes live stream.
- `POST /api/creators/me/live/end`: Concludes caller's active stream.
- `POST /api/creators/live/:sessionId/join`: Viewer join endpoint. Returns viewer LiveKit room token.
- `POST /api/creators/live/:sessionId/leave`: Signals viewer left session.

#### Creator Scheduled Events
- `GET /api/creators/events/upcoming`: Upcoming scheduled creator events.
- `POST /api/creators/me/events`: Schedule an event (`{ title, description, thumbnailUrl, scheduledAt, endsAt }`).
- `PATCH /api/creators/me/events/:id`: Update event schedule or details.
- `DELETE /api/creators/me/events/:id`: Cancel event.

---

### 11. Subscriptions & Tier Entitlements (`/api/subscriptions`)

Tiers control capabilities app-wide:
- **`BASIC`**: Standard rooms & watching.
- **`PRO`**: High-capacity rooms, creator profile creation, priority features.
- **`ADVANCE`**: All features, unlimited HD video uploads, live streaming broadcaster permissions.

#### `GET /api/subscriptions/plans`
Lists available subscription tiers and feature lists.
- **Auth required**: Yes
- **Response**: `{ plans: Plan[] }`

#### `GET /api/subscriptions/me`
Returns current user's active plan, expiry date, and feature flags.
- **Auth required**: Yes
- **Response**:
  ```json
  {
    "tier": "PRO",
    "planName": "Pro Pass",
    "color": "#FFD700",
    "colorName": "gold",
    "gradient": ["#FFE000", "#799F0C"],
    "expiresAt": "2026-10-23T00:00:00Z",
    "isActive": true,
    "canCreate": true,
    "canGoLive": false
  }
  ```

#### `POST /api/subscriptions/upgrade`
Upgrades user subscription tier.
- **Auth required**: Yes
- **Request Body**: `{ "tier": "PRO" | "ADVANCE" }`
- **Response**: `MySubscription`

#### `POST /api/subscriptions/cancel`
Cancels recurring renewal of subscription.
- **Auth required**: Yes
- **Response**: `MySubscription`

---

### 12. Analytics & Tracking (`/api/analytics`)

#### `POST /api/analytics/view/:contentId`
Increments content view count and records viewing analytics.
- **Auth required**: Yes
- **Response**: `{ ok: true }`

#### `GET /api/analytics/creator/me`
Comprehensive metric totals, top performing content, views timeline series, and room engagement.
- **Auth required**: Yes (Creator role)
- **Response**: `CreatorAnalytics`

#### `GET /api/analytics/admin`
System-wide metrics (signups series, platform views, room volume, storage usage).
- **Auth required**: Yes (Admin only)
- **Response**: `AdminAnalyticsFull`

---

### 13. Personal Activity & History (`/api/me`)

#### `GET /api/me/overview`
Dashboard counts and summaries of joined rooms, followed creators, and active subscriptions.
- **Auth required**: Yes
- **Response**: `{ counts: { rooms, following, subscriptions }, rooms: MyRoom[], following: MyCreatorLink[], subscriptions: MyCreatorLink[] }`

#### `GET /api/me/rooms`
User's room visit history and active room memberships.
- **Auth required**: Yes
- **Response**: `{ items: MyRoom[] }`

#### `GET /api/me/following` & `GET /api/me/subscriptions`
List of followed creators and active creator channel subscriptions.
- **Auth required**: Yes
- **Response**: `{ items: MyCreatorLink[] }`

---

### 14. Notifications (`/api/notifications`)

#### `GET /api/notifications`
Lists notifications with unread badge count.
- **Auth required**: Yes
- **Query Parameters**: `limit`, `offset`, `unread` (`true | false`)
- **Response**: `{ items: Notification[], total: number, unreadCount: number }`

#### `POST /api/notifications/:id/read`
Marks single notification as read.
- **Auth required**: Yes
- **Response**: `null`

#### `POST /api/notifications/read-all`
Marks all notifications as read.
- **Auth required**: Yes
- **Response**: `null`

#### `DELETE /api/notifications/:id`
Deletes a notification.
- **Auth required**: Yes
- **Response**: `null`

---

### 15. Admin Portal (`/api/admin`)

*All admin endpoints require an authenticated user with `isAdmin: true`.*

#### Stats & Analytics
- `GET /api/admin/stats`: User counts, active rooms, published posts, content breakdown.
- `GET /api/admin/analytics`: Historical user signup and room creation timelines.

#### User Management
- `GET /api/admin/users`: Searchable and paginated user directory (`?page=&limit=&search=`).
- `PATCH /api/admin/users/:id`: Change user roles (`{ isAdmin?, isVerified?, isBanned? }`).
- `DELETE /api/admin/users/:id`: Delete user account.

#### Content Moderation
- `POST /api/admin/content`: Admin direct content ingest (`{ title, videoUrl, category, year, description, isFeatured }`).
- `PATCH /api/admin/content/:id`: Edit content details or toggle featured flag.
- `DELETE /api/admin/content/:id`: Permanently delete content.

#### Creator & Content Approval Queues
- `GET /api/creators/admin/pending`: List pending creator applications.
- `POST /api/creators/admin/:id/approve`: Approve creator.
- `POST /api/creators/admin/:id/reject`: Reject creator with reason (`{ reason }`).
- `GET /api/creators/admin/content/pending`: Review queue for user-uploaded videos.
- `POST /api/creators/admin/content/:id/approve`: Approve uploaded video for public catalog (`{ isFeatured?: boolean }`).
- `POST /api/creators/admin/content/:id/reject`: Reject video upload with reason (`{ reason }`).

#### Tier & Subscription Control
- `GET /api/admin/subscription-tiers`: List editable tier configurations.
- `PATCH /api/admin/subscription-tiers/:tier`: Update price, days, and features.
- `POST /api/admin/subscription-tiers/assign`: Manually assign a tier to a user (`{ userId, tier, days }`).

#### Room Oversight
- `GET /api/admin/rooms`: List all active and past rooms (`?search=&page=&limit=`).
- `POST /api/admin/rooms/:id/end`: Force terminate an active room.
- `DELETE /api/admin/rooms/:id`: Delete room record.

---

## 5. Real-Time Socket.IO Protocol

The real-time layer synchronizes room playback, delivers instant room chats and reactions, and manages 1-on-1 direct chat messaging.

### Connection Handshake & Reconnection

The client connects to `SOCKET_URL` using dynamic token retrieval:

```javascript
import { io } from 'socket.io-client';

const socket = io(SOCKET_URL, {
  auth: (cb) => {
    // Dynamically fetches latest token from storage on EVERY connect/reconnect
    tokenStorage.getAccessToken().then((token) => cb({ token: token || '' }));
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

// Proactively refresh token on reconnect attempts
socket.io.on('reconnect_attempt', async () => {
  await refreshAccessToken();
});
```

---

### Watch Party Room Events

#### Client Emitted Events (`Client -> Server`)

| Event Name | Payload Schema | Description |
| :--- | :--- | :--- |
| `room:join` | `{ roomId: string }` | Joins the real-time room socket channel |
| `room:leave` | `{ roomId: string }` | Leaves the room socket channel |
| `room:play` | `{ roomId: string, position: number }` | Signals host hit play at `position` (sec) |
| `room:pause` | `{ roomId: string, position: number }` | Signals host paused playback at `position` |
| `room:seek` | `{ roomId: string, position: number, isPlaying: boolean }` | Signals host scrubbed / seeked player |
| `room:videoChange` | `{ roomId: string, url: string }` | Changes the playing video URL for all users |
| `room:message` | `{ roomId: string, content: string }` | Sends live room chat overlay message |
| `room:reaction` | `{ roomId: string, emoji: string }` | Broadcasts floating emoji reaction |
| `room:end` | `{ roomId: string }` | Ends room (host only) |

#### Server Broadcast Events (`Server -> Client`)

| Event Name | Payload Schema | Description |
| :--- | :--- | :--- |
| `room:joined` | `{ room: Room }` | Sent upon successful join confirmation |
| `room:state` | `{ syncState: RoomSyncState }` | Full current playback & server time snapshot |
| `room:play` | `{ position: number, serverTime: number }` | Trigger player playback at given time offset |
| `room:pause` | `{ position: number }` | Trigger player pause at position |
| `room:seek` | `{ position: number, isPlaying: boolean }` | Seek video to target position |
| `room:videoChange` | `{ url: string, videoId?: string, provider?: string }` | Player loads new media source |
| `room:userJoined` | `{ user: PublicUser }` | Notification that another user entered |
| `room:userLeft` | `{ userId: string }` | Notification that a user exited |
| `room:message` | `Message` | New chat message to display in overlay |
| `room:reaction` | `{ id: string, userId: string, emoji: string }` | Render flying emoji animation |
| `room:ended` | `{ roomId: string }` | Host ended the room; client navigates back |

---

### Chat Events

#### Client Emitted Events (`Client -> Server`)
- `chat:join` (`{ chatId: string }`): Subscribes to direct chat channel updates.
- `chat:leave` (`{ chatId: string }`): Unsubscribes from chat channel.
- `chat:markRead` (`{ chatId: string }`): Clears unread messages for conversation.
- `chat:message` (`{ chatId: string, content: string, type?: string, mediaUrl?: string, replyToId?: string }`): Sends real-time chat message.
- `chat:typing` (`{ chatId: string, isTyping: boolean }`): Broadcasts typing indicator.

#### Server Broadcast Events (`Server -> Client`)
- `chat:message` (`Message`): Inbound message received in active conversation.
- `chat:typing` (`{ chatId: string, userId: string, isTyping: boolean }`): User is typing indicator status.

---

## 6. LiveKit WebRTC Live Streaming

WatchParty Live uses **LiveKit** for sub-second, multi-participant interactive live video streaming.

### Broadcaster (Creator) Flow
1. Creator calls `POST /api/creators/me/live/start` with stream metadata.
2. Backend creates a LiveKit Room and generates an access token with publishing grants (`canPublish: true, canSubscribe: true`).
3. Mobile client connects via `@livekit/react-native`:
   ```typescript
   import { Room } from 'livekit-client';
   
   const room = new Room();
   await room.connect(livekitUrl, livekitToken);
   await room.localParticipant.setCameraEnabled(true);
   await room.localParticipant.setMicrophoneEnabled(true);
   ```

### Audience (Viewer) Flow
1. Viewer calls `POST /api/creators/live/:sessionId/join`.
2. Backend generates subscriber token (`canPublish: false, canSubscribe: true`).
3. Viewer attaches to audio/video tracks using `<VideoView>` from `@livekit/react-native`.
4. In-stream comments and reactions are transmitted across the LiveKit Data Channel via `ParticipantEvent.DataReceived`.

---

## 7. Video Ingestion & Bunny Stream (TUS Protocol)

Video files are transcoded and served via Bunny.net Stream CDN to deliver adaptive HLS playback.

### Resumable Upload Sequence (TUS 1.0.0)

```
Mobile App                        Backend                        Bunny Stream
    │                                │                                │
    │ 1. POST /creators/me/content   │                                │
    │ ─────────────────────────────> │                                │
    │                                │ 2. Create Video Entry          │
    │                                │ ─────────────────────────────> │
    │                                │ <───────────────────────────── │
    │ <───────────────────────────── │    (Signature & Expiry)        │
    │    (TUS Auth & videoId)        │                                │
    │                                                                 │
    │ 3. POST /tusupload (TUS Create with Upload-Length)              │
    │ ──────────────────────────────────────────────────────────────> │
    │ <────────────────────────────────────────────────────────────── │
    │    (201 Created + Location URL)                                 │
    │                                                                 │
    │ 4. PATCH <Location> (Upload chunks with progress)               │
    │ ──────────────────────────────────────────────────────────────> │
    │ <────────────────────────────────────────────────────────────── │
    │    (204 No Content / Upload Complete)                           │
    │                                                                 │
    │ 5. POST /creators/me/content/:id/sync (Poll transcoding status) │
    │ ─────────────────────────────> │                                │
```

### Direct Multipart Fallback
For environments where TUS is unavailable or blocked, the client falls back to:
```http
POST /api/creators/me/content/upload-file
Content-Type: multipart/form-data
Authorization: Bearer <token>

file=<binary>&title=...&category=...&format=...
```

---

## 8. Deep Linking Schema

The application handles deep links via the custom scheme `watchpartylive://` and universal links via `https://watchpartylive.app`.

| Intent | Custom URI Scheme | Universal Web Link |
| :--- | :--- | :--- |
| **Join Room via Invite** | `watchpartylive://room/invite/:token` | `https://watchpartylive.app/r/:token` |
| **Join Room by Code** | `watchpartylive://room/:code` | `https://watchpartylive.app/room/:code` |
| **View Creator Channel**| `watchpartylive://creator/:username` | `https://watchpartylive.app/creator/:username` |
| **Join Live Broadcast** | `watchpartylive://live/:sessionId` | `https://watchpartylive.app/live/:sessionId` |
| **View Community Post** | `watchpartylive://post/:id` | `https://watchpartylive.app/post/:id` |
| **Verify Email / Reset**| `watchpartylive://verify?code=...&email=...`| `https://watchpartylive.app/verify?code=...` |
