import { Component, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import type { Climb, Sector } from '../../core/types';

@Component({
  selector: 'app-sector-detail',
  imports: [RouterLink],
  templateUrl: './sector-detail.html',
})
export class SectorDetail {
  private readonly api = inject(Api);

  readonly id = input.required<string>();
  readonly sectorId = input.required<string>();

  protected readonly sector = resource({
    params: () => ({ sectorId: this.sectorId() }),
    loader: ({ params }) => this.api.get<Sector>(`/api/sectors/${params.sectorId}`),
  });

  protected readonly climbs = resource({
    params: () => ({ sectorId: this.sectorId() }),
    loader: ({ params }) => this.api.get<Climb[]>(`/api/climbs?sectorId=${params.sectorId}`),
  });
}
