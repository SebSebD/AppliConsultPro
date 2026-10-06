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
      <button type="button" @click="ajouterPatient" class="btn-add-patient">
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
          type="button"
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

    <!-- PETITE FENÊTRE MODALE D'ÉDITION -->
    <div v-if="patientSelectionne" class="modal-backdrop" @click.self="fermerDetail">
      <div class="patient-modal-box" :class="{ 'modal-expanded': modeGrandesNotes }">
        
        <!-- VUE AGRANDIE : NOTES & SUIVI UNIQUEMENT -->
        <template v-if="modeGrandesNotes">
          <header class="modal-header">
            <div class="header-with-back">
              <button type="button" @click.stop="modeGrandesNotes = false" class="btn-back">
                ← Retour à la fiche
              </button>
              <h3>Notes & Suivi : {{ formerNomComplet(form) }}</h3>
            </div>
            <button type="button" @click="fermerDetail" class="btn-close" title="Fermer">✕</button>
          </header>

          <div class="modal-body-expanded">
            <textarea 
              v-model="form.notes" 
              placeholder="Saisissez ici les notes de suivi détaillées..." 
              class="form-textarea textarea-expanded"
            ></textarea>
          </div>

          <footer class="modal-footer">
            <button type="button" @click="fermerDetail" class="btn-primary">
              Fermer
            </button>
          </footer>
        </template>

        <!-- VUE STANDARD : FICHE PATIENT COMPLÈTE -->
        <template v-else>
          <header class="modal-header">
            <h3>Fiche : {{ formerNomComplet(form) }}</h3>
            <button type="button" @click="fermerDetail" class="btn-close" title="Fermer">✕</button>
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

                <!-- Date de naissance avec 3 menus déroulants -->
                <div class="form-row">
                  <label>Date de naissance</label>
                  <div class="date-selects-container">
                    <div class="date-selects">
                      <select v-model="jourNaissance" class="form-input select-field">
                        <option value="" disabled>Jour</option>
                        <option v-for="j in jours" :key="j" :value="j">{{ j }}</option>
                      </select>

                      <select v-model="moisNaissance" class="form-input select-field">
                        <option value="" disabled>Mois</option>
                        <option v-for="m in mois" :key="m.value" :value="m.value">{{ m.label }}</option>
                      </select>

                      <select v-model="anneeNaissance" class="form-input select-field">
                        <option value="" disabled>Année</option>
                        <option v-for="a in annees" :key="a" :value="a">{{ a }}</option>
                      </select>
                    </div>
                    <p v-if="dateErreur" class="error-msg">⚠️ Date impossible</p>
                  </div>
                </div>
              </fieldset>

              <!-- Section 2: Tarification & Rendez-vous -->
              <fieldset class="form-section">
                <legend>Tarification & Rendez-vous</legend>

                <!-- Tarif avec flèches +10 / -10 -->
                <div class="form-row">
                  <label>Tarif par séance (€)</label>
                  <div class="montant-input-wrapper">
                    <input 
                      v-model.number="form.tarifParDefaut" 
                      type="number" 
                      step="10" 
                      min="0"
                      class="form-input number-input" 
                    />
                    <div class="stepper-buttons">
                      <button type="button" class="btn-step" @click="ajusterTarif(10)" title="+10">▲</button>
                      <button type="button" class="btn-step" @click="ajusterTarif(-10)" title="-10">▼</button>
                    </div>
                  </div>
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

                <!-- E-mail avec bouton mailto et validation -->
                <div class="form-row">
                  <label>E-mail</label>
                  <div class="input-with-action-container">
                    <div class="input-with-action">
                      <input 
                        v-model.trim="form.email" 
                        type="email" 
                        placeholder="exemple@domaine.fr" 
                        class="form-input"
                        :class="{ 'input-error': emailErreur }" 
                      />
                      <a 
                        v-if="form.email && !emailErreur" 
                        :href="'mailto:' + form.email" 
                        class="btn-action btn-mail" 
                        title="Envoyer un e-mail"
                      >
                        ✉️ Écrire
                      </a>
                    </div>
                    <p v-if="emailErreur" class="error-msg">⚠️ Adresse e-mail invalide</p>
                  </div>
                </div>

                <!-- Téléphone avec formatage, bouton d'appel et validation -->
                <div class="form-row">
                  <label>Téléphone</label>
                  <div class="input-with-action-container">
                    <div class="input-with-action">
                      <input 
                        :value="form.telephone" 
                        @input="formatTelephone" 
                        type="tel" 
                        placeholder="06 12 34 56 78 ou +33 6 12 34 56 78" 
                        class="form-input" 
                        :class="{ 'input-error': telErreur }"
                      />
                      <a 
                        v-if="form.telephone && !telErreur" 
                        :href="telCleanUrl" 
                        class="btn-action btn-call" 
                        title="Appeler ce numéro"
                      >
                        📞 Appeler
                      </a>
                    </div>
                    <p v-if="telErreur" class="error-msg">⚠️ Numéro invalide</p>
                  </div>
                </div>
              </fieldset>

              <!-- Section 4: Notes & Suivi (Clic sur le texte pour agrandir) -->
              <fieldset class="form-section">
                <legend 
                  @click.stop="modeGrandesNotes = true" 
                  class="legend-clickable" 
                  title="Cliquer pour agrandir les notes"
                >
                  Notes & Suivi
                </legend>
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
            <button type="button" @click="fermerDetail" class="btn-primary">Fermer</button>
          </footer>
        </template>

      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="patientASupprimer" class="modal-backdrop" @click.self="patientASupprimer = null">
      <div class="modal-box-delete">
        <h3>Supprimer le patient ?</h3>
        <p>Êtes-vous sûr de vouloir supprimer <strong>{{ formerNomComplet(patientASupprimer) }}</strong> ? Cette action est irréversible.</p>
        <div class="modal-actions">
          <button type="button" @click="patientASupprimer = null" class="btn-cancel">Annuler</button>
          <button type="button" @click="confirmerSuppression" class="btn-confirm-delete">Supprimer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { db } from '../db.js'

