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

const handleAuthenticated = () => {
  isAuthenticated.value = true
  localStorage.setItem('app_authenticated', 'true')
}

// --- État global de l'interface ---
const currentTab = ref('accueil')
const afficherPreferences = ref(false)
const intervalleSauvegarde = ref(5)
const sidebarReduite = ref(false) // État pour rétracter la barre latérale

const sections = [
  { id: 'accueil', nom: 'Accueil', couleur: '#3b82f6', description: "Vue d'ensemble et accès rapide" },
  { id: 'patients', nom: 'Patients', couleur: '#6366f1', description: 'Gestion du répertoire patientèle' },
  { id: 'recapPatients', nom: 'Récap Patients', couleur: '#14b8a6', description: 'Synthèse et statistiques par patient' },
  { id: 'seances', nom: 'Séances', couleur: '#0d9488', description: 'Journal des rendez-vous et règlements' },
  { id: 'factures', nom: 'Factures', couleur: '#f97316', description: 'Moteur de facturation' },
  { id: 'urssaf', nom: 'URSSAF', couleur: '#22c55e', description: 'Calcul des cotisations par trimestre' }
]

const sectionActuelle = computed(() => {
  return sections.find(s => s.id === currentTab.value)
})

const changerTab = (id) => {
  currentTab.value = id
}

// --- Gestion des Projets avec Persistance (localStorage) ---
const projects = ref([])
const activeProjectId = ref(null)
const showProjectModal = ref(false)
const newProjectName = ref('')

// Computed pour récupérer facilement le nom du projet actif
const currentProjectName = computed(() => {
  const activeProject = projects.value.find(p => p.id === activeProjectId.value)
  return activeProject ? activeProject.name : ''
})

// Initialisation au montage du composant
onMounted(() => {
  // Vérification de l'auth
  const auth = localStorage.getItem('app_authenticated')
  if (auth === 'true') {
    isAuthenticated.value = true
  }
  
  // Chargement des projets
  const savedProjects = localStorage.getItem('appli_projects')
  const savedActiveId = localStorage.getItem('appli_active_project_id')

  if (savedProjects) {
    projects.value = JSON.parse(savedProjects)
  } else {
    // Projet par défaut si rien n'existe
    projects.value = [{ id: Date.now(), name: 'Année 2026' }]
  }

  // Chargement de l'ID du projet actif
  if (savedActiveId && projects.value.some(p => p.id === parseInt(savedActiveId))) {
    activeProjectId.value = parseInt(savedActiveId)
  } else if (projects.value.length > 0) {
    activeProjectId.value = projects.value[0].id
  }
})

// Sauvegarde automatique à chaque modification de la liste ou du projet actif
watch(projects, (newVal) => {
  localStorage.setItem('appli_projects', JSON.stringify(newVal))
}, { deep: true })

watch(activeProjectId, (newVal) => {
  if (newVal) {
    localStorage.setItem('appli_active_project_id', newVal.toString())
  }
})

// Actions sur les projets
const selectProject = (id) => {
  activeProjectId.value = id
}

const createProject = () => {
  const name = newProjectName.value.trim()
  if (name) {
    const newId = Date.now()
    projects.value.push({ id: newId, name: name })
    selectProject(newId)
    newProjectName.value = ''
    showProjectModal.value = false
  }
}

const removeProject = (id, event) => {
  if (event) event.stopPropagation()
  if (projects.value.length === 1) {
    alert("Vous devez conserver au moins un projet.")
    return
  }
  
  const confirmDelete = confirm("Voulez-vous vraiment supprimer ce projet ?")
  if (confirmDelete) {
    projects.value = projects.value.filter(p => p.id !== id)
    // Si le projet supprimé était l'actif, on bascule sur le premier dispo
    if (activeProjectId.value === id) {
      activeProjectId.value = projects.value[0].id
    }
  }
}

const renameCurrentProject = () => {
  const activeProject = projects.value.find(p => p.id === activeProjectId.value)
  if (!activeProject) return

  const newName = prompt("Nouveau nom pour ce projet :", activeProject.name)
  if (newName && newName.trim()) {
    activeProject.name = newName.trim()
  }
}


// --- Gestion du Swipe / Glissement tactile sur la sidebar ---
let touchStartX = 0
let touchEndX = 0

