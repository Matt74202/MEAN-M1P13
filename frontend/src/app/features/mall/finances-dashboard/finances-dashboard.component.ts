// finances-dashboard.component.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MallNavbarComponent } from '@shared/components/mall-navbar/mall-navbar.component'; 
import { environment } from '@environments/environment';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  isAlerte?: boolean;
  alerteType?: 'danger' | 'warning' | 'info';
  alerteAction?: string;
}

interface Alerte {
  type: 'danger' | 'warning' | 'info';
  titre: string;
  message: string;
  action: string;
}

@Component({
  selector: 'app-finances-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MallNavbarComponent],
  templateUrl: './finances-dashboard.component.html',
  styleUrls:   ['./finances-dashboard.component.scss'],
})
export class FinancesDashboardComponent implements OnInit {
  loading = true;
  errorMessage = '';
  data: any = null;

  readonly GRAPH_HEIGHT_PX    = 140;
  readonly TIMELINE_HEIGHT_PX = 140;

  maxGraphValue = 0;
  activeTab: 'box' | 'boutique' = 'box';
  activePayeursTab: 'tous' | 'bons' | 'mauvais' = 'tous';
  searchPayeurs = '';
  payeursExpanded = false;
  readonly PAYEURS_LIMIT = 5;

  // Timeline draggable
  timelineWindow: any[] = [];
  timelineWindowSize = 12;
  timelineOffset = 0;
  isDragging = false;
  dragStartX = 0;
  dragStartOffset = 0;
  maxTimelineOffset = 0;

  // Chatbot
  chatOuvert = false;
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  chatLoading = false;
  contexte = '';
  alertes: Alerte[] = [];
  rapportEnCours = false;

  readonly questionsRapides = [
    { label: '📊 Résumé du mois',      question: 'Fais-moi un résumé complet de ce mois : revenus, payeurs, et points importants.' },
    { label: '📈 Rapport mensuel',      question: 'Génère un rapport mensuel narratif complet avec points forts, points faibles et recommandations prioritaires.' },
    { label: '⚠️ Qui relancer ?',       question: "Qui dois-je relancer cette semaine pour les paiements en retard ou manquants ? Donne-moi un plan d'action." },
    { label: '🔮 Prévisions 6 mois',    question: 'Quelles sont les prévisions de revenus pour les 6 prochains mois et comment sont-elles calculées ?' },
    { label: '📉 Revenus manqués',      question: 'Explique-moi en détail comment le revenu manqué est calculé et comment le récupérer.' },
    { label: '🏆 Meilleur payeur',      question: 'Qui est le meilleur payeur et pourquoi ? Détaille son score.' },
    { label: '🔴 Pire payeur',          question: 'Qui est le pire payeur ? Explique son score et que faire concrètement.' },
    { label: '📋 Expliquer les scores', question: 'Comment fonctionne le système de score des payeurs ? Explique la logique complète.' },
    { label: '💡 Conseils occupation',  question: "Comment optimiser le taux d'occupation et les revenus des boxes libres ?" },
    { label: '🔄 Taux recouvrement',    question: "Mon taux de recouvrement est-il bon ? Comment est-il calculé et comment l'améliorer ?" },
  ];

  private apiUrl  = `${environment.apiUrl}/finances/dashboard`;
  private chatUrl = `${environment.apiUrl}/finances/chat`;

  constructor(private http: HttpClient) {}

