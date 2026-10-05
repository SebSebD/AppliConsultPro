<template>
  <div 
    class="tooltip-wrapper"
    @mouseenter="estSurvole = true"
    @mouseleave="estSurvole = false"
  >
    <slot />

    <div v-if="estSurvole" class="tooltip-bubble">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  message: {
    type: String,
    required: true
  }
})

const estSurvole = ref(false)
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 24px;
}

.tooltip-bubble {
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-right: 8px; /* Équivalent du offset x: -90 / décalage */
  z-index: 999;
  
  white-space: nowrap;
  font-size: 11px;
  padding: 4px 8px;
  background-color: #ffffff;
  color: #0f172a;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  pointer-events: none;
}
</style>


<!-- EXEMPLE D'UTILISATION :
<template>
  <TooltipSurvol message="Informations détaillées">
    <button class="btn-info">ℹ️</button>
  </TooltipSurvol>
</template>

<script setup>
import TooltipSurvol from './TooltipSurvol.vue'
</scr' + 'ipt>
-->