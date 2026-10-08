<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import LockScreen from './components/LockScreen.vue'
import AccueilView from './components/AccueilView.vue'
import PatientsView from './components/PatientsView.vue'
import RecapPatientsView from './components/RecapPatientsView.vue'
import SeancesView from './components/SeancesView.vue'
import FacturesView from './components/FacturesView.vue'
import UrssafView from './components/UrssafView.vue'

// --- État d'authentification ---
const isAuthenticated = ref(false)
const requirePasswordOnLaunch = ref(localStorage.getItem('app_require_password_on_launch') === 'true')

// --- Gestion du mot de passe ---
const showPasswordModal = ref(false)
const isOldPasswordVerified = ref(false) // Validation de l'ancien mot de passe
const oldPasswordInput = ref('')
const newPasswordInput = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')

// Visibilité des mots de passe (icône œil)
const showOldPassword = ref(false)
const showNewPassword = ref(false)

const getCurrentPassword = () => {
  return localStorage.getItem('app_password') || 'dodo'
}

const openChangePasswordModal = () => {
  oldPasswordInput.value = ''
  newPasswordInput.value = ''
  isOldPasswordVerified.value = false
  passwordError.value = ''
  passwordSuccess.value = ''
  showOldPassword.value = false
  showNewPassword.value = false
  showPasswordModal.value = true
}

// 1. Vérification immédiate de l'ancien mot de passe via le bouton ✔
const verifyOldPassword = () => {
  passwordError.value = ''

  if (!oldPasswordInput.value) {
    passwordError.value = "Veuillez saisir votre mot de passe actuel."
    return
  }

  if (oldPasswordInput.value !== getCurrentPassword()) {
    passwordError.value = "L'ancien mot de passe est incorrect."
    isOldPasswordVerified.value = false
    return
  }

  // Si correct : aucun message d'erreur, et déblocage de la saisie du nouveau mot de passe
  passwordError.value = ''
  isOldPasswordVerified.value = true
}

// 2. Enregistrement du nouveau mot de passe (met à jour localStorage pour LockScreen.vue)
const handlePasswordChange = () => {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (!newPasswordInput.value.trim()) {
    passwordError.value = "Veuillez saisir un nouveau mot de passe."
    return
  }

  // Mise à jour dans le localStorage
  localStorage.setItem('app_password', newPasswordInput.value.trim())
  passwordSuccess.value = "Mot de passe modifié avec succès !"

  setTimeout(() => {
    showPasswordModal.value = false
  }, 2300)
}

const handleAuthenticated = () => {
  isAuthenticated.value = true
  localStorage.setItem('app_authenticated', 'true')
}

watch(requirePasswordOnLaunch, (newVal) => {
  localStorage.setItem('app_require_password_on_launch', newVal.toString())
})

// --- État global de l'interface ---
const currentTab = ref('accueil')
const afficherPreferences = ref(false)
const sidebarReduite = ref(false)
const appKey = ref(0)

const sections = [
  { id: 'accueil', nom: 'Accueil', couleur: '#000000', description: "Vue d'ensemble et accès rapide" },
  { id: 'patients', nom: 'Patients', couleur: '#1fcfc6', description: 'Gestion du répertoire patientèle' },
  { id: 'recapPatients', nom: 'Récap Patients', couleur: '#1f91cf', description: 'Synthèse et statistiques par patient' },
  { id: 'seances', nom: 'Séances', couleur: '#f2cc0f', description: 'Journal des rendez-vous et règlements' },
  { id: 'factures', nom: 'Factures', couleur: '#f27d0f', description: 'Moteur de facturation' },
  { id: 'urssaf', nom: 'URSSAF', couleur: '#34f20f', description: 'Calcul des cotisations par trimestre' }
]

const sectionActuelle = computed(() => {
  return sections.find(s => s.id === currentTab.value)
})

const changerTab = (id) => {
  currentTab.value = id
}

// --- GESTION DES PROJETS ET SAUVEGARDES ---
const projects = ref([])
const activeProjectId = ref(null)
const showProjectModal = ref(false)
const showProjectListDropdown = ref(false)
const showSavesModal = ref(false)

const currentProjectSaves = ref([])
const selectedSaveIds = ref([])

const isSavingBriefly = ref(false)
const savedFeedbackName = ref('')
let saveTimeout = null

