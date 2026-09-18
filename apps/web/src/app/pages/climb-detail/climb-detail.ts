import { Component, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { Api } from '../../core/api';
import { API_URL } from '../../core/config';
import type { Climb, LogEntry, LogStatus, Media, Sector } from '../../core/types';

const STATUS_LABEL: Record<LogStatus, string> = {
  flash: 'Flash',
  redpoint: 'Redpoint',
  project: 'Project',
  todo: 'To do',
};

@Component({
  selector: 'app-climb-detail',
  imports: [RouterLink, HlmButtonImports],
  templateUrl: './climb-detail.html',
})
export class ClimbDetail {
  private readonly api = inject(Api);

  readonly id = input.required<string>();
  protected readonly apiUrl = API_URL;
  protected readonly statusLabel = STATUS_LABEL;

  protected readonly climb = resource({
    params: () => ({ id: this.id() }),
    loader: ({ params }) => this.api.get<Climb>(`/api/climbs/${params.id}`),
  });

  // Returning undefined from `params` skips the loader until the climb (and its sectorId) has loaded.
  protected readonly sector = resource({
    params: () => this.climb.value()?.sectorId,
    loader: ({ params }) => this.api.get<Sector>(`/api/sectors/${params}`),
  });

  protected readonly logEntries = resource({
    params: () => ({ id: this.id() }),
    loader: ({ params }) => this.api.get<LogEntry[]>(`/api/logs?climbId=${params.id}`),
  });

  protected readonly media = resource({
    params: () => ({ id: this.id() }),
    loader: ({ params }) => this.api.get<Media[]>(`/api/media?entityType=climb&entityId=${params.id}`),
  });
}
