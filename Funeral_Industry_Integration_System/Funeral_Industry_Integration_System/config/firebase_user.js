// =====  FIREBASE INITIALIZATION =====
// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { sendRegistrationEmail } from '/Funeral_Industry_Integration_System/Login_Register/assets/javascript/emailVerify.js';

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

// ===== HELPER FUNCTIONS =====
function showError(message, error = null) {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    console.error(message, error);
    alert(errorMessage);
}

function validateIdentityNo(identityNo) {
    // IC format
    const idRegex = /^\d{6}-\d{2}-\d{4}$/;
    if (!idRegex.test(identityNo)) {
        showError("IC format is invalid. Correct format: YYMMDD-PB-XXXX");
        return false;
    }
    return true;
}

function validatePasswordStrength(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.classList.add('error');
        }
        showError("Password must be at least 8 characters long and include the following types: uppercase letters, lowercase letters, numbers, and special characters (@$!%*?&)");
        return false;
    }
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.classList.remove('error');
    }
    return true;
}

function validatePassword(password, confirmPassword) {
    if (!validatePasswordStrength(password)) {
        return false;
    }
    if (password !== confirmPassword) {
        const confirmInput = document.getElementById('confirmPassword');
        if (confirmInput) {
            confirmInput.classList.add('error');
        }
        showError("Passwords do not match");
        return false;
    }
    const confirmInput = document.getElementById('confirmPassword');
    if (confirmInput) {
        confirmInput.classList.remove('error');
    }
    return true;
}

function validateContact(contact) {
    const contactRegex = /^(01\d{8,9})$/;  // Malaysian phone format
    if (!contactRegex.test(contact)) {
        const contactInput = document.getElementById('contact');
        if (contactInput) {
            contactInput.classList.add('error');
        }
        showError("Contact number format is invalid. Format: 01xxxxxxxx (9-10 digits)");
        return false;
    }
    const contactInput = document.getElementById('contact');
    if (contactInput) {
        contactInput.classList.remove('error');
    }
    return true;
}

// ===== DATA HANDLING FUNCTIONS =====
function getStaffFormData(staffID, form) {
    return {
        user_ID: staffID,
        user_Name: form.staffName.value,
        user_IdentityNo: form.identityNo.value,
        user_Gender: form.gender.value,
        user_Contact: form.contact.value,
        user_Position: form.position.value,
        user_Email: form.email.value,
        user_Status: form.status.value,
        user_Password: form.password.value
    };
}

async function saveStaff(staffID, staffData) {
    try {
        await setDoc(doc(db, "users", staffID), staffData);
        return true;
    } catch (error) {
        showError("Failed to save staff", error);
        return false;
    }
}

// ===== AUTHENTICATION =====
async function loginUser(userId, password) {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        
        if (!userDoc.exists()) {
            alert("Invalid user ID or password");
            return false;
        }

        const userData = userDoc.data();
        
        if (userData.user_Password !== password) {
            alert("Invalid user ID or password");
            return false;
        }

        if (userData.user_Status?.toLowerCase() !== 'active') {
            alert("This account is not activated, please contact administrator");
            return false;
        }

        localStorage.setItem("userId", userData.user_ID);
        localStorage.setItem("userName", userData.user_Name);
        localStorage.setItem("userRole", userData.user_Position);

        // based on position
        const redirectPaths = {
            'admin': "/Funeral_Industry_Integration_System/Administration/admin_dashboard/adminStaffManagementPage.html",
            'manager': "/Funeral_Industry_Integration_System/Administration/manager_dashboard/managerStaffManagementPage.html",
            'staff': "/Funeral_Industry_Integration_System/Administration/staff_dashboard/staffServiceProviderManagementPage.html"
        };

        const redirectPath = redirectPaths[userData.user_Position];
        if (redirectPath) {
            window.location.href = redirectPath;
            return true;
        } else {
            showError("Invalid user position");
            return false;
        }
    } catch (error) {
        showError("Login failed", error);
        return false;
    }
}

// ===== ADMIN MANAGEMENT =====
async function generateAdminID() {
    const prefix = "UA";
    try {
        const userList = await getDocs(collection(db, "users"));
        let maxNumber = 0;
        
        userList.forEach(doc => {
            const userID = doc.data().user_ID;
            if (userID?.startsWith(prefix)) {
                const number = parseInt(userID.slice(2));
                if (number > maxNumber) maxNumber = number;
            }
        });

        return prefix + (maxNumber + 1).toString().padStart(4, '0');
    } catch (error) {
        showError("Failed to generate admin ID", error);
        return null;
    }
}

