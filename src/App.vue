<script setup>
import { ref, computed, onMounted } from 'vue'
import LockScreen from './components/LockScreen.vue'
import AccueilView from './components/AccueilView.vue'
import PatientsView from './components/PatientsView.vue'
import RecapPatientsView from './components/RecapPatientsView.vue'
import SeancesView from './components/SeancesView.vue'
import FacturesView from './components/FacturesView.vue'
import UrssafView from './components/UrssafView.vue'

// État d'authentification
const isAuthenticated = ref(false)

onMounted(() => {
  const auth = sessionStorage.getItem('app_authenticated')
  if (auth === 'true') {
    isAuthenticated.value = true
  }
})

const handleAuthenticated = () => {
  isAuthenticated.value = true
  sessionStorage.setItem('app_authenticated', 'true')
}

const currentTab = ref('accueil')
const afficherPreferences = ref(false)
const intervalleSauvegarde = ref(5)

// État pour rétracter la barre latérale
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

// Gestion du Swipe / Glissement tactile sur la sidebar
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
        <h2 v-if="!sidebarReduite">AppliDodo</h2>
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
          @click="currentTab = section.id"
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
      <header class="top-bar">
        <h1>{{ sectionActuelle?.nom }}</h1>
        <p class="top-bar-sub">{{ sectionActuelle?.description }}</p>
      </header>
      
      <section class="content-body">
        <AccueilView v-if="currentTab === 'accueil'" @naviguer="changerTab" />
        <PatientsView v-if="currentTab === 'patients'" />
        <RecapPatientsView v-if="currentTab === 'recapPatients'" />
        <SeancesView v-if="currentTab === 'seances'" />
        <FacturesView v-if="currentTab === 'factures'" />
        <UrssafView v-if="currentTab === 'urssaf'" />
      </section>
    </main>

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
            <p class="pref-desc">Base de données IndexedDB (Stockée sur le navigateur de l'appareil).</p>
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

.form-input {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
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
</style>