const currentProjectName = computed(() => {
  const activeProject = projects.value.find(p => p.id === activeProjectId.value)
  return activeProject?.nom || 'Nom du projet'
})

const projetsFormatted = computed(() => {
  return projects.value.map(p => ({
    id: p.id,
    nom: p.nom || 'Nom du projet'
  }))
})

const lastSaveText = computed(() => {
  if (currentProjectSaves.value.length === 0) {
    return 'Aucune sauvegarde effectuée pour ce projet'
  }
  const latest = currentProjectSaves.value[0]
  if (latest.dateStr) {
    return `Dernière sauvegarde effectuée le ${latest.dateStr}`
  }
  const d = new Date(latest.id)
  const pad = (n) => n.toString().padStart(2, '0')
  const formatted = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} à ${pad(d.getHours())}h${pad(d.getMinutes())}`
  return `Dernière sauvegarde effectuée le ${formatted}`
})

const loadProjectSaves = () => {
  if (!activeProjectId.value) return
  const savesStr = localStorage.getItem(`appli_saves_${activeProjectId.value}`)
  if (savesStr) {
    try {
      currentProjectSaves.value = JSON.parse(savesStr).sort((a, b) => b.id - a.id)
    } catch (e) {
      currentProjectSaves.value = []
    }
  } else {
    currentProjectSaves.value = []
  }
  selectedSaveIds.value = []
}

const loadLatestSave = () => {
  if (currentProjectSaves.value.length > 0) {
    const latest = currentProjectSaves.value[0]
    Object.keys(latest.data).forEach(key => {
      localStorage.setItem(key, latest.data[key])
    })
  }
}

const effectuerSauvegarde = () => {
  if (!activeProjectId.value) return

  const id = activeProjectId.value
  const projName = currentProjectName.value
  const timestamp = Date.now()

  const now = new Date()
  const pad = (n) => n.toString().padStart(2, '0')
  const dateFormatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} à ${pad(now.getHours())}h${pad(now.getMinutes())}`
  const saveName = `Copie de ${projName}-${dateFormatted}`

  const dataToSave = {}
  Object.keys(localStorage).forEach(key => {
    if (key.includes(id.toString()) && !key.startsWith('appli_saves_')) {
      dataToSave[key] = localStorage.getItem(key)
    }
  })

  const newSave = {
    id: timestamp,
    name: saveName,
    dateStr: dateFormatted,
    data: dataToSave
  }

  currentProjectSaves.value.unshift(newSave)
  localStorage.setItem(`appli_saves_${id}`, JSON.stringify(currentProjectSaves.value))

  savedFeedbackName.value = saveName
  isSavingBriefly.value = true

  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    isSavingBriefly.value = false
    savedFeedbackName.value = ''
  }, 2000)
}

const rechargerSave = (save) => {
  if (confirm(`Voulez-vous recharger « ${save.name} » ? Toutes les modifications non sauvegardées seront perdues.`)) {
    Object.keys(save.data).forEach(key => {
      localStorage.setItem(key, save.data[key])
    })
    appKey.value++
    showSavesModal.value = false
  }
}

const isAllSavesSelected = computed(() => {
  return currentProjectSaves.value.length > 0 && selectedSaveIds.value.length === currentProjectSaves.value.length
})

const toggleSelectAllSaves = () => {
  if (isAllSavesSelected.value) {
    selectedSaveIds.value = []
  } else {
    selectedSaveIds.value = currentProjectSaves.value.map(s => s.id)
  }
}

const deleteSelectedSaves = () => {
  if (selectedSaveIds.value.length === 0) return
  const count = selectedSaveIds.value.length
  const msg = count === 1
    ? "Voulez-vous vraiment supprimer la sauvegarde sélectionnée ?"
    : `Voulez-vous vraiment supprimer les ${count} sauvegardes sélectionnées ?`

  if (confirm(msg)) {
    currentProjectSaves.value = currentProjectSaves.value.filter(s => !selectedSaveIds.value.includes(s.id))
    localStorage.setItem(`appli_saves_${activeProjectId.value}`, JSON.stringify(currentProjectSaves.value))
    selectedSaveIds.value = []
  }
}