async function checkAdminExists() {
    try {
        const q = query(collection(db, "users"), where("user_Position", "==", "admin"));
        const querySnapshot = await getDocs(q);
        
        const adminInitSection = document.querySelector('.admin-init-section');
        if (adminInitSection) {
            adminInitSection.style.display = querySnapshot.empty ? 'block' : 'none';
        }
    } catch (error) {
        showError("Error checking admin existence", error);
    }
}

async function registerAdmin(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        
        if (!form.companyName.value || !form.identityNo.value || 
            !form.contact.value || !form.email.value || 
            !form.password.value || !form.confirmPassword.value) {
            showError("Please fill in all required fields");
            return;
        }

        if (!validateIdentityNo(form.identityNo.value)) {
            return;
        }

        if (!validatePassword(form.password.value, form.confirmPassword.value)) {
            return;
        }

        const adminID = await generateAdminID();
        if (!adminID) {
            throw new Error("Failed to generate admin ID");
        }

        const adminData = {
            user_ID: adminID,
            user_Name: "Administrator",
            user_IdentityNo: form.identityNo.value,
            user_Contact: form.contact.value,
            user_Email: form.email.value,
            user_Status: "Active",
            user_Position: "admin",
            user_Password: form.password.value,
            company_Name: form.companyName.value,
            company_Type: "Third Party Platform",
            created_At: new Date().toISOString()
        };

        if (await saveStaff(adminID, adminData)) {
            await sendRegistrationEmail(
                form.email.value,
                adminID,
                form.password.value
            );
            
            alert(`Admin account registration successful!\nAdmin ID: ${adminID}\nPlease save this ID for login.`);
            window.location.href = '/Funeral_Industry_Integration_System/Login_Register/admin-loginPage.html';
        }
    } catch (error) {
        showError("Failed to register admin", error);
    }
}

// ===== STAFF MANAGEMENT =====
async function generateStaffID(position) {
    const prefix = position === "manager" ? "UM" : "US";
    try {
        const staffList = await getDocs(
            query(collection(db, "users"), 
            where("user_Position", "==", position))
        );

        let maxNumber = 0;
        staffList.forEach(doc => {
            const staffID = doc.data().user_ID;
            if (staffID?.startsWith(prefix)) {
                const number = parseInt(staffID.slice(2));
                if (number > maxNumber) maxNumber = number;
            }
        });

        return prefix + (maxNumber + 1).toString().padStart(4, '0');
    } catch (error) {
        showError("Failed to generate staff ID", error);
        return null;
    }
}

async function addNewStaff(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        
        if (!validateIdentityNo(form.identityNo.value)) {
            return;
        }

        if (!validateContact(form.contact.value)) {
            return;
        }

        const currentUserRole = localStorage.getItem('userRole');
        const position = currentUserRole === 'manager' ? 'staff' : document.getElementById('position').value;
        
        const staffID = await generateStaffID(position);
        if (!staffID) return;

        const staffData = getStaffFormData(staffID, form);
        staffData.user_Position = position;
        
        if (!validatePassword(staffData.user_Password, form.confirmPassword.value)) {
            return;
        }
        
        if (await saveStaff(staffID, staffData)) {
            alert(`Staff added successfully!\nStaff ID: ${staffID}`);
            window.location.href = currentUserRole === 'manager'
                ? '/Funeral_Industry_Integration_System/Administration/manager_dashboard/managerStaffManagementPage.html'
                : '/Funeral_Industry_Integration_System/Administration/admin_dashboard/adminStaffManagementPage.html';
        }
    } catch (error) {
        showError("Failed to add staff", error);
    }
}

