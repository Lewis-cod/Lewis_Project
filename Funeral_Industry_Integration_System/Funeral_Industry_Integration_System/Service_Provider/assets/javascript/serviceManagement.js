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
let db;
let storage;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

// DOM Elements
const companyImageUpload = document.getElementById('companyImageUpload');
const companyImageGrid = document.getElementById('companyImageGrid');
const packagesGrid = document.getElementById('packagesGrid');
const addPackageBtn = document.getElementById('addPackageBtn');
const packageModal = document.getElementById('packageModal');
const packageForm = document.getElementById('packageForm');

let currentServiceProviderId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check if we have EITHER ID stored
        const providerId = localStorage.getItem('providerID') || localStorage.getItem('serviceProviderId');
        
        if (!providerId) {
            console.error('No provider ID found');
            return;  // Don't redirect, just return
        }

        // Use the ID we found
        currentServiceProviderId = providerId;
        console.log('Using provider ID:', currentServiceProviderId);

        // Load packages and images
        await loadCompanyImages();
        await loadPackages();
        setupEventListeners();
    } catch (error) {
        console.error('Error:', error);
    }
});

// Load company images
async function loadCompanyImages() {
    try {
        const imagesRef = ref(storage, `service_provider_img/${currentServiceProviderId}`);
        const imagesList = await listAll(imagesRef);
        
        companyImageGrid.innerHTML = '';
        
        for (const imageRef of imagesList.items) {
            const url = await getDownloadURL(imageRef);
            addImageToGrid(url, imageRef.name);
        }

        await updateImageCountDisplay();
    } catch (error) {
        console.error("Error loading company images:", error);
        showOverlay("Error loading company images", 'error');
    }
}

// Add image to grid
function addImageToGrid(url, filename) {
    const div = document.createElement('div');
    div.className = 'image-item';
    div.innerHTML = `
        <img src="${url}" alt="Company Image" class="company-image">
        <button class="delete-btn" data-filename="${filename}">
            <span class="material-symbols-outlined">delete</span>
        </button>
    `;
    
    // Add click event to show image preview
    const img = div.querySelector('.company-image');
    img.addEventListener('click', () => showImagePreview(url));
    
    companyImageGrid.appendChild(div);
}

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

    // Close preview when clicking outside the image or on close button
    previewOverlay.addEventListener('click', (e) => {
        if (e.target === previewOverlay || e.target.closest('.close-preview')) {
            document.body.removeChild(previewOverlay);
        }
    });
}

// Handle image upload
async function handleImageUpload(files) {
    try {
        // Get current number of images
        const imagesRef = ref(storage, `service_provider_img/${currentServiceProviderId}`);
        const imagesList = await listAll(imagesRef);
        const currentImageCount = imagesList.items.length;

        // Check if adding new files would exceed limit
        if (currentImageCount + files.length > 10) {
            showOverlay('Maximum 10 images allowed. Please delete some images first.', 'error');
            return;
        }

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                showOverlay('Please upload only image files', 'error');
                continue;
            }

            try {
                const filename = `${Date.now()}_${file.name}`;
                const imageRef = ref(storage, `service_provider_img/${currentServiceProviderId}/${filename}`);
                await uploadBytes(imageRef, file);
                const url = await getDownloadURL(imageRef);
                addImageToGrid(url, filename);
                showOverlay("Image uploaded successfully", 'success');
            } catch (error) {
                console.error("Error uploading image:", error);
                showOverlay("Error uploading image", 'error');
            }
        }
    } catch (error) {
        console.error("Error checking image count:", error);
        showOverlay("Error uploading images", 'error');
    }
}

// Load packages
async function loadPackages() {
    try {
        const packagesRef = collection(db, "package");
        const querySnapshot = await getDocs(packagesRef);
        
        packagesGrid.innerHTML = '';
        console.log('Loading packages for provider:', currentServiceProviderId);

        querySnapshot.forEach(doc => {
            const packageData = doc.data();
            // Match using SP0001 directly
            if (packageData.serviceProviderId === currentServiceProviderId) {
                const card = createPackageCard(packageData);
                packagesGrid.appendChild(card);
            }
        });
    } catch (error) {
        console.error("Error loading packages:", error);
    }
}

