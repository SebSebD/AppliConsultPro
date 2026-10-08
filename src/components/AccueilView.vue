<template>
  <div class="accueil-container">
    <!-- Barre supérieure : Message de sauvegarde + Bouton Forcer la mise à jour -->
    <div class="sauvegarde-bar">
      <p v-if="dateDerniereSauvegarde" class="sauvegarde-info">
        {{ dateDerniereSauvegarde }}
      </p>

      <button 
        type="button" 
        class="btn-refresh" 
        @click="forcerMiseAJour"
        title="Vider le cache et forcer la mise à jour de l'application"
      >
        🔄 Forcer la mise à jour
      </button>
    </div>


    <!-- Grille des modules -->
    <div class="modules-grid">
      <div 
        v-for="section in sectionsModules" 
        :key="section.id"
        class="module-card"
        @click="$emit('naviguer', section.id)"
      >
        <div class="card-header">
          <div class="icon-circle" :style="{ backgroundColor: section.couleur + '20', color: section.couleur }">
            <span class="icon-symbol">{{ section.icone }}</span>
          </div>
          <span class="chevron">›</span>
        </div>

        <div class="card-body">
          <h4>{{ section.nom }}</h4>
          <p>{{ section.description }}</p>
        </div>
      </div>
    </div>
  </div>

<!-- SÉPARATEUR APERÇU D'ENSEMBLE -->
<div class="section-divider">
  <span>Aperçu d'ensemble</span>
</div>

<!-- ENCADRÉ GLOBAL STATISTIQUES ACCUEIL -->
<section class="stats-card-discrete">
  <div class="stats-layout">
    
    <!-- LIGNE 1 : Patients enregistrés -->
    <div class="stat-row stat-row-single">
      <div class="stat-inline-group">
        <span class="stat-label">Patients enregistrés :</span>
        <span class="stat-value-main">{{ totalPatients ?? 0 }}</span>
      </div>
    </div>

    <!-- LIGNE 2 : Séances et Sommes versées à la suite -->
    <div class="stat-row stat-row-single">
      <div class="stat-inline-group stats-combined-line">
        
        <!-- Groupe Séances -->
        <div class="stat-subgroup">
          <span class="stat-label">Séances (année) :</span>
          <span class="stat-value-main">{{ totalSeances ?? 0 }}</span>
          <div class="stat-details-inline">
            <span>T1: <strong>{{ seancesT1 ?? 0 }}</strong></span>
            <span>T2: <strong>{{ seancesT2 ?? 0 }}</strong></span>
            <span>T3: <strong>{{ seancesT3 ?? 0 }}</strong></span>
            <span>T4: <strong>{{ seancesT4 ?? 0 }}</strong></span>
          </div>
        </div>

        <span class="stat-separator">|</span>

        <!-- Groupe Sommes versées -->
        <div class="stat-subgroup">
          <span class="stat-label">Versé (année) :</span>
          <span class="stat-value-main">{{ (totalVerses || 0).toFixed(2) }} €</span>
          <div class="stat-details-inline">
            <span>T1: <strong>{{ (versesT1 || 0).toFixed(2) }} €</strong></span>
            <span>T2: <strong>{{ (versesT2 || 0).toFixed(2) }} €</strong></span>
            <span>T3: <strong>{{ (versesT3 || 0).toFixed(2) }} €</strong></span>
            <span>T4: <strong>{{ (versesT4 || 0).toFixed(2) }} €</strong></span>
          </div>
        </div>

      </div>
    </div>

    <!-- LIGNE 3 : Solde à ce jour -->
    <div class="stat-row stat-row-single stat-box-highlight">
      <div class="stat-inline-group">
        <span class="stat-label">Solde à ce jour :</span>
        <span 
          class="stat-value-main"
          :class="{
            'text-success': (totalSolde || 0) > 0,
            'text-danger': (totalSolde || 0) < 0,
            'text-neutral': (totalSolde || 0) === 0
          }"
        >
          {{ Math.abs(totalSolde || 0).toFixed(2) }} €
          <span class="stat-subtext">
            ({{ (totalSolde || 0) < 0 ? 'dû' : (totalSolde || 0) > 0 ? 'en avance' : 'à l\'équilibre' }})
          </span>
        </span>
      </div>
    </div>

  </div>
</section>

</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  projectId: {
    type: [Number, String],
    required: true
  },
  dateDerniereSauvegarde: {
    type: String,
    default: ''
  },
  projets: {
    type: Array,
    default: () => []
  },
  patients: {
    type: Array,
    default: () => []
  },
  seances: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['naviguer'])

/* ==========================================
   0. ISOLATION PAR PROJET ACTIF
   ========================================== */

// Filtrage strict par projectId comme dans SeanceView.vue
const patientsDuProjet = computed(() => {
  if (!props.patients?.length) return []
  return props.patients.filter(p => String(p.projectId) === String(props.projectId))
})

const seancesDuProjet = computed(() => {
  if (!props.seances?.length) return []
  return props.seances.filter(s => String(s.projectId) === String(props.projectId))
})

