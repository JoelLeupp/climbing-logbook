import { Injectable } from '@angular/core';
import { API_URL } from './config';

@Injectable({ providedIn: 'root' })
export class Api {
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const isFormData = init.body instanceof FormData;
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: isFormData ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Request failed with status ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data ?? {}),
    });
  }

  patch<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}