onMounted(() => {
  // Gestion du verrouillage d'accès au démarrage
  const requirePassword = localStorage.getItem('app_require_password_on_launch') === 'true'
  const auth = localStorage.getItem('app_authenticated')

  if (requirePassword) {
    isAuthenticated.value = false
    localStorage.removeItem('app_authenticated')
  } else if (auth === 'true') {
    isAuthenticated.value = true
  }

  const savedProjects = localStorage.getItem('appli_projects')
  const savedActiveId = localStorage.getItem('appli_active_project_id')

  if (savedProjects) {
    try {
      const parsed = JSON.parse(savedProjects)
      projects.value = parsed.map(p => ({ id: p.id, nom: p.nom || p.name || 'Nom du projet' }))
    } catch (e) {
      projects.value = [{ id: Date.now(), nom: 'Nom du projet' }]
    }
  } else {
    projects.value = [{ id: Date.now(), nom: 'Nom du projet' }]
  }

  if (savedActiveId && projects.value.some(p => p.id === Number(savedActiveId))) {
    activeProjectId.value = Number(savedActiveId)
  } else if (projects.value.length > 0) {
    activeProjectId.value = projects.value[0].id
  }

  loadProjectSaves()
})

watch(projects, (newVal) => {
  localStorage.setItem('appli_projects', JSON.stringify(newVal))
}, { deep: true })

watch(activeProjectId, (newVal, oldVal) => {
  if (newVal) {
    localStorage.setItem('appli_active_project_id', newVal.toString())
    loadProjectSaves()
    if (oldVal !== undefined) {
      loadLatestSave()
      appKey.value++
    }
  }
})

// --- ACTIONS SUR LES PROJETS ---
const openProjectModal = () => {
  showProjectListDropdown.value = false
  showProjectModal.value = true
}

const openSavesModal = () => {
  loadProjectSaves()
  showSavesModal.value = true
  showProjectModal.value = false
}

const selectProject = (id) => {
  activeProjectId.value = Number(id)
  showProjectModal.value = false
}

const createProject = () => {
  const name = prompt("Nom du nouveau projet :", "Nouveau projet")
  if (name && name.trim()) {
    const newId = Date.now()
    projects.value.push({ id: newId, nom: name.trim() })
    selectProject(newId)
  }
}

const renameSpecificProject = (id) => {
  const proj = projects.value.find(p => p.id === id)
  if (!proj) return
  const currentName = proj.nom || "Nom du projet"
  const newName = prompt("Modifier le nom du projet :", currentName)
  if (newName && newName.trim()) {
    proj.nom = newName.trim()
  }
}

const duplicateProject = (id) => {
  const projToCopy = projects.value.find(p => p.id === id)
  if (!projToCopy) return
  const currentName = projToCopy.nom || "Nom du projet"
  const newId = Date.now()
  const newName = currentName + " (Copie)"

  projects.value.push({ id: newId, nom: newName })

  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.includes(id.toString()) && !key.startsWith('appli_saves_')) {
      const newKey = key.replace(id.toString(), newId.toString())
      localStorage.setItem(newKey, localStorage.getItem(key))
    }
  })

  selectProject(newId)
}

const removeSpecificProject = (id) => {
  if (projects.value.length <= 1) {
    alert("Vous devez conserver au moins un projet.")
    return
  }

  if (confirm("Attention cette action est irréversible, toutes les données seront perdues.")) {
    projects.value = projects.value.filter(p => p.id !== id)
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes(id.toString())) {
        localStorage.removeItem(key)
      }
    })
    if (activeProjectId.value === id && projects.value.length > 0) {
      activeProjectId.value = projects.value[0].id
    }
  }
}

// --- GESTION DU SWIPE ---
let touchStartX = 0
let touchStartY = 0
let touchEndX = 0
let touchEndY = 0

const handleTouchStart = (e) => {
  touchStartX = e.changedTouches[0].screenX
  touchStartY = e.changedTouches[0].screenY
}

const handleTouchEnd = (e) => {
  touchEndX = e.changedTouches[0].screenX
  touchEndY = e.changedTouches[0].screenY
  gererSwipe()
}

const gererSwipe = () => {
  const seuilX = 50
  const toleranceY = 80
  const deltaX = touchEndX - touchStartX
  const deltaY = Math.abs(touchEndY - touchStartY)

  if (deltaY < toleranceY) {
    if (deltaX < -seuilX) sidebarReduite.value = true
    else if (deltaX > seuilX) sidebarReduite.value = false
  }
}
</script>

