import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// ===== Utility Functions =====
function showOverlay(message, type = 'success') {
    const overlay = document.getElementById('overlay-message');
    const content = overlay.querySelector('.overlay-content');
    const icon = overlay.querySelector('.material-symbols-outlined');
    const text = overlay.querySelector('.overlay-text');
    
    // Set icon and class based on type
    switch(type) {
        case 'success':
            icon.textContent = 'check_circle';
            content.className = 'overlay-content success';
            break;
        case 'error':
            icon.textContent = 'error';
            content.className = 'overlay-content error';
            break;
        case 'info':
            icon.textContent = 'info';
            content.className = 'overlay-content info';
            break;
    }
    
    text.textContent = message;
    overlay.style.display = 'flex';
    
    const closeBtn = overlay.querySelector('.overlay-close');
    closeBtn.onclick = () => overlay.style.display = 'none';
}

// ===== Data Loading Functions =====
async function loadProfileData() {
    try {
        const providerId = localStorage.getItem('providerID');
        if (!providerId) {
            window.location.href = '/Funeral_Industry_Integration_System/Login_Register/serviceProvider-loginPage.html';
            return;
        }

        const providerDoc = await getDoc(doc(db, "service_provider", providerId));
        if (providerDoc.exists()) {
            const data = providerDoc.data();
            
            // Update form fields
            const fields = {
                'providerId': data.provider_ID,
                'companyName': data.provider_companyName,
                'businessAddress': data.business_Address,
                'serviceType': data.service_Type,
                'contact': data.provider_Contact,
                'email': data.provider_email,
                'businessLicense': data.business_License,
                'accountStatus': (data.provider_Status || '').toUpperCase(),
                'partnerStatus': (data.partner_Status || '').toUpperCase()
            };

            // Update all fields
            Object.entries(fields).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                    if (id === 'accountStatus' || id === 'partnerStatus') {
                        element.className = 'status-input';
                        element.setAttribute('value', value);
                    }
                }
            });

            const stateSelect = document.getElementById('businessState');
            if (stateSelect) {
                const state = data.business_state;
                const options = stateSelect.options;
                for (let i = 0; i < options.length; i++) {
                    if (options[i].value === state) {
                        stateSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        showOverlay("Error loading profile data", 'error');
    }
}

// ===== Profile Interaction Functions =====
function setupEditFunctionality() {
    const editButton = document.getElementById('editButton');
    const saveButton = document.querySelector('.save-button');
    const form = document.querySelector('.profile-info');
    const inputFields = document.querySelectorAll('#companyName, #businessAddress, #businessState, #contact, #email');
    let isEditing = false;
    let originalValues = {};

    // Save button handler
    saveButton.addEventListener('click', async function(e) {
        e.preventDefault();
        if (!isEditing) {
            showOverlay('Please click Edit to make changes', 'error');
            return;
        }

        try {
            const providerId = localStorage.getItem('providerID');
            if (!providerId) throw new Error('no provider ID found');

            const contact = document.getElementById('contact').value.trim();
            const email = document.getElementById('email').value.trim();

            // add validation
            if (!validateContact(contact)) return;
            if (!validateEmail(email)) return;

            const updatedData = {
                provider_companyName: document.getElementById('companyName').value.trim(),
                business_Address: document.getElementById('businessAddress').value.trim(),
                business_state: document.getElementById('businessState').value.trim(),
                provider_Contact: contact,
                provider_email: email
            };

            // update database
            const docRef = doc(db, "service_provider", providerId);
            await updateDoc(docRef, updatedData);

            // update UI
            showOverlay("Profile updated successfully", 'success');
            inputFields.forEach(field => {
                field.disabled = true;
                originalValues[field.id] = field.value;
            });
            
            editButton.innerHTML = '<span class="material-symbols-outlined">edit</span>Edit';
            editButton.classList.remove('cancel');
            saveButton.style.display = 'none';
            isEditing = false;

        } catch (error) {
            console.error("Error updating profile:", error);
            showOverlay("Error updating profile", 'error');
        }
    });

    // Edit button handler
    editButton.addEventListener('click', function() {
        if (!isEditing) {
            // Enable editing
            inputFields.forEach(field => {
                field.disabled = false;
                originalValues[field.id] = field.value;
            });
            editButton.innerHTML = '<span class="material-symbols-outlined">close</span>Cancel';
            editButton.classList.add('cancel');
            saveButton.style.display = 'flex';
            isEditing = true;
        } else {
            // Cancel editing
            inputFields.forEach(field => {
                field.disabled = true;
                field.value = originalValues[field.id];
            });
            editButton.innerHTML = '<span class="material-symbols-outlined">edit</span>Edit';
            editButton.classList.remove('cancel');
            saveButton.style.display = 'none';
            isEditing = false;
        }
    });

    // Prevent form submission
    form.addEventListener('submit', e => e.preventDefault());
}

function setupPasswordChange() {
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordFields = document.querySelector('.password-fields');
    const cancelPasswordBtn = document.querySelector('.cancel-password-button');
    const savePasswordBtn = document.querySelector('.save-password-button');

    // Show password fields
    changePasswordBtn?.addEventListener('click', () => {
        passwordFields.style.display = 'block';
        changePasswordBtn.style.display = 'none';
    });

    // Cancel password change
    cancelPasswordBtn?.addEventListener('click', () => {
        passwordFields.style.display = 'none';
        changePasswordBtn.style.display = 'flex';
        ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
            document.getElementById(id).value = '';
        });
    });

    // Save password
    savePasswordBtn?.addEventListener('click', async () => {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // add validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            showOverlay('Please fill in all password fields', 'error');
            return;
        }

        if (!validatePassword(newPassword)) {
            return;
        }

        if (newPassword !== confirmPassword) {
            showOverlay("New passwords don't match", 'error');
            return;
        }

        try {
            const providerId = localStorage.getItem('providerID');
            const docRef = doc(db, "service_provider", providerId);
            const docSnap = await getDoc(docRef);
            const data = docSnap.data();

            if (data.password !== currentPassword) {
                showOverlay("Current password is incorrect", 'error');
                return;
            }

            await updateDoc(docRef, { password: newPassword });

            // reset UI
            showOverlay("Password updated successfully", 'success');
            passwordFields.style.display = 'none';
            changePasswordBtn.style.display = 'flex';
            ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
                document.getElementById(id).value = '';
            });
        } catch (error) {
            console.error("Error updating password:", error);
            showOverlay("Error updating password", 'error');
        }
    });

    // password visibility toggle 
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type');
            
            if (type === 'password') {
                input.setAttribute('type', 'text');
                this.textContent = 'visibility_off';
            } else {
                input.setAttribute('type', 'password');
                this.textContent = 'visibility';
            }
        });
    });
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', function() {
    loadProfileData();
    setupEditFunctionality();
    setupPasswordChange();
}); 

function validateContact(contact) {
    //  phone number format
    const contactRegex = /^(01\d{8,9})$/;
    if (!contactRegex.test(contact)) {
        showOverlay("Contact number format invalid. Format: 01xxxxxxxx (9-10 digits)", 'error');
        return false;
    }
    return true;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showOverlay("Please enter a valid email address", 'error');
        return false;
    }
    return true;
}

function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        showOverlay("Password must be at least 8 characters long, containing uppercase and lowercase letters, numbers, and special characters (@$!%*?&)", 'error');
        return false;
    }
    return true;
} 