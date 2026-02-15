import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Boutique } from '@app/model/mall-models';

@Injectable({
  providedIn: 'root'
})
export class BoutiqueService {
  private apiUrl = 'http://localhost:5000/api/boutiques';  

  constructor(private http: HttpClient) {}

  getBoutiques(filters?: { typeCommerce?: string }): Observable<Boutique[]> {
    let params: any = {};
    if (filters?.typeCommerce) params.typeCommerce = filters.typeCommerce;

    return this.http.get<Boutique[]>(this.apiUrl, { params });
  }

  getBoutiqueById(id: string): Observable<Boutique> {
    return this.http.get<Boutique>(`${this.apiUrl}/${id}`);
  }

  createBoutique(boutique: Partial<Boutique>): Observable<Boutique> {
    return this.http.post<Boutique>(this.apiUrl, boutique);
  }

  updateBoutique(id: string, boutique: Partial<Boutique>): Observable<Boutique> {
    return this.http.put<Boutique>(`${this.apiUrl}/${id}`, boutique);
  }

  deleteBoutique(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Palette de couleurs pour les types de commerce
   * Basée sur vos données MongoDB
   */
  static readonly TYPE_COLORS: Record<string, number> = {
    // Restaurants et alimentation
    'Restaurant': 0x4CAF50,           // Vert
    'Fast Food': 0xFF9800,            // Orange
    'Café': 0x795548,                 // Marron
    
    // Commerce
    'vetements': 0x9C27B0,            // Violet
    'Boutique vêtements': 0xFFEB3B,   // Jaune ⭐ CHANGÉ
    
    // Services
    'Optique': 0x2196F3,              // Bleu
    'Institut de beauté': 0xFFB6C1,   // Rose clair
    'Salon de coiffure': 0xFFC107,    // Jaune/Ambre ⭐ CHANGÉ
    'Téléphonie & accessoires': 0x00BCD4, // Cyan
    'Librairie / Papeterie': 0x8B4513,// Marron foncé
    'Pressing / Couture': 0x00CED1,   // Turquoise
    'Pharmacie': 0x3F51B5,            // Indigo
    
    'default': 0x757575               // Gris par défaut
  };

  /**
   * Retourne la couleur hexadécimale pour un type de commerce
   */
  getColorForType(typeCommerce: string): number {
    // Normaliser le type de commerce (enlever les espaces en trop, minuscules)
    const normalizedType = typeCommerce.trim();
    
    // Chercher une correspondance exacte
    if (BoutiqueService.TYPE_COLORS[normalizedType] !== undefined) {
      return BoutiqueService.TYPE_COLORS[normalizedType];
    }
    
    // Chercher une correspondance partielle (insensible à la casse)
    const lowerType = normalizedType.toLowerCase();
    for (const [key, value] of Object.entries(BoutiqueService.TYPE_COLORS)) {
      if (key.toLowerCase().includes(lowerType) || lowerType.includes(key.toLowerCase())) {
        return value;
      }
    }
    
    // Couleur par défaut
    console.warn('[BOUTIQUE-SERVICE] Type de commerce inconnu:', typeCommerce);
    return BoutiqueService.TYPE_COLORS['default'];
  }
}