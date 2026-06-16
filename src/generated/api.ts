/**
 * Generated SDK
 * Auto-generated from backend routes
 * DO NOT EDIT - regenerate with Lynq
 */

import * as React from 'react';

const API_URL = 'http://localhost:3001';
const LYNQ_API_URL = typeof window !== 'undefined' ? window.location.origin : '';
const LYNQ_PROJECT_ID = 'ed0459a9-4952-4edd-913b-0ecbb9a0383c';

// Type definitions

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

// API client
class APIClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setSession(session: { accessToken: string; refreshToken?: string | null }) {
    this.accessToken = session.accessToken;
    this.refreshToken = session.refreshToken ?? this.refreshToken;
  }

  clearSession() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  getAccessToken() {
    return this.accessToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  private getProjectId(projectId?: string): string {
    const resolved = projectId || LYNQ_PROJECT_ID;
    if (!resolved) {
      throw new Error('LYNQ projectId is required for auth methods');
    }
    return resolved;
  }

  async signUp(input: { email: string; password: string; profile?: Record<string, unknown> }, projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    const response = await fetch(`${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        profile: input.profile ?? {},
        emailVerified: false,
      }),
    });
    if (!response.ok) throw new Error(`Auth error: ${response.statusText}`);
    return response.json();
  }

  async signInWithPassword(input: { email: string; password: string }, projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    const response = await fetch(`${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Auth error: ${response.statusText}`);
    const result = await response.json();
    this.setSession(result.session);
    return result.session;
  }

  async signInWithGoogle(credential: string, projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    const response = await fetch(`${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/oauth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential }),
    });
    if (!response.ok) throw new Error(`Auth error: ${response.statusText}`);
    const result = await response.json();
    this.setSession(result.session);
    return result.session;
  }

  signInWithOAuthRedirect(provider: 'google', redirectTo: string, projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    const url = `${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/oauth/${provider}/authorize?redirectTo=${encodeURIComponent(redirectTo)}`;
    if (typeof window === 'undefined') {
      return url;
    }
    window.location.href = url;
    return url;
  }

  consumeOAuthCallback(search = typeof window !== 'undefined' ? window.location.search : '') {
    const params = new URLSearchParams(search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken) return null;
    this.setSession({ accessToken, refreshToken });
    return { accessToken, refreshToken };
  }

  async getCurrentUser(projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    if (!this.accessToken) return null;
    const response = await fetch(`${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/session`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      credentials: 'include',
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result.session.user;
  }

  async sendVerificationEmail(input: { email: string; redirectTo?: string }, projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    const response = await fetch(`${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/email/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Auth error: ${response.statusText}`);
    return response.json();
  }

  async verifyEmail(input: { email: string; code: string }, projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    const response = await fetch(`${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/email/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Auth error: ${response.statusText}`);
    const result = await response.json();
    this.setSession(result.session);
    return result.session;
  }

  async sendPasswordResetEmail(input: { email: string; redirectTo?: string }, projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    const response = await fetch(`${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/email/send-reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Auth error: ${response.statusText}`);
    return response.json();
  }

  async exchangeResetPasswordCode(input: { email: string; code: string }, projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    const response = await fetch(`${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/email/exchange-reset-password-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Auth error: ${response.statusText}`);
    return response.json();
  }

  async resetPassword(input: { token: string; newPassword: string }, projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    const response = await fetch(`${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/email/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Auth error: ${response.statusText}`);
    return response.json();
  }

  async refreshSession(projectId?: string) {
    const resolvedProjectId = this.getProjectId(projectId);
    if (!this.refreshToken) return null;
    const response = await fetch(`${LYNQ_API_URL}/api/lynq/platform/projects/${resolvedProjectId}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    if (!response.ok) {
      this.clearSession();
      return null;
    }
    const result = await response.json();
    this.setSession(result.session);
    return result.session;
  }

  signOut() {
    this.clearSession();
  }

  async getCategories(): Promise<unknown> {
    return this.request('GET', '/categories');
  }

  async createCategory(data: unknown): Promise<unknown> {
    return this.request('POST', '/categories', data);
  }

  async getCategoryById(id: string): Promise<unknown> {
    return this.request('GET', `/categories/${id}`);
  }

  async updateCategory(id: string, data: unknown): Promise<unknown> {
    return this.request('PUT', `/categories/${id}`, data);
  }

  async deleteCategory(id: string): Promise<void> {
    return this.request('DELETE', `/categories/${id}`);
  }

  async getProducts(): Promise<unknown> {
    return this.request('GET', '/products');
  }

  async createProduct(data: unknown): Promise<unknown> {
    return this.request('POST', '/products', data);
  }

  async getProductById(id: string): Promise<unknown> {
    return this.request('GET', `/products/${id}`);
  }

  async updateProduct(id: string, data: unknown): Promise<unknown> {
    return this.request('PUT', `/products/${id}`, data);
  }

  async deleteProduct(id: string): Promise<void> {
    return this.request('DELETE', `/products/${id}`);
  }

}

export const api = new APIClient(API_URL);
export default api;

// React hooks

export function useGetCategories() {
  const [data, setData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    try {
      const result = await api.getCategories();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

export function useCreateCategory(input: unknown) {
  const [data, setData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    try {
      const result = await api.createCategory(input);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

export function useGetCategoryById(id: string) {
  const [data, setData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    try {
      const result = await api.getCategoryById(id);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

export function useUpdateCategory(id: string, input: unknown) {
  const [data, setData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    try {
      const result = await api.updateCategory(id, input);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

export function useDeleteCategory(id: string) {
  const [data, setData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    try {
      const result = await api.deleteCategory(id);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

export function useGetProducts() {
  const [data, setData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    try {
      const result = await api.getProducts();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

export function useCreateProduct(input: unknown) {
  const [data, setData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    try {
      const result = await api.createProduct(input);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

export function useGetProductById(id: string) {
  const [data, setData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    try {
      const result = await api.getProductById(id);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

export function useUpdateProduct(id: string, input: unknown) {
  const [data, setData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    try {
      const result = await api.updateProduct(id, input);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

export function useDeleteProduct(id: string) {
  const [data, setData] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    try {
      const result = await api.deleteProduct(id);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}