// 1. Récupération de l'ID du projet actif
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

// État d'affichage de la fenêtre agrandie des notes
const modeGrandesNotes = ref(false)

// --- DONNÉES POUR LES MENUS DÉROULANTS DE DATE DE NAISSANCE ---
const jourNaissance = ref('')
const moisNaissance = ref('')
const anneeNaissance = ref('')

const jours = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
const mois = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' }
]
const anneeActuelle = new Date().getFullYear()
const annees = Array.from({ length: 110 }, (_, i) => String(anneeActuelle - i))

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

// --- VALIDATION ET SYNCHRO DATE DE NAISSANCE ---
const dateErreur = computed(() => {
  if (!jourNaissance.value || !moisNaissance.value || !anneeNaissance.value) return false
  const j = parseInt(jourNaissance.value, 10)
  const m = parseInt(moisNaissance.value, 10) - 1
  const a = parseInt(anneeNaissance.value, 10)
  const dateObj = new Date(a, m, j)
  return !(dateObj.getFullYear() === a && dateObj.getMonth() === m && dateObj.getDate() === j)
})

watch([jourNaissance, moisNaissance, anneeNaissance], () => {
  if (verrouillageMaj) return
  if (jourNaissance.value && moisNaissance.value && anneeNaissance.value && !dateErreur.value) {
    form.dateNaissance = `${anneeNaissance.value}-${moisNaissance.value}-${jourNaissance.value}`
  } else {
    form.dateNaissance = ''
  }
})

// --- GESTION DU TARIF PAR PAS DE 10 ---
const ajusterTarif = (delta) => {
  const val = Number(form.tarifParDefaut) || 0
  form.tarifParDefaut = Math.max(0, val + delta)
}

// --- FORMATAGE ET VALIDATION DU TÉLÉPHONE ---
const formatTelephone = (event) => {
  let raw = event.target.value.replace(/[^\d+]/g, '')
  if (raw.startsWith('+33')) {
    let rest = raw.slice(3).replace(/\D/g, '').slice(0, 9)
    let formatted = '+33'
    if (rest.length > 0) formatted += ' ' + rest[0]
    let pairs = rest.slice(1).match(/.{1,2}/g) || []
    if (pairs.length > 0) formatted += ' ' + pairs.join(' ')
    form.telephone = formatted
  } else {
    let digits = raw.replace(/\D/g, '').slice(0, 10)
    let pairs = digits.match(/.{1,2}/g) || []
    form.telephone = pairs.join(' ')
  }
}

const telErreur = computed(() => {
  if (!form.telephone) return false
  const clean = form.telephone.replace(/\s/g, '')
  const regex = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/
  return !regex.test(clean)
})

const telCleanUrl = computed(() => {
  if (!form.telephone) return '#'
  return 'tel:' + form.telephone.replace(/\s/g, '')
})

// --- VALIDATION EMAIL ---
const emailErreur = computed(() => {
  if (!form.email) return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return !regex.test(form.email)
})

// --- CALCUL DU SOLDE ---
const calculerSoldePatient = (patientId, tarifParDefaut) => {
  const seancesPatient = seances.value.filter(s => String(s.patientId) === String(patientId))
  const totalPaye = seancesPatient.reduce((acc, s) => acc + (Number(s.montant) || 0), 0)
  const tarif = Number(tarifParDefaut ?? 60.0)
  const totalDu = seancesPatient.length * tarif
  return totalPaye - totalDu
}

