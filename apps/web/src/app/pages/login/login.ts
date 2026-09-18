import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { Auth } from '../../core/auth';

interface LoginFormModel {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormField, FormRoot, HlmButtonImports, HlmCardImports, HlmFieldImports, HlmInputImports],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly model = signal<LoginFormModel>({ email: '', password: '' });

  protected readonly loginForm = form(
    this.model,
    (schema) => {
      required(schema.email, { message: 'Email is required' });
      email(schema.email, { message: 'Enter a valid email address' });
      required(schema.password, { message: 'Password is required' });
    },
    {
      submission: {
        action: async (field) => {
          const value = field().value();
          try {
            await this.auth.login(value.email, value.password);
            this.router.navigateByUrl('/');
            return;
          } catch (err) {
            return { kind: 'server', message: err instanceof Error ? err.message : 'Login failed' };
          }
        },
      },
    },
  );
}