async function loadStaffData() {
    try {
        const staffId = sessionStorage.getItem('editStaffId');
        const currentUserRole = localStorage.getItem('userRole');
        const basePath = currentUserRole === 'manager'
            ? '/Funeral_Industry_Integration_System/Administration/manager_dashboard'
            : '/Funeral_Industry_Integration_System/Administration/admin_dashboard';
        
        if (!staffId) {
            showError("No staff selected");
            window.location.href = `${basePath}/managerStaffManagementPage.html`;
            return;
        }

        const staffDoc = await getDoc(doc(db, "users", staffId));
        
        if (!staffDoc.exists()) {
            showError("Staff not found");
            window.location.href = `${basePath}/managerStaffManagementPage.html`;
            return;
        }

        const staffData = staffDoc.data();

        if (currentUserRole === 'manager' && staffData.user_Position !== 'staff') {
            showError("Access denied");
            window.location.href = `${basePath}/managerStaffManagementPage.html`;
            return;
        }

        // fill form
        document.getElementById('staffName').value = staffData.user_Name;
        document.getElementById('identityNo').value = staffData.user_IdentityNo;
        document.getElementById('gender').value = staffData.user_Gender;
        document.getElementById('contact').value = staffData.user_Contact;
        document.getElementById('position').value = staffData.user_Position;
        document.getElementById('email').value = staffData.user_Email;
        document.getElementById('status').value = staffData.user_Status.toLowerCase();
        
        // manager can only edit staff
        if (currentUserRole === 'manager') {
            document.getElementById('position').disabled = true;
        }
        
        sessionStorage.setItem('currentPassword', staffData.user_Password);
        sessionStorage.setItem('currentEditingStaff', staffId);

    } catch (error) {
        showError("Failed to load staff data", error);
    }
}

async function updateStaff(event) {
    event.preventDefault();
    try {
        const staffId = sessionStorage.getItem('currentEditingStaff');
        if (!staffId) {
            showError("No staff selected for editing");
            return;
        }
        
        const form = event.target;
        
        if (!validateIdentityNo(form.identityNo.value)) {
            return;
        }
        
        if (!validateContact(form.contact.value)) {
            return;
        }
        
        // Get current staff data to preserve password if not changing
        const staffDoc = await getDoc(doc(db, "users", staffId));
        const currentStaffData = staffDoc.data();
        
        const staffData = {
            user_ID: staffId,  
            user_Name: form.staffName.value,
            user_IdentityNo: form.identityNo.value,
            user_Gender: form.gender.value,
            user_Contact: form.contact.value,
            user_Position: form.position.value,
            user_Email: form.email.value,
            user_Status: form.status.value,
            user_Password: currentStaffData.user_Password // Keep existing password by default
        };
        
        // Only update password if new password is provided
        if (form.password.value || form.confirmPassword.value) {
            if (!validatePassword(form.password.value, form.confirmPassword.value)) {
                return;
            }
            staffData.user_Password = form.password.value;
        }
        
        if (await saveStaff(staffId, staffData)) {
            alert("Staff information updated successfully!");
            const currentUserRole = localStorage.getItem('userRole');
            window.location.href = currentUserRole === 'manager'
                ? '/Funeral_Industry_Integration_System/Administration/manager_dashboard/managerStaffManagementPage.html'
                : '/Funeral_Industry_Integration_System/Administration/admin_dashboard/adminStaffManagementPage.html';
        }
    } catch (error) {
        showError("Failed to update staff", error);
    }
}

async function showStaffList() {
    try {
        // add delay to ensure DOM is fully loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        const tableBody = document.getElementById('staffTableBody');
        const template = document.getElementById('staffRowTemplate');
        
        if (!tableBody || !template) {
            console.error("Required elements not found:", {
                tableBody: !!tableBody,
                template: !!template
            });
            return;
        }
        
        tableBody.innerHTML = '';
        const staffList = await getDocs(collection(db, "users"));
        
        let totalStaff = 0;      
        let activeStaff = 0;     
        
        const currentUserRole = localStorage.getItem('userRole');
        
        staffList.forEach((doc) => {
            const staff = doc.data();
            
            // permission control
            if (currentUserRole === 'manager') {
                // manager can only see staff
                if (staff.user_Position !== 'staff') {
                    return;
                }
            } else if (currentUserRole === 'admin') {
                // admin can see everyone 
                if (staff.user_Position === 'admin') {
                    return;
                }
            }
            
            totalStaff++;
            if (staff.user_Status?.toLowerCase() === 'active') {
                activeStaff++;
            }
            
            const newRow = template.content.cloneNode(true);
            fillStaffData(newRow, staff);
            addButtonFunctions(newRow, staff, doc.id);
            tableBody.appendChild(newRow);
        });

        updateStaffCount(totalStaff, activeStaff);
    } catch (error) {
        console.error("Error in showStaffList:", error);
        showError("Failed to load staff list", error);
    }
}

