import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import L from 'leaflet';

// Leaflet's default marker icons resolve relative to the page URL, which breaks under a
// bundler - point them at the copied assets in public/leaflet instead. Icon.Default._getIconUrl
// always prepends Icon.Default.imagePath (auto-detected from a hidden-element CSS trick, which
// Angular's build resolves to a `/media/...` asset path via leaflet.css's own url() reference) on
// top of whatever iconUrl/shadowUrl is set - so giving it an absolute path here produces a
// doubled-up URL like `/media//leaflet/marker-icon.png` (404). Setting imagePath explicitly avoids
// the auto-detection entirely; iconUrl/shadowUrl must then be bare filenames, not paths.
L.Icon.Default.imagePath = '/leaflet/';
L.Icon.Default.mergeOptions({
  iconUrl: 'marker-icon.png',
  iconRetinaUrl: 'marker-icon-2x.png',
  shadowUrl: 'marker-shadow.png',
});

export interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-map',
  template: `<div #mapEl class="h-full w-full"></div>`,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');

  readonly markers = input<MapMarker[]>([]);
  readonly center = input<[number, number]>([46.8, 8.3]);
  readonly zoom = input(8);
  readonly markerClick = output<string>();

  private map?: L.Map;
  private markerLayer?: L.LayerGroup;

  constructor() {
    effect(() => {
      const markers = this.markers();
      const layer = this.markerLayer;
      if (!layer) return;

      layer.clearLayers();
      for (const marker of markers) {
        L.marker([marker.latitude, marker.longitude])
          .addTo(layer)
          .bindPopup(marker.name)
          .on('click', () => this.markerClick.emit(marker.id));
      }
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl().nativeElement).setView(this.center(), this.zoom());
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
    this.markerLayer = L.layerGroup().addTo(this.map);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
