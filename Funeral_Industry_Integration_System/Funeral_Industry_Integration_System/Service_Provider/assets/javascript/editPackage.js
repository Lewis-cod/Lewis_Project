import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
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
let db;
let storage;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

// Get package ID from URL
const urlParams = new URLSearchParams(window.location.search);
const packageId = urlParams.get('id');

// Load existing package data
async function loadPackageData() {
    try {
        const packageRef = doc(db, "package", packageId);
        const packageDoc = await getDoc(packageRef);
        
        if (packageDoc.exists()) {
            const data = packageDoc.data();
            
            // Fill form fields
            document.getElementById('packageName').value = data.name;
            document.getElementById('religion').value = data.religion;
            document.getElementById('description').value = data.description;
            document.getElementById('price').value = data.price;
            
            // Load existing images
            await loadExistingImages(packageId);
        }
    } catch (error) {
        console.error("Error loading package data:", error);
        showOverlay('Error loading package data', 'error');
    }
}

// Load existing images
async function loadExistingImages(packageId) {
    const imageGrid = document.getElementById('packageImageGrid');
    const fileCount = document.getElementById('selectedFileCount');
    
    const packageRef = doc(db, "package", packageId);
    const packageDoc = await getDoc(packageRef);
    
    if (packageDoc.exists()) {
        const packageData = packageDoc.data();
        const imageUrls = packageData.imageUrls || [];
        
        imageUrls.forEach(url => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <img src="${url}" alt="Package Image" class="company-image">
                <button class="delete-btn">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `;
            
            const img = imageItem.querySelector('img');
            img.dataset.url = url; // Store original URL
            img.addEventListener('click', () => showImagePreview(url));
            
            imageItem.querySelector('.delete-btn').addEventListener('click', function() {
                imageItem.remove();
                const newCount = imageGrid.children.length;
                fileCount.textContent = `${newCount}/6 images uploaded`;
            });
            
            imageGrid.appendChild(imageItem);
        });
        
        fileCount.textContent = `${imageUrls.length}/6 images uploaded`;
    }
}

// Handle new image selection
document.getElementById('packageImage').addEventListener('change', function() {
    const files = this.files;
    const imageGrid = document.getElementById('packageImageGrid');
    const fileCount = document.getElementById('selectedFileCount');
    const maxImages = 6;
    const currentImages = imageGrid.children.length;

    if (currentImages + files.length > maxImages) {
        showOverlay('Maximum 6 images allowed', 'error');
        return;
    }

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) {
            showOverlay('Please upload only image files', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <img src="${e.target.result}" alt="Package Image" class="company-image">
                <button class="delete-btn">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `;
            
            const img = imageItem.querySelector('img');
            img.file = file;
            img.addEventListener('click', () => showImagePreview(e.target.result));
            
            imageItem.querySelector('.delete-btn').addEventListener('click', function() {
                imageItem.remove();
                const newCount = imageGrid.children.length;
                fileCount.textContent = `${newCount}/6 images uploaded`;
            });
            
            imageGrid.appendChild(imageItem);
        };
        reader.readAsDataURL(file);
    });
    
    fileCount.textContent = `${currentImages + files.length}/6 images uploaded`;
});

// Image preview functionality
function showImagePreview(imageUrl) {
    const previewOverlay = document.createElement('div');
    previewOverlay.className = 'image-preview-overlay';
    previewOverlay.innerHTML = `
        <div class="preview-content">
            <img src="${imageUrl}" alt="Preview">
            <button class="close-preview">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
    `;

    document.body.appendChild(previewOverlay);

    previewOverlay.addEventListener('click', (e) => {
        if (e.target === previewOverlay || e.target.closest('.close-preview')) {
            document.body.removeChild(previewOverlay);
        }
    });
}

// Handle form submission
document.getElementById('packageForm').addEventListener('submit', function(e) {
    e.preventDefault();
    document.getElementById('confirmationOverlay').style.display = 'flex';
});

// Function to update loading overlay content
function updateLoadingOverlay(title, message, status) {
    document.getElementById('loadingTitle').textContent = title;
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('statusMessage').textContent = status;
}

