import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, minLength, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { Auth } from '../../core/auth';

interface RegisterFormModel {
  email: string;
  name: string;
  password: string;
}

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormField, FormRoot, HlmButtonImports, HlmCardImports, HlmFieldImports, HlmInputImports],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly model = signal<RegisterFormModel>({ email: '', name: '', password: '' });

  protected readonly registerForm = form(
    this.model,
    (schema) => {
      required(schema.email, { message: 'Email is required' });
      email(schema.email, { message: 'Enter a valid email address' });
      required(schema.name, { message: 'Name is required' });
      required(schema.password, { message: 'Password is required' });
      minLength(schema.password, 8, { message: 'Password must be at least 8 characters' });
    },
    {
      submission: {
        action: async (field) => {
          const value = field().value();
          try {
            await this.auth.register(value.email, value.name, value.password);
            this.router.navigateByUrl('/');
            return;
          } catch (err) {
            return { kind: 'server', message: err instanceof Error ? err.message : 'Registration failed' };
          }
        },
      },
    },
  );
}
