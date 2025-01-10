// ===== Firebase Configuration =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { sendProviderRegistrationEmail } from '/Funeral_Industry_Integration_System/Login_Register/assets/javascript/emailVerify.js';

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

// ===== Utility Functions =====
function showError(message, error = null) {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    console.error(message, error);
    alert(errorMessage);
}

// ===== Service Provider ID Generation =====
async function generateServiceProviderID() {
    const prefix = "SP";
    
    try {
        const providerList = await getDocs(collection(db, "service_provider"));
        
        let maxNumber = 0;
        providerList.forEach(doc => {
            const providerID = doc.data().provider_ID;
            if (providerID && providerID.startsWith(prefix)) {
                const number = parseInt(providerID.slice(2));
                if (!isNaN(number) && number > maxNumber) {
                    maxNumber = number;
                }
            }
        });

        const newNumber = maxNumber + 1;
        return `${prefix}${newNumber.toString().padStart(4, '0')}`;
    } catch (error) {
        showError("Could not generate provider ID", error);
        return null;
    }
}

// ===== Form Data Handling =====
function getServiceProviderFormData(providerID, form) {
    const serviceType = form.service_Type.value;
    if (!serviceType) {
        throw new Error('Please select a service type');
    }

    return {
        provider_ID: providerID,
        provider_companyName: form.provider_companyName.value,
        business_Address: form.business_Address.value,
        business_state: form.business_state.value,
        provider_Contact: form.provider_Contact.value,
        provider_Status: 'Active',
        partner_Status: 'Pending',
        business_License: form.business_License.value,
        service_Type: serviceType,
        provider_email: form.provider_email.value,
        password: form.password.value,
        created_At: new Date().toISOString(),
        updated_At: new Date().toISOString()
    };
}

// ===== Database Operations =====
async function saveServiceProvider(providerID, providerData) {
    try {
        await setDoc(doc(db, "service_provider", providerID), providerData);
        return true;
    } catch (error) {
        showError("Save failed", error);
        return false;
    }
}

// ===== Authentication Functions =====
async function loginServiceProvider(providerID, password) {
    try {
        const providerDoc = await getDoc(doc(db, "service_provider", providerID));

        if (providerDoc.exists()) {
            const data = providerDoc.data();
            
            if (data.password.toUpperCase() === password.toUpperCase()) {
                if (data.provider_Status?.toLowerCase() !== 'active') {
                    showError("This account is not activated, please contact the administrator.");
                    return false;
                }

                localStorage.setItem("providerID", data.provider_ID);
                localStorage.setItem("providerName", data.provider_companyName);
                localStorage.setItem("providerType", data.service_Type);
                localStorage.setItem("partnerStatus", data.partner_Status);
                
                window.location.href = "/Funeral_Industry_Integration_System/Service_Provider/serviceProviderDashboardPage.html";
                return true;
            }
        }
        showError("Invalid provider ID or password");
        return false;
    } catch (error) {
        console.error("Login error:", error);
        showError("Login failed", error);
        return false;
    }
}

// ===== Registration Functions =====
async function addNewServiceProvider(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const requiredFields = [
            'provider_companyName',
            'business_Address',
            'business_License',
            'provider_Contact',
            'service_Type',
            'provider_email',
            'password',
            'confirmPassword'
        ];

        // Validate required fields
        for (const field of requiredFields) {
            if (!form[field].value.trim()) {
                throw new Error(`Please fill in ${field.replace('_', ' ')}`);
            }
        }

        // validate password
        const password = form.password.value;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            throw new Error('password must be at least 8 characters, include uppercase and lowercase letters, numbers, and special characters (@$!%*?&)');
        }

        // validate password match
        if (password !== form.confirmPassword.value) {
            throw new Error('The passwords you entered do not match');
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.provider_email.value)) {
            throw new Error('Please enter a valid email address');
        }

        // Validate phone number
        const phoneRegex = /^\d{8,15}$/;
        if (!phoneRegex.test(form.provider_Contact.value)) {
            throw new Error('Please enter a valid contact number');
        }

        const providerID = await generateServiceProviderID();
        if (!providerID) {
            throw new Error('Could not generate provider ID');
        }

        const providerData = getServiceProviderFormData(providerID, form);
        await saveServiceProvider(providerID, providerData);
        
        // send registration confirmation email
        console.log('Sending registration email with:', {
            email: form.provider_email.value,
            providerID: providerID,
            password: form.password.value
        });

        await sendProviderRegistrationEmail(
            form.provider_email.value,
            providerID,
            form.password.value
        );
        
        alert(`Registration successful!\nYour Service Provider ID: ${providerID}\nPlease save this ID for login.`);
        window.location.href = '/Funeral_Industry_Integration_System/Login_Register/serviceProvider-loginPage.html';
        
    } catch (error) {
        alert(error.message || 'Registration failed. Please try again.');
        console.error("Registration error:", error);
    }
}

// ===== Business Form Functions =====
async function submitBusinessForm(event) {
    event.preventDefault();
    
    try {
        const providerID = localStorage.getItem('providerID');
        if (!providerID) {
            alert('Please login first');
            return;
        }

        const businessData = {
            business_Name: event.target.querySelector('input[type="text"]').value,
            business_Address: event.target.querySelector('textarea').value,
            business_LicenseNumber: event.target.querySelector('input[type="text"]:nth-of-type(2)').value,
            business_Contact: event.target.querySelector('input[type="tel"]').value,
            business_Email: event.target.querySelector('input[type="email"]').value,
            services_Offered: Array.from(document.querySelectorAll('.service-item input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value),
            business_Status: 'Pending Review',
            partner_Status: 'Pending',
            updated_At: new Date().toISOString()
        };

        await updateDoc(doc(db, "service_provider", providerID), businessData);
        
        alert('Business information submitted successfully! Your application is pending review.');
        window.location.href = '/Funeral_Industry_Integration_System/Service_Provider/serviceProviderDashboardPage.html';
        
    } catch (error) {
        console.error("Error updating business information:", error);
        alert('Failed to submit business information. Please try again.');
    }
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', function() {
    // Service provider signup form handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', addNewServiceProvider);
    }

    // Service provider login handler
    const signinButton = document.querySelector('.service-provider-signin-button');
    if (signinButton) {
        signinButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const providerID = document.querySelector('.user-input').value;
            const password = document.querySelector('.pass-input').value;

            if (!providerID || !password) {
                alert('Please enter both provider ID and password');
                return;
            }

            await loginServiceProvider(providerID, password);
        });
    }

    // Business form handler
    const businessForm = document.getElementById('partnershipForm');
    if (businessForm) {
        businessForm.addEventListener('submit', submitBusinessForm);
    }
});

// ===== Exports =====
export {
    // Authentication
    loginServiceProvider,
    
    // Registration
    addNewServiceProvider,
    
    // Business Form
    submitBusinessForm,
    
    // Database Operations
    saveServiceProvider,
    
    // Utility Functions
    showError,
    
    // Firebase Instance 
    db
}; 