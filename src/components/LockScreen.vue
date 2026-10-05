<script setup>
import { ref } from 'vue'

const emit = defineEmits(['authenticated'])
const password = ref('')
const error = ref(false)

// 🔑 Définis ici ton mot de passe personnel
const CORRECT_PASSWORD = 'dodo' 

const handleLogin = () => {
  if (password.value === CORRECT_PASSWORD) {
    error.value = false
    // On enregistre de façon persistante dans le navigateur
    localStorage.setItem('app_authenticated', 'true')
    // On prévient le composant parent que l'accès est autorisé
    emit('authenticated')
  } else {
    error.value = true
  }
}
</script>

<template>
  <div class="lock-container">
    <div class="lock-card">
      <h2>🔒 Espace Sécurisé</h2>
      <p>Veuillez entrer le mot de passe pour accéder à AppliConsultPro.</p>
      
      <form @submit.prevent="handleLogin" class="lock-form">
        <input 
          type="password" 
          v-model="password" 
          placeholder="Mot de passe..." 
          class="lock-input"
          autofocus
        />
        <button type="submit" class="lock-btn">Valider</button>
      </form>
      
      <p v-if="error" class="error-msg">Mot de passe incorrect.</p>
    </div>
  </div>
</template>

<style scoped>
.lock-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-color: #f1f5f9;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
}

.lock-card {
  background: white;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.lock-card h2 {
  margin-bottom: 0.5rem;
  color: #1e293b;
}

.lock-card p {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 1.5rem;
}

.lock-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lock-input {
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.lock-input:focus {
  border-color: #3b82f6;
}

.lock-btn {
  padding: 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.lock-btn:hover {
  background-color: #2563eb;
}

.error-msg {
  color: #ef4444;
  font-size: 13px;
  margin-top: 10px;
}
</style>