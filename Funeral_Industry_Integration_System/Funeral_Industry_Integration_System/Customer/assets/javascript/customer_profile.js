// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

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
const storage = getStorage(app);

// Add this function at the start of your file
function showOverlay(message, type = 'success') {
    const overlay = document.getElementById('overlay-message');
    const content = overlay.querySelector('.overlay-content');
    const icon = overlay.querySelector('.material-symbols-outlined');
    const text = overlay.querySelector('.overlay-text');
    
    // Set icon and class based on type
    if (type === 'success') {
        icon.textContent = 'check_circle';
        content.className = 'overlay-content success';
    } else {
        icon.textContent = 'error';
        content.className = 'overlay-content error';
    }
    
    // Set message
    text.textContent = message;
    
    // Show overlay
    overlay.style.display = 'flex';
    
    // Add close button listener
    const closeBtn = overlay.querySelector('.overlay-close');
    closeBtn.onclick = () => {
        overlay.style.display = 'none';
    };
}

// Check if user is logged in
document.addEventListener('DOMContentLoaded', async function() {
    // Check if logged in using custId
    const custId = localStorage.getItem('custId');
    if (!custId) {
        window.location.href = '/Funeral_Industry_Integration_System/Login_Register/customer_login.html';
        return;
    }

    // Get customer data using custId
    try {
        // Query by customerID field
        const customersRef = collection(db, "customer");
        const q = query(customersRef, where("customerID", "==", custId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const custDoc = querySnapshot.docs[0];
            const data = custDoc.data();
            
            // Update profile display
            document.getElementById('customerName').textContent = data.cust_name;
            document.getElementById('custId').value = data.customerID;
            document.getElementById('fullName').value = data.cust_name;
            document.getElementById('custIC').value = data.cust_ic;
            document.getElementById('custGender').value = data.cust_gender;
            document.getElementById('email').value = data.cust_email;
            document.getElementById('phoneNo').value = data.cust_phone_no;
            document.getElementById('custStatus').value = data.cust_status;

            // Set profile image with proper check for existing uploads
            const profileImage = document.getElementById('profileImage');
            const customerFolderRef = ref(storage, `customer_img/${custId}`);
            
            try {
                // Check if customer has any uploaded images
                const listResult = await listAll(customerFolderRef);
                if (listResult.items.length > 0) {
                    // Use the customer's uploaded profile image
                    const imageUrl = await getDownloadURL(listResult.items[0]);
                    profileImage.src = imageUrl;
                    updateProfileOverlay(true);
                } else {
                    // No uploaded image found, use default
                    const defaultImageRef = ref(storage, 'customer_img/default_profile_img.jpg');
                    const defaultUrl = await getDownloadURL(defaultImageRef);
                    profileImage.src = defaultUrl;
                    updateProfileOverlay(false);
                }
            } catch (error) {
                console.error("Error checking profile image:", error);
                // If there's an error, attempt to load default image
                const defaultImageRef = ref(storage, 'customer_img/default_profile_img.jpg');
                getDownloadURL(defaultImageRef)
                    .then(url => {
                        profileImage.src = url;
                        updateProfileOverlay(false);
                    })
                    .catch(err => {
                        console.error("Error loading default profile image:", err);
                        // Fallback to local default image if Firebase storage fails
                        profileImage.src = '/Funeral_Industry_Integration_System/Customer/assets/customer_module_img/customer_profile_img/default_avatar.png';
                    });
            }
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        showOverlay("Error loading profile data", 'error');
    }

    // Setup back button
    document.querySelector('.back-button').addEventListener('click', function() {
        window.location.href = '/Funeral_Industry_Integration_System/Customer/index.html';
    });

    // Setup edit button functionality
    const editButton = document.getElementById('editButton');
    const saveButton = document.querySelector('.save-button');
    const inputFields = document.querySelectorAll('#email, #phoneNo');
    let isEditing = false;

    // Store original values
    let originalValues = {};

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

    // Add these validation functions
    function validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    function validatePhone(phone) {
        const regex = /^[0-9]{10,11}$/;
        return regex.test(phone);
    }

    // Handle form submission
    document.getElementById('profileForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phoneNo').value;

        if (!validateEmail(email)) {
            showOverlay('Please enter a valid email address', 'error');
            return;
        }

        if (!validatePhone(phone)) {
            showOverlay('Phone number must be 10-11 digits', 'error');
            return;
        }

        if (!isEditing) {
            showOverlay('Please click Edit to make changes', 'error');
            return;
        }

        const updatedData = {
            cust_email: document.getElementById('email').value,
            cust_phone_no: document.getElementById('phoneNo').value
        };

        try {
            const custId = localStorage.getItem('custId');
            const customersRef = collection(db, "customer");
            const q = query(customersRef, where("customerID", "==", custId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const custDoc = querySnapshot.docs[0];
                await updateDoc(doc(db, "customer", custDoc.id), updatedData);
                showOverlay("Profile updated successfully", 'success');
                
                // Disable fields after successful update
                inputFields.forEach(field => {
                    field.disabled = true;
                });
                editButton.innerHTML = '<span class="material-symbols-outlined">edit</span>Edit';
                editButton.classList.remove('cancel');
                saveButton.style.display = 'none';
                isEditing = false;

                // Update the stored original values
                Object.keys(updatedData).forEach(key => {
                    if (originalValues[key]) {
                        originalValues[key] = updatedData[key];
                    }
                });
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            showOverlay("Error updating profile", 'error');
        }
    });

    // Setup deactivate button
    document.querySelector('.deactivate-button').addEventListener('click', function() {
        deactivateModal.style.display = 'flex';
    });

    // Close modal function
    window.closeDeactivateModal = function() {
        deactivateModal.style.display = 'none';
        document.getElementById('deactivatePassword').value = '';
    };

    // Handle deactivation confirmation
    document.getElementById('confirmDeactivate').addEventListener('click', async function() {
        const password = document.getElementById('deactivatePassword').value;
        
        if (!password) {
            showOverlay('Please enter your password');
            return;
        }

        try {
            const custId = localStorage.getItem('custId');
            const custRef = doc(db, "customer", custId);
            const custDoc = await getDoc(custRef);
            const data = custDoc.data();

            if (data.cust_password === password) {
                if (confirm("Are you sure you want to deactivate your account? This action cannot be undone.")) {
                    await updateDoc(custRef, {
                        cust_status: 'inactive'
                    });
                    showOverlay("Account deactivated successfully", 'success');
                    localStorage.clear();
                    window.location.href = '/Funeral_Industry_Integration_System/Login_Register/customer_login.html';
                }
            } else {
                showOverlay("Incorrect password. Account deactivation cancelled.");
            }
        } catch (error) {
            console.error("Error deactivating account:", error);
            showOverlay("Error deactivating account", 'error');
        }

        closeDeactivateModal();
    });

    // Close modal when clicking outside
    deactivateModal.addEventListener('click', function(e) {
        if (e.target === deactivateModal) {
            closeDeactivateModal();
        }
    });

    // Add this to your existing JavaScript
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordFields = document.querySelector('.password-fields');
    const cancelPasswordBtn = document.querySelector('.cancel-password-button');
    const savePasswordBtn = document.querySelector('.save-password-button');

    // Toggle password fields
    changePasswordBtn.addEventListener('click', function() {
        passwordFields.style.display = 'block';
        changePasswordBtn.style.display = 'none';
    });

    // Cancel password change
    cancelPasswordBtn.addEventListener('click', function() {
        passwordFields.style.display = 'none';
        changePasswordBtn.style.display = 'flex';
        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    });

    // Add this function to validate password
    function validatePassword(password) {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(password);
    }

    // Update the save password button event listener
    savePasswordBtn.addEventListener('click', async function() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            showOverlay('Please fill in all password fields', 'error');
            return;
        }

        // Add password validation
        if (!validatePassword(newPassword)) {
            showOverlay('Password must contain at least 8 characters, including uppercase, lowercase, number and special character', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showOverlay("New passwords don't match", 'error');
            return;
        }

        try {
            const custId = localStorage.getItem('custId');
            const custRef = doc(db, "customer", custId);
            const custDoc = await getDoc(custRef);
            const data = custDoc.data();

            if (data.cust_password !== currentPassword) {
                showOverlay("Current password is incorrect");
                return;
            }

            // Update password
            await updateDoc(custRef, {
                cust_password: newPassword
            });

            showOverlay("Password updated successfully", 'success');
            // Reset form
            passwordFields.style.display = 'none';
            changePasswordBtn.style.display = 'flex';
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } catch (error) {
            console.error("Error updating password:", error);
            showOverlay("Error updating password", 'error');
        }
    });

    // Handle password change functionality
    document.addEventListener('DOMContentLoaded', function() {
        const changePasswordForm = document.querySelector('form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const currentPassword = document.querySelector('input[placeholder="Current Password"]').value;
                const newPassword = document.querySelector('input[placeholder="New Password"]').value;
                const confirmPassword = document.querySelector('input[placeholder="Confirm New Password"]').value;

                // Validation
                if (!currentPassword || !newPassword || !confirmPassword) {
                    showOverlay('Please fill in all password fields');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    showOverlay("New passwords don't match");
                    return;
                }

                try {
                    const custId = localStorage.getItem('custId');
                    // Query the customer document
                    const customersRef = collection(db, "customer");
                    const q = query(customersRef, where("customerID", "==", custId));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const custDoc = querySnapshot.docs[0];
                        const data = custDoc.data();

                        // Verify current password
                        if (data.cust_password !== currentPassword) {
                            showOverlay("Current password is incorrect");
                            return;
                        }

                        // Update password
                        await updateDoc(doc(db, "customer", custDoc.id), {
                            cust_password: newPassword
                        });

                        showOverlay("Password updated successfully", 'success');
                        // Clear form
                        changePasswordForm.reset();
                        
                        // Optional: Redirect to profile or refresh page
                        window.location.reload();
                    }
                } catch (error) {
                    console.error("Error updating password:", error);
                    showOverlay("Error updating password", 'error');
                }
            });

            // Add cancel button functionality
            const cancelButton = document.querySelector('button[type="button"]');
            if (cancelButton) {
                cancelButton.addEventListener('click', function() {
                    changePasswordForm.reset();
                    // Optional: redirect back or hide form
                    window.history.back();
                });
            }
        }
    });

    // Reattach the image upload event listener
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
});

