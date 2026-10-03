import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { provideNativeDateAdapter } from '@angular/material/core';
import { NotifyService } from '../../../core/services/notify.service';
import { toLocalDate } from '../../../core/models/page.model';
import { Driver, EligibleUser, LICENSE_CLASSES, PASSWORD_HINT, PASSWORD_PATTERN } from '../driver.models';

type AccountMode = 'new' | 'existing';

@Component({
  selector: 'app-driver-form',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatButtonToggleModule, MatIconModule, MatDatepickerModule, MatProgressSpinnerModule
  ],
  template: `
    <a class="back-link" [routerLink]="editId ? ['/drivers', editId] : '/drivers'">
      <mat-icon>arrow_back</mat-icon> {{ editId ? 'Back to driver' : 'Back to drivers' }}
    </a>
    <div class="page-head">
      <div>
        <h1>{{ editId ? 'Edit driver' : 'Register driver' }}</h1>
        <p>{{ editId ? 'Update the driver profile.' : 'Create the driver login and profile in one step, or link an existing driver login.' }}</p>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      <form class="form-card" [formGroup]="form" (ngSubmit)="submit()">
        @if (!editId) {
          <h2>Login account</h2>
          <mat-button-toggle-group [value]="mode()" (change)="setMode($event.value)" class="mode">
            <mat-button-toggle value="new">Create new login</mat-button-toggle>
            <mat-button-toggle value="existing">Link existing user</mat-button-toggle>
          </mat-button-toggle-group>

          @if (mode() === 'new') {
            <div class="form-grid" formGroupName="newUser">
              <mat-form-field appearance="outline">
                <mat-label>Full name</mat-label>
                <input matInput formControlName="fullName" maxlength="100">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email">
                <mat-error>Enter a valid email</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Username</mat-label>
                <input matInput formControlName="username" maxlength="50" autocomplete="off">
                <mat-error>3–50 letters, digits, dots or underscores</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Initial password</mat-label>
                <input matInput type="password" formControlName="password" autocomplete="new-password">
                <mat-hint>{{ passwordHint }}</mat-hint>
                <mat-error>{{ passwordHint }}</mat-error>
              </mat-form-field>
            </div>
          } @else {
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Driver login</mat-label>
                <mat-select formControlName="userId">
                  @for (u of eligibleUsers(); track u.id) {
                    <mat-option [value]="u.id">{{ u.fullName }} ({{ u.username }} · {{ u.email }})</mat-option>
                  }
                </mat-select>
                @if (!eligibleUsers().length) {
                  <mat-hint>No DRIVER logins without a profile. Create a new login instead.</mat-hint>
                }
              </mat-form-field>
            </div>
          }
        }

        <h2>Driver details</h2>
        <div class="form-grid">
          @if (editId) {
            <mat-form-field appearance="outline" class="full">
              <mat-label>Full name</mat-label>
              <input matInput formControlName="fullName" maxlength="100">
            </mat-form-field>
          }
          <mat-form-field appearance="outline">
            <mat-label>Employee number</mat-label>
            <input matInput formControlName="employeeNumber" maxlength="20">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Licence number</mat-label>
            <input matInput formControlName="licenseNumber" maxlength="30">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Licence class</mat-label>
            <mat-select formControlName="licenseClass">
              <mat-option [value]="null">Not specified</mat-option>
              @for (c of licenseClasses; track c.value) { <mat-option [value]="c.value">{{ c.label }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Licence expiry</mat-label>
            <input matInput [matDatepicker]="licPicker" formControlName="licenseExpiryDate" [min]="editId ? null : tomorrow">
            <mat-datepicker-toggle matIconSuffix [for]="licPicker"></mat-datepicker-toggle>
            <mat-datepicker #licPicker></mat-datepicker>
            <mat-error>A future expiry date is required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Medical certificate expiry</mat-label>
            <input matInput [matDatepicker]="medPicker" formControlName="medicalCertificateExpiry">
            <mat-datepicker-toggle matIconSuffix [for]="medPicker"></mat-datepicker-toggle>
            <mat-datepicker #medPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Contact number</mat-label>
            <input matInput formControlName="contactNumber" maxlength="20">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Emergency contact name</mat-label>
            <input matInput formControlName="emergencyContactName" maxlength="100">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Emergency contact number</mat-label>
            <input matInput formControlName="emergencyContactNumber" maxlength="20">
          </mat-form-field>
        </div>

        <div class="form-actions">
          <a mat-stroked-button [routerLink]="editId ? ['/drivers', editId] : '/drivers'">Cancel</a>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Saving…' : (editId ? 'Save changes' : 'Register driver') }}
          </button>
        </div>
      </form>
    }
  `,
  styles: [`.mode { margin-bottom: 1.25rem; }`]
})
export class DriverFormComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly notify = inject(NotifyService);

  readonly editId: number | null = this.route.snapshot.params['id'] ? Number(this.route.snapshot.params['id']) : null;
  readonly mode = signal<AccountMode>('new');
  readonly eligibleUsers = signal<EligibleUser[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly licenseClasses = LICENSE_CLASSES;
  readonly passwordHint = PASSWORD_HINT;
  readonly tomorrow = new Date(Date.now() + 86_400_000);

  readonly form = this.fb.group({
    userId: this.fb.control<number | null>(null),
    newUser: this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[a-zA-Z0-9_.]+$/)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]]
    }),
    fullName: [''],
    employeeNumber: ['', [Validators.required, Validators.maxLength(20)]],
    licenseNumber: ['', [Validators.required, Validators.maxLength(30)]],
    licenseClass: this.fb.control<string | null>(null),
    licenseExpiryDate: this.fb.control<Date | null>(null, Validators.required),
    medicalCertificateExpiry: this.fb.control<Date | null>(null),
    contactNumber: [''],
    emergencyContactName: [''],
    emergencyContactNumber: ['']
  });

  ngOnInit(): void {
    if (this.editId) {
      this.form.controls.newUser.disable();
      this.form.controls.fullName.setValidators([Validators.required, Validators.maxLength(100)]);
      this.loading.set(true);
      this.http.get<Driver>(`/api/v1/drivers/${this.editId}`).subscribe({
        next: d => {
          this.form.patchValue({
            fullName: d.fullName,
            employeeNumber: d.employeeNumber,
            licenseNumber: d.licenseNumber,
            licenseClass: d.licenseClass,
            licenseExpiryDate: this.parseDate(d.licenseExpiryDate),
            medicalCertificateExpiry: this.parseDate(d.medicalCertificateExpiry),
            contactNumber: d.contactNumber ?? '',
            emergencyContactName: d.emergencyContactName ?? '',
            emergencyContactNumber: d.emergencyContactNumber ?? ''
          });
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    } else {
      this.http.get<EligibleUser[]>('/api/v1/drivers/eligible-users').subscribe(users => this.eligibleUsers.set(users));
    }
  }

  setMode(mode: AccountMode): void {
    this.mode.set(mode);
    const { newUser, userId } = this.form.controls;
    if (mode === 'new') {
      newUser.enable();
      userId.clearValidators();
      userId.setValue(null);
    } else {
      newUser.disable();
      userId.setValidators(Validators.required);
    }
    userId.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const details = {
      employeeNumber: v.employeeNumber?.trim(),
      licenseNumber: v.licenseNumber?.trim(),
      licenseClass: v.licenseClass,
      licenseExpiryDate: v.licenseExpiryDate ? toLocalDate(v.licenseExpiryDate) : null,
      medicalCertificateExpiry: v.medicalCertificateExpiry ? toLocalDate(v.medicalCertificateExpiry) : null,
      contactNumber: v.contactNumber || null,
      emergencyContactName: v.emergencyContactName || null,
      emergencyContactNumber: v.emergencyContactNumber || null
    };

    this.saving.set(true);
    const request$ = this.editId
      ? this.http.put<Driver>(`/api/v1/drivers/${this.editId}`, { ...details, fullName: v.fullName?.trim() })
      : this.http.post<Driver>('/api/v1/drivers', {
          ...details,
          ...(this.mode() === 'new' ? { newUser: v.newUser } : { userId: v.userId })
        });

    request$.subscribe({
      next: d => {
        this.notify.success(this.editId ? 'Driver updated' : 'Driver registered');
        this.router.navigate(['/drivers', d.id]);
      },
      error: () => this.saving.set(false)
    });
  }

  private parseDate(value: string | null): Date | null {
    return value ? new Date(value + 'T00:00:00') : null;
  }
}
