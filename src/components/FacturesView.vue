<template>
  <div class="factures-container">
    <!-- BARRE D'ÉDITION DE FACTURE -->
    <div class="card form-card">
      <h2>Génération de Note d'honoraires</h2>

      <!-- 1. Numéro & Date -->
      <div class="form-row gap-20">
        <div class="form-group">
          <label>Numéro de facture</label>
          <input type="text" v-model="numeroFacture" class="form-input w-200" />
        </div>
        <div class="form-group">
          <label>Date d'émission</label>
          <input type="date" v-model="dateEmission" class="form-input" />
        </div>
      </div>

      <hr class="divider" />

      <!-- 2. Sélection du Patient -->
      <div class="section-block">
        <h3>Patient</h3>
        <div class="form-row gap-16">
          <select v-model="patientSelectionneId" @change="onPatientSelect" class="form-input flex-1">
            <option :value="null">— Sélectionner dans la liste —</option>
            <option v-for="pat in patients" :key="pat.id" :value="pat.id">
              {{ pat.nom }} {{ pat.prenom }}
            </option>
          </select>
          <input 
            type="text" 
            v-model="recherchePatient" 
            placeholder="Saisir ou modifier un nom..." 
            class="form-input flex-1" 
          />
        </div>

        <!-- Informations Récupérées du Patient -->
        <div class="info-box mt-12">
          <div class="info-box-title">Informations récupérées :</div>
          <div v-if="patientAssocie">
            <p><strong>Nom :</strong> {{ patientAssocie.nom }} {{ patientAssocie.prenom }}</p>
            <p><strong>Adresse :</strong> {{ patientAssocie.adresseLigne1 || 'Non renseignée' }} {{ patientAssocie.adresseLigne2 || '' }}</p>
            <p><strong>E-mail :</strong> {{ patientAssocie.email || 'Non renseigné' }}</p>
            <p><strong>Téléphone :</strong> {{ patientAssocie.telephone || 'Non renseigné' }}</p>
            <p><strong>Tarif par défaut :</strong> {{ (patientAssocie.tarifParDefaut || 60).toFixed(2) }} €</p>
          </div>
          <div v-else class="text-muted">
            Saisie libre (aucun patient enregistré lié).
          </div>
        </div>
      </div>

      <hr class="divider" />

      <!-- 3. Prestations incluses -->
      <div class="section-block">
        <div class="section-header-row">
          <h3>Séances / Prestations incluses</h3>
          <button @click="ajouterLigne" class="btn-secondary">+ Ajouter une séance</button>
        </div>

        <div class="lignes-list">
          <div v-for="(ligne, index) in lignesFacture" :key="ligne.id" class="ligne-item-card">
            
            <!-- GRILLE DU HAUT : Date et Description uniquement -->
            <div class="ligne-grid-top">
              <div class="form-group">
                <label>Date séance</label>
                <input type="date" v-model="ligne.date" class="form-input" />
              </div>

              <div class="form-group flex-2">
                <label>Description de la prestation</label>
                <select 
                  v-model="ligne.description" 
                  @change="handleDescriptionSelectChange($event, index)"
                  class="form-input"
                >
                  <option v-for="desc in descriptionsPredefinies" :key="desc" :value="desc">
                    {{ desc }}
                  </option>
                  <option value="__CREER_NOUVELLE__">➕ Créer une nouvelle description...</option>
                  <option value="__GERER__">⚙️ Supprimer / modifier une description...</option>
                </select>
              </div>

              <button 
                v-if="lignesFacture.length > 1" 
                @click="supprimerLigne(index)" 
                class="btn-icon-danger" 
                title="Supprimer la ligne"
              >
                🗑️
              </button>
            </div>

            <!-- GRILLE DU BAS : Montant HT déplacé à gauche, suivi du Paiement -->
            <div class="ligne-grid-bottom">
                <div class="form-group">
                <label>Montant HT (€)</label>
                <div class="montant-stepper-container">
                  <button type="button" @click="ajusterMontantLigne(ligne, -10)" class="btn-stepper">-</button>
                  <input type="number" step="0.01" v-model.number="ligne.montantHT" class="form-input text-center w-100" />
                  <button type="button" @click="ajusterMontantLigne(ligne, 10)" class="btn-stepper">+</button>
                </div>
              </div>

              <div class="form-group">
                <label>Mode de paiement</label>
                <select v-model="ligne.moyenPaiement" class="form-input text-center">
                  <option v-for="mode in modesPaiement" :key="mode" :value="mode">{{ mode }}</option>
                </select>
              </div>

              <div class="form-group">
                <label>Date de paiement</label>
                <input type="date" v-model="ligne.datePaiement" class="form-input" />
              </div>
            </div>

          </div>
        </div>
      </div>

      <hr class="divider" />

      <!-- 4. Informations Professionnelles -->
      <div class="section-block">
        <div class="section-header-row">
          <h3>Informations Professionnelles</h3>
          <button @click="afficherModalEditionPro = true" class="btn-secondary">Modifier</button>
        </div>

        <div class="info-box">
          <p><strong>{{ proNom }}</strong> - {{ proFonction }}</p>
          <p>{{ proAdresse }}</p>
          <p>{{ proTelephone }}</p>
          <p>{{ proEmail }}</p>
          <p>{{ proSiret }}</p>
          <p>{{ proAdeli }}</p>
          <p>{{ proRpps }}</p>
        </div>
      </div>
    </div>

    <!-- BARRE D'ACTION FIXE EN BAS -->
    <div class="bottom-action-bar">
      <button 
        @click="afficherFenetreVisualisation = true" 
        :disabled="!recherchePatient" 
        class="btn-primary-lg"
      >
        👁️ Visualisation & Export PDF
      </button>
    </div>

    <!-- MODALE : ÉDITION PRO -->
    <div v-if="afficherModalEditionPro" class="modal-backdrop">
      <div class="modal-box">
        <header class="modal-header">
          <h3>Informations Professionnelles</h3>
          <button @click="afficherModalEditionPro = false" class="btn-close">✕</button>
        </header>

        <div class="modal-body form-stack">
          <h4>Identité</h4>
          <input type="text" v-model="proNom" placeholder="Nom et prénom" class="form-input" />
          <input type="text" v-model="proFonction" placeholder="Fonction" class="form-input" />

          <h4>Coordonnées</h4>
          <input type="text" v-model="proAdresse" placeholder="Adresse" class="form-input" />
          <input type="text" v-model="proTelephone" placeholder="Téléphone" class="form-input" />
          <input type="email" v-model="proEmail" placeholder="E-mail" class="form-input" />

          <h4>Identifiants professionnels</h4>
          <input type="text" v-model="proSiret" placeholder="N° SIRET" class="form-input" />
          <input type="text" v-model="proAdeli" placeholder="N° ADELI" class="form-input" />
          <input type="text" v-model="proRpps" placeholder="N° RPPS" class="form-input" />
        </div>

        <footer class="modal-footer">
          <button @click="sauvegarderInfosPro" class="btn-primary">Enregistrer</button>
        </footer>
      </div>
    </div>

    <!-- MODALE : CRÉATION DESCRIPTION -->
    <div v-if="afficherModalCreationDescription" class="modal-backdrop">
      <div class="modal-box">
        <header class="modal-header">
          <h3>Nouvelle description</h3>
          <button @click="afficherModalCreationDescription = false" class="btn-close">✕</button>
        </header>

        <div class="modal-body">
          <label>Libellé de la prestation</label>
          <input 
            type="text" 
            v-model="nouvelleDescriptionTexte" 
            placeholder="Ex : Bilan psychologique complet..." 
            class="form-input mt-6" 
          />
        </div>

        <footer class="modal-footer gap-10">
          <button @click="afficherModalCreationDescription = false" class="btn-secondary">Annuler</button>
          <button @click="ajouterNouvelleDescription" :disabled="!nouvelleDescriptionTexte.trim()" class="btn-primary">
            Ajouter
          </button>
        </footer>
      </div>
    </div>

    <!-- MODALE : GESTION DES DESCRIPTIONS -->
    <div v-if="afficherModalGestionDescriptions" class="modal-backdrop">
      <div class="modal-box">
        <header class="modal-header">
          <h3>Gérer les descriptions</h3>
          <button @click="afficherModalGestionDescriptions = false" class="btn-close">✕</button>
        </header>

        <div class="modal-body descriptions-manage-list">
          <div v-for="desc in descriptionsPredefinies" :key="desc" class="desc-manage-item">
            <template v-if="descriptionEnEdition === desc">
              <input type="text" v-model="texteModifie" class="form-input flex-1" />
              <button @click="sauvegarderModificationDescription(desc)" class="btn-primary-sm">Valider</button>
            </template>
            <template v-else>
              <span>{{ desc }}</span>
              <div class="desc-actions">
                <button @click="commencerEditionDesc(desc)" class="btn-secondary-sm">Modifier</button>
                <button @click="supprimerDescription(desc)" class="btn-danger-sm">🗑️</button>
              </div>
            </template>
          </div>
        </div>

        <footer class="modal-footer">
          <button @click="afficherModalGestionDescriptions = false" class="btn-primary">Terminer</button>
        </footer>
      </div>
    </div>

    <!-- MODALE : APERÇU / IMPRESSION PDF (Strict A4 Format) -->
    <div v-if="afficherFenetreVisualisation" class="modal-backdrop overflow-auto">
      <div class="modal-box preview-modal-box">
        <header class="modal-header no-print">
          <h3>Aperçu de la Note d'honoraires</h3>
          <div class="header-actions">
            <button @click="imprimerA4" class="btn-primary">🖨️ Partager / Imprimer</button>
            <button @click="afficherFenetreVisualisation = false" class="btn-close">✕</button>
          </div>
        </header>

        <!-- FEUILLE STRICTE A4 -->
        <div class="a4-page-container">
          <div class="a4-page" id="facture-a4">
            <!-- En-tête -->
            <div class="a4-header">
              <div class="a4-header-right">
                <div class="a4-title">
                  <span>Note d'honoraires</span>
                  <span>N° {{ numeroFacture }}</span>
                </div>
                <div class="a4-date">
                  <strong>Date :</strong> {{ formaterDateFr(dateEmission) }}
                </div>
              </div>
            </div>

            <!-- Double bloc Émetteur / Destinataire -->
            <div class="a4-grid-2col">
              <div class="a4-col-box">
                <p><strong>{{ proNom }}</strong> - {{ proFonction }}</p>
                <p>{{ proAdresse }}</p>
                <p>Tel : {{ proTelephone }}</p>
                <p>e-mail : {{ proEmail }}</p>
                <div class="spacer-10"></div>
                <p>{{ proSiret }}</p>
                <p>{{ proAdeli }}</p>
                <p>{{ proRpps }}</p>
              </div>

              <div class="a4-col-box border-left">
                <template v-if="patientAssocie">
                  <p><strong>{{ patientAssocie.nom }} {{ patientAssocie.prenom }}</strong></p>
                  <p>{{ patientAssocie.adresseLigne1 || 'Adresse inconnue' }}</p>
                  <p v-if="patientAssocie.adresseLigne2">{{ patientAssocie.adresseLigne2 }}</p>
                  <p>e-mail : {{ patientAssocie.email || 'Adresse inconnue' }}</p>
                  <p>téléphone : {{ patientAssocie.telephone || 'Adresse inconnue' }}</p>
                </template>
                <template v-else>
                  <p><strong>{{ recherchePatient || 'Nom inconnu' }}</strong></p>
                  <p>Adresse inconnue</p>
                  <p>e-mail : Adresse inconnue</p>
                  <p>téléphone : Adresse inconnue</p>
                </template>
              </div>
            </div>

            <!-- Tableau des Prestations -->
            <div class="a4-table-box">
              <div class="a4-table-header">
                <div class="col-date">Date de la séance</div>
                <div class="col-desc">Description</div>
                <div class="col-montant">Montant HT</div>
              </div>

              <div class="a4-table-body">
                <div v-for="line in lignesFacture" :key="line.id" class="a4-table-row">
                  <div class="col-date">{{ formaterDateFr(line.date) }}</div>
                  <div class="col-desc">{{ line.description }}</div>
                  <div class="col-montant">{{ (line.montantHT || 0).toFixed(2) }} €</div>
                </div>
              </div>
            </div>

            <!-- Bas de page : Mentions & Totaux -->
            <div class="a4-footer-row">
              <div class="a4-paiement-info">
                <span v-if="lignesFacture.length > 0">
                  <strong>payé par {{ lignesFacture[0].moyenPaiement?.toLowerCase() }} le {{ formaterDateFr(lignesFacture[0].datePaiement) }}</strong>
                </span>
              </div>

              <div class="a4-totaux-box">
                <div class="totaux-row ht">
                  <span class="label">HT</span>
                  <span class="value">{{ totalGlobal.toFixed(2) }} €</span>
                </div>
                <div class="totaux-row ttc">
                  <span class="label">TOTAL TTC</span>
                  <span class="value">{{ totalGlobal.toFixed(2) }} €</span>
                </div>

                <div class="a4-mentions-legales">
                  <p>Exonéré de TVA au titre de l'article 261-4-1° du</p>
                  <p>Code Général des Impôts</p>
                </div>
              </div>
            </div>

            <!-- Zone de Signature -->
            <div class="a4-signature-box">
            <p class="sig-name">{{ proNom }}</p>
            <img src="/signNOIR Dodo.png" alt="Signature" class="sig-image" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { db } from '../db.js'