<template>
  <LockScreen v-if="!isAuthenticated" @authenticated="handleAuthenticated" />

  <div v-else class="app-container" :class="{ 'sidebar-collapsed': sidebarReduite }">
    <!-- Navigation latérale -->
    <aside 
      class="sidebar"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <div class="sidebar-header">
        <div v-if="!sidebarReduite" class="sidebar-title-container" @click="openProjectModal" title="Gérer le projet actif">
          <h2 class="sidebar-title">{{ currentProjectName }}</h2>
        </div>

      <div class="sidebar-actions">
        <button 
          @click="afficherPreferences = true" 
          class="btn-icon" 
          title="Préférences Système"
          style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 2rem; line-height: 1; padding: 0;"
        >
          <span style="display: inline-block; transform: translateY(-2px);">⚙</span>
        </button>
      </div>
      </div>

      <nav class="sidebar-nav">
        <button 
          v-for="section in sections" 
          :key="section.id" 
          :class="['nav-btn', { active: currentTab === section.id }]"
          @click="changerTab(section.id)"
          :title="section.nom"
        >
          <span class="nav-icon-dot" :style="{ backgroundColor: section.couleur }"></span>
          <div v-if="!sidebarReduite" class="nav-btn-text">
            <span class="nav-label">{{ section.nom }}</span>
            <span class="nav-desc">{{ section.description }}</span>
          </div>
        </button>
      </nav>

      <div class="sidebar-empty-space" @click="sidebarReduite = !sidebarReduite" title="Réduire/Agrandir le menu"></div>
    </aside>

    <!-- Zone de travail principale -->
    <main class="main-content">
      <header class="top-bar">
        <div class="top-bar-left">
          <h1 
            :style="{ 
              color: currentTab === 'accueil' ? '#8f1818' : '#0f172a',
              cursor: currentTab === 'accueil' ? 'pointer' : 'default'
            }"
            @click="currentTab === 'accueil' ? openProjectModal() : null"
            :title="currentTab === 'accueil' ? 'Gérer le projet actif' : ''"
          >
            {{ currentTab === 'accueil' ? currentProjectName : sectionActuelle?.nom }}
          </h1>
          <p v-if="currentTab !== 'accueil'" class="top-bar-sub">{{ sectionActuelle?.description }}</p>
        </div>
      </header>

      <section class="content-body">
        <AccueilView 
          v-if="currentTab === 'accueil'" 
          :project-id="activeProjectId" 
          :projets="projetsFormatted"
          :date-derniere-sauvegarde="lastSaveText"
          :key="'accueil-' + activeProjectId + '-' + appKey"
          @naviguer="changerTab" 
        />
        <PatientsView v-if="currentTab === 'patients'" :project-id="activeProjectId" :key="'patients-' + activeProjectId + '-' + appKey" />
        <RecapPatientsView v-if="currentTab === 'recapPatients'" :project-id="activeProjectId" :key="'recap-' + activeProjectId + '-' + appKey" />
        <SeancesView v-if="currentTab === 'seances'" :project-id="activeProjectId" :key="'seances-' + activeProjectId + '-' + appKey" />
        <FacturesView v-if="currentTab === 'factures'" :project-id="activeProjectId" :key="'factures-' + activeProjectId + '-' + appKey" />
        <UrssafView v-if="currentTab === 'urssaf'" :project-id="activeProjectId" :key="'urssaf-' + activeProjectId + '-' + appKey" />
      </section>
    </main>

    <!-- FENÊTRE DE GESTION DU PROJET -->
    <div v-if="showProjectModal" class="modal-backdrop">
      <div class="modal-box project-modal">
        <header class="modal-header">
          <h3>📂 Gestion du Projet</h3>
          <button @click="showProjectModal = false" class="btn-close">✕</button>
        </header>

        <div class="current-project-view">
          <div class="project-active-header-box">
            <span class="project-large-name" :title="currentProjectName">{{ currentProjectName }}</span>
            <div class="project-actions-group">
              <button @click="renameSpecificProject(activeProjectId)" class="action-ico" title="Renommer">✏️</button>
            </div>
          </div>

          <div class="project-saves-actions">
            <button 
              v-if="!isSavingBriefly" 
              @click="effectuerSauvegarde" 
              class="btn-secondary-action"
            >
              💾 Effectuer une sauvegarde
            </button>

            <div v-else class="save-feedback-box" :title="savedFeedbackName">
              ✅ {{ savedFeedbackName }}
            </div>

            <button @click="openSavesModal" class="btn-secondary-action icon-only" title="Voir les sauvegardes">👁️</button>
          </div>

          <button @click="createProject" class="btn-primary new-project-btn" style="margin-top: 10px;">+ Nouveau Projet</button>

          <button @click="showProjectListDropdown = !showProjectListDropdown" class="btn-list-projects">
            📋 Liste des projets {{ showProjectListDropdown ? '▲' : '▼' }}
          </button>

          <div v-if="showProjectListDropdown" class="projects-full-list">
            <div 
              v-for="proj in projetsFormatted" 
              :key="proj.id" 
              :class="['project-list-item', { active: proj.id === activeProjectId }]"
            >
              <div class="project-item-name" @click="selectProject(proj.id)">
                <span>{{ proj.nom }}</span>
                <span v-if="proj.id === activeProjectId" class="active-tag-small">(Actif)</span>
              </div>
              <div class="project-item-actions">
                <button @click="renameSpecificProject(proj.id)" class="action-ico" title="Renommer">✏️</button>
                <button @click="duplicateProject(proj.id)" class="action-ico" title="Dupliquer">📋</button>
                <button v-if="projects.length > 1" @click="removeSpecificProject(proj.id)" class="action-ico trash" title="Supprimer">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FENÊTRE VISUALISATION ET SUPPRESSION DES SAUVEGARDES -->
    <div v-if="showSavesModal" class="modal-backdrop">
      <div class="modal-box saves-modal">
        <header class="modal-header">
          <div class="header-title-with-trash">
            <h3>👁️ Sauvegardes du projet</h3>
            <button 
              @click="deleteSelectedSaves" 
              class="btn-trash-icon" 
              :disabled="selectedSaveIds.length === 0"
              :title="selectedSaveIds.length > 0 ? 'Supprimer les fichiers sélectionnés' : 'Sélectionnez au moins une sauvegarde à supprimer'"
            >
              🗑️
            </button>
          </div>
          <button @click="showSavesModal = false; showProjectModal = true" class="btn-close">✕</button>
        </header>

        <div class="saves-list-container">
          <div v-if="currentProjectSaves.length === 0" class="empty-state">
            Aucune sauvegarde pour ce projet.
          </div>

          <table v-else class="saves-table">
            <thead>
              <tr>
                <th class="th-checkbox">
                  <input 
                    type="checkbox" 
                    :checked="isAllSavesSelected" 
                    @change="toggleSelectAllSaves" 
                    title="Tout sélectionner / Tout désélectionner"
                  />
                </th>
                <th class="th-name">Fichier / Date</th>
                <th class="th-action">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="save in currentProjectSaves" :key="save.id" class="save-row">
                <td class="td-checkbox">
                  <input 
                    type="checkbox" 
                    :value="save.id" 
                    v-model="selectedSaveIds" 
                  />
                </td>
                <td class="td-name">
                  <span class="save-name-text">{{ save.name }}</span>
                </td>
                <td class="td-action">
                  <button @click="rechargerSave(save)" class="btn-reload-save" title="Recharger cette sauvegarde">Recharger</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="modal-footer" style="margin-top: 16px;">
          <button @click="showSavesModal = false; showProjectModal = true" class="btn-primary" style="width: 100%;">Fermer</button>
        </footer>
      </div>
    </div>

    <!-- FENÊTRE DES PRÉFÉRENCES SYSTÈME -->