const handleTouchStart = (e) => {
  touchStartX = e.changedTouches[0].screenX
}

const handleTouchEnd = (e) => {
  touchEndX = e.changedTouches[0].screenX
  gererSwipe()
}

const gererSwipe = () => {
  const seuilSwipe = 50 // Distance minimale en pixels pour valider le geste
  const deltaX = touchEndX - touchStartX

  if (deltaX < -seuilSwipe) {
    // Glissement vers la gauche -> Rétracter la sidebar
    sidebarReduite.value = true
  } else if (deltaX > seuilSwipe) {
    // Glissement vers la droite -> Déployer la sidebar
    sidebarReduite.value = false
  }
}
</script>

<template>
  <!-- Écran de verrouillage si non authentifié -->
  <LockScreen v-if="!isAuthenticated" @authenticated="handleAuthenticated" />

  <!-- Application principale -->
  <div v-else class="app-container" :class="{ 'sidebar-collapsed': sidebarReduite }">
    <!-- Navigation latérale (Rétractable avec Swipe & Clic sur zone vide) -->
    <aside 
      class="sidebar"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <div class="sidebar-header">
        <!-- Nom du projet affiché dans la sidebar (cliquable pour changer) -->
        <h2 v-if="!sidebarReduite" class="sidebar-project-title" @click="showProjectModal = true" title="Gérer les projets">
          📂 {{ currentProjectName }}
        </h2>
        <div class="sidebar-actions">
          <button @click="sidebarReduite = !sidebarReduite" class="btn-icon" :title="sidebarReduite ? 'Agrandir le menu' : 'Rétracter le menu'">
            {{ sidebarReduite ? '▶' : '◀' }}
          </button>
          <button @click="afficherPreferences = true" class="btn-icon" title="Préférences">
            ⚙️
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

      <!-- Zone vide cliquable en bas pour basculer l'état -->
      <div class="sidebar-empty-space" @click="sidebarReduite = !sidebarReduite" title="Cliquer pour basculer le menu"></div>
    </aside>

    <!-- Zone de travail principale -->
    <main class="main-content">
      <!-- En-tête avec titre de section à gauche et Nom du projet centré -->
      <header class="top-bar custom-top-bar">
        <div class="top-bar-left">
          <h1>{{ sectionActuelle?.nom }}</h1>
          <p class="top-bar-sub">{{ sectionActuelle?.description }}</p>
        </div>

        <!-- NOM DU PROJET CENTRE ET TOUJOURS VISIBLE -->
        <div class="top-bar-center">
          <div class="project-display-badge" @click="showProjectModal = true" title="Changer ou gérer les projets">
            <span class="project-badge-icon">📂</span>
            <span class="project-badge-name">{{ currentProjectName }}</span>
          </div>
          <button @click="renameCurrentProject" class="btn-icon-small" title="Renommer ce projet">✏️</button>
        </div>

        <div class="top-bar-right">
          <button @click="showProjectModal = true" class="btn-secondary-small">📁 Projets</button>
        </div>
      </header>
      
      <!-- Zone de contenu dynamisée par l'ID du projet actif -->
      <section class="content-body">
        <AccueilView 
          v-if="currentTab === 'accueil'" 
          @naviguer="changerTab" 
          :project-id="activeProjectId" 
          :key="activeProjectId" 
        />
        <PatientsView 
          v-if="currentTab === 'patients'" 
          :project-id="activeProjectId" 
          :key="activeProjectId" 
        />
        <RecapPatientsView 
          v-if="currentTab === 'recapPatients'" 
          :project-id="activeProjectId" 
          :key="activeProjectId" 
        />
        <SeancesView 
          v-if="currentTab === 'seances'" 
          :project-id="activeProjectId" 
          :key="activeProjectId" 
        />
        <FacturesView 
          v-if="currentTab === 'factures'" 
          :project-id="activeProjectId" 
          :key="activeProjectId" 
        />
        <UrssafView 
          v-if="currentTab === 'urssaf'" 
          :project-id="activeProjectId" 
          :key="activeProjectId" 
        />
      </section>
    </main>

    <!-- Modale de Gestion et Changement de Projets -->
    <div v-if="showProjectModal" class="modal-backdrop">
      <div class="modal-box project-modal-box">
        <header class="modal-header">
          <h3>📂 Gestion des Projets</h3>
          <button @click="showProjectModal = false" class="btn-close">✕</button>
        </header>

        <div class="preferences-body">
          <div class="pref-group">
            <label>Projet actif actuel :</label>
            <p class="active-project-highlight"><strong>{{ currentProjectName }}</strong></p>
          </div>

          <div class="pref-group">
            <label>Basculer vers un autre projet :</label>
            <div class="projects-list-container">
              <button 
                v-for="proj in projects" 
                :key="proj.id"
                @click="selectProject(proj.id); showProjectModal = false"
                :class="['project-choice-btn', { active: proj.id === activeProjectId }]"
              >
                <span>{{ proj.name }}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span v-if="proj.id === activeProjectId" class="active-tag">(Actif)</span>
                  <span 
                    v-if="projects.length > 1" 
                    @click="(e) => removeProject(proj.id, e)" 
                    style="color: #ef4444; font-size: 18px; cursor: pointer; padding: 0 4px;"
                    title="Supprimer ce projet"
                  >
                    ×
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div class="pref-group">
            <label>Créer un nouveau projet :</label>
            <div class="new-project-row">
              <input 
                type="text" 
                v-model="newProjectName" 
                placeholder="Ex: Année 2027, Cabinet B..." 
                class="form-input"
                @keyup.enter="createProject"
              />
              <button @click="createProject" class="btn-primary">Créer</button>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button @click="showProjectModal = false" class="btn-secondary">Fermer</button>
        </footer>
      </div>
    </div>

    <!-- Modal des Préférences -->
    <div v-if="afficherPreferences" class="modal-backdrop">
      <div class="modal-box">
        <header class="modal-header">
          <h3>Préférences</h3>
          <button @click="afficherPreferences = false" class="btn-close">✕</button>
        </header>

        <div class="preferences-body">
          <div class="pref-group">
            <label>Sauvegarde automatique</label>
            <select v-model="intervalleSauvegarde" class="form-input">
              <option :value="0">Désactivée</option>
              <option :value="2">Toutes les 2 minutes</option>
              <option :value="5">Toutes les 5 minutes</option>
              <option :value="10">Toutes les 10 minutes</option>
            </select>
          </div>

          <div class="pref-group">
            <label>Stockage local</label>
            <p class="pref-desc">Base de données IndexedDB / LocalStorage (Stockée sur le navigateur de l'appareil).</p>
          </div>
        </div>

        <footer class="modal-footer">
          <button @click="afficherPreferences = false" class="btn-primary">OK</button>
        </footer>
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

/* Sidebar normale et mode rétracté */
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
}