// ===== STAFF LIST FUNCTIONS =====
function fillStaffData(row, staff) {
    const fields = row.querySelectorAll('[data-field]');
    fields.forEach(field => {
        const fieldName = field.dataset.field;
        if (fieldName === 'user_Status') {
            const status = staff[fieldName]?.toLowerCase() || 'unknown';
            field.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            field.className = `status status-${status}`;
        } else {
            field.textContent = staff[fieldName] || '';
        }
    });
}

function addButtonFunctions(row, staff, docId) {
    const passwordBtn = row.querySelector('.view-password-icon');
    const editBtn = row.querySelector('.action-icon');
    
    if (passwordBtn) passwordBtn.onclick = () => showHidePassword(passwordBtn, staff.user_Password);
    if (editBtn) editBtn.onclick = () => editStaffInfo(docId);
}

function updateStaffCount(total, active) {
    const totalElement = document.querySelector('.card:nth-child(1) .font-weight-bold');
    const activeElement = document.querySelector('.card:nth-child(2) .font-weight-bold');
    const inactiveElement = document.querySelector('.card:nth-child(3) .font-weight-bold');
    
    if (totalElement) totalElement.textContent = total;
    if (activeElement) activeElement.textContent = active;
    if (inactiveElement) inactiveElement.textContent = total - active;
}

function showHidePassword(icon, password) {
    const field = icon.parentElement;
    if (icon.textContent === 'visibility') {
        field.textContent = password;
        icon.textContent = 'visibility_off';
    } else {
        field.textContent = '••••••••';
        icon.textContent = 'visibility';
    }
    field.appendChild(icon);
}

function editStaffInfo(staffId) {
    sessionStorage.setItem('editStaffId', staffId);
    const currentUserRole = localStorage.getItem('userRole');
    window.location.href = currentUserRole === 'manager'
        ? '/Funeral_Industry_Integration_System/Administration/manager_dashboard/managerEditStaffPage.html'
        : '/Funeral_Industry_Integration_System/Administration/admin_dashboard/editStaffPage.html';
}

// ===== CUSTOMER MANAGEMENT =====
async function showCustomerList() {
    try {
        await new Promise(resolve => setTimeout(resolve, 100));

        const tableBody = document.getElementById('customerTableBody');
        const template = document.getElementById('customerRowTemplate');
        
        if (!tableBody || !template) {
            console.error("Required elements not found");
            return;
        }
        
        tableBody.innerHTML = '';
        const customerList = await getDocs(collection(db, "customer"));
        
        let totalCustomers = 0;      
        let activeCustomers = 0;     
        
        customerList.forEach((doc) => {
            const customer = doc.data();
            totalCustomers++;
            
            if (customer.cust_status?.toLowerCase() === 'active') {
                activeCustomers++;
            }
            
            const newRow = template.content.cloneNode(true);
            fillCustomerData(newRow, customer);
            viewCustomerPassword(newRow, customer);
            tableBody.appendChild(newRow);
        });

        // Update statistics cards
        const totalElement = document.querySelector('.card:nth-child(1) .font-weight-bold');
        const activeElement = document.querySelector('.card:nth-child(2) .font-weight-bold');
        const inactiveElement = document.querySelector('.card:nth-child(3) .font-weight-bold');
        
        if (totalElement) totalElement.textContent = totalCustomers;
        if (activeElement) activeElement.textContent = activeCustomers;
        if (inactiveElement) inactiveElement.textContent = totalCustomers - activeCustomers;

    } catch (error) {
        console.error("Error in showCustomerList:", error);
        showError("Failed to load customer list", error);
    }
}

function fillCustomerData(row, customer) {
    const fields = row.querySelectorAll('[data-field]');
    fields.forEach(field => {
        const fieldName = field.dataset.field;
        if (fieldName === 'cust_status') {
            const status = customer[fieldName]?.toLowerCase() || 'unknown';
            field.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            field.className = `status status-${status}`;
        } else {
            field.textContent = customer[fieldName] || '';
        }
    });
}

function viewCustomerPassword(row, customer) {
    const passwordBtn = row.querySelector('.view-password-icon');
    if (passwordBtn) {
        passwordBtn.onclick = () => showHidePassword(passwordBtn, customer.cust_password);
    }
}

