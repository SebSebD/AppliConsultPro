import Dexie from 'dexie'

export const db = new Dexie('AppliDodoDB')

// 
db.version(2).stores({
    patients: '++id, numero, nom, prenom, email, telephone',
    seances: '++id, patientId, date, montant, moyenPaiement, numeroFacture',
    factures: '++id, patientId, date, montant, payee'
})