// 1. Déclaration de la prop projectId transmise par le composant parent
const props = defineProps({
  projectId: {
    type: [Number, String],
    required: true
  }
})

const patients = ref([])
const patientSelectionneId = ref(null)
const recherchePatient = ref('')

const numeroFacture = ref('FAC-' + String(Math.floor(Math.random() * 9000) + 1000))
const dateEmission = ref(new Date().toISOString().substring(0, 10))

const modesPaiement = ['CB', 'Espèces', 'Chèque', 'Virement']

// Infos Pro Stockées
const proNom = ref(localStorage.getItem('proNom') || 'Dorothée Chapelain')
const proFonction = ref(localStorage.getItem('proFonction') || 'Psychologue')
const proAdresse = ref(localStorage.getItem('proAdresse') || 'adresse')
const proTelephone = ref(localStorage.getItem('proTelephone') || 'Tel : __ __ __ __ __')
const proEmail = ref(localStorage.getItem('proEmail') || 'email : ______________')
const proSiret = ref(localStorage.getItem('proSiret') || 'N° SIRET : ___ ___ ___ _____')
const proAdeli = ref(localStorage.getItem('proAdeli') || 'N° ADELI : _________')
const proRpps = ref(localStorage.getItem('proRpps') || 'N° RPPS : ___________')

