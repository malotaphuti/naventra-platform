import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatPaginatorModule],
  template: `
    <div class="page-header">
      <h1>Incidents</h1>
      <button mat-raised-button color="warn" routerLink="new">
        <mat-icon>add</mat-icon> Report Incident
      </button>
    </div>

    <table mat-table [dataSource]="incidents()" class="mat-elevation-z2 full-width">
      <ng-container matColumnDef="incidentNumber">
        <th mat-header-cell *matHeaderCellDef>Incident #</th>
        <td mat-cell *matCellDef="let i">{{ i.incidentNumber }}</td>
      </ng-container>

      <ng-container matColumnDef="type">
        <th mat-header-cell *matHeaderCellDef>Type</th>
        <td mat-cell *matCellDef="let i">{{ i.type }}</td>
      </ng-container>

      <ng-container matColumnDef="severity">
        <th mat-header-cell *matHeaderCellDef>Severity</th>
        <td mat-cell *matCellDef="let i">
          <mat-chip [class]="'severity-' + i.severity.toLowerCase()">{{ i.severity }}</mat-chip>
        </td>
      </ng-container>

      <ng-container matColumnDef="vehicle">
        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
        <td mat-cell *matCellDef="let i">{{ i.vehicleRegistration }}</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let i"><mat-chip>{{ i.status }}</mat-chip></td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let i">
          @if (i.status === 'REPORTED' || i.status === 'UNDER_REVIEW') {
            <button mat-icon-button (click)="resolve(i.id)" color="primary" aria-label="Resolve">
              <mat-icon>check_circle</mat-icon>
            </button>
          }
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;"></tr>
    </table>

    <mat-paginator [length]="total()" [pageSize]="20" (page)="onPage($event)"></mat-paginator>

    @if (incidents().length === 0) {
      <p style="text-align:center; color:#666; margin-top:2rem;">No incidents reported.</p>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .full-width { width: 100%; }
    .severity-critical { background: #f44336 !important; color: white !important; }
    .severity-high { background: #ff9800 !important; }
    .severity-medium { background: #ffc107 !important; }
    .severity-low { background: #4caf50 !important; color: white !important; }
  `]
})
export class IncidentListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly incidents = signal<any[]>([]);
  readonly total = signal(0);
  readonly columns = ['incidentNumber', 'type', 'severity', 'vehicle', 'status', 'actions'];
  page = 0;

  ngOnInit() { this.load(); }

  load() {
    const params = new HttpParams().set('page', this.page.toString()).set('size', '20');
    this.http.get<any>('/api/v1/incidents', { params }).subscribe(r => {
      this.incidents.set(r.content || []);
      this.total.set(r.totalElements || 0);
    });
  }

  resolve(id: number) {
    this.http.put(`/api/v1/incidents/${id}/resolve?notes=Resolved`, {}).subscribe(() => this.load());
  }

  onPage(e: PageEvent) { this.page = e.pageIndex; this.load(); }
}