// Function to create a package card
function createPackageCard(packageData) {
    const card = document.createElement('div');
    card.className = 'package-card';
    
    // Create image carousel if multiple images
    let imageHtml = '';
    if (packageData.imageUrls && packageData.imageUrls.length > 0) {
        if (packageData.imageUrls.length === 1) {
            imageHtml = `<img src="${packageData.imageUrls[0]}" class="package-image" alt="${packageData.name}">`;
        } else {
            imageHtml = `
                <div id="carousel-${packageData.packageID}" class="carousel slide" data-bs-ride="carousel">
                    <div class="carousel-inner">
                        ${packageData.imageUrls.map((url, index) => `
                            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                                <img src="${url}" class="d-block w-100" alt="Package Image ${index + 1}">
                            </div>
                        `).join('')}
                    </div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${packageData.packageID}" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Previous</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#carousel-${packageData.packageID}" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Next</span>
                    </button>
                </div>
            `;
        }
    }

    card.innerHTML = `
        <div class="package-images">
            ${imageHtml}
        </div>
        <div class="package-details">
            <div class="package-id">${packageData.packageID}</div>
            <h3 class="package-name">${packageData.name}</h3>
            <div class="package-religion">${packageData.religion}</div>
            <div class="package-price">RM ${packageData.price.toFixed(2)}</div>
            <p class="package-description">${packageData.description}</p>
            <div class="package-actions">

                <!-- Jit Liang_2024-12-08_11:17 changed redirect to editPackage.html (previously was /serviceProviderAddEditPackage.html) -->
                <a href="/Funeral_Industry_Integration_System/Service_Provider/editPackage.html?id=${packageData.packageID}" class="btn btn-warning btn-sm edit-btn">
                    <span class="material-symbols-outlined">edit</span> Edit
                </a>
                <button class="btn btn-danger btn-sm delete-btn" data-id="${packageData.packageID}">
                    <span class="material-symbols-outlined">delete</span> Delete
                </button>
            </div>
        </div>
    `;

    return card;
}

// Setup event listeners
function setupEventListeners() {
    // Company image upload
    companyImageUpload.addEventListener('change', (e) => handleImageUpload(e.target.files));

    // Delete company image
    companyImageGrid.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-btn')) {
            const filename = e.target.closest('.delete-btn').dataset.filename;
            if (confirm('Are you sure you want to delete this image?')) {
                try {
                    const imageRef = ref(storage, `service_provider_img/${currentServiceProviderId}/${filename}`);
                    await deleteObject(imageRef);
                    e.target.closest('.image-item').remove();
                    
                    // Update count immediately after deletion
                    const currentImages = companyImageGrid.querySelectorAll('.image-item').length;
                    document.querySelector('.image-count').textContent = `${currentImages}/10 images uploaded`;
                    
                    showOverlay("Image deleted successfully", 'success');
                } catch (error) {
                    console.error("Error deleting image:", error);
                    showOverlay("Error deleting image", 'error');
                }
            }
        }
    });

    // Package modal
    addPackageBtn.addEventListener('click', () => {
        packageModal.style.display = 'block';
        packageForm.reset();
    });

    // Close modal
    document.querySelector('.close-modal').addEventListener('click', () => {
        packageModal.style.display = 'none';
    });

    // Package form submission
    packageForm.addEventListener('submit', handlePackageSubmit);
}

// Handle package form submission
async function handlePackageSubmit(e) {
    e.preventDefault();

    const packageData = {
        name: document.getElementById('packageName').value,
        religion: document.getElementById('packageReligion').value,
        description: document.getElementById('packageDescription').value,
        price: parseFloat(document.getElementById('packagePrice').value),
        serviceProviderId: currentServiceProviderId
    };

    if (!packageData.religion) {
        showOverlay('Please select a religion', 'error');
        return;
    }

    try {
        // Handle image upload if provided
        const imageFile = document.getElementById('packageImage').files[0];
        if (imageFile) {
            const filename = `${Date.now()}_${imageFile.name}`;
            const imageRef = ref(storage, `package_images/${currentServiceProviderId}/${filename}`);
            await uploadBytes(imageRef, imageFile);
            packageData.imageUrl = await getDownloadURL(imageRef);
        }

        // Add to Firestore
        const packageRef = collection(db, "service_packages");
        await addDoc(packageRef, packageData);

        // Update UI
        addPackageToGrid(packageData);
        packageModal.style.display = 'none';
        showOverlay("Package added successfully", 'success');
    } catch (error) {
        console.error("Error adding package:", error);
        showOverlay("Error adding package", 'error');
    }
}

// Show overlay message
function showOverlay(message, type = 'success') {
    const overlay = document.getElementById('overlay-message');
    const content = overlay.querySelector('.overlay-content');
    const icon = overlay.querySelector('.material-symbols-outlined');
    const text = overlay.querySelector('.overlay-text');
    
    if (type === 'success') {
        icon.textContent = 'check_circle';
        content.className = 'overlay-content success';
    } else {
        icon.textContent = 'error';
        content.className = 'overlay-content error';
    }
    
    text.textContent = message;
    overlay.style.display = 'flex';
    
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 3000);
}

// Add this function to update image count display
async function updateImageCountDisplay() {
    try {
        const imagesRef = ref(storage, `service_provider_img/${currentServiceProviderId}`);
        const imagesList = await listAll(imagesRef);
        const currentCount = imagesList.items.length;
        
        const countDisplay = document.createElement('div');
        countDisplay.className = `image-count-indicator ${currentCount >= 8 ? 'near-limit' : ''} ${currentCount >= 10 ? 'at-limit' : ''}`;
        countDisplay.textContent = `${currentCount}/10 images uploaded`;
        
        // Replace existing count display if it exists
        const existingCount = document.querySelector('.image-count-indicator');
        if (existingCount) {
            existingCount.replaceWith(countDisplay);
        } else {
            document.querySelector('.upload-controls').after(countDisplay);
        }
    } catch (error) {
        console.error("Error updating image count:", error);
    }
} 