export interface Produit {
  _id: string;
  idBoutique: string;
  details: {
    nom: string;
    description?: string;
    categorie: string;
    prix: number;
    date: string;
  };
  imageUrl?: string;
  stock?: number;
  enPromotion?: boolean;
}