// Listes des descriptions
const defaultDescriptions = "Nouvel entretien psychologique 1h|Suivi psychologique 45 min|Séance guidance parentale 1h|Enfant/adolescent 1ère séance de psychologie 1h|Enfant/Adolescent Suivi psychologique 30min à 1h"
const customDescriptionsStockees = ref(localStorage.getItem('customDescriptionsList') || defaultDescriptions)

const descriptionsPredefinies = computed(() => {
  return customDescriptionsStockees.value.split('|').filter(d => d.trim() !== '')
})

const ajusterMontantLigne = (ligne, valeur) => {
  let actuel = Number(ligne.montantHT) || 0
  ligne.montantHT = Math.max(0, Number((actuel + valeur).toFixed(2)))
}

// Lignes de facture
const createLigneDefault = () => ({
  id: Date.now() + Math.random(),
  date: new Date().toISOString().substring(0, 10),
  description: descriptionsPredefinies.value[0] || 'Suivi psychologique 45 min',
  montantHT: 60.0,
  moyenPaiement: 'CB',
  datePaiement: new Date().toISOString().substring(0, 10)
})

const lignesFacture = ref([createLigneDefault()])

// Modales & États
const afficherModalEditionPro = ref(false)
const afficherFenetreVisualisation = ref(false)
const afficherModalCreationDescription = ref(false)
const afficherModalGestionDescriptions = ref(false)

