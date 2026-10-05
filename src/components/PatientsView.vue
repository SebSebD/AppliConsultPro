<template>
  <div class="patients-split-view">
    <!-- Colonne de gauche : Répertoire & Recherche (320px) -->
    <aside class="patients-sidebar">
      <div class="sidebar-actions">
        <input 
          v-model="texteRecherche" 
          type="search" 
          placeholder="Rechercher un patient..." 
          class="search-input"
        />
        <button @click="ajouterPatient" class="btn-add-patient">
          <span>+</span> Nouveau Patient
        </button>
      </div>

      <div class="patients-list">
        <div 
          v-for="p in patientsFiltres" 
          :key="p.id" 
          :class="['patient-card-item', { selected: patientSelectionne?.id === p.id }]"
          @click="selectionnerPatient(p)"
        >
          <div class="patient-card-info">
            <span class="patient-name" :style="{ color: calculerCouleurSolde(p.solde) }">
              {{ formerNomComplet(p) }}
            </span>
            <span class="patient-tarif">
              Tarif : {{ (p.tarifParDefaut ?? 60).toFixed(2) }} € / séance
            </span>
          </div>
          <button 
            @click.stop="demanderSuppression(p)" 
            class="btn-trash" 
            title="Supprimer"
          >
            🗑️
          </button>
        </div>

        <p v-if="patientsFiltres.length === 0" class="empty-list-text">
          {{ texteRecherche ? 'Aucun résultat' : 'Aucun patient enregistré' }}
        </p>
      </div>
    </aside>

    <!-- Colonne de droite : Fiche / Édition Patient -->
    <main class="patient-detail-panel">
      <div v-if="patientSelectionne" class="detail-container">
        <header class="detail-header">
          <h2>{{ formerNomComplet(form) }}</h2>
        </header>

        <form @submit.prevent class="detail-form">
          <!-- Section 1: Informations Personnelles -->
          <fieldset class="form-section">
            <legend>Informations Personnelles</legend>
            <div class="form-row">
              <label>Nom</label>
              <input v-model="form.nom" type="text" placeholder="Nom" class="form-input" />
            </div>
            <div class="form-row">
              <label>Prénom</label>
              <input v-model="form.prenom" type="text" placeholder="Prénom" class="form-input" />
            </div>
            <div class="form-row">
              <label>Date de naissance</label>
              <input v-model="form.dateNaissance" type="text" placeholder="ex: 03/05/1996" class="form-input" />
            </div>
          </fieldset>

          <!-- Section 2: Tarification & Rendez-vous -->
          <fieldset class="form-section">
            <legend>Tarification & Rendez-vous</legend>
            <div class="form-row">
              <label>Tarif par séance (€)</label>
              <input v-model.number="form.tarifParDefaut" type="number" step="0.5" class="form-input number-input" />
            </div>
            <div class="form-row">
              <label>Date du 1er RDV</label>
              <input v-model="form.datePremierRdv" type="date" class="form-input" />
            </div>
          </fieldset>

          <!-- Section 3: Coordonnées (Note d'honoraires) -->
          <fieldset class="form-section">
            <legend>Coordonnées (Note d'honoraires)</legend>
            <div class="form-row">
              <label>Numéro et rue</label>
              <input v-model="form.adresseLigne1" type="text" placeholder="Adresse" class="form-input" />
            </div>
            <div class="form-row">
              <label>Complément, CP, ville</label>
              <input v-model="form.adresseLigne2" type="text" placeholder="Code postal & ville" class="form-input" />
            </div>
            <div class="form-row">
              <label>E-mail</label>
              <input v-model="form.email" type="email" placeholder="E-mail" class="form-input" />
            </div>
            <div class="form-row">
              <label>Téléphone</label>
              <input v-model="form.telephone" type="tel" placeholder="Téléphone" class="form-input" />
            </div>
          </fieldset>

          <!-- Section 4: Notes & Suivi -->
          <fieldset class="form-section">
            <legend>Notes & Suivi</legend>
            <textarea v-model="form.notes" placeholder="Notes de suivi..." rows="4" class="form-textarea"></textarea>
          </fieldset>

          <!-- Section 5: Situation Financière -->
          <fieldset class="form-section">
            <legend>Situation Financière</legend>
            <div class="financial-summary-row">
              <span>Solde du patient :</span>
              <strong :style="{ color: couleurSoldeForm }">
                {{ texteSoldeForm }}
              </strong>
            </div>
          </fieldset>
        </form>
      </div>

      <!-- État vide -->
      <div v-else class="empty-selection-state">
        <div class="empty-icon">👤</div>
        <h3>Sélectionnez un patient dans la liste</h3>
      </div>
    </main>

    <!-- Modal de confirmation de suppression -->
    <div v-if="patientASupprimer" class="modal-backdrop">
      <div class="modal-box">
        <h3>Supprimer le patient ?</h3>
        <p>Êtes-vous sûr de vouloir supprimer <strong>{{ formerNomComplet(patientASupprimer) }}</strong> ? Cette action est irréversible.</p>
        <div class="modal-actions">
          <button @click="patientASupprimer = null" class="btn-cancel">Annuler</button>
          <button @click="confirmerSuppression" class="btn-confirm-delete">Supprimer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { db } from '../db.js'

const patients = ref([])
const seances = ref([])
const texteRecherche = ref('')
const patientSelectionne = ref(null)
const patientASupprimer = ref(null)

const form = reactive({
  id: null,
  nom: '',
  prenom: '',
  dateNaissance: '',
  tarifParDefaut: 60.0,
  datePremierRdv: '',
  adresseLigne1: '',
  adresseLigne2: '',
  email: '',
  telephone: '',
  notes: ''
})

let verrouillageMaj = false

const chargerDonnees = async () => {
  patients.value = await db.patients.toArray()
  seances.value = await db.seances.toArray()

  // Calcul du solde pour chaque patient dans la liste
  patients.value = patients.value.map(p => {
    const seancesPatient = seances.value.filter(s => s.patientId === p.id)
    const totalPaye = seancesPatient.reduce((acc, s) => acc + (Number(s.montant) || 0), 0)
    const totalDu = seancesPatient.length * (Number(p.tarifParDefaut) ?? 60.0)
    return { ...p, solde: totalPaye - totalDu }
  })
}

const formerNomComplet = (p) => {
  if (!p) return 'Nouveau Patient'
  const nom = (p.nom || '').trim().toUpperCase()
  const prenom = (p.prenom || '').trim()
  const prenomCap = prenom ? prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase() : ''
  const complet = `${nom} ${prenomCap}`.trim()
  return complet || 'Nouveau Patient'
}

const calculerCouleurSolde = (solde = 0) => {
  if (solde > 0.001) return '#16a34a' // Vert (avance)
  if (solde < -0.001) return '#dc2626' // Rouge (dû)
  return '#1e293b' // Équilibre
}

const patientsFiltres = computed(() => {
  if (!texteRecherche.value.trim()) return patients.value
  const query = texteRecherche.value.toLowerCase()
  return patients.value.filter(p => formerNomComplet(p).toLowerCase().includes(query))
})

const selectionnerPatient = (p) => {
  verrouillageMaj = true
  patientSelectionne.value = p
  Object.assign(form, {
    id: p.id,
    nom: p.nom || '',
    prenom: p.prenom || '',
    dateNaissance: p.dateNaissance || '',
    tarifParDefaut: p.tarifParDefaut ?? 60.0,
    datePremierRdv: p.datePremierRdv || new Date().toISOString().slice(0, 10),
    adresseLigne1: p.adresseLigne1 || '',
    adresseLigne2: p.adresseLigne2 || '',
    email: p.email || '',
    telephone: p.telephone || '',
    notes: p.notes || ''
  })
  setTimeout(() => { verrouillageMaj = false }, 50)
}

// Auto-sauvegarde dynamique dès qu'un champ change
watch(form, async (nouveauForm) => {
  if (verrouillageMaj || !nouveauForm.id) return
  await db.patients.update(nouveauForm.id, {
    nom: nouveauForm.nom,
    prenom: nouveauForm.prenom,
    dateNaissance: nouveauForm.dateNaissance,
    tarifParDefaut: Number(nouveauForm.tarifParDefaut) || 0,
    datePremierRdv: nouveauForm.datePremierRdv,
    adresseLigne1: nouveauForm.adresseLigne1,
    adresseLigne2: nouveauForm.adresseLigne2,
    email: nouveauForm.email,
    telephone: nouveauForm.telephone,
    notes: nouveauForm.notes
  })
  await chargerDonnees()
}, { deep: true })

const ajouterPatient = async () => {
  const count = patients.value.length
  const newId = await db.patients.add({
    numero: count + 1,
    nom: 'NOUVEAU',
    prenom: 'Patient',
    tarifParDefaut: 60.0,
    datePremierRdv: new Date().toISOString().slice(0, 10),
    dateNaissance: '',
    adresseLigne1: '',
    adresseLigne2: '',
    email: '',
    telephone: '',
    notes: ''
  })
  await chargerDonnees()
  const nouveau = patients.value.find(p => p.id === newId)
  if (nouveau) selectionnerPatient(nouveau)
}

const demanderSuppression = (p) => {
  patientASupprimer.value = p
}

const confirmerSuppression = async () => {
  if (!patientASupprimer.value) return
  const id = patientASupprimer.value.id
  if (patientSelectionne.value?.id === id) {
    patientSelectionne.value = null
  }
  await db.patients.delete(id)
  patientASupprimer.value = null
  await chargerDonnees()
}

// Solde du patient sélectionné
const seancesPatientForm = computed(() => {
  if (!form.id) return []
  return seances.value.filter(s => s.patientId === form.id)
})

const soldeForm = computed(() => {
  const totalPaye = seancesPatientForm.value.reduce((acc, s) => acc + (Number(s.montant) || 0), 0)
  const totalDu = seancesPatientForm.value.length * (Number(form.tarifParDefaut) ?? 60.0)
  return totalPaye - totalDu
})

const couleurSoldeForm = computed(() => calculerCouleurSolde(soldeForm.value))

const texteSoldeForm = computed(() => {
  const s = soldeForm.value
  if (s > 0.001) return `${s.toFixed(2)} € (avance)`
  if (s < -0.001) return `${Math.abs(s).toFixed(2)} € (dû)`
  return '0,00 € (Équilibre)'
})

onMounted(() => {
  chargerDonnees()
})
</script>

<style scoped>
.patients-split-view {
  display: flex;
  height: calc(100vh - 120px);
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

/* Sidebar */
.patients-sidebar {
  width: 320px;
  border-right: 1px solid #e2e8f0;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
}

.sidebar-actions {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid #e2e8f0;
  background: white;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
}

.btn-add-patient {
  padding: 10px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.patients-list {
  flex: 1;
  overflow-y: auto;
}

.patient-card-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: white;
  transition: background 0.15s;
}

.patient-card-item:hover {
  background-color: #f8fafc;
}

.patient-card-item.selected {
  background-color: #eff6ff;
  border-left: 4px solid #2563eb;
}

.patient-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.patient-name {
  font-size: 15px;
  font-weight: 700;
}

.patient-tarif {
  font-size: 12px;
  color: #64748b;
}

.btn-trash {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  padding: 4px;
}

.btn-trash:hover {
  opacity: 1;
}

.empty-list-text {
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

/* Detail Panel */
.patient-detail-panel {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: white;
}

.detail-header h2 {
  font-size: 22px;
  color: #0f172a;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.form-section {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-section legend {
  font-weight: 600;
  font-size: 13px;
  color: #475569;
  padding: 0 6px;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.form-row label {
  font-size: 14px;
  color: #334155;
  width: 220px;
}

.form-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
}

.number-input {
  max-width: 120px;
  text-align: right;
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
}

.financial-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  padding: 4px 0;
}

/* Empty Selection */
.empty-selection-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  gap: 12px;
}

.empty-icon {
  font-size: 48px;
}

/* Modal */
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
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.modal-box h3 {
  margin-bottom: 10px;
}

.modal-box p {
  font-size: 14px;
  color: #475569;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 6px;
  cursor: pointer;
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