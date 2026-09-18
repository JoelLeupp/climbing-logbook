import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { Auth } from './core/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, HlmButtonImports],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  constructor() {
    void this.auth.refresh();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
