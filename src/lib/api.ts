/* ──────────────────────────────────────────────
   API client for Django backend
   ────────────────────────────────────────────── */

const BASE = import.meta.env.VITE_API_URL ?? 'https://mafia.alward.dev'

function formatError(body: Record<string, unknown>): string {
  const entries = Object.entries(body)
  if (entries.length === 0) return 'Request failed'
  const first = entries[0]
  if (Array.isArray(first[1]) && first[1].length > 0) return `${first[0]}: ${first[1][0]}`
  if (typeof first[1] === 'string') return first[1]
  return `HTTP error`
}

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(formatError(body))
  }
  return res.json() as Promise<T>
}

/* ── Types ── */

export interface TokenResponse { access: string; refresh: string }

export interface RegisterPayload { username: string; email: string; password: string }

export interface RoomResponse {
  room: {
    id: number
    name: string
    code: string
    host: string
    max_members: number
    member_count: number
    status: string
    meeting_id: string
    created_at: string
    updated_at: string
  }
  participant_id?: string
  token?: string
}

export interface MemberListResponse {
  host: { id: number; username: string }
  member_count: number
  max_members: number
  members: { id: number; username: string }[]
}

export interface AddMemberResponse {
  room: RoomResponse['room']
  user_id: number
  username: string
  participant_id: string
  token: string
}

export const api = {
  /* ── Auth ── */
  login: (username: string, password: string) =>
    request<TokenResponse>('/api/accounts/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  refreshToken: (refresh: string) =>
    request<TokenResponse>('/api/accounts/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    }),

  register: (data: RegisterPayload) =>
    request<{ id: number; username: string; email: string }>('/api/accounts/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /* ── Rooms ── */
  createRoom: (name: string, maxMembers: number, token: string) =>
    request<RoomResponse>('/api/rooms/create/', {
      method: 'POST',
      body: JSON.stringify({ name, max_members: maxMembers }),
      headers: authHeader(token),
    }),

  joinRoom: (code: string, token: string) =>
    request<RoomResponse>(`/api/rooms/${code}/join/`, {
      method: 'POST',
      headers: authHeader(token),
    }),

  getMembers: (code: string, token: string) =>
    request<MemberListResponse>(`/api/rooms/${code}/members/`, {
      headers: authHeader(token),
    }),

  addMember: (code: string, userId: number, token: string) =>
    request<AddMemberResponse>(`/api/rooms/${code}/add/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
      headers: authHeader(token),
    }),

  removeMember: (code: string, userId: number, token: string) =>
    request<{ room: RoomResponse['room']; removed_user_id: number; removed_username: string }>(
      `/api/rooms/${code}/remove/`,
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
        headers: authHeader(token),
      },
    ),
}
