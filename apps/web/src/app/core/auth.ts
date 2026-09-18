import { Injectable, inject, signal } from '@angular/core';
import { Api } from './api';
import type { User } from './types';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly api = inject(Api);

  readonly user = signal<User | null>(null);

  async refresh(): Promise<void> {
    try {
      this.user.set(await this.api.get<User | null>('/api/auth/me'));
    } catch {
      // Genuine network/server failure (API down, etc.) - not-logged-in is a 200 with `null`.
      this.user.set(null);
    }
  }

  async login(email: string, password: string): Promise<void> {
    this.user.set(await this.api.post<User>('/api/auth/login', { email, password }));
  }

  async register(email: string, name: string, password: string): Promise<void> {
    this.user.set(await this.api.post<User>('/api/auth/register', { email, name, password }));
  }

  async logout(): Promise<void> {
    await this.api.post('/api/auth/logout');
    this.user.set(null);
  }
}
