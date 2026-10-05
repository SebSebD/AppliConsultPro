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
const afficherPreferences = ref(false) // Pour la roue crantée (système)
const intervalleSauvegarde = ref(5)
const sidebarReduite = ref(false)

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

// --- GESTION DES PROJETS ---
const projects = ref([])
const activeProjectId = ref(null)
const showProjectModal = ref(false)
const showProjectListDropdown = ref(false) // Pour le menu déroulant "Liste des projets"

// Nom du projet actif (par défaut "Nom du projet")
const currentProjectName = computed(() => {
  const activeProject = projects.value.find(p => p.id === activeProjectId.value)
  if (activeProject && (activeProject.name || activeProject.nom)) {
    return activeProject.name || activeProject.nom
  }
  return 'Nom du projet'
})

// Formatage pour la liste
const projetsFormatted = computed(() => {
  return projects.value.map(p => ({
    id: p.id,
    nom: p.name || p.nom || 'Nom du projet'
  }))
})

onMounted(() => {
  const auth = localStorage.getItem('app_authenticated')
  if (auth === 'true') {
    isAuthenticated.value = true
  }
  
  const savedProjects = localStorage.getItem('appli_projects')
  const savedActiveId = localStorage.getItem('appli_active_project_id')

  if (savedProjects) {
    try {
      projects.value = JSON.parse(savedProjects)
    } catch (e) {
      projects.value = [{ id: Date.now(), name: 'Nom du projet' }]
    }
  } else {
    projects.value = [{ id: Date.now(), name: 'Nom du projet' }]
  }

  if (savedActiveId && projects.value.some(p => p.id === Number(savedActiveId))) {
    activeProjectId.value = Number(savedActiveId)
  } else if (projects.value.length > 0) {
    activeProjectId.value = projects.value[0].id
  }
})

// Sauvegardes auto des projets
watch(projects, (newVal) => {
  localStorage.setItem('appli_projects', JSON.stringify(newVal))
}, { deep: true })

watch(activeProjectId, (newVal) => {
  if (newVal) {
    localStorage.setItem('appli_active_project_id', newVal.toString())
  }
})

// --- ACTIONS SUR LES PROJETS ---
const openProjectModal = () => {
  showProjectListDropdown.value = false // Réinitialiser le déroulé à l'ouverture
  showProjectModal.value = true
}

const selectProject = (id) => {
  activeProjectId.value = Number(id)
  showProjectModal.value = false
}

const createProject = () => {
  const name = prompt("Nom du nouveau projet :", "Nouveau projet")
  if (name && name.trim()) {
    const newId = Date.now()
    projects.value.push({ id: newId, name: name.trim() })
    selectProject(newId)
  }
}

const renameSpecificProject = (id) => {
  const proj = projects.value.find(p => p.id === id)
  if (!proj) return
  
  const currentName = proj.name || proj.nom || "Nom du projet"
  const newName = prompt("Modifier le nom du projet :", currentName)
  
  if (newName && newName.trim()) {
    proj.name = newName.trim()
    proj.nom = newName.trim()
  }
}

const duplicateProject = (id) => {
  const projToCopy = projects.value.find(p => p.id === id)
  if (!projToCopy) return

  const currentName = projToCopy.name || projToCopy.nom || "Nom du projet"
  const newId = Date.now()
  const newName = currentName + " (Copie)"

  // 1. Ajouter le nouveau projet à la liste
  projects.value.push({ id: newId, name: newName })

  // 2. Dupliquer TOUTES les données du localStorage liées à cet ID
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.includes(id.toString())) {
      const newKey = key.replace(id.toString(), newId.toString())
      localStorage.setItem(newKey, localStorage.getItem(key))
    }
  })

  // 3. Basculer automatiquement sur la copie
  selectProject(newId)
}

const removeSpecificProject = (id) => {
  if (projects.value.length <= 1) {
    alert("Vous devez conserver au moins un projet.")
    return
  }
  
  if (confirm("Attention cette action est irréversible, toutes les données seront perdues.")) {
    // Supprimer le projet de la liste
    projects.value = projects.value.filter(p => p.id !== id)
    
    // Supprimer physiquement les données liées au projet dans le localStorage
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes(id.toString())) {
        localStorage.removeItem(key)
      }
    })

    // Rediriger vers un projet existant si on a supprimé le projet actif
    if (activeProjectId.value === id && projects.value.length > 0) {
      activeProjectId.value = projects.value[0].id
    }
  }
}

// --- GESTION DU SWIPE ---
let touchStartX = 0
let touchEndX = 0

const handleTouchStart = (e) => { touchStartX = e.changedTouches[0].screenX }
const handleTouchEnd = (e) => {
  touchEndX = e.changedTouches[0].screenX
  gererSwipe()
}

