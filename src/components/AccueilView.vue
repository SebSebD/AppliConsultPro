<template>
  <div class="accueil-container">
    <header class="accueil-header">
      <p class="status-badge">
        <span class="status-dot green"></span>
        Système à jour
      </p>
    </header>

    <!-- Grille des modules -->
    <div class="modules-grid">
      <div 
        v-for="section in sectionsModules" 
        :key="section.id"
        class="module-card"
        @click="$emit('naviguer', section.id)"
      >
        <div class="card-header">
          <div class="icon-circle" :style="{ backgroundColor: section.couleur + '20', color: section.couleur }">
            <span class="icon-symbol">{{ section.icone }}</span>
          </div>
          <span class="chevron">›</span>
        </div>

        <div class="card-body">
          <h4>{{ section.nom }}</h4>
          <p>{{ section.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  projectId: {
    type: [Number, String],
    required: true
  }
})

const emit = defineEmits(['naviguer'])

const sectionsModules = [
  { id: 'patients', nom: 'Patients', icone: '👥', couleur: '#6366f1', description: 'Gestion du répertoire patientèle' },
  { id: 'recapPatients', nom: 'Récap Patients', icone: '📊', couleur: '#14b8a6', description: 'Synthèse et statistiques par patient' },
  { id: 'seances', nom: 'Séances', icone: '📅', couleur: '#0d9488', description: 'Journal des rendez-vous et règlements' },
  { id: 'factures', nom: 'Factures', icone: '📄', couleur: '#f97316', description: 'Moteur de facturation' },
  { id: 'urssaf', nom: 'URSSAF', icone: '📈', couleur: '#22c55e', description: 'Calcul des cotisations par trimestre' }
]
</script>

<style scoped>
.accueil-container {
  padding: 10px;
}

.accueil-header {
  margin-bottom: 24px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
}

.status-dot.green {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #22c55e;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.module-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
  border-color: #cbd5e1;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.chevron {
  font-size: 20px;
  color: #cbd5e1;
  font-weight: 300;
}

.card-body h4 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.card-body p {
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
}
</style>