import { Component, inject, input, signal } from '@angular/core';
import { form, FormField, FormRoot, min } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { Api } from '../../core/api';
import type { LogEntry, LogStatus } from '../../core/types';

interface LogFormModel {
  status: LogStatus;
  attempts: number | null;
  notes: string;
  climbedAt: string;
}

@Component({
  selector: 'app-log-new',
  imports: [
    RouterLink,
    FormField,
    FormRoot,
    HlmButtonImports,
    HlmFieldImports,
    HlmInputImports,
    HlmTextareaImports,
  ],
  templateUrl: './log-new.html',
})
export class LogNew {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  readonly climbId = input<string>();

  protected readonly model = signal<LogFormModel>({
    status: 'todo',
    attempts: null,
    notes: '',
    climbedAt: '',
  });

  protected readonly logForm = form(
    this.model,
    (schema) => {
      min(schema.attempts, 1, { message: 'Must be at least 1 attempt' });
    },
    {
      submission: {
        action: async (field) => {
          const climbId = this.climbId();
          if (!climbId) return { kind: 'missingClimb', message: 'No climb selected' };

          const value = field().value();
          try {
            await this.api.post<LogEntry>('/api/logs', {
              climbId,
              status: value.status,
              attempts: value.attempts,
              notes: value.notes || null,
              climbedAt: value.climbedAt || null,
            });
            this.router.navigate(['/climbs', climbId]);
            return;
          } catch (err) {
            return { kind: 'server', message: err instanceof Error ? err.message : 'Failed to save log entry' };
          }
        },
      },
    },
  );
}