.sidebar-project-title {
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.1rem;
  color: #1e293b;
}

.sidebar-project-title:hover {
  color: #3b82f6;
}

.sidebar-actions {
  display: flex;
  gap: 6px;
  align-items: center;
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

/* Zone vide cliquable en bas du menu */
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

/* Zone principale avec défilement horizontal et vertical garanti */
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
}

.custom-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.top-bar-center {
  display: flex;
  align-items: center;
  gap: 8px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.project-display-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  color: #1e293b;
  border: 1px solid #cbd5e1;
  transition: background 0.2s;
}

.project-display-badge:hover {
  background: #e2e8f0;
}

.btn-icon-small {
  background: none;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: #f8fafc;
  transition: background 0.15s;
}

.btn-icon-small:hover {
  background-color: #f1f5f9;
}

.btn-secondary-small {
  padding: 6px 12px;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #475569;
}

.btn-secondary-small:hover {
  background-color: #e2e8f0;
}

.top-bar-sub {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.content-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  overflow-x: auto;
}

/* Modals */
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
}

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
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.pref-desc {
  font-size: 13px;
  color: #64748b;
}

.active-project-highlight {
  font-size: 15px;
  color: #2563eb;
}

.projects-list-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
  margin-top: 5px;
}

.project-choice-btn {
  padding: 8px 12px;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
}

.project-choice-btn.active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #3b82f6;
  font-weight: 600;
}

.active-tag {
  font-size: 12px;
  color: #2563eb;
}

.new-project-row {
  display: flex;
  gap: 8px;
  margin-top: 5px;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-primary {
  padding: 8px 16px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  padding: 8px 16px;
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
</style>
