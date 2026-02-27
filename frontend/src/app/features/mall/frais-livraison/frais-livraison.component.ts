import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { FraisLivraisonService, TrancheLivraison } from '@app/services/frais.service';
import { MallNavbarComponent } from '@shared/components/mall-navbar/mall-navbar.component'; 

@Component({
  selector: 'app-frais-livraison',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MallNavbarComponent, // ← added
  ],
  templateUrl: './frais-livraison.component.html',
  styleUrl: './frais-livraison.component.scss',
})
export class FraisLivraisonComponent implements OnInit {

  private fb = inject(FormBuilder);
  private fraisService = inject(FraisLivraisonService);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);

  form = this.fb.group({
    tranches: this.fb.array([])
  });

  get tranches(): FormArray {
    return this.form.get('tranches') as FormArray;
  }

  ngOnInit() {
    this.loadFrais();
  }

  loadFrais() {
    this.isLoading.set(true);
    this.fraisService.getFrais().subscribe({
      next: data => {
        this.tranches.clear();
        data.frais.forEach(t => this.addTranche(t));
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Erreur de chargement', '', { duration: 2000 });
        this.isLoading.set(false);
      }
    });
  }

  addTranche(data?: TrancheLivraison) {
    this.tranches.push(this.fb.group({
      distanceMin: [data?.distanceMin ?? 0, [Validators.required, Validators.min(0)]],
      distanceMax: [data?.distanceMax ?? null, [Validators.min(0)]],
      prix:        [data?.prix ?? 0, [Validators.required, Validators.min(0)]]
    }));
  }

  removeTranche(index: number) {
    this.tranches.removeAt(index);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Veuillez corriger les erreurs', '', { duration: 2000 });
      return;
    }

    const frais: TrancheLivraison[] = this.tranches.value;

    this.fraisService.updateFrais(frais).subscribe({
      next: () => {
        this.snackBar.open('✓ Frais de livraison mis à jour', '', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Erreur lors de la sauvegarde', '', { duration: 2000 });
      }
    });
  }
}