// ===== PROFILE MANAGEMENT =====
async function setupEditFunctionality() {
    console.log("Setting up edit functionality...");
    
    const editButton = document.querySelector('.edit-button');
    const saveButton = document.querySelector('.save-button');
    const form = document.querySelector('.profile-info');
    const inputFields = form.querySelectorAll('input:not([id="staffId"]):not([id="status"]):not([id="position"])');
    
    console.log("Found elements:", {
        editButton: !!editButton,
        saveButton: !!saveButton,
        form: !!form,
        inputFields: inputFields.length
    });

    if (!editButton || !saveButton || !form) {
        console.error("Required elements not found");
        return;
    }

    let isEditing = false;
    let originalValues = {};

    saveButton.addEventListener('click', async function(e) {
        console.log("Save button clicked");
        e.preventDefault();
        
        if (!isEditing) {
            showError('Please click the edit button to make changes');
            return;
        }

        try {
            const userId = localStorage.getItem('userId');
            console.log("User ID:", userId);
            
            if (!userId) {
                throw new Error('User ID not found');
            }

            // Validate input fields
            const identityNoInput = document.getElementById('identityNo');
            const contactInput = document.getElementById('contact');
            
            // Validate Identity No
            if (identityNoInput && !validateIdentityNo(identityNoInput.value)) {
                identityNoInput.focus();
                return;
            }

            // Validate Contact
            if (contactInput && !validateContact(contactInput.value)) {
                contactInput.focus();
                return;
            }

            // update data
            const updatedData = {};
            inputFields.forEach(field => {
                if (field.id && field.value.trim()) {
                    const dbField = 'user_' + field.id.charAt(0).toUpperCase() + field.id.slice(1);
                    updatedData[dbField] = field.value.trim();
                }
            });

            console.log("Updating with data:", updatedData);

            // update database
            await updateDoc(doc(db, "users", userId), updatedData);
            console.log("Update successful");

            // show success message and update UI
            showOverlay("Profile updated successfully", 'success');
            
            // disable all input fields
            inputFields.forEach(field => {
                field.disabled = true;
                originalValues[field.id] = field.value;
            });
            
            // reset button state
            editButton.innerHTML = '<span class="material-symbols-outlined">edit</span>Edit';
            editButton.classList.remove('cancel');
            saveButton.style.display = 'none';
            isEditing = false;

        } catch (error) {
            console.error("Update profile failed:", error);
            showOverlay("Update profile failed: " + error.message, 'error');
        }
    });

    editButton.addEventListener('click', function() {
        console.log("Edit button clicked, isEditing:", isEditing);
        
        if (!isEditing) {
            // enter edit mode
            inputFields.forEach(field => {
                if (field.id !== 'staffId' && field.id !== 'status' && field.id !== 'position') {
                    field.disabled = false;
                    originalValues[field.id] = field.value;
                }
            });
            editButton.innerHTML = '<span class="material-symbols-outlined">close</span>Cancel';
            editButton.classList.add('cancel');
            saveButton.style.display = 'flex';
            isEditing = true;
        } else {
            // cancel edit
            inputFields.forEach(field => {
                field.disabled = true;
                if (originalValues[field.id]) {
                    field.value = originalValues[field.id];
                }
            });
            editButton.innerHTML = '<span class="material-symbols-outlined">edit</span>Edit';
            editButton.classList.remove('cancel');
            saveButton.style.display = 'none';
            isEditing = false;
        }
    });

    form.addEventListener('submit', e => {
        console.log("Form submission prevented");
        e.preventDefault();
    });
}

// add function to show overlay message
function showOverlay(message, type = 'success') {
    const overlay = document.getElementById('overlay-message');
    if (!overlay) {
        console.error("Overlay element not found");
        alert(message); // downgrade
        return;
    }

    const overlayText = overlay.querySelector('.overlay-text');
    const overlayIcon = overlay.querySelector('.material-symbols-outlined');
    
    if (overlayText && overlayIcon) {
        overlayText.textContent = message;
        overlay.style.display = 'flex';
        
        if (type === 'success') {
            overlayIcon.textContent = 'check_circle';
            overlayIcon.style.color = '#4CAF50';
        } else {
            overlayIcon.textContent = 'error';
            overlayIcon.style.color = '#f44336';
        }
        
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 3000);
    }
}

