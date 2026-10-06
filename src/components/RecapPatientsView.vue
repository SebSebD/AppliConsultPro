<template>
  <div class="recap-container">
    <!-- 1. FILTRES FINANCIERS -->
    <div class="filters-bar">
      <button 
        v-for="f in filtres" 
        :key="f.id"
        :class="['btn-filter', { active: filtreActuel === f.id }]"
        @click="filtreActuel = f.id"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- 2. LISTE DES PATIENTS -->
    <div class="recap-list-wrapper">
      <div v-if="patientsFiltres.length === 0" class="empty-state">
        <p>Aucun patient correspondant.</p>
      </div>

      <div v-else class="recap-list">
        <div 
          v-for="p in patientsFiltres" 
          :key="p.id" 
          class="recap-card"
          @click="ouvrirDetailPatient(p)"
        >
          <div class="recap-card-header">
            <span class="patient-name">{{ p.nomComplet }}</span>
            <span class="patient-solde" :style="{ color: p.couleurSolde }">
              {{ p.texteSolde }}
            </span>
          </div>

          <div class="recap-card-sub">
            <span>Séances en {{ anneeCourante }} : <strong>{{ p.seancesAnneeCount }}</strong></span>
            <span>
              Dernière séance : 
              <strong>{{ p.dateDerniereSeance ? formerDate(p.dateDerniereSeance) : 'Aucune' }}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. STATISTIQUES PIED DE PAGE -->
    <footer class="stats-footer">
      <div class="stat-item">Nombre de patients : <strong>{{ patientsFiltres.length }}</strong></div>
      <div class="stat-spacer"></div>
      <div class="stat-total">
        Total : 
        <strong :style="{ color: couleurTotalFiltre }">
          {{ totalMontantFiltre.toFixed(2) }} €
        </strong>
      </div>
    </footer>

    <!-- MODAL : DÉTAIL DU PATIENT -->
    <div v-if="patientDetail" class="modal-backdrop">
      <div class="modal-box modal-large">
        <header class="modal-header">
          <h2>{{ patientDetail.nomComplet }}</h2>
          <button @click="fermerDetailPatient" class="btn-close">✕</button>
        </header>

        <div class="modal-content-scroll">
          <!-- Informations Générales -->
          <section class="detail-section">
            <h4>Informations Générales</h4>
            <div class="info-grid">
              <div class="info-box">
                <span class="info-label">Tarif de base convenu</span>
                <span class="info-value">{{ Number(patientDetail.tarifParDefaut ?? 60).toFixed(2) }} €</span>
              </div>
              <div class="info-box">
                <span class="info-label">Date du 1er RDV</span>
                <span class="info-value">
                  {{ patientDetail.datePremierRdv ? formerDate(patientDetail.datePremierRdv) : 'Non renseignée' }}
                </span>
              </div>
            </div>
          </section>

          <!-- Situation Financière -->
          <section class="detail-section">
            <h4>Situation Financière</h4>
            <div class="financial-row">
              <span class="info-label">Différence (Payé - Dû) :</span>
              <strong :style="{ color: patientDetail.couleurSolde }" class="financial-value">
                {{ patientDetail.texteSoldeDetail }}
              </strong>
            </div>
          </section>

          <!-- Bilan par Trimestre -->
          <section class="detail-section">
            <h4>Bilan par Trimestre</h4>
            <div class="trimestre-list">
              <div v-for="t in bilanTrimestres" :key="t.label" class="trimestre-row">
                <span class="trimestre-label">{{ t.label }}</span>
                <span class="trimestre-count">{{ t.count }} séance(s)</span>
                <span class="trimestre-du">Dû : {{ t.totalDu.toFixed(2) }} €</span>
                <strong class="trimestre-total">Encaissements : {{ t.totalPaye.toFixed(2) }} €</strong>
              </div>
            </div>
          </section>

          <!-- Historique Détaillé des Séances -->
          <section class="detail-section">
            <h4>Historique détaillé des séances</h4>
            
            <div v-if="seancesPatientDetail.length === 0" class="empty-history">
              Aucune séance enregistrée pour ce patient.
            </div>

            <div v-else class="history-table">
              <!-- En-tête / Légende requise -->
              <div class="history-header">
                <span class="col-header date-col">Date de la séance</span>
                <span class="col-header tarif-col">Tarif de la séance</span>
                <span class="col-header paye-col">Montant payé</span>
              </div>

              <!-- Liste des séances -->
              <div class="history-list">
                <div v-for="s in seancesPatientDetail" :key="s.id" class="history-row">
                  <!-- Col 1 : Date & Trimestre -->
                  <div class="history-col date-col">
                    <span class="history-date">{{ formerDate(s.date) }}</span>
                    <span class="history-trimestre">{{ s.chaineTrimestre }}</span>
                  </div>

                  <!-- Col 2 : Tarif de la séance (Editable) -->
                  <div class="history-col tarif-col">
                    <input 
                      type="number" 
                      step="0.01" 
                      :value="s.tarifEffectif"
                      @change="e => modifierTarifSeance(s.id, e.target.value)"
                      class="input-tarif"
                      title="Modifier le tarif pour cette séance"
                    />
                    <span class="currency-symbol">€</span>
                  </div>

                  <!-- Col 3 : Montant Payé & Mode de Paiement -->
                  <div class="history-col paye-col">
                    <span class="history-montant">{{ Number(s.montant || 0).toFixed(2) }} €</span>
                    <span class="history-pay">{{ s.moyenPaiement || 'CB' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Pied du modal -->
        <footer class="modal-footer">
          <button @click="fermerDetailPatient" class="btn-cancel">Fermer</button>
          <div class="modal-footer-total">
            Total des encaissement :
            <strong class="total-paye-blue">{{ totalPayePatientDetail.toFixed(2) }} €</strong>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { db } from '../db.js'

const props = defineProps({
  projectId: {
    type: [Number, String],
    required: true
  }
})

const patients = ref([])
const seances = ref([])
const filtreActuel = ref('tous')
const patientDetail = ref(null)

const anneeCourante = new Date().getFullYear()

const filtres = [
  { id: 'tous', label: 'Tous' },
  { id: 'dues', label: 'Sommes dues' },
  { id: 'avance', label: 'En avance' },
  { id: 'aJour', label: 'À jour' }
]

const chargerDonnees = async () => {
  const tousLesPatients = await db.patients.toArray()
  const toutesLesSeances = await db.seances.toArray()

  patients.value = tousLesPatients.filter(p => p.projectId === props.projectId)
  seances.value = toutesLesSeances.filter(s => s.projectId === props.projectId)

  if (patientDetail.value) {
    const pAjour = patientsEnrichis.value.find(p => p.id === patientDetail.value.id)
    if (pAjour) patientDetail.value = pAjour
  }
}

const formerNomComplet = (p) => {
  if (!p) return 'Patient inconnu'
  const nom = (p.nom || '').trim().toUpperCase()
  const prenom = (p.prenom || '').trim()
  const prenomCap = prenom ? prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase() : ''
  const complet = `${nom} ${prenomCap}`.trim()
  return complet || 'Nouveau Patient'
}

const formerDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

const calculerTrimestre = (dateStr) => {
  if (!dateStr) return 'Trimestre 1'
  const mois = new Date(dateStr).getMonth() + 1
  if (mois <= 3) return 'Trimestre 1'
  if (mois <= 6) return 'Trimestre 2'
  if (mois <= 9) return 'Trimestre 3'
  return 'Trimestre 4'
}

// Enrichissement des patients avec calcul basé sur le tarif de chaque séance
const patientsEnrichis = computed(() => {
  return patients.value.map(p => {
    const seancesP = seances.value.filter(s => s.patientId === p.id)
    const tarifParDefaut = Number(p.tarifParDefaut ?? 60.0)

    const totalPaye = seancesP.reduce((sum, s) => sum + (Number(s.montant) || 0), 0)
    
    // Le total dû prend le tarif spécifique de la séance s'il existe, sinon le tarif par défaut
    const totalDu = seancesP.reduce((sum, s) => {
      const tarifSeance = (s.tarif !== undefined && s.tarif !== null && s.tarif !== '') 
        ? Number(s.tarif) 
        : tarifParDefaut
      return sum + tarifSeance
    }, 0)

    const solde = totalPaye - totalDu

    let texteSolde = '0,00 €'
    let texteSoldeDetail = '0,00 € (Équilibre)'
    let couleurSolde = '#1e293b'

    if (solde > 0.001) {
      texteSolde = `${solde.toFixed(2)} € (avance)`
      texteSoldeDetail = `${solde.toFixed(2)} € (avance)`
      couleurSolde = '#16a34a'
    } else if (solde < -0.001) {
      texteSolde = `${Math.abs(solde).toFixed(2)} € (due)`
      texteSoldeDetail = `${Math.abs(solde).toFixed(2)} € (due)`
      couleurSolde = '#dc2626'
    }

    const seancesAnneeCount = seancesP.filter(s => {
      if (!s.date) return false
      return new Date(s.date).getFullYear() === anneeCourante
    }).length

    const seancesTriees = [...seancesP].sort((a, b) => new Date(b.date) - new Date(a.date))
    const dateDerniereSeance = seancesTriees[0]?.date || null

    return {
      ...p,
      nomComplet: formerNomComplet(p),
      solde,
      texteSolde,
      texteSoldeDetail,
      couleurSolde,
      seancesAnneeCount,
      dateDerniereSeance,
      seancesP
    }
  })
})

const patientsFiltres = computed(() => {
  return patientsEnrichis.value.filter(p => {
    switch (filtreActuel.value) {
      case 'dues': return p.solde < -0.001
      case 'avance': return p.solde > 0.001
      case 'aJour': return Math.abs(p.solde) <= 0.001
      case 'tous':
      default:
        return true
    }
  })
})

const totalMontantFiltre = computed(() => {
  return patientsFiltres.value.reduce((sum, p) => sum + p.solde, 0)
})

const couleurTotalFiltre = computed(() => {
  const t = totalMontantFiltre.value
  if (t > 0.001) return '#16a34a'
  if (t < -0.001) return '#dc2626'
  return '#1e293b'
})

// MODAL DETAILS PATIENT
const ouvrirDetailPatient = (p) => {
  patientDetail.value = p
}

const fermerDetailPatient = () => {
  patientDetail.value = null
}

const seancesPatientDetail = computed(() => {
  if (!patientDetail.value) return []
  const seancesP = seances.value.filter(s => s.patientId === patientDetail.value.id)
  const tarifParDefaut = Number(patientDetail.value.tarifParDefaut ?? 60.0)

  return seancesP.map(s => ({
    ...s,
    chaineTrimestre: calculerTrimestre(s.date),
    tarifEffectif: (s.tarif !== undefined && s.tarif !== null && s.tarif !== '') ? Number(s.tarif) : tarifParDefaut
  })).sort((a, b) => new Date(b.date) - new Date(a.date))
})

const totalPayePatientDetail = computed(() => {
  return seancesPatientDetail.value.reduce((sum, s) => sum + (Number(s.montant) || 0), 0)
})

const bilanTrimestres = computed(() => {
  const tLabels = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3', 'Trimestre 4']
  return tLabels.map(label => {
    const sTrim = seancesPatientDetail.value.filter(s => s.chaineTrimestre === label)
    const count = sTrim.length
    const totalPaye = sTrim.reduce((sum, s) => sum + (Number(s.montant) || 0), 0)
    const totalDu = sTrim.reduce((sum, s) => sum + Number(s.tarifEffectif), 0)

    return { label, count, totalDu, totalPaye }
  })
})

// Modification à la volée du tarif d'une séance spécifique
const modifierTarifSeance = async (seanceId, nouveauTarif) => {
  const valNum = parseFloat(nouveauTarif)
  if (isNaN(valNum)) return

  await db.seances.update(seanceId, { tarif: valNum })
  await chargerDonnees()
}

watch(() => props.projectId, () => {
  patientDetail.value = null
  chargerDonnees()
})

onMounted(() => {
  chargerDonnees()
})
</script>

<style scoped>
.recap-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.filters-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.btn-filter {
  padding: 6px 14px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
}

.btn-filter.active {
  background-color: #c1e6f7;
  border-color: #93c5fd;
  color: #0f172a;
  font-weight: 700;
}

.recap-list-wrapper {
  flex: 1;
  overflow-y: auto;
}

.recap-list {
  display: flex;
  flex-direction: column;
}

.recap-card {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s;
}

.recap-card:hover {
  background-color: #f8fafc;
}

.recap-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.patient-name {
  font-size: 16px;
  font-weight: 700;
  color: #2563eb;
}

.patient-solde {
  font-size: 15px;
  font-weight: 700;
}

.recap-card-sub {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #64748b;
}

.stats-footer {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 14px;
  color: #334155;
}

.stat-spacer { flex: 1; }
.stat-total { font-size: 16px; }

.empty-state {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-box.modal-large {
  background: white;
  border-radius: 12px;
  max-width: 680px;
  width: 92%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.modal-header h2 {
  font-size: 18px;
  color: #0f172a;
}

.btn-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
}

.modal-content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
}

.detail-section h4 {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.info-grid {
  display: flex;
  gap: 30px;
}

.info-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 12px;
  color: #64748b;
}

.info-value {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.financial-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.financial-value {
  font-size: 16px;
}

.trimestre-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trimestre-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.trimestre-count, .trimestre-du {
  color: #64748b;
}

.trimestre-total {
  font-size: 13px;
  color: #0f172a;
}

/* HISTORIQUE ET LÉGENDE DE SÉANCES */
.history-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  background: #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.col-header {
  display: flex;
  align-items: center;
}

.date-col { flex: 1.2; }
.tarif-col { flex: 1; justify-content: center; text-align: center; }
.paye-col { flex: 1; text-align: right; justify-content: flex-end; }

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  padding: 8px 10px;
  background: white;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
}

.history-col {
  display: flex;
  flex-direction: column;
}

.history-date, .history-montant {
  font-weight: 700;
  color: #0f172a;
}

.history-trimestre, .history-pay {
  font-size: 11px;
  color: #64748b;
}

.tarif-col {
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.input-tarif {
  width: 65px;
  padding: 4px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  text-align: right;
  font-weight: 600;
  font-size: 13px;
  color: #0f172a;
}

.currency-symbol {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.empty-history {
  font-size: 13px;
  color: #94a3b8;
  font-style: italic;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.modal-footer-total {
  font-size: 14px;
  color: #334155;
}
.total-paye-blue {
  font-size: 16px;
  color: #2563eb;
  margin-left: 6px;
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

/* Styles et masquage des flèches pour .input-tarif */
.input-tarif {
  -webkit-appearance: none;
  appearance: none;
  -moz-appearance: textfield; /* Firefox */
  width: 65px;
  padding: 4px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  text-align: right;
  font-weight: 600;
  font-size: 13px;
  color: #0f172a;
}

.input-tarif::-webkit-outer-spin-button,
.input-tarif::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

</style>