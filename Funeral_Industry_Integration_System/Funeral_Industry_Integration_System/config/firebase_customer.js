// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, where, getDocs, query } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// Customer login function
async function loginCustomer(cust_id, password) {
    try {
        // Convert inputs to uppercase
        cust_id = cust_id.toUpperCase();
        password = password.toUpperCase();

        console.log("Attempting login with:", cust_id);
        
        // Query by customerID field
        const customersRef = collection(db, "customer");
        const q = query(customersRef, where("customerID", "==", cust_id));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const custDoc = querySnapshot.docs[0];
            const data = custDoc.data();
            console.log("Retrieved data:", data);
            
            // Check if account is inactive
            if (data.cust_status && data.cust_status.toLowerCase() === "inactive") {
                // Create and show overlay
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                `;

                const message = document.createElement('div');
                message.style.cssText = `
                    background: white;
                    padding: 20px;
                    border-radius: 5px;
                    text-align: center;
                `;
                message.innerHTML = `
                    <h3>Account Deactivated</h3>
                    <p>This account has been deactivated and cannot be accessed.</p>
                    <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px;">Close</button>
                `;

                overlay.appendChild(message);
                document.body.appendChild(overlay);
                return false;
            }
            
            // Compare passwords (convert stored password to uppercase)
            if (data.cust_password.toUpperCase() === password) {
                // Store the document ID and customerID
                localStorage.setItem("custId", data.customerID);  // Store the customerID field
                localStorage.setItem("custName", data.cust_name);
                
                window.location.href = "/Funeral_Industry_Integration_System/Customer/index.html";
                return true;
            } else {
                console.log("Password mismatch");
            }
        }
        alert("Invalid user ID or password");
        return false;
    } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred during login");
        return false;
    }
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const loginButton = document.querySelector('.cust-signin-button');
    const custIdInput = document.querySelector('.user-input');
    const passwordInput = document.querySelector('.pass-input');
    
    loginButton.addEventListener('click', async function(e) {
        e.preventDefault();

        // Get input values
        const cust_id = custIdInput.value.trim();
        const password = passwordInput.value.trim();

        // Basic validation
        if (!cust_id || !password) {
            alert('Please enter both id and password');
            return;
        }

        // Disable button while processing
        loginButton.disabled = true;

        try {
            // Call login function
            await loginCustomer(cust_id, password);
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login');
        } finally {
            // Re-enable button
            loginButton.disabled = false;
        }
    });

    // Optional: Add enter key support for password field
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginButton.click();
        }
    });
});
