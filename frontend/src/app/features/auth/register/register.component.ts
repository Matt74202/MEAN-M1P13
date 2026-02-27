import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './register.component.html',
})
export class RegisterComponent {

  nom = '';
  mail = '';
  mdp = '';
  typeCommerce = 'autre';
  description = '';
  numero = '';
  errorMessage = '';
  successMessage = ''; // ← pour afficher un message de succès
  isLoading = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      nom: this.nom.trim(),
      mail: this.mail.trim(),
      mdp: this.mdp.trim(),
      role: 'boutique',                    // forcé
      typeCommerce: this.typeCommerce,
      description: this.description.trim(),
      contact: {
        numero: this.numero.trim()
      }
    };

    console.log('[REGISTER DEBUG] Envoi au backend :', payload);

    this.http.post('http://localhost:5000/api/auth/register', payload)
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log('[REGISTER SUCCÈS] Réponse complète :', response);

          if (response.success) {
            this.successMessage = 'Compte boutique créé avec succès ! Redirection...';
            if (response.token) {
              localStorage.setItem('token', response.token);
              localStorage.setItem('userRole', response.user?.role || 'boutique');
            }
            // Redirection après 1.5s pour laisser voir le message
            setTimeout(() => {
              this.router.navigate(['/']);
            }, 1500);
          } else {
            this.errorMessage = response.message || 'Réponse inattendue du serveur';
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('[REGISTER ERREUR] Détails complets :', err);

          // Affichage plus précis de l'erreur
          if (err.status === 400 && err.error?.errors) {
            this.errorMessage = err.error.errors.map((e: any) => e.msg).join(' • ');
          } else if (err.error?.message) {
            this.errorMessage = err.error.message;
          } else if (err.status === 0) {
            this.errorMessage = 'Impossible de contacter le serveur (vérifiez si le backend tourne sur port 5000)';
          } else {
            this.errorMessage = 'Erreur inconnue (' + (err.status || '???') + ')';
          }
        }
      });
  }
}