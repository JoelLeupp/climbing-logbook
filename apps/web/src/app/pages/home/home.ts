import { Component, computed, inject, resource } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { Api } from '../../core/api';
import type { ClimbingArea } from '../../core/types';
import { MapComponent, type MapMarker } from '../../shared/map';

@Component({
  selector: 'app-home',
  imports: [RouterLink, MapComponent, HlmCardImports],
  templateUrl: './home.html',
})
export class Home {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  protected readonly areas = resource({
    loader: () => this.api.get<ClimbingArea[]>('/api/areas'),
  });

  protected readonly markers = computed<MapMarker[]>(() =>
    (this.areas.value() ?? []).map((area) => ({
      id: area.id,
      name: area.name,
      latitude: area.latitude,
      longitude: area.longitude,
    })),
  );

  onMarkerClick(id: string): void {
    this.router.navigate(['/areas', id]);
  }
}