const indexLigneEnEditionDescription = ref(null)
const nouvelleDescriptionTexte = ref('')
const descriptionEnEdition = ref(null)
const texteModifie = ref('')

// 2. Charger les patients du projet actif depuis Dexie IndexedDB
const chargerPatients = async () => {
  const tousLesPatients = await db.patients.toArray()
  patients.value = tousLesPatients.filter(p => p.projectId === props.projectId)
}

const patientAssocie = computed(() => {
  if (!recherchePatient.value) return null
  return patients.value.find(p => {
    const nomComplet = `${p.nom} ${p.prenom}`.toLowerCase()
    return nomComplet === recherchePatient.value.trim().toLowerCase()
  })
})

const onPatientSelect = () => {
  const pat = patients.value.find(p => p.id === patientSelectionneId.value)
  if (pat) {
    recherchePatient.value = `${pat.nom} ${pat.prenom}`
    patientSelectionneId.value = null
  }
}

const totalGlobal = computed(() => {
  return lignesFacture.value.reduce((sum, line) => sum + (Number(line.montantHT) || 0), 0)
})

const ajouterLigne = () => {
  const defaultTarif = patientAssocie.value?.tarifParDefaut || 60.0
  const line = createLigneDefault()
  line.montantHT = defaultTarif
  lignesFacture.value.push(line)
}