function setupPasswordChange() {
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordFields = document.querySelector('.password-fields');
    const cancelBtn = document.querySelector('.cancel-password-button');
    const savePasswordBtn = document.querySelector('.save-password-button');

    changePasswordBtn?.addEventListener('click', () => {
        passwordFields.style.display = 'block';
        changePasswordBtn.style.display = 'none';
    });

    cancelBtn?.addEventListener('click', () => {
        passwordFields.style.display = 'none';
        changePasswordBtn.style.display = 'flex';
        ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
            document.getElementById(id).value = '';
        });
    });

    savePasswordBtn?.addEventListener('click', async () => {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showError('Please fill in all password fields');
            return;
        }

        if (!validatePasswordStrength(newPassword)) {
            return;
        }

        if (newPassword !== confirmPassword) {
            showError("New passwords don't match");
            return;
        }

        try {
            const userId = localStorage.getItem('userId');
            const userDoc = await getDoc(doc(db, "users", userId));
            const userData = userDoc.data();

            if (userData.user_Password !== currentPassword) {
                showError("Current password is incorrect");
                return;
            }

            await updateDoc(doc(db, "users", userId), {
                user_Password: newPassword
            });

            showError("Password updated successfully");
            passwordFields.style.display = 'none';
            changePasswordBtn.style.display = 'flex';
            ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
                document.getElementById(id).value = '';
            });
        } catch (error) {
            console.error("Failed to update password:", error);
            showError("Failed to update password");
        }
    });
}

async function loadUserProfile() {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            window.location.href = '/Funeral_Industry_Integration_System/Login_Register/admin-loginPage.html';
            return;
        }

        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // update form fields
            const fields = {
                'staffId': data.user_ID,
                'staffName': data.user_Name,
                'identityNo': data.user_IdentityNo,
                'gender': data.user_Gender || '',
                'contact': data.user_Contact,
                'position': data.user_Position,
                'email': data.user_Email,
                'status': data.user_Status
            };

            // update all fields
            Object.entries(fields).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value || '';
                    if (id === 'status') {
                        element.value = value.toUpperCase();
                        element.className = `status-input status-${value.toLowerCase()}`;
                    }
                }
            });
        }
    } catch (error) {
        console.error("Failed to load profile:", error);
        showError("Failed to load profile");
    }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    console.log("Current path:", path);
    
    if (path.includes('StaffManagementPage.html')) {
        console.log("Initializing staff list...");
        // ensure elements exist
        const tableBody = document.getElementById('staffTableBody');
        const template = document.getElementById('staffRowTemplate');
        console.log("Elements found:", {
            tableBody: !!tableBody,
            template: !!template
        });
        
        showStaffList().catch(error => {
            console.error("Failed to load staff list:", error);
        });
    } else if (path.includes('editStaffPage.html')) {
        loadStaffData();
    } else if (path.includes('admin-loginPage.html')) {
        checkAdminExists();
    } else if (path.includes('CustomerManagement')) {
        console.log("Initializing customer list...");
        const tableBody = document.getElementById('customerTableBody');
        const template = document.getElementById('customerRowTemplate');
        
        console.log("Elements found:", {
            tableBody: !!tableBody,
            template: !!template
        });
        
        if (!tableBody || !template) {
            console.error("Required elements missing on load");
            return;
        }
        
        showCustomerList().catch(error => {
            console.error("Error initializing customer list:", error);
        });
    }
});

// ===== EXPORTS Functions =====
export {
    // Authentication & Admin
    loginUser,
    checkAdminExists,
    registerAdmin,
    generateAdminID,

    // Staff Management
    showStaffList,
    editStaffInfo,
    addNewStaff,
    loadStaffData,
    updateStaff,

    // Customer Management
    showCustomerList,
    fillCustomerData,
    viewCustomerPassword,

    // UI Helpers
    showHidePassword,
    fillStaffData,
    addButtonFunctions,
    updateStaffCount,

    // Validation
    validatePassword,
    validateIdentityNo,
    validatePasswordStrength,
    validateContact,
    
    // Data Handling
    showError,
    getStaffFormData,
    saveStaff,

    // Profile Management
    setupEditFunctionality,
    setupPasswordChange,
    loadUserProfile,
    
}; 