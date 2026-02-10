export interface TypeBoutique {
  _id: string;
  nom: string;
  longueur: number;
  largeur: number;
  nbEtagereGauche: number;
  nbEtagereDroite: number;
}

export type Etage = 'RC' | 'FC';

export interface Box {
  _id: string;
  idType?: string;           // optionnel maintenant
  statut: 'LIBRE' | 'OCCUPE' | 'NON_FONCTIONNEL';
  loyer?: number;            // optionnel
  x: number;
  y: number;
  etage: Etage;
  width?: number;            // ajouté
  height?: number;           // ajouté
  rotation?: number;         // ajouté (optionnel)
}

export interface Boutique {
  _id: string;
  nom: string;
  typeCommerce: string;
}

export interface Contrat {
  _id: string;
  idBoutique: string;
  idBox: string;
  duree: number;
  dateDebut: Date;
  dateFin: Date;
  statut: string;
}

export interface Supermarche {
  _id: string;          
  nom: string;
  mail: string;
  mdp: string;
  adresse: string;
  dimensions?: {
    largeur: number;    
    hauteur: number; 
  };
}