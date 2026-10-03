import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { toLocalDate } from '../../core/models/page.model';

interface ReportCard { key: string; title: string; description: string; icon: string; }
type ExportFormat = 'csv' | 'xlsx' | 'pdf';

interface ReportData {
  key: string;
  title: string;
  from: string;
  to: string;
  columns: string[];
  rows: (string | number | null)[][];
  generatedAt: string;
}

const REPORTS: ReportCard[] = [
  { key: 'fleet-utilization', title: 'Fleet Utilization', description: 'Trips, distance and days in use per vehicle', icon: 'pie_chart' },
  { key: 'driver-performance', title: 'Driver Performance', description: 'Trips, distance, fuel efficiency and incidents per driver', icon: 'people' },
  { key: 'maintenance-history', title: 'Maintenance History', description: 'Work orders with dates and cost breakdown', icon: 'build' },
  { key: 'fuel-consumption', title: 'Fuel Consumption', description: 'Litres, spend and efficiency per vehicle', icon: 'local_gas_station' },
  { key: 'trip-summary', title: 'Trip Summary', description: 'All trips requested in the period', icon: 'route' },
  { key: 'vehicle-downtime', title: 'Vehicle Downtime', description: 'Days off the road for maintenance per vehicle', icon: 'timer_off' },
  { key: 'incident-report', title: 'Incident Report', description: 'Incidents with severity, status and resolution time', icon: 'warning' },
  { key: 'cost-analysis', title: 'Cost Analysis', description: 'Fuel and maintenance cost per vehicle and per km', icon: 'payments' }
];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatProgressSpinnerModule, MatTooltipModule],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="page-head">
      <div>
        <h1>Reports</h1>
        <p>Preview operational reports or download them as CSV, Excel or PDF.</p>
      </div>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Period</mat-label>
        <mat-date-range-input [rangePicker]="picker" [max]="today">
          <input matStartDate placeholder="From" [(ngModel)]="from" (dateChange)="rangeChanged()">
          <input matEndDate placeholder="To" [(ngModel)]="to" (dateChange)="rangeChanged()">
        </mat-date-range-input>
        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-date-range-picker #picker></mat-date-range-picker>
      </mat-form-field>
      <div class="quick">
        <button mat-stroked-button (click)="quick('month')">This month</button>
        <button mat-stroked-button (click)="quick('last-month')">Last month</button>
        <button mat-stroked-button (click)="quick('90')">Last 90 days</button>
        <button mat-stroked-button (click)="quick('ytd')">Year to date</button>
      </div>
    </div>

    <div class="report-grid">
      @for (r of reports; track r.key) {
        <section class="panel rcard" [class.active]="preview()?.key === r.key">
          <div class="rhead">
            <span class="ricon"><mat-icon>{{ r.icon }}</mat-icon></span>
            <div>
              <h2>{{ r.title }}</h2>
              <p>{{ r.description }}</p>
            </div>
          </div>
          <div class="ractions">
            <button mat-flat-button color="primary" (click)="openPreview(r)" [disabled]="busy() === r.key + ':preview'">
              @if (busy() === r.key + ':preview') { <mat-spinner diameter="16"></mat-spinner> } @else { <mat-icon>visibility</mat-icon> }
              Preview
            </button>
            @for (f of formats; track f.format) {
              <button mat-stroked-button (click)="download(r, f.format)" [disabled]="busy() === r.key + ':' + f.format"
                      [matTooltip]="'Download ' + f.label">
                @if (busy() === r.key + ':' + f.format) { <mat-spinner diameter="16"></mat-spinner> } @else { <mat-icon>{{ f.icon }}</mat-icon> }
                {{ f.label }}
              </button>
            }
          </div>
        </section>
      }
    </div>

    <div #previewEl>
      @if (preview(); as p) {
        <section class="panel preview">
          <div class="panel-head">
            <h2>{{ p.title }} <small>{{ p.from }} to {{ p.to }} · {{ p.rows.length }} row(s)</small></h2>
            <button mat-icon-button (click)="preview.set(null)" aria-label="Close preview"><mat-icon>close</mat-icon></button>
          </div>
          @if (p.rows.length) {
            <div class="scroll">
              <table>
                <thead><tr>@for (c of p.columns; track $index) { <th>{{ c }}</th> }</tr></thead>
                <tbody>
                  @for (row of p.rows; track $index) {
                    <tr [class.total]="row[0] === 'TOTAL'">
                      @for (cell of row; track $index) {
                        <td [class.num]="isNumber(cell)">{{ isNumber(cell) ? (cell | number:'1.0-2') : (cell ?? '—') }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="empty"><mat-icon>inbox</mat-icon><span>No data for this period</span></div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .filters { align-items: center; }
    .filters .mat-mdc-form-field { width: 280px; }
    .quick { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .report-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .rcard { display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; }
    .rcard.active { border-color: var(--fo-accent); }
    .rhead { display: flex; gap: 0.85rem; }
    .rhead h2 { margin: 0; font-size: 1rem; }
    .rhead p { margin: 0.2rem 0 0; font-size: 0.82rem; color: var(--fo-muted); }
    .ricon { width: 40px; height: 40px; flex: none; border-radius: 10px; display: grid; place-items: center; background: #f0fdfa; color: var(--fo-accent-strong); }
    .ractions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .ractions button { min-width: 0; padding: 0 0.7rem; }
    .ractions mat-spinner { display: inline-block; margin-right: 6px; }
    .panel-head small { font-weight: 400; color: var(--fo-muted); font-size: 0.8rem; margin-left: 0.5rem; }
    .scroll { overflow: auto; max-height: 60vh; border: 1px solid var(--fo-border); border-radius: 10px; }
    table { border-collapse: collapse; width: 100%; font-size: 0.82rem; }
    th { position: sticky; top: 0; background: #f8fafc; text-align: left; color: var(--fo-muted); font-weight: 600; white-space: nowrap; }
    th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--fo-border); }
    td { white-space: nowrap; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tr.total td { font-weight: 700; background: #f1f5f9; }
  `]
})
export class ReportsComponent {
  private readonly http = inject(HttpClient);
  @ViewChild('previewEl') private previewEl?: ElementRef<HTMLElement>;

  readonly reports = REPORTS;
  readonly formats: { format: ExportFormat; label: string; icon: string }[] = [
    { format: 'csv', label: 'CSV', icon: 'download' },
    { format: 'xlsx', label: 'Excel', icon: 'table_chart' },
    { format: 'pdf', label: 'PDF', icon: 'picture_as_pdf' }
  ];
  readonly today = new Date();
  readonly busy = signal<string | null>(null);
  readonly preview = signal<ReportData | null>(null);

  from: Date | null = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  to: Date | null = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());

  isNumber(value: unknown): value is number {
    return typeof value === 'number';
  }

  quick(kind: 'month' | 'last-month' | '90' | 'ytd'): void {
    const t = this.today;
    const end = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    switch (kind) {
      case 'month':
        this.from = new Date(t.getFullYear(), t.getMonth(), 1); this.to = end; break;
      case 'last-month':
        this.from = new Date(t.getFullYear(), t.getMonth() - 1, 1);
        this.to = new Date(t.getFullYear(), t.getMonth(), 0); break;
      case '90':
        this.from = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 89); this.to = end; break;
      case 'ytd':
        this.from = new Date(t.getFullYear(), 0, 1); this.to = end; break;
    }
    this.rangeChanged();
  }

  rangeChanged(): void {
    const current = this.preview();
    if (current && this.from && this.to) {
      const card = this.reports.find(r => r.key === current.key);
      if (card) this.openPreview(card, false);
    }
  }

  openPreview(report: ReportCard, scroll = true): void {
    const key = `${report.key}:preview`;
    this.busy.set(key);
    this.http.get<ReportData>(`/api/v1/reports/${report.key}`, { params: this.params() }).subscribe({
      next: data => {
        this.preview.set(data);
        this.clearBusy(key);
        if (scroll) setTimeout(() => this.previewEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      },
      error: () => this.clearBusy(key)
    });
  }

  download(report: ReportCard, format: ExportFormat): void {
    const key = `${report.key}:${format}`;
    this.busy.set(key);
    this.http.get(`/api/v1/reports/${report.key}/export`, {
      params: this.params().set('format', format),
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: res => {
        this.save(res, `fleetops-${report.key}.${format}`);
        this.clearBusy(key);
      },
      error: () => this.clearBusy(key)
    });
  }

  private save(res: HttpResponse<Blob>, fallback: string): void {
    if (!res.body) return;
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    const filename = match ? decodeURIComponent(match[1]) : fallback;
    const url = URL.createObjectURL(res.body);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private params(): HttpParams {
    let params = new HttpParams();
    if (this.from) params = params.set('from', toLocalDate(this.from));
    if (this.to) params = params.set('to', toLocalDate(this.to));
    return params;
  }

  private clearBusy(key: string): void {
    if (this.busy() === key) this.busy.set(null);
  }
}
