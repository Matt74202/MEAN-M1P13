import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '@app/services/auth.service';
import { Router } from '@angular/router';

// Import de la directive routerLink (pas tout RouterModule)
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink   // ← ICI : juste RouterLink pour que <a routerLink="/register"> fonctionne
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  form: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // TOUS LES VALIDATORS DÉSACTIVÉS POUR FORCER LE TEST
    this.form = this.fb.group({
      mail: [''],
      mdp: ['']
    });

    // Log constant pour voir ce qui se passe en live
    this.form.statusChanges.subscribe(status => {
      console.log('[DEBUG STATUS CHANGE]', {
        status,
        valid: this.form.valid,
        dirty: this.form.dirty,
        touched: this.form.touched,
        values: this.form.value,
        mailErrors: this.form.get('mail')?.errors,
        mdpErrors: this.form.get('mdp')?.errors
      });
    });

    // Log initial
    console.log('[DEBUG INIT] Formulaire initialisé', {
      valid: this.form.valid,
      values: this.form.value
    });
  }

  onSubmit() {
    console.log('==================================================');
    console.log('[onSubmit] FONCTION APPELEE !');
    console.log('==================================================');

    console.log('État actuel :', {
      valid: this.form.valid,
      dirty: this.form.dirty,
      touched: this.form.touched,
      values: this.form.value
    });

    // On force markAllAsTouched pour voir si ça change quelque chose
    this.form.markAllAsTouched();
    console.log('Après markAllAsTouched → valid ?', this.form.valid);

    console.log('On continue → extraction valeurs');
    const mail = this.form.get('mail')?.value || '';
    const mdp = this.form.get('mdp')?.value || '';

    console.log('Valeurs envoyées au service :', { mail, mdp });

    this.isLoading = true;
    this.errorMessage = null;

    this.authService.login(mail, mdp).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.user?.role === 'supermarche') {
          this.router.navigate(['/edition']);
        } else if (response.user?.role === 'boutique') {
          this.router.navigate(['/boutique']); 
        } else {
          this.router.navigate(['/client']);
        }
      },
      error: (err) => {
        console.error('[ERREUR] :', err);
        this.isLoading = false;
        this.errorMessage = err.error?.message || err.message || 'Erreur connexion';
      }
    });
  }

  // Bouton test : appelle login SANS UTILISER LE FORM
  testLoginHardcoded() {
    console.log('==================================================');
    console.log('[TEST HARDCODED] Appel direct sans form !');
    console.log('==================================================');

    const mail = 'admin@supermarche.mg';
    const mdp = 'admin';

    console.log('Test avec :', { mail, mdp });

    this.isLoading = true;

    this.authService.login(mail, mdp).subscribe({
      next: (response) => {
        console.log('[TEST SUCCÈS] :', response);
        this.isLoading = false;
        if (response.user?.role === 'supermarche') {
          this.router.navigate(['/edition']);
        } else {
          this.router.navigate(['/shop']);
        }
      },
      error: (err) => {
        console.error('[TEST ÉCHEC] :', err);
        this.isLoading = false;
        this.errorMessage = 'Test échoué : ' + (err.message || 'Erreur');
      }
    });
  }
}