<div v-if="afficherPreferences" class="modal-backdrop">
      <div class="modal-box">
        <header class="modal-header">
          <h3><span style="font-size: 1.2em; vertical-align: middle; margin-right: 10px;">⚙️</span> Préférences Système</h3>
          <button @click="afficherPreferences = false" class="btn-close">✕</button>
        </header>

        <div class="preferences-body">
          <div class="pref-group">
            <label>Stockage local</label>
            <p class="pref-desc">Vos données et sauvegardes manuelles sont enregistrées en toute sécurité dans la mémoire de votre navigateur.</p>
          </div>

          <div class="pref-group pref-checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="requirePasswordOnLaunch" />
              <span>Demander mon mot de passe à l'ouverture</span>
            </label>
            <p class="pref-desc">Si cette option est activée, le mot de passe vous sera demandé à chaque ouverture de l'application.</p>
          </div>

          <div class="pref-group pref-password-group">
            <button @click="openChangePasswordModal" class="btn-secondary-action">
              🔑 Modifier le mot de passe
            </button>
          </div>
        </div>

        <footer class="modal-footer">
          <button @click="afficherPreferences = false" class="btn-primary" style="width: 100%;">Fermer</button>
        </footer>
      </div>
    </div>

<!-- FENÊTRE DE MODIFICATION DU MOT DE PASSE (UNIQUE VUE) -->
    <div v-if="showPasswordModal" class="modal-backdrop" style="z-index: 110;">
      <div class="modal-box password-modal">
        <header class="modal-header">
          <h3>🔑 Modifier le mot de passe</h3>
          <button type="button" @click="showPasswordModal = false" class="btn-close">✕</button>
        </header>

        <form @submit.prevent="handlePasswordChange" class="password-body" style="padding: 16px 0;">
          
          <!-- Mot de passe actuel + Œil + Petit bouton carré vert ✔ -->
          <div class="input-group">
            <label>Mot de passe actuel</label>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <input 
                :type="showOldPassword ? 'text' : 'password'" 
                v-model="oldPasswordInput" 
                placeholder="Mot de passe actuel"
                :disabled="isOldPasswordVerified"
                @keyup.enter.prevent="verifyOldPassword"
                style="flex: 1;"
              />

              <!-- Bouton Œil (Ancien mot de passe) -->
              <button 
                type="button" 
                @click.prevent="showOldPassword = !showOldPassword" 
                style="width: 36px; height: 36px; min-width: 36px; background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;"
                :title="showOldPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                {{ showOldPassword ? '🙈' : '👁️' }}
              </button>

              <!-- Petit bouton carré vert ✔ -->
              <button 
                type="button" 
                @click.prevent="verifyOldPassword" 
                :disabled="isOldPasswordVerified"
                style="width: 36px; height: 36px; min-width: 36px; background-color: #16a34a; color: white; border: none; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px;"
                :style="{ opacity: isOldPasswordVerified ? 0.6 : 1, cursor: isOldPasswordVerified ? 'not-allowed' : 'pointer' }"
                title="Vérifier le mot de passe actuel"
              >
                ✔
              </button>
            </div>
          </div>

          <!-- Nouveau mot de passe + Œil -->
          <div class="input-group" style="margin-top: 14px;">
            <label>Nouveau mot de passe</label>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <input 
                :type="showNewPassword ? 'text' : 'password'" 
                v-model="newPasswordInput" 
                placeholder="Entrez le nouveau mot de passe"
                required 
                style="flex: 1;"
              />

              <!-- Bouton Œil (Nouveau mot de passe) -->
              <button 
                type="button" 
                @click.prevent="showNewPassword = !showNewPassword" 
                style="width: 36px; height: 36px; min-width: 36px; background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;"
                :title="showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                {{ showNewPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <!-- Messages d'erreur et de succès -->
          <p v-if="passwordError" class="password-msg error" style="color: #dc2626; margin-top: 8px; font-size: 13px;">
            {{ passwordError }}
          </p>
          <p v-if="passwordSuccess" class="password-msg success" style="color: #16a34a; margin-top: 8px; font-size: 13px;">
            {{ passwordSuccess }}
          </p>

          <footer class="modal-footer" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" @click="showPasswordModal = false" class="btn-secondary-action">Annuler</button>
            <button type="submit" class="btn-primary">Valider</button>
          </footer>
        </form>
      </div>
    </div>

  </div>
