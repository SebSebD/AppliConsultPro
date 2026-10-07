<template>
  <div class="seances-container">
    <!-- BANDEAU DES FILTRES TEMPORELS -->
    <div class="period-filters-bar">
      <button 
        v-for="f in filtresTemporels" 
        :key="f.id"
        :class="['btn-filter-period', { active: filtreTemporelActuel === f.id }]"
        @click="filtreTemporelActuel = f.id"
      >
        {{ f.label }}
      </button>

      <button @click="ouvrirModalAjout" class="btn-primary-add">
        + Nouvelle Séance
      </button>
    </div>

    <!-- TABLEAU DES SÉANCES -->
    <div class="table-wrapper">
      <div v-if="seancesTriees.length === 0" class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>Aucune séance pour cette période</h3>
      </div>

      <table v-else class="seances-table">
        <thead>
          <tr>
            <th @click="basculerTri('patient')" class="th-sortable col-patient">
              Patient <span class="sort-arrow" v-if="colonneTriActuelle === 'patient'">{{ triAscendant ? '▲' : '▼' }}</span>
            </th>
            <th @click="basculerTri('date')" class="th-sortable col-date">
              Date <span class="sort-arrow" v-if="colonneTriActuelle === 'date'">{{ triAscendant ? '▲' : '▼' }}</span>
            </th>
            <th @click="basculerTri('moyenPaiement')" class="th-sortable col-payement">
              Paiement <span class="sort-arrow" v-if="colonneTriActuelle === 'moyenPaiement'">{{ triAscendant ? '▲' : '▼' }}</span>
            </th>
            <th @click="basculerTri('tarifConvenu')" class="th-sortable text-right col-tarif">
              Tarif <span class="sort-arrow" v-if="colonneTriActuelle === 'tarifConvenu'">{{ triAscendant ? '▲' : '▼' }}</span>
            </th>
            <th @click="basculerTri('montant')" class="th-sortable text-right col-montant">
              Montant <span class="sort-arrow" v-if="colonneTriActuelle === 'montant'">{{ triAscendant ? '▲' : '▼' }}</span>
            </th>
            <th @click="basculerTri('voyantCouleur')" class="th-sortable text-center col-voyant">
              ● <span class="sort-arrow" v-if="colonneTriActuelle === 'voyantCouleur'">{{ triAscendant ? '▲' : '▼' }}</span>
            </th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="s in seancesTriees" 
            :key="s.id" 
            class="tr-seance"
            @click="ouvrirModalEditer(s)"
          >
            <td class="td-patient">
              <strong :class="{ 'unassigned-patient': !s.patientId }">{{ s.patientNom }}</strong>
            </td>
            <td class="td-date">{{ formerDate(s.date) }}</td>
            <td class="td-payement">
              <div class="pay-info">
                <span class="pay-moyen">{{ s.moyenPaiement || 'CB' }}</span>
                <span class="pay-trimestre">{{ s.chaineTrimestre }}</span>
              </div>
            </td>
            <td class="td-tarif text-right">{{ s.tarifConvenu.toFixed(2) }} €</td>
            <td class="td-montant text-right"><strong>{{ s.montant.toFixed(2) }} €</strong></td>
            <td class="td-voyant text-center">
              <span class="status-dot" :style="{ backgroundColor: s.couleurVoyant }"></span>
            </td>
            <td class="td-actions" @click.stop>
              <button @click="demanderSuppression(s)" class="btn-trash-row" title="Supprimer">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PIED DE PAGE : STATISTIQUES -->
    <footer class="stats-footer">
      <div class="stat-item">Séances : <strong>{{ seancesTriees.length }}</strong></div>
      <div class="stat-separator">•</div>
      <div class="stat-item">Patients : <strong>{{ nombrePatientsDifferents }}</strong></div>
      <div class="stat-spacer"></div>
      <div class="stat-total">Total : <strong>{{ totalMontantFiltre.toFixed(2) }} €</strong></div>
    </footer>

    <!-- MODAL : FEUILLE AJOUT / ÉDITION -->
    <div v-if="afficherModal" class="modal-backdrop">
      <div class="modal-box">
        <h3>{{ seanceEnEdition ? 'Éditer la Séance' : 'Nouvelle Séance' }}</h3>

        <form @submit.prevent="soumettreFormulaire" class="modal-form">
          <div class="form-group">
            <label>Patient associé</label>
            <select v-model="form.patientId" class="form-input" @change="surChangementPatient">
              <option :value="null">— Aucun patient attribué —</option>
              <option v-for="p in patients" :key="p.id" :value="p.id">
                {{ formerNomPatient(p) }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Date de la séance</label>
            <input v-model="form.date" type="date" required class="form-input" />
          </div>

          <div class="form-group">
            <label>Moyen de paiement</label>
            <select v-model="form.moyenPaiement" class="form-input">
              <option v-for="moyen in moyensPaiement" :key="moyen" :value="moyen">
                {{ moyen }}
              </option>
            </select>
          </div>

          <!-- Tarif de la séance avec flèches tactiles -10 / +10 -->
          <div class="form-group">
            <label>Tarif de la séance (€)</label>
            <div class="montant-stepper-container">
              <button type="button" class="btn-step-side" @click="ajusterTarifSeance(-10)" title="-10">-</button>
              <input 
                v-model.number="form.tarif" 
                type="number" 
                step="1" 
                min="0"
                required 
                class="form-input text-center number-input-centered" 
              />
              <button type="button" class="btn-step-side" @click="ajusterTarifSeance(10)" title="+10">+</button>
            </div>
          </div>

          <!-- Montant payé avec flèches tactiles -10 / +10 -->
          <div class="form-group">
            <label>Montant payé (€)</label>
            <div class="montant-stepper-container">
              <button type="button" class="btn-step-side" @click="ajusterMontant(-10)" title="-10">-</button>
              <input 
                v-model.number="form.montant" 
                type="number" 
                step="1" 
                min="0"
                required 
                class="form-input text-center number-input-centered" 
              />
              <button type="button" class="btn-step-side" @click="ajusterMontant(10)" title="+10">+</button>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="fermerModal" class="btn-cancel">Annuler</button>
            <button type="submit" class="btn-save">
              {{ seanceEnEdition ? 'Modifier' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- DIALOGUE CONFIRMATION MODIFICATION -->
    <div v-if="afficherConfirmationModification" class="modal-backdrop">
      <div class="modal-box">
        <h3>Modifier la séance ?</h3>
        <p>Voulez-vous enregistrer les modifications apportées à cette séance ?</p>
        <div class="modal-actions">
          <button @click="afficherConfirmationModification = false" class="btn-cancel">Annuler</button>
          <button @click="confirmerModification" class="btn-save">Valider la modification</button>
        </div>
      </div>
    </div>

    <!-- DIALOGUE CONFIRMATION SUPPRESSION -->
    <div v-if="seanceASupprimer" class="modal-backdrop">
      <div class="modal-box">
        <h3>Supprimer la séance ?</h3>
        <p>Êtes-vous sûr de vouloir supprimer cette séance du <strong>{{ formerDate(seanceASupprimer.date) }}</strong> ?</p>
        <div class="modal-actions">
          <button @click="seanceASupprimer = null" class="btn-cancel">Annuler</button>
          <button @click="confirmerSuppression" class="btn-confirm-delete">Supprimer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { db } from '../db.js'

// 1. Déclaration de la prop projectId transmise par le composant parent
const props = defineProps({
  projectId: {
    type: [Number, String],
    required: true
  }
})

const patients = ref([])
const seances = ref([])

const filtreTemporelActuel = ref('annee')
const colonneTriActuelle = ref('date')
const triAscendant = ref(false)

const afficherModal = ref(false)
const afficherConfirmationModification = ref(false)
const seanceEnEdition = ref(null)
const seanceASupprimer = ref(null)

const moyensPaiement = ['CB', 'Espèces', 'Chèque', 'Virement']

const form = reactive({
  patientId: null,
  date: new Date().toISOString().slice(0, 10),
  tarif: 60.0,
  montant: 60.0,
  moyenPaiement: 'CB'
})

const filtresTemporels = [
  { id: 'annee', label: 'Année' },
  { id: 'trimestre1', label: 'Trimestre 1' },
  { id: 'trimestre2', label: 'Trimestre 2' },
  { id: 'trimestre3', label: 'Trimestre 3' },
  { id: 'trimestre4', label: 'Trimestre 4' }
]

// 2. Chargement des données filtrées selon le projet actif
const chargerDonnees = async () => {
  const tousLesPatients = await db.patients.toArray()
  const toutesLesSeances = await db.seances.toArray()

  patients.value = tousLesPatients.filter(p => p.projectId === props.projectId)
  seances.value = toutesLesSeances.filter(s => s.projectId === props.projectId)
}

const formerNomPatient = (p) => {
  if (!p) return '— Aucun patient attribué —'
  const nom = (p.nom || '').trim().toUpperCase()
  const prenom = (p.prenom || '').trim()
  const prenomCap = prenom ? prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase() : ''
  const complet = `${nom} ${prenomCap}`.trim()
  return complet || 'Nouveau Patient'
}

const calculerTrimestre = (dateStr) => {
  if (!dateStr) return 'Trimestre 1'
  const mois = new Date(dateStr).getMonth() + 1
  if (mois <= 3) return 'Trimestre 1'
  if (mois <= 6) return 'Trimestre 2'
  if (mois <= 9) return 'Trimestre 3'
  return 'Trimestre 4'
}

const seancesFiltrees = computed(() => {
  const anneeCourante = new Date().getFullYear()
  
  return seances.value.filter(s => {
    if (!s.date) return false
    const d = new Date(s.date)
    const annee = d.getFullYear()
    const mois = d.getMonth() + 1

    if (annee !== anneeCourante) return false

    switch (filtreTemporelActuel.value) {
      case 'trimestre1': return mois >= 1 && mois <= 3
      case 'trimestre2': return mois >= 4 && mois <= 6
      case 'trimestre3': return mois >= 7 && mois <= 9
      case 'trimestre4': return mois >= 10 && mois <= 12
      default: return true
    }
  })
})

const ajusterTarifSeance = (valeur) => {
  let actuel = Number(form.tarif) || 0
  form.tarif = Math.max(0, Number((actuel + valeur).toFixed(2)))
}

const ajusterMontant = (valeur) => {
  let actuel = Number(form.montant) || 0
  form.montant = Math.max(0, Number((actuel + valeur).toFixed(2)))
}

const seancesTriees = computed(() => {
  const enrichies = seancesFiltrees.value.map(s => {
    const patient = patients.value.find(p => p.id === s.patientId)
    // Récupère le tarif propre à la séance s'il existe (ex: modifié dans RecapPatient), 
    // sinon bascule sur s.tarifConvenu ou le tarif par défaut du patient
    const tarifConvenu = Number(s.tarif ?? s.tarifConvenu ?? patient?.tarifParDefaut ?? 0.0)
    const montantPaye = Number(s.montant ?? 0)

    let couleurVoyant = '#1e293b'
    let poidsVoyant = 1
    if (montantPaye < tarifConvenu) {
      couleurVoyant = '#ef4444'
      poidsVoyant = 0
    } else if (montantPaye > tarifConvenu) {
      couleurVoyant = '#22c55e'
      poidsVoyant = 2
    }

    return {
      ...s,
      patientNom: s.patientId ? formerNomPatient(patient) : 'Patient non attribué',
      tarifConvenu,
      couleurVoyant,
      poidsVoyant,
      chaineTrimestre: calculerTrimestre(s.date)
    }
  })

  return enrichies.sort((a, b) => {
    let res = 0
    switch (colonneTriActuelle.value) {
      case 'patient':
        res = a.patientNom.localeCompare(b.patientNom)
        break
      case 'date':
        res = new Date(a.date) - new Date(b.date)
        break
      case 'moyenPaiement':
        res = (a.moyenPaiement || '').localeCompare(b.moyenPaiement || '')
        break
      case 'tarifConvenu':
        res = a.tarifConvenu - b.tarifConvenu
        break
      case 'montant':
        res = a.montant - b.montant
        break
      case 'voyantCouleur':
        res = a.poidsVoyant - b.poidsVoyant
        break
    }
    return triAscendant.value ? res : -res
  })
})

const basculerTri = (colonne) => {
  if (colonneTriActuelle.value === colonne) {
    triAscendant.value = !triAscendant.value
  } else {
    colonneTriActuelle.value = colonne
    triAscendant.value = true
  }
}

const totalMontantFiltre = computed(() => {
  return seancesTriees.value.reduce((sum, s) => sum + (Number(s.montant) || 0), 0)
})

const nombrePatientsDifferents = computed(() => {
  const setP = new Set(seancesTriees.value.filter(s => s.patientId).map(s => s.patientId))
  return setP.size
})

const formerDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

const ouvrirModalAjout = () => {
  seanceEnEdition.value = null
  const premierPatient = patients.value[0] || null
  const tarifInitial = premierPatient ? Number(premierPatient.tarifParDefaut ?? 60.0) : 60.0
  Object.assign(form, {
    patientId: premierPatient ? premierPatient.id : null,
    date: new Date().toISOString().slice(0, 10),
    tarif: tarifInitial,
    montant: tarifInitial,
    moyenPaiement: 'CB'
  })
  afficherModal.value = true
}

const surChangementPatient = () => {
  if (!seanceEnEdition.value && form.patientId) {
    const patient = patients.value.find(p => p.id === form.patientId)
    if (patient) {
      const pTarif = Number(patient.tarifParDefaut ?? 60.0)
      form.tarif = pTarif
      form.montant = pTarif
    }
  }
}

const ouvrirModalEditer = (seance) => {
  seanceEnEdition.value = seance
  const patient = patients.value.find(p => p.id === seance.patientId)
  Object.assign(form, {
    patientId: seance.patientId || null,
    date: seance.date,
    tarif: Number(seance.tarif ?? seance.tarifConvenu ?? patient?.tarifParDefaut ?? 60.0),
    montant: seance.montant,
    moyenPaiement: seance.moyenPaiement || 'CB'
  })
  afficherModal.value = true
}

const fermerModal = () => {
  afficherModal.value = false
}

const soumettreFormulaire = () => {
  if (seanceEnEdition.value) {
    afficherConfirmationModification.value = true
  } else {
    sauvegarder()
  }
}

const confirmerModification = async () => {
  afficherConfirmationModification.value = false
  await sauvegarder()
}

// 3. Rattachement explicite au projectId lors de l'enregistrement
const sauvegarder = async () => {
  const payload = {
    projectId: props.projectId,
    patientId: form.patientId ? Number(form.patientId) : null,
    date: form.date,
    tarif: Number(form.tarif),
    montant: Number(form.montant),
    moyenPaiement: form.moyenPaiement
  }

  if (seanceEnEdition.value) {
    await db.seances.update(seanceEnEdition.value.id, payload)
  } else {
    await db.seances.add(payload)
  }

  fermerModal()
  await chargerDonnees()
}

const demanderSuppression = (s) => {
  seanceASupprimer.value = s
}

const confirmerSuppression = async () => {
  if (seanceASupprimer.value) {
    await db.seances.delete(seanceASupprimer.value.id)
    seanceASupprimer.value = null
    await chargerDonnees()
  }
}

// 4. Watcher pour réinitialiser l'état et recharger les données lors du changement de projet
watch(() => props.projectId, () => {
  afficherModal.value = false
  afficherConfirmationModification.value = false
  seanceEnEdition.value = null
  seanceASupprimer.value = null
  chargerDonnees()
})

onMounted(() => {
  chargerDonnees()
})
</script>

<style scoped>
.seances-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.period-filters-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.btn-filter-period {
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-filter-period.active {
  background-color: #c1e6f7;
  border-color: #93c5fd;
  color: #0f172a;
  font-weight: 700;
}

.btn-primary-add {
  margin-left: auto;
  padding: 8px 16px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto;
}

.seances-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.seances-table th {
  position: sticky;
  top: 0;
  background: #f1f5f9;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
  user-select: none;
}

.th-sortable { cursor: pointer; }
.th-sortable:hover { background: #e2e8f0; }

.sort-arrow {
  font-size: 10px;
  color: #2563eb;
}

.tr-seance {
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.15s;
}

.tr-seance:hover { background-color: #f8fafc; }
.seances-table td { padding: 12px 16px; }

.unassigned-patient {
  color: #94a3b8;
  font-weight: 400;
  font-style: italic;
}

.pay-info {
  display: flex;
  flex-direction: column;
}

.pay-moyen { font-size: 14px; }
.pay-trimestre { font-size: 11px; color: #64748b; }

.text-right { text-align: right; }
.text-center { text-align: center; }

.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.btn-trash-row {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.5;
}

.btn-trash-row:hover { opacity: 1; }

.stats-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 14px;
  color: #334155;
}

.stat-spacer { flex: 1; }
.stat-separator { color: #cbd5e1; }

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  gap: 10px;
  padding: 40px;
}

.empty-icon { font-size: 48px; }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-box {
  background: white;
  padding: 24px;
  border-radius: 12px;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.modal-box h3 {
  margin-bottom: 16px;
  color: #0f172a;
}

.modal-box p {
  font-size: 14px;
  color: #475569;
  margin-bottom: 20px;
}

/* Centrage global des groupes du formulaire dans la modale */
.modal-form {
  display: flex;
  flex-direction: column;
  align-items: center; /* Centre les éléments enfants horizontalement */
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  align-items: center; /* Centre le label et le stepper */
  gap: 6px;
  width: 100%;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-align: center; /* Centre le texte du libellé au-dessus du bloc */
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
}

/* Centrage et dimensionnement du stepper tactile */
.montant-stepper-container {
  display: flex;
  align-items: center;
  justify-content: center; /* Centre les boutons et l'input à l'intérieur du conteneur */
  gap: 6px;
  max-width: 160px;
  width: 100%;
  margin: 0 auto; /* Force le centrage du bloc complet */
}

.btn-step-side {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  width: 34px;
  height: 34px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #334155;
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.btn-step-side:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
  color: #0f172a;
}

.btn-step-side:active {
  background: #cbd5e1;
}

.number-input-centered {
  text-align: center;
  font-weight: 600;
  width: 60px;
  padding: 6px 4px;
  -webkit-appearance: none;
  appearance: none;
  -moz-appearance: textfield;
}

.number-input-centered::-webkit-outer-spin-button,
.number-input-centered::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
/* --------------------------------------------- */

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.btn-save {
  padding: 8px 16px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.btn-confirm-delete {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>