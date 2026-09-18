import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  {
    path: 'areas/:id',
    loadComponent: () => import('./pages/area-detail/area-detail').then((m) => m.AreaDetail),
  },
  {
    path: 'areas/:id/sectors/:sectorId',
    loadComponent: () => import('./pages/sector-detail/sector-detail').then((m) => m.SectorDetail),
  },
  {
    path: 'climbs/:id',
    loadComponent: () => import('./pages/climb-detail/climb-detail').then((m) => m.ClimbDetail),
  },
  {
    path: 'log/new',
    loadComponent: () => import('./pages/log-new/log-new').then((m) => m.LogNew),
  },
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
];
