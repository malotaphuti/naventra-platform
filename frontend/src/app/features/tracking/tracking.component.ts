import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <h1>GPS Tracking</h1>
    <mat-card>
      <mat-card-content>
        <div id="map" style="height: 600px; background: #e8e8e8; display: flex; align-items: center; justify-content: center;">
          <p>Leaflet Map will be rendered here. Configure Leaflet with OpenStreetMap tiles.</p>
        </div>
      </mat-card-content>
    </mat-card>
  `
})
export class TrackingComponent {}