// Function to update profile picture overlay
function updateProfileOverlay(hasCustomPicture) {
    const uploadOverlay = document.querySelector('.upload-overlay');
    
    if (hasCustomPicture) {
        // Show single button that triggers options overlay
        uploadOverlay.innerHTML = `
            <button type="button" class="photo-options-button">
                <span class="material-symbols-outlined">photo_camera</span>
                <span>Change/Remove Photo</span>
            </button>
        `;
        
        // Add click listener for the options button
        document.querySelector('.photo-options-button').addEventListener('click', showPhotoOptionsOverlay);
    } else {
        // Show only upload option for default picture
        uploadOverlay.innerHTML = `
            <div class="upload-buttons">
                <label for="imageUpload" class="upload-button">
                    <span class="material-symbols-outlined">photo_camera</span>
                    <span>Upload Photo</span>
                </label>
                <input type="file" id="imageUpload" accept="image/*" style="display: none">
            </div>
        `;
        // Attach upload listener
        document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    }
}

// Function to show photo options overlay
function showPhotoOptionsOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay-message';
    overlay.style.display = 'flex';
    
    overlay.innerHTML = `
        <div class="overlay-content photo-options">
            <h3>Profile Picture Options</h3>
            <div class="photo-options-buttons">
                <label for="imageUpload" class="option-button change-photo">
                    <span class="material-symbols-outlined">photo_camera</span>
                    Change Photo
                </label>
                <button class="option-button remove-photo">
                    <span class="material-symbols-outlined">delete</span>
                    Remove Photo
                </button>
            </div>
            <input type="file" id="imageUpload" accept="image/*" style="display: none">
            <button class="overlay-close">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    const closeBtn = overlay.querySelector('.overlay-close');
    const removeBtn = overlay.querySelector('.remove-photo');
    const imageInput = overlay.querySelector('#imageUpload');
    
    closeBtn.onclick = () => {
        document.body.removeChild(overlay);
    };
    
    removeBtn.onclick = () => {
        showRemoveConfirmation();
        document.body.removeChild(overlay);
    };
    
    imageInput.addEventListener('change', (e) => {
        handleImageUpload(e);
        document.body.removeChild(overlay);
    });
}

// Function to show remove confirmation
function showRemoveConfirmation() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay-message';
    overlay.style.display = 'flex';
    
    overlay.innerHTML = `
        <div class="overlay-content">
            <div class="overlay-icon">
                <span class="material-symbols-outlined">warning</span>
            </div>
            <h3>Remove Profile Picture?</h3>
            <p>Are you sure you want to remove your profile picture?</p>
            <div class="confirmation-buttons">
                <button class="cancel-button">Cancel</button>
                <button class="confirm-button">Remove</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    const cancelBtn = overlay.querySelector('.cancel-button');
    const confirmBtn = overlay.querySelector('.confirm-button');
    
    cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
    };
    
    confirmBtn.onclick = async () => {
        await removeProfilePicture();
        document.body.removeChild(overlay);
    };
}