  ngOnInit() { this.chargerDashboard(); }

  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    if (!token || token === 'null' || token.trim() === '') return {};
    return { Authorization: `Bearer ${token.trim()}` };
  }

  chargerDashboard() {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<any>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        if (res.success) {
          this.data = res.data;

          if (res.data.graphiqueMensuel?.length) {
            this.maxGraphValue = Math.max(
              ...res.data.graphiqueMensuel.map((m: any) =>
                Math.max(+(m.percu || 0), +(m.estime || 0))
              ), 1
            );
          }

          if (res.data.timeline?.length) {
            const tl = res.data.timeline;
            this.maxTimelineOffset = Math.max(0, tl.length - this.timelineWindowSize);
            let presentIdx = tl.length - 1;
            for (let i = 0; i < tl.length; i++) {
              if (tl[i].type === 'present') { presentIdx = i; break; }
            }
            const half = Math.floor(this.timelineWindowSize / 2);
            this.timelineOffset = Math.max(0, Math.min(presentIdx - half, this.maxTimelineOffset));
            this.updateTimelineWindow();
          }

          this.contexte = res.data.contexteChatbot || '';
          this.alertes  = res.data.alertesChatbot  || [];

          if (this.chatMessages.length === 0) {
            const nbAlertes = this.alertes.length;
            this.chatMessages.push({
              role: 'assistant',
              content: `Bonjour ! Je suis votre assistant financier IA.\n\nJe connais toutes vos données en temps réel et je peux :\n• Expliquer la logique de chaque calcul\n• Détecter des anomalies et vous alerter\n• Générer des rapports narratifs\n• Vous conseiller sur les actions à prendre\n\n${nbAlertes > 0 ? `⚠️ ${nbAlertes} alerte(s) détectée(s) — cliquez sur une alerte ci-dessous ou posez votre question.` : 'Tout semble normal. Posez-moi une question ou utilisez les raccourcis.'}`
            });
            this.alertes.forEach(a => {
              this.chatMessages.push({
                role: 'assistant',
                content: `${a.titre}\n${a.message}`,
                isAlerte: true,
                alerteType: a.type,
                alerteAction: a.action
              });
            });
          }
        } else {
          this.errorMessage = res.message || 'Erreur inattendue';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Impossible de charger le dashboard';
        this.loading = false;
      }
    });
  }

  // ── Chatbot ───────────────────────────────────────────────────────────────────
  toggleChat() {
    this.chatOuvert = !this.chatOuvert;
    if (this.chatOuvert) setTimeout(() => this.scrollChat(), 100);
  }

  envoyerMessage(messageOverride?: string) {
    const msg = (messageOverride || this.chatInput).trim();
    if (!msg || this.chatLoading) return;
    this.chatInput = '';
    this.chatMessages.push({ role: 'user', content: msg });
    const loadingMsg: ChatMessage = { role: 'assistant', content: '', loading: true };
    this.chatMessages.push(loadingMsg);
    this.chatLoading = true;
    setTimeout(() => this.scrollChat(), 50);

    const historique = this.chatMessages
      .filter(m => !m.loading && !m.isAlerte && m.content)
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content }));

    this.http.post<any>(this.chatUrl,
      { message: msg, contexte: this.contexte, historique },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        const idx = this.chatMessages.indexOf(loadingMsg);
        if (idx !== -1) this.chatMessages[idx] = { role: 'assistant', content: res.reponse || 'Désolé, pas de réponse.' };
        this.chatLoading = false;
        setTimeout(() => this.scrollChat(), 50);
      },
      error: () => {
        const idx = this.chatMessages.indexOf(loadingMsg);
        if (idx !== -1) this.chatMessages[idx] = { role: 'assistant', content: '❌ Erreur de connexion au chatbot.' };
        this.chatLoading = false;
      }
    });
  }

  onChatKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.envoyerMessage(); }
  }

  scrollChat() {
    const el = document.getElementById('chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  useQuestion(q: string) {
    this.chatInput = '';
    if (!this.chatOuvert) this.chatOuvert = true;
    setTimeout(() => this.envoyerMessage(q), 100);
  }

  genererRapport() {
    this.rapportEnCours = true;
    this.useQuestion('Génère un rapport mensuel narratif complet et structuré avec : résumé exécutif, analyse des revenus, comportement des payeurs, alertes prioritaires, et 3 recommandations concrètes avec délais.');
    setTimeout(() => { this.rapportEnCours = false; }, 3000);
  }

  getAlerteBgClass(type: string): string {
    if (type === 'danger')  return 'chat-alerte--danger';
    if (type === 'warning') return 'chat-alerte--warning';
    return 'chat-alerte--info';
  }

  getAlerteTextClass(type: string): string {
    if (type === 'danger')  return 'chat-alerte__title--danger';
    if (type === 'warning') return 'chat-alerte__title--warning';
    return 'chat-alerte__title--info';
  }

  get nbAlertesDanger(): number { return this.alertes.filter(a => a.type === 'danger').length; }
  get nbAlertesTotal(): number  { return this.alertes.length; }

  // ── Timeline ──────────────────────────────────────────────────────────────────
  updateTimelineWindow() {
    if (!this.data?.timeline) return;
    this.timelineOffset = Math.max(0, Math.min(this.timelineOffset, this.maxTimelineOffset));
    this.timelineWindow = this.data.timeline.slice(
      this.timelineOffset,
      this.timelineOffset + this.timelineWindowSize
    );
  }

  onTimelineDragStart(e: MouseEvent | TouchEvent) {
    this.isDragging      = true;
    this.dragStartX      = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    this.dragStartOffset = this.timelineOffset;
    e.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  @HostListener('window:touchmove', ['$event'])
  onDragMove(e: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    this.timelineOffset = this.dragStartOffset + Math.round((this.dragStartX - clientX) / 55);
    this.updateTimelineWindow();
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onDragEnd() { this.isDragging = false; }

  navigateTimeline(d: number) { this.timelineOffset += d * 3; this.updateTimelineWindow(); }

  goToToday() {
    const tl = this.data?.timeline;
    if (!tl) return;
    let targetIdx = tl.length - 1;
    for (let i = 0; i < tl.length; i++) {
      if (tl[i].type === 'present') { targetIdx = i; break; }
    }
    this.timelineOffset = Math.max(0, Math.min(
      targetIdx - Math.floor(this.timelineWindowSize / 2),
      this.maxTimelineOffset
    ));
    this.updateTimelineWindow();
  }

  get timelineMax(): number {
    if (!this.timelineWindow?.length) return 1;
    const max = Math.max(
      ...this.timelineWindow.map(t => Math.max(
        +(t.percu      || 0),
        +(t.estimeCont || 0),
        +(t.projMax    || 0),
        +(t.projection || 0)
      ))
    );
    return max > 0 ? max : 1;
  }

  tlPx(v: number): number {
    const val = Math.max(0, +(v || 0));
    if (val === 0) return 3;
    return Math.round((val / this.timelineMax) * this.TIMELINE_HEIGHT_PX);
  }

  get graphMax(): number {
    if (!this.data?.graphiqueMensuel?.length) return 1;
    const max = Math.max(
      ...this.data.graphiqueMensuel.map((m: any) =>
        Math.max(+(m.percu || 0), +(m.estime || 0))
      )
    );
    return max > 0 ? max : 1;
  }

  grPx(v: number): number {
    const val = Math.max(0, +(v || 0));
    if (val === 0) return 3;
    return Math.round((val / this.graphMax) * this.GRAPH_HEIGHT_PX);
  }

  pct(v: number, total: number = 100): string {
    if (!total) return '0%';
    return Math.min(100, Math.round((+(v || 0) / total) * 100)) + '%';
  }

  get timelineRangeLabel(): string {
    if (!this.timelineWindow?.length) return '';
    return `${this.timelineWindow[0]?.moisNom} → ${this.timelineWindow[this.timelineWindow.length - 1]?.moisNom}`;
  }

  get timelineProgressPct(): number {
    return this.maxTimelineOffset === 0
      ? 0
      : Math.round((this.timelineOffset / this.maxTimelineOffset) * 100);
  }

  // ── Payeurs ───────────────────────────────────────────────────────────────────
  get payeursAffiches(): any[] {
    if (!this.data?.analysePayeurs) return [];

    let liste: any[];
    if (this.activePayeursTab === 'bons')         liste = this.data.bonsPayeurs    || [];
    else if (this.activePayeursTab === 'mauvais') liste = this.data.mauvaisPayeurs || [];
    else                                           liste = this.data.analysePayeurs;

    if (this.searchPayeurs.trim()) {
      const q = this.searchPayeurs.trim().toLowerCase();
      liste = liste.filter((b: any) =>
        b.boutiqueNom?.toLowerCase().includes(q) ||
        b.boutiqueMail?.toLowerCase().includes(q)
      );
    }

    return this.payeursExpanded ? liste : liste.slice(0, this.PAYEURS_LIMIT);
  }

  get payeursTotalFiltres(): number {
    if (!this.data?.analysePayeurs) return 0;
    let liste: any[];
    if (this.activePayeursTab === 'bons')         liste = this.data.bonsPayeurs    || [];
    else if (this.activePayeursTab === 'mauvais') liste = this.data.mauvaisPayeurs || [];
    else                                           liste = this.data.analysePayeurs;

    if (this.searchPayeurs.trim()) {
      const q = this.searchPayeurs.trim().toLowerCase();
      liste = liste.filter((b: any) =>
        b.boutiqueNom?.toLowerCase().includes(q) ||
        b.boutiqueMail?.toLowerCase().includes(q)
      );
    }
    return liste.length;
  }

  getCategorieLabel(c: string) {
    return c === 'excellent' ? 'Excellent' : c === 'moyen' ? 'Moyen' : 'Mauvais';
  }
  getCategorieClass(c: string) {
    if (c === 'excellent') return 'payeur-row__avatar--excellent';
    if (c === 'moyen')     return 'payeur-row__avatar--moyen';
    return 'payeur-row__avatar--mauvais';
  }
  getScoreBarClass(c: string) {
    return c === 'excellent'
      ? 'score-bar-wrap__fill--excellent'
      : c === 'moyen'
        ? 'score-bar-wrap__fill--moyen'
        : 'score-bar-wrap__fill--mauvais';
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────────
  formatMontant(v: number): string {
    if (!v) return '0';
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'Md';
    if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000)         return (v / 1_000).toFixed(0) + 'k';
    return v.toString();
  }

  getJoursClass(j: number): string {
    if (j <= 30) return 'jours-urgent';
    if (j <= 60) return 'jours-warning';
    return 'jours-ok';
  }

  onInputFocus(e: Event) {
    (e.target as HTMLInputElement).style.borderColor = 'var(--accent)';
  }

  onInputBlur(e: Event) {
    (e.target as HTMLInputElement).style.borderColor = 'var(--border)';
  }

  onBtnEnter(e: Event) {
    const btn = e.target as HTMLButtonElement;
    btn.style.background  = 'var(--accent-light)';
    btn.style.borderColor = 'var(--accent)';
    btn.style.color       = 'var(--accent-dark)';
  }

  onBtnLeave(e: Event) {
    const btn = e.target as HTMLButtonElement;
    btn.style.background  = 'var(--bg-main)';
    btn.style.borderColor = 'var(--border)';
    btn.style.color       = 'var(--text-secondary)';
  }
}