// For updating package
document.getElementById('confirmEdit').addEventListener('click', async function() {
    document.getElementById('confirmationOverlay').style.display = 'none';
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';
    
    updateLoadingOverlay(
        'Updating Package',
        'Please wait while we save your changes...',
        'Saving package information...'
    );
    
    try {
        const packageData = {
            packageID: packageId,
            name: document.getElementById('packageName').value,
            religion: document.getElementById('religion').value,
            description: document.getElementById('description').value,
            price: parseFloat(document.getElementById('price').value),
            imageUrls: [],
            updatedAt: new Date()
        };

        // Get all images (both existing and new)
        const images = document.querySelectorAll('.image-item img');
        const uploadPromises = [];

        for (const img of images) {
            if (img.dataset.url) {
                // Existing image
                packageData.imageUrls.push(img.dataset.url);
            } else if (img.file) {
                // New image
                const filename = `${Date.now()}_${img.file.name}`;
                const imageRef = ref(storage, `package_images/${packageId}/${filename}`);
                
                const uploadPromise = uploadBytes(imageRef, img.file)
                    .then(() => getDownloadURL(imageRef))
                    .then(url => packageData.imageUrls.push(url));
                
                uploadPromises.push(uploadPromise);
            }
        }

        // Wait for all uploads to complete
        await Promise.all(uploadPromises);

        // Update package in Firestore
        const packageRef = doc(db, "package", packageId);
        await setDoc(packageRef, packageData, { merge: true });

        // Hide loading overlay
        document.getElementById('loadingOverlay').style.display = 'none';

        // Show success overlay before redirecting
        const confirmationOverlay = document.getElementById('confirmationOverlay');
        const overlayContent = confirmationOverlay.querySelector('.overlay-content');
        overlayContent.innerHTML = `
            <h4>Success!</h4>
            <p>Package has been updated successfully.</p>
            <div class="overlay-buttons">
                <button class="btn btn-success" onclick="window.location.href='/Funeral_Industry_Integration_System/Service_Provider/serviceManagementPage.html'">
                    Back to Service Management
                </button>
            </div>
        `;
        confirmationOverlay.style.display = 'flex';

    } catch (error) {
        document.getElementById('loadingOverlay').style.display = 'none';
        console.error("Error updating package:", error);
        alert('Error updating package: ' + error.message);
    }
});

// Handle delete button
document.getElementById('removePackageBtn').addEventListener('click', function() {
    document.getElementById('deleteConfirmationOverlay').style.display = 'flex';
});

// For deleting package
document.getElementById('confirmDelete').addEventListener('click', async function() {
    document.getElementById('deleteConfirmationOverlay').style.display = 'none';
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';
    
    updateLoadingOverlay(
        'Removing Package',
        'Please wait while we remove the package...',
        'Deleting package data...'
    );
    
    try {
        // Delete images from storage
        const imageRef = ref(storage, `package_images/${packageId}`);
        const imagesList = await listAll(imageRef);
        const deletePromises = imagesList.items.map(item => deleteObject(item));
        await Promise.all(deletePromises);

        // Delete document from Firestore
        const packageRef = doc(db, "package", packageId);
        await deleteDoc(packageRef);

        // Hide loading overlay
        document.getElementById('loadingOverlay').style.display = 'none';

        // Show success overlay before redirecting
        const confirmationOverlay = document.getElementById('confirmationOverlay');
        const overlayContent = confirmationOverlay.querySelector('.overlay-content');
        overlayContent.innerHTML = `
            <h4>Success!</h4>
            <p>Package has been deleted successfully.</p>
            <div class="overlay-buttons">
                <button class="btn btn-success" onclick="window.location.href='/Funeral_Industry_Integration_System/Service_Provider/serviceManagementPage.html'">
                    Back to Service Management
                </button>
            </div>
        `;
        confirmationOverlay.style.display = 'flex';

    } catch (error) {
        document.getElementById('loadingOverlay').style.display = 'none';
        console.error("Error deleting package:", error);
        alert('Error deleting package: ' + error.message);
    }
});

// Handle cancel buttons
document.getElementById('cancelEdit').addEventListener('click', function() {
    document.getElementById('confirmationOverlay').style.display = 'none';
});

document.getElementById('cancelDelete').addEventListener('click', function() {
    document.getElementById('deleteConfirmationOverlay').style.display = 'none';
});

// Load package data when page loads
loadPackageData(); 