// Separate the image upload handler function
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
        showOverlay('Please upload an image file', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showOverlay('Image size should be less than 5MB', 'error');
        return;
    }

    try {
        const custId = localStorage.getItem('custId');
        
        // Create a reference to the customer's folder
        const customerFolderRef = ref(storage, `customer_img/${custId}`);
        
        // Check if folder exists and delete old images
        try {
            const listResult = await listAll(customerFolderRef);
            for (const item of listResult.items) {
                await deleteObject(item);
            }
        } catch (error) {
            console.log('Creating new folder for customer:', custId);
        }

        // Get file extension and create filename
        const fileExtension = file.name.split('.').pop();
        const fileName = `${custId}_profile_pic.${fileExtension}`;
        
        // Upload new image
        const fileRef = ref(storage, `customer_img/${custId}/${fileName}`);
        await uploadBytes(fileRef, file);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(fileRef);
        
        // Update UI
        document.getElementById('profileImage').src = downloadURL;
        
        // Update database
        const customersRef = collection(db, "customer");
        const q = query(customersRef, where("customerID", "==", custId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const custDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, "customer", custDoc.id), {
                profile_image_url: downloadURL
            });
            
            // Update overlay to show both options
            updateProfileOverlay(true);
            showOverlay('Profile picture updated successfully', 'success');
        }
    } catch (error) {
        console.error("Error uploading image:", error);
        showOverlay('Error uploading image. Please try again.', 'error');
    }
}

// Function to remove profile picture
async function removeProfilePicture() {
    try {
        const custId = localStorage.getItem('custId');
        
        // Reference to the customer's folder
        const customerFolderRef = ref(storage, `customer_img/${custId}`);
        
        // Delete all files in customer's folder
        const listResult = await listAll(customerFolderRef);
        for (const item of listResult.items) {
            await deleteObject(item);
        }

        // Get default image URL
        const defaultImageRef = ref(storage, 'customer_img/default_profile_img.jpg');
        const defaultUrl = await getDownloadURL(defaultImageRef);
        
        // Update UI with default image
        document.getElementById('profileImage').src = defaultUrl;
        
        // Update database to remove profile_image_url
        const customersRef = collection(db, "customer");
        const q = query(customersRef, where("customerID", "==", custId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const custDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, "customer", custDoc.id), {
                profile_image_url: null
            });
            
            // Update overlay to show upload only
            updateProfileOverlay(false);
            showOverlay('Profile picture removed successfully', 'success');
        }
    } catch (error) {
        console.error("Error removing profile picture:", error);
        showOverlay('Error removing profile picture', 'error');
    }
} 