const supprimerLigne = (index) => {
  if (lignesFacture.value.length > 1) {
    lignesFacture.value.splice(index, 1)
  }
}

const handleDescriptionSelectChange = (event, index) => {
  const val = event.target.value
  if (val === '__CREER_NOUVELLE__') {
    indexLigneEnEditionDescription.value = index
    afficherModalCreationDescription.value = true
    // Rétablir la valeur précédente temporairement
    lignesFacture.value[index].description = descriptionsPredefinies.value[0]
  } else if (val === '__GERER__') {
    afficherModalGestionDescriptions.value = true
    lignesFacture.value[index].description = descriptionsPredefinies.value[0]
  }
}

const ajouterNouvelleDescription = () => {
  const txt = nouvelleDescriptionTexte.value.trim()
  if (txt) {
    let list = customDescriptionsStockees.value.split('|')
    if (!list.includes(txt)) {
      list.push(txt)
      customDescriptionsStockees.value = list.join('|')
      localStorage.setItem('customDescriptionsList', customDescriptionsStockees.value)
    }
    if (indexLigneEnEditionDescription.value !== null) {
      lignesFacture.value[indexLigneEnEditionDescription.value].description = txt
    }
  }
  nouvelleDescriptionTexte.value = ''
  afficherModalCreationDescription.value = false
}

const commencerEditionDesc = (desc) => {
  descriptionEnEdition.value = desc
  texteModifie.value = desc
}

const sauvegarderModificationDescription = (ancienne) => {
  const txt = texteModifie.value.trim()
  if (txt) {
    let list = customDescriptionsStockees.value.split('|')
    const idx = list.indexOf(ancienne)
    if (idx !== -1) {
      list[idx] = txt
      customDescriptionsStockees.value = list.join('|')
      localStorage.setItem('customDescriptionsList', customDescriptionsStockees.value)
    }
  }
  descriptionEnEdition.value = null
}

