// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA3QJpuhNnEtDivnLXc2BsX2ltcJ87bDHY",
    authDomain: "funeral-integrationsyste-3988c.firebaseapp.com",
    projectId: "funeral-integrationsyste-3988c",
    storageBucket: "funeral-integrationsyste-3988c.firebasestorage.app",
    messagingSenderId: "449055794833",
    appId: "1:449055794833:web:b68ec0d31dba9b77ce8130",
    measurementId: "G-25GELPQ29Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Update cart badge count
async function updateCartBadge() {
    try {
        const customerId = localStorage.getItem('custId');
        if (!customerId) return;

        const cartRef = collection(db, "cart");
        const q = query(cartRef, where("customerId", "==", customerId));
        const querySnapshot = await getDocs(q);
        
        let totalItems = 0;
        querySnapshot.forEach(doc => {
            const quantity = doc.data().quantity || 1;
            totalItems += parseInt(quantity);
        });

        const badge = document.getElementById('cartBadge');
        if (badge) {
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error("Error updating cart badge:", error);
    }
}

// Make updateCartBadge available globally
window.updateCartBadge = updateCartBadge;

// Update cart badge when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await updateCartBadge();
}); 