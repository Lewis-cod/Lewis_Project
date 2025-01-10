import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

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

// Get current service provider ID from localStorage
const currentServiceProviderId = localStorage.getItem('providerID');
console.log('Using provider ID for new package:', currentServiceProviderId);

// Add a check to ensure we have the ID
if (!currentServiceProviderId) {
    console.error('No provider ID found');
    showOverlay('Error: Provider ID not found', 'error');
}

// Move the initialization code inside a function
async function initializePackageForm() {
    try {
        if (!currentServiceProviderId) {
            throw new Error('No provider ID found');
        }

        // Rest of your initialization code...
        const packageImage = document.getElementById('packageImage');
        const imageGrid = document.getElementById('packageImageGrid');
        const fileCount = document.getElementById('selectedFileCount');

        // Add your event listeners here
        packageImage.addEventListener('change', handleImageSelection);
        //  other event listeners
    } catch (error) {
        console.error('Error initializing form:', error);
        showOverlay('Error initializing form', 'error');
    }
}

// Call the initialization function when the document is ready
document.addEventListener('DOMContentLoaded', initializePackageForm);

// Function to get the next package ID
async function getNextPackageId() {
    try {
        const packageRef = collection(db, "package");
        const querySnapshot = await getDocs(packageRef);
        let maxId = 0;

        querySnapshot.forEach(doc => {
            const packageId = doc.data().packageID || "";
            if (packageId.startsWith("PCK")) {
                const idNumber = parseInt(packageId.substring(3));
                if (!isNaN(idNumber) && idNumber > maxId) {
                    maxId = idNumber;
                }
            }
        });

        const nextId = maxId + 1;
        return `PCK${String(nextId).padStart(4, '0')}`;
    } catch (error) {
        console.error("Error getting next package ID:", error);
        throw error;
    }
}

// Add this function at the top of your file
function showOverlay(message, type = 'success') {
    const overlay = document.createElement('div');
    overlay.className = 'overlay-message';
    overlay.innerHTML = `
        <div class="overlay-content ${type}">
            <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
            <span class="overlay-text">${message}</span>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.remove();
    }, 3000);
}

// Handle multiple image selection and preview
document.getElementById('packageImage').addEventListener('change', function() {
    const files = this.files;
    const imageGrid = document.getElementById('packageImageGrid');
    const fileCount = document.getElementById('selectedFileCount');
    const maxImages = 6;
    const currentImages = imageGrid.children.length;

    console.log('Files selected:', files.length); // Debug log

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
            console.log('Image loaded:', e.target.result.substring(0, 50) + '...'); // Debug log

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
            console.log('Image added to grid'); // Debug log
        };
        reader.readAsDataURL(file);
    });
    
    fileCount.textContent = `${currentImages + files.length}/6 images uploaded`;
});

// Add image preview functionality
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

    // Close preview when clicking outside or on close button
    previewOverlay.addEventListener('click', (e) => {
        if (e.target === previewOverlay || e.target.closest('.close-preview')) {
            document.body.removeChild(previewOverlay);
        }
    });
}

// Handle form submission
document.getElementById('packageForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Show confirmation overlay instead of submitting immediately
    const confirmationOverlay = document.getElementById('confirmationOverlay');
    confirmationOverlay.style.display = 'flex';
});

// Handle confirmation overlay buttons
document.getElementById('cancelUpload').addEventListener('click', function() {
    document.getElementById('confirmationOverlay').style.display = 'none';
});

document.getElementById('confirmUpload').addEventListener('click', async function() {
    // Hide the confirmation overlay
    document.getElementById('confirmationOverlay').style.display = 'none';
    // Show loading overlay
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    try {
        // Get the next package ID
        const packageId = await getNextPackageId();
        
        const packageData = {
            packageID: packageId,
            name: document.getElementById('packageName').value,
            religion: document.getElementById('religion').value,
            description: document.getElementById('description').value,
            price: parseFloat(document.getElementById('price').value),
            serviceProviderId: currentServiceProviderId,
            imageUrls: [], // Will store multiple image URLs
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Get all preview images that need to be uploaded
        const imageItems = document.querySelectorAll('.image-item img');
        const imageUploadPromises = [];

        for (const img of imageItems) {
            const file = img.file;  // Get the stored file from the img element
            const filename = `${packageId}_${file.name}`;
            const imageRef = ref(storage, `package_images/${packageId}/${filename}`);
            
            const uploadPromise = uploadBytes(imageRef, file)
                .then(() => getDownloadURL(imageRef))
                .then(url => {
                    packageData.imageUrls.push(url);
                    console.log('Image uploaded successfully:', url);
                })
                .catch(error => {
                    console.error('Error uploading image:', error);
                    throw error;
                });
            
            imageUploadPromises.push(uploadPromise);
        }

        // Wait for all images to upload
        try {
            await Promise.all(imageUploadPromises);
            console.log('All images uploaded successfully');

            // Add package to Firestore only if we have images
            if (packageData.imageUrls.length > 0) {
                const packageRef = collection(db, "package");
                const docRef = doc(packageRef, packageId);
                await setDoc(docRef, packageData);
                console.log('Package data saved with images:', packageData);

                // Hide loading overlay
                document.getElementById('loadingOverlay').style.display = 'none';
                
                // Show success overlay before redirecting
                const confirmationOverlay = document.getElementById('confirmationOverlay');
                const overlayContent = confirmationOverlay.querySelector('.overlay-content');
                overlayContent.innerHTML = `
                    <h4>Success!</h4>
                    <p>Package has been uploaded successfully.</p>
                    <div class="overlay-buttons">
                        <button class="btn btn-success" onclick="window.location.href='/Funeral_Industry_Integration_System/Service_Provider/serviceManagementPage.html'">
                            Back to Service Management
                        </button>
                    </div>
                `;
                confirmationOverlay.style.display = 'flex';
            } else {
                // Hide loading overlay
                document.getElementById('loadingOverlay').style.display = 'none';
                throw new Error('No images were uploaded successfully');
            }
        } catch (error) {
            // Hide loading overlay
            document.getElementById('loadingOverlay').style.display = 'none';
            console.error('Error in image upload process:', error);
            alert('Error uploading images: ' + error.message);
        }

    } catch (error) {
        // Hide loading overlay
        document.getElementById('loadingOverlay').style.display = 'none';
        console.error("Error adding package:", error);
        alert('Error adding package: ' + error.message);
    }
}); 