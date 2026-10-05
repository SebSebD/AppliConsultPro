<template>
  <div class="patients-main-container">
    <!-- Barre d'actions (Recherche + Bouton Nouveau) -->
    <div class="patients-top-bar">
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

    <!-- Grille ou liste des patients -->
    <div class="patients-grid">
      <div 
        v-for="p in patientsFiltres" 
        :key="p.id" 
        class="patient-card-item"
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

    <!-- PETITE FENÊTRE MODALE D'ÉDITION (Style Récap Patients) -->
    <div v-if="patientSelectionne" class="modal-backdrop" @click.self="fermerDetail">
      <div class="patient-modal-box">
        <header class="modal-header">
          <h3>Fiche : {{ formerNomComplet(form) }}</h3>
          <button @click="fermerDetail" class="btn-close">✕</button>
        </header>

        <div class="modal-body-scroll">
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

            <!-- Section 3: Coordonnées -->
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
              <textarea v-model="form.notes" placeholder="Notes de suivi..." rows="3" class="form-textarea"></textarea>
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

        <footer class="modal-footer">
          <button @click="fermerDetail" class="btn-primary">Fermer</button>
        </footer>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="patientASupprimer" class="modal-backdrop" @click.self="patientASupprimer = null">
      <div class="modal-box-delete">
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

// 1. Récupération de l'ID du projet actif transmis par le composant parent
const props = defineProps({
  projectId: {
    type: [Number, String],
    required: true
  }
})

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

// 2. Chargement des données filtrées selon le projet actif
const chargerDonnees = async () => {
  const tousLesPatients = await db.patients.toArray()
  const toutesLesSeances = await db.seances.toArray()

  // Isolation des données du projet actuel
  patients.value = tousLesPatients.filter(p => p.projectId === props.projectId)
  seances.value = toutesLesSeances.filter(s => s.projectId === props.projectId)

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

const fermerDetail = () => {
  patientSelectionne.value = null
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

// 3. Associaton systématique du projet lors de la création
const ajouterPatient = async () => {
  const count = patients.value.length
  const newId = await db.patients.add({
    projectId: props.projectId, // Rattachement au projet actif
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

// 4. Rechargement si le projet change dynamiquement
watch(() => props.projectId, () => {
  patientSelectionne.value = null
  chargerDonnees()
})

onMounted(() => {
  chargerDonnees()
})
</script>

<style scoped>
.patients-main-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 110px);
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.patients-top-bar {
  padding: 16px;
  display: flex;
  gap: 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  background: white;
}

.search-input:focus {
  border-color: #2563eb;
}

.btn-add-patient {
  padding: 10px 20px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;
  flex-shrink: 0;
}

.btn-add-patient:hover {
  background-color: #1d4ed8;
}

.patients-grid {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  align-content: start;
}

.patient-card-item {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: white;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.patient-card-item:hover {
  border-color: #2563eb;
  background-color: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
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
  grid-column: 1 / -1;
  padding: 40px;
  text-align: center;
  color: #94a3b8;
  font-size: 15px;
}

/* --- MODALE FLOTTANTE --- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}

.patient-modal-box {
  background: white;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.modal-header h3 {
  font-size: 18px;
  color: #0f172a;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
  padding: 4px;
}

.btn-close:hover {
  color: #0f172a;
}

.modal-body-scroll {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-section {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 14px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-section legend {
  font-weight: 700;
  font-size: 13px;
  color: #334155;
  padding: 0 6px;
  background: #fafafa;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.form-row label {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  width: 160px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  outline: none;
}

.form-input:focus {
  border-color: #2563eb;
}

.number-input {
  max-width: 120px;
  text-align: right;
}

.form-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
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
  font-size: 15px;
  font-weight: 600;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  padding: 8px 18px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

/* Modale de suppression */
.modal-box-delete {
  background: white;
  padding: 24px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
}

.modal-box-delete h3 {
  margin-bottom: 10px;
}

.modal-box-delete p {
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