// 2. Chargement des données filtrées selon le projet actif
const chargerDonnees = async () => {
  const tousLesPatients = await db.patients.toArray()
  const toutesLesSeances = await db.seances.toArray()

  seances.value = toutesLesSeances.filter(s => String(s.projectId) === String(props.projectId))

  const patientsFiltresProjet = tousLesPatients.filter(p => String(p.projectId) === String(props.projectId))
  
  patients.value = patientsFiltresProjet.map(p => ({
    ...p,
    solde: calculerSoldePatient(p.id, p.tarifParDefaut)
  }))
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
  modeGrandesNotes.value = false
  patientSelectionne.value = p

  if (p.dateNaissance && p.dateNaissance.includes('-')) {
    const [a, m, j] = p.dateNaissance.split('-')
    jourNaissance.value = j ? j.padStart(2, '0') : ''
    moisNaissance.value = m ? m.padStart(2, '0') : ''
    anneeNaissance.value = a || ''
  } else if (p.dateNaissance && p.dateNaissance.includes('/')) {
    const [j, m, a] = p.dateNaissance.split('/')
    jourNaissance.value = j ? j.padStart(2, '0') : ''
    moisNaissance.value = m ? m.padStart(2, '0') : ''
    anneeNaissance.value = a || ''
  } else {
    jourNaissance.value = ''
    moisNaissance.value = ''
    anneeNaissance.value = ''
  }

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

  nextTick(() => {
    verrouillageMaj = false
  })
}

const fermerDetail = () => {
  patientSelectionne.value = null
  modeGrandesNotes.value = false
}

// Enregistrement réactif automatique
watch(form, async (nouveauForm) => {
  if (verrouillageMaj || !nouveauForm.id) return

  const payload = {
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
  }

  await db.patients.update(nouveauForm.id, payload)

  const idx = patients.value.findIndex(p => p.id === nouveauForm.id)
  if (idx !== -1) {
    const updated = { ...patients.value[idx], ...payload }
    updated.solde = calculerSoldePatient(updated.id, updated.tarifParDefaut)
    patients.value[idx] = updated
  }
}, { deep: true })

// 3. Création d'un nouveau patient
const ajouterPatient = async () => {
  const count = patients.value.length
  const newId = await db.patients.add({
    projectId: props.projectId,
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
    fermerDetail()
  }
  await db.patients.delete(id)
  patientASupprimer.value = null
  await chargerDonnees()
}

const seancesPatientForm = computed(() => {
  if (!form.id) return []
  return seances.value.filter(s => String(s.patientId) === String(form.id))
})

const soldeForm = computed(() => {
  return calculerSoldePatient(form.id, form.tarifParDefaut)
})

const couleurSoldeForm = computed(() => calculerCouleurSolde(soldeForm.value))

const texteSoldeForm = computed(() => {
  const s = soldeForm.value
  if (s > 0.001) return `${s.toFixed(2)} € (avance)`
  if (s < -0.001) return `${Math.abs(s).toFixed(2)} € (dû)`
  return '0,00 € (Équilibre)'
})

// 4. Rechargement si le projet change
watch(() => props.projectId, () => {
  fermerDetail()
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.patient-card-item:hover {
  border-color: #2563eb;
  background-color: #f8fafc;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
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
  transition: max-width 0.2s ease, height 0.2s ease;
}

/* Modale agrandie pour les grandes notes */
.patient-modal-box.modal-expanded {
  max-width: 850px;
  height: 80vh;
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

.header-with-back {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-back {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-back:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
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

/* Corps agrandi pour le mode Notes */
.modal-body-expanded {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.textarea-expanded {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 300px;
  font-size: 15px;
  line-height: 1.6;
  padding: 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  resize: vertical;
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

/* Légende cliquable */
.legend-clickable {
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.15s, transform 0.1s; /* Ajout de la transition de transformation */
}

.legend-clickable:hover {
  color: #2563eb;
  text-decoration: underline; /* Indique encore plus clairement le lien cliquable */
}

/* Effet "pression" au clic */
.legend-clickable:active {
  transform: scale(0.97);
}

.expand-badge {
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 2px 6px;
  border-radius: 4px;
}

.form-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.form-row label {
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  width: 160px;
  flex-shrink: 0;
  padding-top: 8px;
}

.form-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-input:focus {
  border-color: #2563eb;
}

/* --- SÉLECTEURS DE DATE (Naissance) --- */
.date-selects-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-selects {
  display: flex;
  gap: 8px;
  width: 100%;
}

.select-field {
  flex: 1;
  padding: 8px 6px;
  cursor: pointer;
}

/* --- STEPPER DU TARIF --- */
.montant-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 140px;
  width: 100%;
}

.number-input {
  width: 100%;
  padding-right: 28px;
  text-align: right;
  -moz-appearance: textfield;
}

.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.stepper-buttons {
  position: absolute;
  right: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.btn-step {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  width: 20px;
  height: 13px;
  font-size: 7px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  padding: 0;
}

.btn-step:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* --- BOUTONS D'ACTION (E-MAIL ET APPEL) --- */
.input-with-action-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-with-action {
  display: flex;
  gap: 8px;
  width: 100%;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s, border-color 0.15s;
}

.btn-mail {
  background-color: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.btn-mail:hover {
  background-color: #bae6fd;
}

.btn-call {
  background-color: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.btn-call:hover {
  background-color: #bbf7d0;
}

/* --- GESTION DES ERREURS --- */
.input-error {
  border-color: #ef4444 !important;
  background-color: #fef2f2;
}

.error-msg {
  font-size: 12px;
  color: #ef4444;
  margin: 2px 0 0 0;
  font-weight: 500;
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
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
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