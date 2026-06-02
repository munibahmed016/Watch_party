// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

export const queryKeys = {
  auth: ['auth'] as const,
  me: ['auth', 'me'] as const,
  user: (username: string) => ['user', username] as const,
  userSearch: (q: string) => ['user', 'search', q] as const,

  friends: ['friends'] as const,
  friendsList: ['friends', 'list'] as const,
  friendsSuggestions: ['friends', 'suggestions'] as const,
  friendsIncoming: ['friends', 'requests', 'incoming'] as const,
  friendsOutgoing: ['friends', 'requests', 'outgoing'] as const,

  rooms: ['rooms'] as const,
  roomsList: (filter?: string, search?: string) => ['rooms', 'list', filter, search] as const,
  room: (id: string) => ['rooms', id] as const,
  roomSync: (id: string) => ['rooms', id, 'sync'] as const,

  chats: ['chats'] as const,
  chatsList: ['chats', 'list'] as const,
  chat: (id: string) => ['chats', id] as const,
  chatMessages: (id: string) => ['chats', id, 'messages'] as const,

  discover: ['discover'] as const,
  discoverHome: ['discover', 'home'] as const,
  discoverSearch: (q: string) => ['discover', 'search', q] as const,

  notifications: ['notifications'] as const,

  // Posts (News & Events)
  posts: ['posts'] as const,
  postsList: (filters?: { kind?: 'NEWS' | 'EVENT'; upcoming?: boolean; authorUsername?: string }) =>
    ['posts', 'list', filters?.kind, filters?.upcoming ? 'upcoming' : null, filters?.authorUsername] as const,
  post: (id: string) => ['posts', id] as const,
  postsByAuthor: (username: string) => ['posts', 'author', username] as const,
  
  content: ['content'] as const,
  contentList: (category?: string, search?: string, page?: number) =>
    ['content', 'list', category, search, page] as const,
  contentCategories: ['content', 'categories'] as const,
  contentLanding: ['content', 'landing'] as const,
  contentFeatured: ['content', 'featured'] as const,
  contentItem: (id: string) => ['content', id] as const,
 
};