const supprimerDescription = (desc) => {
  let list = customDescriptionsStockees.value.split('|')
  list = list.filter(d => d !== desc)
  customDescriptionsStockees.value = list.join('|')
  localStorage.setItem('customDescriptionsList', customDescriptionsStockees.value)
}

const sauvegarderInfosPro = () => {
  localStorage.setItem('proNom', proNom.value)
  localStorage.setItem('proFonction', proFonction.value)
  localStorage.setItem('proAdresse', proAdresse.value)
  localStorage.setItem('proTelephone', proTelephone.value)
  localStorage.setItem('proEmail', proEmail.value)
  localStorage.setItem('proSiret', proSiret.value)
  localStorage.setItem('proAdeli', proAdeli.value)
  localStorage.setItem('proRpps', proRpps.value)
  afficherModalEditionPro.value = false
}

const formaterDateFr = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR')
}

const imprimerA4 = () => {
  window.print()
}

// 3. Réinitialisation des champs et rechargement des patients lors du changement de projet
watch(() => props.projectId, () => {
  recherchePatient.value = ''
  patientSelectionneId.value = null
  afficherFenetreVisualisation.value = false
  chargerPatients()
})

onMounted(() => {
  chargerPatients()
})
</script>

<style scoped>
/* ==========================================
   1. STRUCTURE & CONTENEURS GLOBAUX
   ========================================== */
.factures-container {
  padding-bottom: 80px;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-card h2 {
  font-size: 20px;
  font-weight: 700;
}

.form-row {
  display: flex;
  align-items: center;
}

.divider {
  border: none;
  border-top: 1px solid #e2e8f0;
}

.section-block h3 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

/* ==========================================
   2. FORMULAIRES & INPUTS
   ========================================== */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.text-center {
  text-align: center;
  text-align-last: center;
}

/* Masquer les flèches des inputs numériques */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}

/* ==========================================
   3. LIGNES DE FACTURE & GRILLES
   ========================================== */
