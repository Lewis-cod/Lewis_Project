import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    orderBy, 
    limit,
    getDocs,
    doc,
    setDoc,
    where 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// Function to generate next available customer ID
async function generateNextCustomerId() {
    try {
        const customersRef = collection(db, "customer");
        const q = query(customersRef, orderBy("customerID", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        
        let nextNumber = 1; // Start with 1 if no customers exist

        if (!querySnapshot.empty) {
            const lastCustomer = querySnapshot.docs[0].data();
            const lastNumber = parseInt(lastCustomer.customerID.replace('CS', ''));
            nextNumber = lastNumber + 1;
        }

        // Keep trying until we find an unused ID
        let isIdAvailable = false;
        let customerId = '';
        
        while (!isIdAvailable) {
            customerId = `CS${nextNumber.toString().padStart(4, '0')}`;
            
            // Check if this ID already exists
            const idQuery = query(customersRef, where("customerID", "==", customerId));
            const idSnapshot = await getDocs(idQuery);
            
            if (idSnapshot.empty) {
                isIdAvailable = true;
            } else {
                nextNumber++;
            }
        }

        return customerId;
    } catch (error) {
        console.error("Error generating customer ID:", error);
        throw error;
    }
}

// Add this function to validate password
function validatePassword(password) {
    // At least 8 characters long
    if (password.length < 8) {
        return {
            isValid: false,
            message: "Password must be at least 8 characters long"
        };
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
        return {
            isValid: false,
            message: "Password must contain at least one number"
        };
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
        return {
            isValid: false,
            message: "Password must contain at least one lowercase letter"
        };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        return {
            isValid: false,
            message: "Password must contain at least one uppercase letter"
        };
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return {
            isValid: false,
            message: "Password must contain at least one special character"
        };
    }

    return {
        isValid: true,
        message: "Password is valid"
    };
}

// Update the IC number validation function
function validateICNumber(input) {
    // Only allow numbers
    const numericValue = input.value.replace(/[^0-9]/g, '');
    
    // Update the input value only if it's different (prevents cursor jumping)
    if (input.value !== numericValue) {
        input.value = numericValue;
    }

    // Prevent paste of non-numeric characters
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numericPastedText = pastedText.replace(/[^0-9]/g, '');
        input.value = numericPastedText.slice(0, 12);
    });
}

// Update the validateName function
function validateName(input) {
    // Only allow letters and spaces, and limit to 30 characters
    const validValue = input.value.replace(/[^A-Za-z\s]/g, '').slice(0, 30);
    
    // Update the input value only if it's different
    if (input.value !== validValue) {
        input.value = validValue;
    }

    // Prevent paste of invalid characters
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const validPastedText = pastedText.replace(/[^A-Za-z\s]/g, '').slice(0, 30);
        input.value = validPastedText;
    });
}

// Add this function to validate email
function validateEmail(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
}

// Add this function to validate phone number
function validatePhone(input) {
    // Only allow numbers
    const numericValue = input.value.replace(/[^0-9]/g, '').slice(0, 11);
    
    // Update the input value only if it's different
    if (input.value !== numericValue) {
        input.value = numericValue;
    }

    // Prevent paste of non-numeric characters
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numericPastedText = pastedText.replace(/[^0-9]/g, '');
        input.value = numericPastedText.slice(0, 11);
    });
}

// Add to your existing DOMContentLoaded event listener
window.addEventListener('DOMContentLoaded', () => {
    // Existing IC number validation
    const icNumberInput = document.querySelector('input[name="icNumber"]');
    if (icNumberInput) {
        icNumberInput.addEventListener('keypress', (e) => {
            if (!/[\d]/.test(e.key)) {
                e.preventDefault();
            }
        });
    }

    // Add name input validation
    const nameInput = document.querySelector('input[name="fullName"]');
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            // Allow only letters and space
            if (!/[A-Za-z\s]/.test(e.key)) {
                e.preventDefault();
            }
        });
    }

    // Add phone input validation
    const phoneInput = document.querySelector('input[name="phone"]');
    if (phoneInput) {
        phoneInput.addEventListener('keypress', (e) => {
            // Allow only numbers
            if (!/[\d]/.test(e.key)) {
                e.preventDefault();
            }
        });
    }
});

console.log("customer_register.js loaded");

window.registerCustomer = async function() {
    console.log("Register button clicked"); 
    
    const icNumber = document.querySelector('input[name="icNumber"]').value;
    // Add IC number format validation
    if (!/^\d{12}$/.test(icNumber)) {
        alert('IC Number must be exactly 12 digits');
        return;
    }
    
    const fullName = document.querySelector('input[name="fullName"]').value;
    const gender = document.querySelector('select[name="gender"]').value;
    const email = document.querySelector('input[name="email"]').value;
    const phone = document.querySelector('input[name="phone"]').value;
    const password = document.querySelector('input[name="password"]').value;
    const confirmPassword = document.querySelector('input[name="confirmPassword"]').value;

    // Add email validation
    if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    // Add phone number length validation
    if (phone.length < 10 || phone.length > 11) {
        alert('Phone number must be between 10 and 11 digits');
        return;
    }

    console.log("Form data:", { icNumber, fullName, gender, email, phone }); 

    if (!icNumber || !fullName || !gender || !email || !phone || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        alert(passwordValidation.message);
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    try {
       
        const customerId = await generateNextCustomerId();
        console.log("Generated ID:", customerId); 
        const customerData = {
            customerID: customerId,
            cust_ic: icNumber,
            cust_name: fullName.toUpperCase(),
            cust_gender: gender,
            cust_email: email,
            cust_phone_no: phone,
            cust_password: password,
            cust_status: "active"
        };


        await setDoc(doc(db, "customer", customerId), customerData);
        console.log("Customer data saved"); 

        const successOverlay = document.getElementById('successOverlay');
        const customerIdSpan = document.getElementById('customerId');
        customerIdSpan.textContent = customerId;
        successOverlay.style.display = 'flex';

    } catch (error) {
        console.error("Registration error:", error);
        alert('Registration failed. Please try again.');
    }
};

window.redirectToLogin = function() {
    window.location.href = '/Funeral_Industry_Integration_System/Login_Register/customer_login.html';
};