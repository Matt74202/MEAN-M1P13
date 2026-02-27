import { Component, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'select-or-text' | 'email' | 'tel' | 'file' | 'date';
  placeholder?: string;
  required?: boolean;
  options?: { value: any; label: string }[];
  rows?: number;
  hint?: string;
}

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatAutocompleteModule,
  ],
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent {

  private data = inject(MAT_DIALOG_DATA);

  title        = signal<string>(this.data.title);
  subtitle     = signal<string | undefined>(this.data.subtitle);
  fields       = signal<FormField[]>(this.data.fields);
  formGroup    = signal<FormGroup>(this.data.formGroup);
  submitLabel  = signal<string>(this.data.submitLabel ?? 'Enregistrer');
  showCancel   = signal<boolean>(this.data.showCancel ?? true);
  isSubmitting = signal<boolean>(false);

  submit = output<void>();
  cancel = output<void>();

  private fileNames = signal<Map<string, string>>(new Map());

  // ── Conversion string → number pour les inputs type="number" ──
  onNumberChange(fieldName: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.valueAsNumber;  // retourne NaN si vide
    this.formGroup().get(fieldName)?.setValue(
      isNaN(val) ? null : val,
      { emitEvent: true }
    );
  }

  getCategorySuggestions(options?: { value: any; label: string }[]): string {
    if (!options || options.length === 0) return '';
    return options.map(o => o.label).join(', ');
  }

  triggerFileInput(fieldName: string) {
    const input = document.getElementById('file-' + fieldName) as HTMLInputElement;
    if (input) input.click();
  }

  onFileChange(event: Event, fieldName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.formGroup().get(fieldName)?.setValue(file);
      const newMap = new Map(this.fileNames());
      newMap.set(fieldName, file.name);
      this.fileNames.set(newMap);
    }
  }

  getFileName(fieldName: string): string {
    return this.fileNames().get(fieldName) || '';
  }

  onSubmit() {
    if (this.formGroup().valid) {
      this.submit.emit();
    } else {
      this.formGroup().markAllAsTouched();
    }
  }
}