.lignes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ligne-item-card {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ligne-grid-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Grille du bas : Montant, Mode, Date de paiement */
.ligne-grid-bottom {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 40px;
  margin-top: 12px;
  align-items: start;
}

.ligne-grid-bottom .form-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ligne-grid-bottom .form-group label {
  text-align: center;
  width: 100%;
  margin-bottom: 4px;
}

.ligne-grid-bottom .form-input,
.ligne-grid-bottom .montant-stepper-container {
  width: 80%;
}

.ligne-grid-bottom input,
.ligne-grid-bottom select {
  padding: 6px 12px;
}

/* ==========================================
   4. COMPOSANTS SPÉCIFIQUES (Stepper)
   ========================================== */
.montant-stepper-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-stepper {
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-stepper:hover {
  background-color: #e2e8f0;
}

/* ==========================================
   5. BOÎTES D'INFORMATION & ACTIONS
   ========================================== */
.info-box {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  color: #334155;
  line-height: 1.5;
}

.info-box-title {
  font-weight: 700;
  color: #64748b;
  margin-bottom: 4px;
}

.bottom-action-bar {
  position: fixed;
  bottom: 0;
  left: 290px;
  right: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-top: 1px solid #e2e8f0;
  padding: 12px 24px;
  display: flex;
  justify-content: center;
  z-index: 10;
}

/* ==========================================
   6. BOUTONS
   ========================================== */
.btn-secondary {
  padding: 6px 12px;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-secondary:hover { 
  background-color: #f1f5f9; 
}

.btn-primary-lg {
  padding: 10px 24px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary-lg:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.btn-icon-danger {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  margin-top: 16px;
}

.btn-primary-sm {
  padding: 4px 8px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
}

.btn-secondary-sm {
  padding: 4px 8px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 12px;
}

.btn-danger-sm {
  background: none;
  border: none;
  cursor: pointer;
}

/* ==========================================
   7. MODALES & GESTION DES DESCRIPTIONS
   ========================================== */
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-stack h4 {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
}

.descriptions-manage-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.desc-manage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #f8fafc;
  border-radius: 6px;
  font-size: 13px;
}

.desc-actions {
  display: flex;
  gap: 6px;
}

/* ==========================================
   8. APERÇU A4 & IMPRESSION
   ========================================== */
.preview-modal-box {
  max-width: 700px !important;
  width: 95% !important;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.a4-page-container {
  display: flex;
  justify-content: center;
  background-color: #f1f5f9;
  padding: 20px;
  border-radius: 8px;
  max-height: 75vh;
  overflow-y: auto;
}

.a4-page {
  width: 575px;
  min-height: 800px;
  background: white;
  padding: 30px;
  border: 2px solid #0d0d0d;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  color: #0d0d0d;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.a4-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.a4-title {
  font-size: 22px;
  font-weight: 800;
  display: flex;
  gap: 12px;
}

.a4-date {
  font-size: 13px;
  text-align: right;
  margin-top: 4px;
}

.a4-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1.5px solid #0d0d0d;
  min-height: 130px;
  margin-bottom: 20px;
}

.a4-col-box {
  padding: 10px;
  font-size: 11px;
  line-height: 1.4;
}

.a4-col-box.border-left {
  border-left: 1px solid #0d0d0d;
}

.spacer-10 { height: 10px; }

.a4-table-box {
  border: 1.5px solid #0d0d0d;
  margin-bottom: 15px;
}

.a4-table-header {
  display: flex;
  background-color: #eaeaea;
  font-size: 11px;
  font-weight: 700;
  border-bottom: 1px solid #0d0d0d;
  height: 28px;
  align-items: center;
}

.col-date { width: 130px; text-align: center; border-right: 1px solid #0d0d0d; }
.col-desc { flex: 1; padding-left: 8px; border-right: 1px solid #0d0d0d; }
.col-montant { width: 110px; text-align: center; }

.a4-table-body {
  min-height: 180px;
}

.a4-table-row {
  display: flex;
  font-size: 11px;
  height: 28px;
  align-items: center;
  border-bottom: 1px dashed #e2e8f0;
}

.a4-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 10px;
}

.a4-paiement-info {
  font-size: 11px;
}

.a4-totaux-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.totaux-row {
  display: flex;
  border: 1.5px solid #0d0d0d;
  font-size: 11px;
  height: 24px;
  align-items: center;
}

.totaux-row .label {
  width: 80px;
  text-align: center;
  border-right: 1px solid #0d0d0d;
}

.totaux-row .value {
  width: 100px;
  text-align: center;
}

.totaux-row.ttc {
  border-width: 2.5px;
  font-weight: 800;
  font-size: 12px;
}

.totaux-row.ttc .label { width: 120px; }

.a4-mentions-legales {
  font-size: 9px;
  color: #475569;
  text-align: right;
  line-height: 1.3;
}

.a4-signature-box {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.sig-name {
  font-size: 12px;
  font-weight: 600;
}

.sig-image {
  width: 140px;
  height: 60px;
  object-fit: contain;
}

/* ==========================================
   9. UTILITAIRES & MEDIA QUERIES (PRINT)
   ========================================== */
.gap-20 { gap: 20px; }
.gap-16 { gap: 16px; }
.gap-10 { gap: 10px; }
.mt-12 { margin-top: 12px; }
.mt-6 { margin-top: 6px; }
.flex-1 { flex: 1; }
.flex-2 { flex: 2; }
.w-200 { width: 200px; }
.w-100 { width: 100px; }
.text-muted { color: #94a3b8; }

@media print {
  body * {
    visibility: hidden;
  }

  .no-print {
    display: none !important;
  }

  #facture-a4, #facture-a4 * {
    visibility: visible;
  }

  #facture-a4 {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: none;
    box-shadow: none;
  }
}
</style>