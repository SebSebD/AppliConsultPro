<template>
  <div class="accueil-container">
    <!-- Barre supérieure : Message de sauvegarde + Bouton Forcer la mise à jour -->
    <div class="sauvegarde-bar">
      <p v-if="dateDerniereSauvegarde" class="sauvegarde-info">
        {{ dateDerniereSauvegarde }}
      </p>

      <button 
        type="button" 
        class="btn-refresh" 
        @click="forcerMiseAJour"
        title="Vider le cache et forcer la mise à jour de l'application"
      >
        🔄 Forcer la mise à jour
      </button>
    </div>

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
  },
  dateDerniereSauvegarde: {
    type: String,
    default: ''
  }
}) // <-- C'EST CETTE FERMETURE QUI MANQUAIT CHEZ VOUS

const emit = defineEmits(['naviguer'])

const forcerMiseAJour = async () => {
  try {
    // 1. Désinstaller tous les Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
      }
    }

    // 2. Vider les caches de l'application
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }

    // 3. Forcer le rechargement de la page
    window.location.reload(true)
  } catch (e) {
    console.error('Erreur lors du nettoyage :', e)
    window.location.reload()
  }
}

const sectionsModules = [
  { id: 'patients', nom: 'Patients', icone: '👥', couleur: '#1fcfc6', description: 'Gestion du répertoire patientèle' },
  { id: 'recapPatients', nom: 'Récap Patients', icone: '📊', couleur: '#1f91cf', description: 'Synthèse et statistiques par patient' },
  { id: 'seances', nom: 'Séances', icone: '📅', couleur: '#f2cc0f', description: 'Journal des rendez-vous et règlements' },
  { id: 'factures', nom: 'Factures', icone: '📄', couleur: '#f27d0f', description: 'Moteur de facturation' },
  { id: 'urssaf', nom: 'URSSAF', icone: '📈', couleur: '#34f20f', description: 'Calcul des cotisations par trimestre' }
]
</script>

<style scoped>
.accueil-container {
  padding: 10px;
}

/* Style discret pour le message de sauvegarde au-dessus de la grille */
.sauvegarde-info {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
  padding: 8px 14px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: inline-block;
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

.sauvegarde-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

/* On ajuste sauvegarde-info pour qu'il prenne moins de marge verticale */
.sauvegarde-info {
  font-size: 13px;
  color: #64748b;
  padding: 8px 14px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 0;
}

/* Style du bouton de rafraîchissement */
.btn-refresh {
  background-color: white;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-refresh:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}
</style>