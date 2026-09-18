import { Component, computed, inject, input, resource } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { API_URL } from '../../core/config';
import type { ClimbingArea, Media, Sector } from '../../core/types';
import { MapComponent, type MapMarker } from '../../shared/map';

@Component({
  selector: 'app-area-detail',
  imports: [RouterLink, MapComponent],
  templateUrl: './area-detail.html',
})
export class AreaDetail {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  protected readonly apiUrl = API_URL;

  protected readonly area = resource({
    params: () => ({ id: this.id() }),
    loader: ({ params }) => this.api.get<ClimbingArea>(`/api/areas/${params.id}`),
  });

  protected readonly sectors = resource({
    params: () => ({ id: this.id() }),
    loader: ({ params }) => this.api.get<Sector[]>(`/api/sectors?areaId=${params.id}`),
  });

  protected readonly media = resource({
    params: () => ({ id: this.id() }),
    loader: ({ params }) => this.api.get<Media[]>(`/api/media?entityType=area&entityId=${params.id}`),
  });

  protected readonly markers = computed<MapMarker[]>(() =>
    (this.sectors.value() ?? [])
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({ id: s.id, name: s.name, latitude: s.latitude!, longitude: s.longitude! })),
  );

  onMarkerClick(sectorId: string): void {
    this.router.navigate(['/areas', this.id(), 'sectors', sectorId]);
  }
}
