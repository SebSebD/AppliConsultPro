<template>
  <div class="urssaf-container card">
    <h3>URSSAF - Récapitulatif des recettes</h3>

    <!-- Section Trimestres -->
    <div class="urssaf-section">
      <h4>Récapitulatif par trimestre ({{ anneeCourante }})</h4>
      <div class="table-rows">
        <div class="urssaf-row">
          <span>Trimestre 1 (Janvier - Mars)</span>
          <strong>{{ totalTrimestre1.toFixed(2) }} €</strong>
        </div>
        <div class="urssaf-row">
          <span>Trimestre 2 (Avril - Juin)</span>
          <strong>{{ totalTrimestre2.toFixed(2) }} €</strong>
        </div>
        <div class="urssaf-row">
          <span>Trimestre 3 (Juillet - Septembre)</span>
          <strong>{{ totalTrimestre3.toFixed(2) }} €</strong>
        </div>
        <div class="urssaf-row">
          <span>Trimestre 4 (Octobre - Décembre)</span>
          <strong>{{ totalTrimestre4.toFixed(2) }} €</strong>
        </div>
      </div>
    </div>

    <!-- Section Total Annuel -->
    <div class="urssaf-section total-section">
      <h4>Total Annuel</h4>
      <div class="urssaf-row total-row">
        <span>Chiffre d'affaires brut</span>
        <strong class="total-amount">{{ totalAnnuel.toFixed(2) }} €</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../db.js'

const seances = ref([])
const anneeCourante = new Date().getFullYear()

const chargerDonnees = async () => {
  seances.value = await db.seances.toArray()
}

const seancesAnnee = computed(() => {
  return seances.value.filter(s => {
    if (!s.date) return false
    return new Date(s.date).getFullYear() === anneeCourante
  })
})

const totalPourTrimestre = (tMinMois, tMaxMois) => {
  return seancesAnnee.value
    .filter(s => {
      const mois = new Date(s.date).getMonth() + 1
      return mois >= tMinMois && mois <= tMaxMois
    })
    .reduce((sum, s) => sum + (Number(s.montant) || 0), 0)
}

const totalTrimestre1 = computed(() => totalPourTrimestre(1, 3))
const totalTrimestre2 = computed(() => totalPourTrimestre(4, 6))
const totalTrimestre3 = computed(() => totalPourTrimestre(7, 9))
const totalTrimestre4 = computed(() => totalPourTrimestre(10, 12))

const totalAnnuel = computed(() => {
  return seancesAnnee.value.reduce((sum, s) => sum + (Number(s.montant) || 0), 0)
})

onMounted(() => {
  chargerDonnees()
})
</script>

<style scoped>
.urssaf-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.urssaf-section {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 18px;
  background-color: #f8fafc;
}

.urssaf-section h4 {
  font-size: 14px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 12px;
}

.table-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.urssaf-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #1e293b;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.urssaf-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.total-section {
  background-color: #eff6ff;
  border-color: #bfdbfe;
}

.total-row {
  border-bottom: none;
  font-size: 16px;
}

.total-amount {
  font-size: 20px;
  color: #16a34a;
}
</style>