</template>

<style>

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

html, body, #app {
  height: 100%;
  background-color: #f8fafc;
  color: #1e293b;
}

.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  transition: all 0.2s ease;
}

/* Sidebar */
.sidebar {
  width: 290px;
  background-color: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  flex-shrink: 0;
  user-select: none;
}

.app-container.sidebar-collapsed .sidebar {
  width: 76px;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 73px;
  gap: 8px;
}

.sidebar-title-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.15s;
  flex: 1;
  overflow: hidden;
}

.sidebar-title-container:hover {
  background-color: #f1f5f9;
}

.sidebar-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.btn-icon {
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  background-color: #f8fafc;
  transition: background 0.15s;
  flex-shrink: 0;
}

.btn-icon:hover { 
  background-color: #f1f5f9; 
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
}

.sidebar-empty-space {
  flex: 1;
  min-height: 40px;
  cursor: pointer;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  min-height: 52px;
  transition: background 0.15s ease;
  width: 100%;
}

.app-container.sidebar-collapsed .nav-btn {
  justify-content: center;
  padding: 10px;
}

.nav-btn:hover { background-color: #f1f5f9; }
.nav-btn.active { background-color: #eff6ff; }

.nav-icon-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nav-btn-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nav-label {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-btn.active .nav-label { color: #2563eb; }

.nav-desc {
  font-size: 11px;
  color: #64748b;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Zone principale */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.top-bar {
  padding: 20px 30px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.top-bar-left {
  flex: 1;
}

.top-bar-left h1 {
  font-size: 50px;
  font-weight: 800;
}

.top-bar-sub {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.top-bar-right {
  display: flex;
  align-items: center;
  margin-left: 20px;
}

.last-save-info {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  background-color: #f1f5f9;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.content-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  overflow-x: auto;
}

/* Modales */
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
  max-width: 520px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.header-title-with-trash {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-trash-icon {
  background: none;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s;
  background-color: #fef2f2;
}

.btn-trash-icon:hover:not(:disabled) {
  background-color: #fee2e2;
  border-color: #ef4444;
}

.btn-trash-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #cbd5e1;
  background-color: #f1f5f9;
}

.btn-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
}

/* Projet Modal */
.current-project-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
}

.project-active-header-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  padding: 12px 16px;
  border-radius: 8px;
}

.project-large-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

.project-actions-group {
  display: flex;
  gap: 4px;
}

.action-ico {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: background 0.15s;
}

.action-ico:hover { background: #e2e8f0; }
.action-ico.trash:hover { background: #fee2e2; }

/* Boutons secondaires (Sauvegardes) */
.project-saves-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.btn-secondary-action {
  flex: 1;
  padding: 10px;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary-action:hover {
  background-color: #e2e8f0;
}

.save-feedback-box {
  flex: 1;
  padding: 10px;
  background-color: #dcfce7;
  border: 1px solid #86efac;
  color: #166534;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-secondary-action.icon-only {
  flex: none;
  width: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.btn-list-projects {
  width: 100%;
  padding: 12px;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-list-projects:hover {
  background-color: #e2e8f0;
}

/* Liste déroulante des projets */
.projects-full-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
  background: #f8fafc;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.project-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  transition: all 0.15s;
}

.project-list-item:hover { background: #f1f5f9; }
.project-list-item.active {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.project-item-name {
  flex: 1;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.active-tag-small {
  font-size: 11px;
  color: #2563eb;
  font-weight: 500;
}

.project-item-actions {
  display: flex;
  gap: 2px;
}

/* Modale Sauvegardes & Tableau par colonne */
.saves-list-container {
  display: flex;
  flex-direction: column;
  max-height: 380px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: #64748b;
  font-style: italic;
}

.saves-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.saves-table th {
  background-color: #f8fafc;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  color: #475569;
}

.saves-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.saves-table tr:last-child td {
  border-bottom: none;
}

.th-checkbox, .td-checkbox {
  width: 40px;
  text-align: center;
}

.th-checkbox input, .td-checkbox input {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.save-name-text {
  font-weight: 600;
  color: #1e293b;
  word-break: break-all;
}

.th-action, .td-action {
  width: 100px;
  text-align: right;
}

.btn-reload-save {
  background-color: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-reload-save:hover {
  background-color: #dbeafe;
}

/* Preferences Body */
.preferences-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.pref-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pref-group label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.pref-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
}

.pref-checkbox-group {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.pref-password-group {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 600;
  color: #334155;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* Modale Mot de Passe */
.password-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.input-group input {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.input-group input:focus {
  border-color: #2563eb;
}

.password-msg {
  font-size: 13px;
  font-weight: 600;
}

.password-msg.error {
  color: #dc2626;
}

.password-msg.success {
  color: #16a34a;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.btn-primary {
  padding: 10px 16px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  text-align: center;
  flex: 1;
}

.btn-primary:hover { background-color: #1d4ed8; }
</style>