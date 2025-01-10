// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, updateDoc, collection, getDocs, setDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA3QJpuhNnEtDivnLXc2BsX2ltcJ87bDHY",
    authDomain: "funeral-integrationsyste-3988c.firebaseapp.com",
    projectId: "funeral-integrationsyste-3988c",
    storageBucket: "funeral-integrationsyste-3988c.firebasestorage.app",
    messagingSenderId: "449055794833",
    appId: "1:449055794833:web:b68ec0d31dba9b77ce8130",
    measurementId: "G-25GELPQ29Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Validation Functions
function showError(message) {
    const validationDiv = document.getElementById('validation-message');
    const errorText = validationDiv.querySelector('.error-text');
    if (validationDiv && errorText) {
        errorText.textContent = message;
        validationDiv.style.display = 'block';
        setTimeout(() => validationDiv.style.display = 'none', 3000);
    }
}

function validateForm() {
    // Check terms agreement
    if (!document.getElementById('termsCheckbox').checked) {
        showError('Please agree to the terms and conditions');
        return false;
    }

    // Validate card name
    const cardName = document.getElementById('card-name').value.trim();
    if (!cardName || !/^[A-Za-z ]+$/.test(cardName)) {
        showError('Please enter a valid name');
        return false;
    }

    // Validate card number
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    if (!cardNumber || cardNumber.length !== 16) {
        showError('Please enter a valid 16-digit card number');
        return false;
    }

    // Validate expiry date
    const expiry = document.getElementById('expiry').value;
    if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) {
        showError('Please enter a valid expiry date (MM/YY)');
        return false;
    }

    // Check expiry date is valid
    const [month, year] = expiry.split('/').map(num => parseInt(num));
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    if (month < 1 || month > 12) {
        showError('Invalid month in expiry date');
        return false;
    }

    if (year < currentYear || year > currentYear + 10) {
        showError('Expiry year must be between current year and next 10 years');
        return false;
    }

    if (year === currentYear && month < currentMonth) {
        showError('Card has expired');
        return false;
    }

    // Validate CVV
    const cvv = document.getElementById('cvv').value;
    if (!cvv || !/^\d{3}$/.test(cvv)) {
        showError('Please enter a valid 3-digit CVV');
        return false;
    }

    return true;
}

// Input Formatting
document.addEventListener('DOMContentLoaded', () => {
    // Format card number: Add space every 4 digits
    document.getElementById('card-number').addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        e.target.value = value.replace(/(\d{4})/g, '$1 ').trim();
    });

    // Format expiry date: MM/YY
    document.getElementById('expiry').addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4);
        }
        e.target.value = value;
    });

    // Format CVV: Only numbers, max 3 digits
    document.getElementById('cvv').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
    });

    // Format card name: Only letters and spaces
    document.getElementById('card-name').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^A-Za-z ]/g, '').replace(/\s+/g, ' ');
    });

    // Add form submit handler
    const form = document.getElementById('payment-form');
    if (form) {
        form.addEventListener('submit', handlePaymentSubmit);
    }
});

// Payment Processing
async function generatePaymentId() {
    const paymentRef = collection(db, "payments");
    const querySnapshot = await getDocs(paymentRef);
    let maxNumber = 0;
    
    querySnapshot.forEach(doc => {
        const paymentID = doc.data().paymentID;
        if (paymentID?.startsWith('PY')) {
            const number = parseInt(paymentID.slice(2));
            if (number > maxNumber) maxNumber = number;
        }
    });
    
    return `PY${(maxNumber + 1).toString().padStart(4, '0')}`;
}

async function handlePaymentSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) return;

    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';
    
    try {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        const providerID = localStorage.getItem('providerID');
        if (!providerID) throw new Error('Provider ID not found');

        // Create payment record
        const now = new Date();
        const paymentId = await generatePaymentId();
        const paymentData = {
            paymentID: paymentId,
            providerID: providerID,
            payment_type: 'Membership',
            payment_amount: 1999.00,
            payment_method: 'Credit Card',
            payment_date: now.toISOString().split('T')[0],
            payment_time: now.toTimeString().split(' ')[0],
            payment_status: 'Completed',
            card_last_four: document.getElementById('card-number').value.slice(-4)
        };

        // Save payment record
        await setDoc(doc(db, "payments", paymentId), paymentData);

        // Update provider status
        const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await updateDoc(doc(db, "service_provider", providerID), {
            membership_status: 'active',
            membership_expiry: expiryDate,
            last_payment_date: now,
            last_payment_id: paymentId
        });

        loadingOverlay.style.display = 'none';
        document.getElementById('successOverlay').style.display = 'flex';

    } catch (error) {
        console.error('Payment error:', error);
        loadingOverlay.style.display = 'none';
        showError('Payment failed. Please try again.');
    }
}
