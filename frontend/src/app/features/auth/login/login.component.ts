import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '@app/services/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {

  form: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      mail: ['', [Validators.required, Validators.email]],
      mdp:  ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { mail, mdp } = this.form.value;
    this.isLoading    = true;
    this.errorMessage = null;

    this.authService.login(mail, mdp).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.redirectByRole(response.user?.role);
      },
      error: (err) => {
        this.isLoading    = false;
        this.errorMessage = err.error?.message || 'Identifiants incorrects';
      },
    });
  }

  private redirectByRole(role?: string) {
    switch (role) {
      case 'supermarche': this.router.navigate(['/mall']);  break;
      case 'boutique':    this.router.navigate(['/boutique']); break;
      default:            this.router.navigate(['/client']);   break;
    }
  }
}