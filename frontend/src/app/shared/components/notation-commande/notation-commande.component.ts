import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { NoteService } from '@app/services/note.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface ProduitANoter {
  idProduit: string;
  nom: string;
  note: number;
  commentaire: string;
}

@Component({
  selector: 'app-notation-commande',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatButtonModule,
    MatIconModule, MatInputModule, MatFormFieldModule,
    FormsModule, MatSnackBarModule
  ],
  templateUrl: './notation-commande.component.html',
  styleUrl:    './notation-commande.component.scss'
})
export class NotationCommandeComponent {
  private dialogRef  = inject(MatDialogRef<NotationCommandeComponent>);
  private noteService = inject(NoteService);
  private snackBar   = inject(MatSnackBar);
  readonly data      = inject(MAT_DIALOG_DATA) as {
    clientId:   string;
    idBoutique: string;
    nomBoutique: string;
    produits:   { idProduit: string; nom: string }[];
  };

  // Note boutique
  noteBoutique      = signal(0);
  commentaireBoutique = signal('');

  // Notes produits
  produits = signal<ProduitANoter[]>(
    this.data.produits.map(p => ({
      idProduit:   p.idProduit,
      nom:         p.nom,
      note:        0,
      commentaire: ''
    }))
  );

  isSubmitting = signal(false);
  etape = signal<'boutique' | 'produits'>('boutique');

  // ── Étoiles ──
  setNoteBoutique(n: number)  { this.noteBoutique.set(n); }
  setNoteProduit(index: number, n: number) {
    this.produits.update(list => {
      const copy = [...list];
      copy[index] = { ...copy[index], note: n };
      return copy;
    });
  }

  setCommentaireProduit(index: number, val: string) {
    this.produits.update(list => {
      const copy = [...list];
      copy[index] = { ...copy[index], commentaire: val };
      return copy;
    });
  }

  getStars(note: number): ('full' | 'empty')[] {
    return [1,2,3,4,5].map(i => i <= note ? 'full' : 'empty');
  }

  suivant() { this.etape.set('produits'); }

  async valider() {
    this.isSubmitting.set(true);
    const requests = [];

    // Note boutique si renseignée
    if (this.noteBoutique() > 0) {
      requests.push(
        this.noteService.noterBoutique({
          idClient:    this.data.clientId,
          idBoutique:  this.data.idBoutique,
          note:        this.noteBoutique(),
          commentaire: this.commentaireBoutique()
        }).toPromise()
      );
    }

    // Notes produits si renseignées
    this.produits().forEach(p => {
      if (p.note > 0) {
        requests.push(
          this.noteService.noterProduit({
            idClient:    this.data.clientId,
            idProduit:   p.idProduit,
            idBoutique:  this.data.idBoutique,
            note:        p.note,
            commentaire: p.commentaire
          }).toPromise()
        );
      }
    });

    await Promise.allSettled(requests);
    this.isSubmitting.set(false);
    this.snackBar.open('✓ Merci pour votre avis !', '', { duration: 2500 });
    this.dialogRef.close('noted');
  }

  skipper() { this.dialogRef.close('skipped'); }
}