/* ==========================================
   1. UTILITAIRES & SÉCURITÉ (Dates, Nombres)
   ========================================== */

// Convertit une valeur en nombre valide (évite les NaN)
const toNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

// Extrait l'année et le mois SANS passer par new Date() pour éviter les bugs de fuseau horaire
const getDateInfo = (val) => {
  if (!val) return { annee: 0, mois: 0 }
  
  if (typeof val === 'string') {
    // Format YYYY-MM-DD
    if (val.includes('-')) {
      const parts = val.split('-')
      return { annee: Number(parts[0]), mois: Number(parts[1]) }
    }
    // Format DD/MM/YYYY
    if (val.includes('/')) {
      const parts = val.split('/')
      return { annee: Number(parts[2]), mois: Number(parts[1]) }
    }
  }
  
  // Fallback sécurisé si c'est déjà un objet Date
  const parsed = new Date(val)
  if (!isNaN(parsed.getTime())) {
    return { annee: parsed.getFullYear(), mois: parsed.getMonth() + 1 }
  }
  
  return { annee: 0, mois: 0 }
}

// Extrait le montant réellement versé d'une séance (priorité à `montant` comme dans SeanceView)
const getMontantVerse = (s) => {
  return toNumber(s?.montant ?? s?.montantVerse ?? (s?.paye ? (s?.prix ?? s?.tarif) : 0))
}

/* ==========================================
   2. STATISTIQUES GLOBALES (Patients, Soldes)
   ========================================== */

// Total des patients du projet
const totalPatients = computed(() => patientsDuProjet.value.length)

// Total Solde (Payé - Dû) du projet à ce jour
const totalSolde = computed(() => {
  const listPatients = patientsDuProjet.value
  
  if (listPatients.length && listPatients.some(p => p.solde !== undefined && p.solde !== null)) {
    return listPatients.reduce((acc, p) => acc + toNumber(p.solde), 0)
  }

  const listSeances = seancesDuProjet.value
  if (!listSeances.length) return 0

  const mapPatients = new Map(
    listPatients.map(p => [String(p.id), toNumber(p.tarifParDefaut ?? p.tarif ?? 60)])
  )

  return listSeances.reduce((acc, s) => {
    const paye = getMontantVerse(s)
    const patientKey = s?.patientId ? String(s.patientId) : (s?.idPatient ? String(s.idPatient) : null)
    const tarifPatient = patientKey ? mapPatients.get(patientKey) : 60
    
    // Le dû est basé sur le tarif convenu/tarif séance, sinon tarif par défaut du patient
    const du = toNumber(s?.tarif ?? s?.tarifConvenu ?? s?.tarifEffectif ?? tarifPatient ?? 60)

    return acc + (paye - du)
  }, 0)
})

/* ==========================================
   3. STATISTIQUES PAR TRIMESTRE (Année en cours)
   ========================================== */

const anneeCourante = new Date().getFullYear()

// Filtre des séances du projet pour l'année en cours
const seancesAnneeCourante = computed(() => {
  const listSeances = seancesDuProjet.value
  if (!listSeances.length) return []
  
  return listSeances.filter(s => {
    const { annee } = getDateInfo(s.date)
    return annee === anneeCourante
  })
})

const totalSeances = computed(() => seancesAnneeCourante.value.length)

const totalVerses = computed(() => {
  return seancesAnneeCourante.value.reduce((sum, s) => sum + getMontantVerse(s), 0)
})

// Fonction d'agrégation générique par trimestre
const calculerTrimestre = (moisDebut, moisFin) => {
  const seancesTrimestre = seancesAnneeCourante.value.filter(s => {
    const { mois } = getDateInfo(s.date)
    return mois >= moisDebut && mois <= moisFin
  })

  return {
    nombre: seancesTrimestre.length,
    versements: seancesTrimestre.reduce((total, s) => total + getMontantVerse(s), 0)
  }
}

// Calcul de chaque trimestre
const statsT1 = computed(() => calculerTrimestre(1, 3))
const statsT2 = computed(() => calculerTrimestre(4, 6))
const statsT3 = computed(() => calculerTrimestre(7, 9))
const statsT4 = computed(() => calculerTrimestre(10, 12))

// --- VARIABLES EXPOSÉES POUR LE TEMPLATE ---

// Nombre de séances par trimestre
const seancesT1 = computed(() => statsT1.value.nombre)
const seancesT2 = computed(() => statsT2.value.nombre)
const seancesT3 = computed(() => statsT3.value.nombre)
const seancesT4 = computed(() => statsT4.value.nombre)

// Sommes versées par trimestre
const versesT1 = computed(() => statsT1.value.versements)
const versesT2 = computed(() => statsT2.value.versements)
const versesT3 = computed(() => statsT3.value.versements)
const versesT4 = computed(() => statsT4.value.versements)

