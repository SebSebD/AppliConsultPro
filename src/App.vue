<template>
  <div class="app-container">
    <!-- Navigation latérale (6 Sections iPad) -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>AppliDodo</h2>
        <button @click="afficherPreferences = true" class="btn-gear" title="Préférences">
          ⚙️
        </button>
      </div>
      <nav class="sidebar-nav">
        <button 
          v-for="section in sections" 
          :key="section.id" 
          :class="['nav-btn', { active: currentTab === section.id }]"
          @click="currentTab = section.id"
        >
          <span class="nav-icon-dot" :style="{ backgroundColor: section.couleur }"></span>
          <div class="nav-btn-text">
            <span class="nav-label">{{ section.nom }}</span>
            <span class="nav-desc">{{ section.description }}</span>
          </div>
        </button>
      </nav>
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

<script setup>
import { ref, computed } from 'vue'
import AccueilView from './components/AccueilView.vue'
import PatientsView from './components/PatientsView.vue'
import RecapPatientsView from './components/RecapPatientsView.vue'
import SeancesView from './components/SeancesView.vue'
import FacturesView from './components/FacturesView.vue'
import UrssafView from './components/UrssafView.vue'

const currentTab = ref('accueil')
const afficherPreferences = ref(false)
const intervalleSauvegarde = ref(5)

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
</script>

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
}

.sidebar {
  width: 290px;
  background-color: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 24px 20px 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-gear {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.7;
}

.btn-gear:hover { opacity: 1; }

.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 6px;
  overflow-y: auto;
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
}

.nav-label {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.nav-btn.active .nav-label { color: #2563eb; }

.nav-desc {
  font-size: 11px;
  color: #64748b;
  line-height: 1.2;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.top-bar {
  padding: 20px 30px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.top-bar-sub {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.content-body {
  padding: 30px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
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