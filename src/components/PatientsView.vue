<template>
  <div class="patients-split-view" :class="{ 'show-detail-mobile': patientSelectionne }">
    <!-- Colonne de gauche : Répertoire & Recherche -->
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
          <!-- Bouton Retour visible uniquement sur écran étroit / portrait -->
          <button @click="patientSelectionne = null" class="btn-back-mobile">
            ← Retour à la liste
          </button>
          <h2>Fiche de : {{ formerNomComplet(form) }}</h2>
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
            <textarea v-model="form.notes" placeholder="Notes de suivi..." rows="5" class="form-textarea"></textarea>
          </fieldset>

          <!-- Section 5: Situation Financière -->
          <fieldset class="form-section financial-section">
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

      <!-- État vide si aucun patient sélectionné (mode grand écran) -->
      <div v-else class="empty-selection-state">
        <div class="empty-icon">📂</div>
        <h3>Sélectionnez un patient dans la liste</h3>
        <p>Ou cliquez sur <strong>"+ Nouveau Patient"</strong> pour en créer un.</p>
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
  if (solde > 0.001) return '#16a34a'
  if (solde < -0.001) return '#dc2626'
  return '#1e293b'
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
  height: calc(100vh - 110px);
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

/* Sidebar Liste */
.patients-sidebar {
  width: 340px;
  border-right: 1px solid #e2e8f0;
  background-color: #f8fafc;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-actions {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid #e2e8f0;
  background: white;
}

.search-input {
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
}

.search-input:focus {
  border-color: #2563eb;
}

.btn-add-patient {
  padding: 12px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s;
}

.btn-add-patient:hover {
  background-color: #1d4ed8;
}

.patients-list {
  flex: 1;
  overflow-y: auto;
}

.patient-card-item {
  padding: 14px 18px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: white;
  transition: background 0.15s;
}

.patient-card-item:hover {
  background-color: #f1f5f9;
}

.patient-card-item.selected {
  background-color: #eff6ff;
  border-left: 5px solid #2563eb;
}

.patient-card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.patient-name {
  font-size: 16px;
  font-weight: 700;
}

.patient-tarif {
  font-size: 13px;
  color: #64748b;
}

.btn-trash {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.5;
  padding: 8px;
  font-size: 16px;
  transition: opacity 0.15s;
}

.btn-trash:hover {
  opacity: 1;
}

.empty-list-text {
  padding: 30px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

/* Panneau de droite : Fiche Patient */
.patient-detail-panel {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  background: #ffffff;
}

.detail-container {
  max-width: 800px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
}

.detail-header h2 {
  font-size: 24px;
  color: #0f172a;
  margin: 0;
}

/* Bouton Retour masqué par défaut sur grand écran */
.btn-back-mobile {
  display: none;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
  color: #334155;
}

.form-section {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 24px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section legend {
  font-weight: 700;
  font-size: 14px;
  color: #334155;
  padding: 0 8px;
  background: #fafafa;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.form-row label {
  font-size: 15px;
  font-weight: 500;
  color: #475569;
  width: 240px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 15px;
  background: white;
  outline: none;
}

.form-input:focus {
  border-color: #2563eb;
}

.number-input {
  max-width: 140px;
  text-align: right;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 15px;
  background: white;
  resize: vertical;
  outline: none;
}

.form-textarea:focus {
  border-color: #2563eb;
}

.financial-section {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.financial-section legend {
  background: #f0fdf4;
  color: #166534;
}

.financial-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  padding: 6px 0;
}

/* État vide */
.empty-selection-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  gap: 12px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
}

.empty-selection-state h3 {
  font-size: 20px;
  color: #475569;
}

/* Modal suppression */
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
  padding: 30px;
  border-radius: 12px;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.modal-box h3 {
  margin-bottom: 12px;
  font-size: 20px;
}

.modal-box p {
  font-size: 15px;
  color: #475569;
  margin-bottom: 24px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-confirm-delete {
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* --- ADAPTATION MOBILE & IPAD PORTRAIT (Écrans étroits) --- */
@media (max-width: 900px) {
  /* Par défaut en portrait, on cache la sidebar et on affiche uniquement le détail, ou inversement */
  .patients-sidebar {
    width: 100%;
    height: 100%;
    display: flex;
  }

  .patient-detail-panel {
    display: none;
    position: absolute;
    inset: 0;
    z-index: 10;
    padding: 16px;
    background: white;
  }

  /* Quand un patient est sélectionné en mode portrait, on cache la liste et on affiche la fiche en plein écran */
  .patients-split-view.show-detail-mobile .patients-sidebar {
    display: none;
  }

  .patients-split-view.show-detail-mobile .patient-detail-panel {
    display: block;
  }

  /* On affiche le bouton retour en haut de la fiche */
  .btn-back-mobile {
    display: inline-flex;
    align-items: center;
  }

  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .form-row {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .form-row label {
    width: 100%;
  }

  .number-input {
    max-width: 100%;
    text-align: left;
  }
}
</style>