// Séances du trimestre civil en cours (rétrocompatibilité)
const seancesTrimestre = computed(() => {
  const moisActuel = new Date().getMonth() + 1
  if (moisActuel <= 3) return seancesT1.value
  if (moisActuel <= 6) return seancesT2.value
  if (moisActuel <= 9) return seancesT3.value
  return seancesT4.value
})

/* ==========================================
   4. MODULES DE NAVIGATION
   ========================================== */

const sectionsModules = [
  { id: 'patients', nom: 'Patients', icone: '👥', couleur: '#1fcfc6', description: 'Gestion du répertoire patientèle' },
  { id: 'recapPatients', nom: 'Récap Patients', icone: '📊', couleur: '#1f91cf', description: 'Synthèse et statistiques par patient' },
  { id: 'seances', nom: 'Séances', icone: '📅', couleur: '#f2cc0f', description: 'Journal des rendez-vous et règlements' },
  { id: 'factures', nom: 'Factures', icone: '📄', couleur: '#f27d0f', description: 'Moteur de facturation' },
  { id: 'urssaf', nom: 'URSSAF', icone: '📈', couleur: '#34f20f', description: 'Calcul des cotisations par trimestre' }
]

/* ==========================================
   5. ACTIONS SYSTÈME
   ========================================== */

// Vider le cache du navigateur / ServiceWorker et forcer le rafraîchissement
const forcerMiseAJour = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
      }
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }

    window.location.reload()
  } catch (e) {
    console.error('Erreur lors de la réinitialisation :', e)
    window.location.reload()
  }
}
</script>

<style scoped>
.accueil-container {
  padding: 10px;
}

/* Style discret pour le message de sauvegarde au-dessus de la grille */
.sauvegarde-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.sauvegarde-info {
  font-size: 13px;
  color: #64748b;
  padding: 8px 14px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 0;
}

/* Style du bouton de rafraîchissement */
.btn-refresh {
  background-color: white;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-refresh:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.accueil-header {
  margin-bottom: 24px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
}

.status-dot.green {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #22c55e;
}

/* Grille des modules */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.module-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
  border-color: #cbd5e1;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.chevron {
  font-size: 20px;
  color: #cbd5e1;
  font-weight: 300;
}

.card-body h4 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.card-body p {
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
}

/* ==========================================
   ENCARES STATISTIQUES GLOBAL (3 lignes)
   ========================================== */
.stats-card-discrete {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  text-align: left;
}

.stats-layout {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: stretch;
}

/* Lignes 1 & 3 (Pleines largeurs, alignées à gauche) */
.stat-row-single {
  background: #ffffff;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  padding: 0.65rem 1rem;
  text-align: left;
}

.stat-inline-group {
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 0.6rem;
  font-size: 0.95rem;
  text-align: left;
}

/* Ligne 2 : 2 blocs côte à côte (Séances & Sommes versées) */
.stat-row-dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
  width: 100%;
}

@media (max-width: 768px) {
  .stat-row-dual {
    grid-template-columns: 1fr;
  }
}

.stat-box {
  background: #ffffff;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: left;
}

/* Total + Trimestres alignés sur la même ligne */
.stat-inline-content {
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 1.25rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
  text-align: left;
}

.stat-value-main {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  text-align: left;
}

/* Détails trimestres à la suite du total */
.stat-details-inline {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  font-size: 0.78rem;
  color: #64748b;
  border-left: 2px solid #e2e8f0;
  padding-left: 0.75rem;
  text-align: left;
}

/* Solde & couleurs dynamiques */
.stat-box-highlight {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.stat-subtext {
  font-size: 0.85rem;
  font-weight: 500;
  margin-left: 0.25rem;
}

.text-success {
  color: #16a34a !important;
}

.text-danger {
  color: #dc2626 !important;
}

.text-neutral {
  color: #475569 !important;
}
/* Ligne combinée (Ligne 2) */
.stats-combined-line {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 1.5rem !important;
  justify-content: flex-start !important;
  text-align: left !important;
}

.stat-subgroup {
  display: flex !important;
  align-items: baseline !important;
  gap: 0.5rem !important;
  flex-wrap: wrap !important;
  text-align: left !important;
}

.stat-separator {
  color: #cbd5e1 !important;
  font-weight: 300 !important;
}

.stat-details-inline {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  font-size: 0.78rem !important;
  color: #64748b !important;
  border-left: 2px solid #e2e8f0 !important;
  padding-left: 0.6rem !important;
  margin-left: 0.25rem !important;
}

.section-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 2.5rem 0 1.25rem 0; 
  
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-divider::before,
.section-divider::after {
  content: '-------------------------'; /* Tu peux ajouter ou enlever des tirets ici si tu veux des traits plus longs ou plus courts */
  flex: 1;
  color: #cbd5e1; /* Couleur discrète des tirets */
  letter-spacing: 2px;
  overflow: hidden;
}

.section-divider::before {
  margin-right: 1rem; /* Espace entre les tirets de gauche et le texte */
}

.section-divider::after {
  margin-left: 1rem; /* Espace entre le texte et les tirets de droite */
}

</style>