const gererSwipe = () => {
  const seuilSwipe = 50
  const deltaX = touchEndX - touchStartX
  if (deltaX < -seuilSwipe) sidebarReduite.value = true
  else if (deltaX > seuilSwipe) sidebarReduite.value = false
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
        
        <!-- TITRE DU PROJET ACTIF CLIQUABLE (Sans flèche) -->
        <div v-if="!sidebarReduite" class="sidebar-title-container" @click="openProjectModal" title="Gérer le projet actif">
          <h2 class="sidebar-title">{{ currentProjectName }}</h2>
        </div>

        <div class="sidebar-actions">
          <!-- Bouton fléché retiré, seule la roue crantée reste -->
          <button 
            @click="afficherPreferences = true" 
            class="btn-icon" 
            title="Préférences Système"
          >
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

      <!-- Zone vide en bas pour rétracter/agrandir au clic -->
      <div class="sidebar-empty-space" @click="sidebarReduite = !sidebarReduite" title="Réduire/Agrandir le menu"></div>
    </aside>

    <!-- Zone de travail principale -->
    <main class="main-content">
      <header class="top-bar">
        <div class="top-bar-left">
          <!-- Nom du projet actif en couleur #3297b3 à la place de "Accueil" si on est sur l'accueil, ou affichage dynamique -->
          <h1 :style="{ color: currentTab === 'accueil' ? '#3297b3' : '#0f172a' }">
            {{ currentTab === 'accueil' ? currentProjectName : sectionActuelle?.nom }}
          </h1>
          <!-- Sous-titre masqué sur l'accueil suite à votre demande -->
          <p v-if="currentTab !== 'accueil'" class="top-bar-sub">{{ sectionActuelle?.description }}</p>
        </div>
      </header>
      
      <section class="content-body">
        <AccueilView 
          v-if="currentTab === 'accueil'" 
          :project-id="activeProjectId" 
          :projets="projetsFormatted"
          :key="activeProjectId"
          @naviguer="changerTab" 
        />
        <PatientsView v-if="currentTab === 'patients'" :project-id="activeProjectId" :key="activeProjectId" />
        <RecapPatientsView v-if="currentTab === 'recapPatients'" :project-id="activeProjectId" :key="activeProjectId" />
        <SeancesView v-if="currentTab === 'seances'" :project-id="activeProjectId" :key="activeProjectId" />
        <FacturesView v-if="currentTab === 'factures'" :project-id="activeProjectId" :key="activeProjectId" />
        <UrssafView v-if="currentTab === 'urssaf'" :project-id="activeProjectId" :key="activeProjectId" />
      </section>
    </main>

    <!-- FENÊTRE DE GESTION DES PROJETS -->
    <div v-if="showProjectModal" class="modal-backdrop">
      <div class="modal-box project-modal">
        <header class="modal-header">
          <h3>📂 Gestion du Projet</h3>
          <button @click="showProjectModal = false" class="btn-close">✕</button>
        </header>
        
        <div class="current-project-view">
          <!-- Nom du projet actif + Stylo + Dupliquer + Poubelle -->
          <div class="project-active-header-box">
            <span class="project-large-name" :title="currentProjectName">{{ currentProjectName }}</span>
            <div class="project-actions-group">
              <button @click="renameSpecificProject(activeProjectId)" class="action-ico" title="Renommer">✏️</button>
              <button @click="duplicateProject(activeProjectId)" class="action-ico" title="Dupliquer">📋</button>
              <button v-if="projects.length > 1" @click="removeSpecificProject(activeProjectId)" class="action-ico trash" title="Supprimer">🗑️</button>
            </div>
          </div>

          <!-- Bouton + Nouveau Projet placé au-dessus de Liste des projets -->
          <button @click="createProject" class="btn-primary new-project-btn">+ Nouveau Projet</button>
          
          <!-- Bouton Liste des projets (Déroulant) -->
          <button @click="showProjectListDropdown = !showProjectListDropdown" class="btn-list-projects">
            📋 Liste des projets {{ showProjectListDropdown ? '▲' : '▼' }}
          </button>

          <!-- Liste déroulante des projets -->
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

    <!-- FENÊTRE DES PRÉFÉRENCES SYSTÈME -->
    <div v-if="afficherPreferences" class="modal-backdrop">
      <div class="modal-box">
        <header class="modal-header">
          <h3>⚙️ Préférences Système</h3>
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
            <p class="pref-desc">Vos données sont enregistrées en toute sécurité dans la mémoire de votre navigateur actuel.</p>
          </div>
        </div>

        <footer class="modal-footer">
          <button @click="afficherPreferences = false" class="btn-primary" style="width: 100%;">Fermer</button>
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

/* Titre cliquable sans flèche */
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

/* Modifiez ou ajoutez ceci pour centrer le contenu de l'en-tête */
.top-bar-left {
  width: 100%;
  text-align: center;
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
  max-width: 480px;
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

.btn-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
}

/* Styles spécifiques à la modale Projet */
.current-project-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  max-width: 240px;
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

/* Liste de projets déroulante */
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

.new-project-btn {
  width: 100%;
}

/* Formulaires & Préférences */
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

.form-input {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: center;
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
}

.btn-primary:hover { background-color: #1d4ed8; }
</style>