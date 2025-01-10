import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage, ref, getDownloadURL, listAll } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

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

let currentSlide = 0;
let currentImages = [];
let allPackages = []; // Store all packages

// Add this at the start of your file to get the provider ID from URL
function getProviderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

document.addEventListener('DOMContentLoaded', async function() {
    const providerId = getProviderIdFromUrl();
    if (providerId) {
        try {
            // First load provider details (this includes company info and images)
            await loadProviderDetails(providerId);
            // Then load the packages
            await loadProviderPackages(providerId);
            setupFilterListeners();
        } catch (error) {
            console.error('Error loading provider information:', error);
        }
    } else {
        console.error('No provider ID found in URL');
    }
});

async function loadProviderDetails(providerId) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    try {
        loadingOverlay.style.display = 'flex';
        // Query the service provider
        const providersRef = collection(db, "service_provider");
        const q = query(providersRef, where("provider_ID", "==", providerId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const providerData = querySnapshot.docs[0].data();
            
            // Load provider images
            const imagesRef = ref(storage, `service_provider_img/${providerId}`);
            currentImages = [];
            
            try {
                const imagesList = await listAll(imagesRef);
                for (const imageRef of imagesList.items) {
                    const url = await getDownloadURL(imageRef);
                    currentImages.push(url);
                }
            } catch (error) {
                console.error("Error loading images:", error);
                currentImages = ['customer_module_img/funeral_card_img_home/default.jpg'];
            }

            // Update page content with provider details
            updatePageContent(providerData);
            
            // Initialize image slider if there are images
            if (currentImages.length > 0) {
                initializeImageSlider();
            }

            // Setup map links
            setupMapLinks(providerData.business_Address);
        } else {
            console.error("Provider not found");
        }
    } catch (error) {
        console.error("Error loading provider details:", error);
    } finally {
        // Only hide the overlay after everything is loaded
        loadingOverlay.style.display = 'none';
    }
}

async function updatePageContent(provider) {
    // Get provider's rating
    const rating = await getProviderAverageRating(provider.provider_ID);
    const stars = generateStarRating(rating.average);
    
    // Update company name and rating
    document.getElementById('companyName').innerHTML = `
        ${provider.provider_companyName}
        <div class="rating-container">
            <div class="stars">${stars}</div>
            <span class="rating-count">(${rating.count} reviews)</span>
        </div>
    `;
    
    // Update company details
    document.getElementById('companyDetails').innerHTML = `
        <div class="details-content">
            <div class="main-info">
                <div class="info-item">
                    <span class="info-label">Service Type</span>
                    <span class="info-value uppercase">${provider.service_Type || 'Not specified'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Address</span>
                    <span class="info-value uppercase">${provider.business_Address || 'Not specified'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">State</span>
                    <span class="info-value uppercase">${provider.business_state || 'Not specified'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Contact</span>
                    <div class="contact-wrapper">
                        <span class="info-value uppercase">${provider.provider_Contact || 'Not specified'}</span>
                        <a href="https://wa.me/${provider.provider_Contact?.replace(/\D/g, '')}" class="whatsapp-btn">
                            <i class="fab fa-whatsapp"></i>
                        </a>
                    </div>
                </div>
                <div class="info-item">
                    <span class="info-label">Email</span>
                    <span class="info-value">${provider.provider_email || 'Not specified'}</span>
                </div>
            </div>
        </div>
         <div class="navigation-buttons">
                <a id="googleMapsLink" target="_blank" class="nav-button google-maps">
                    <i class="fas fa-map-marker-alt"></i> Open in Google Maps
                </a>
                <a id="wazeLink" target="_blank" class="nav-button waze">
                    <i class="fas fa-road"></i> Open in Waze
                </a>
            </div>
        </div>
    `;
     // Setup map links
     setupMapLinks(provider.business_Address);
}

function initializeImageSlider() {
    const container = document.querySelector('.image-container');
    container.innerHTML = `
        ${currentImages.map((url, index) => `
            <img src="${url}" class="slide ${index === 0 ? 'active' : ''}" 
                alt="Property" onclick="showCurrentImage()">
        `).join('')}
        <button class="nav-btn prev" onclick="changeSlide(-1)">❮</button>
        <button class="nav-btn next" onclick="changeSlide(1)">❯</button>
        <span class="image-count">1/${currentImages.length}</span>
    `;
}

function setupMapLinks(address) {
    const googleMapsLink = document.getElementById('googleMapsLink');
    const wazeLink = document.getElementById('wazeLink');

    const encodedAddress = encodeURIComponent(address);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    const wazeUrl = `https://www.waze.com/ul?q=${encodedAddress}&navigate=yes`;

    googleMapsLink.href = googleMapsUrl;
    wazeLink.href = wazeUrl;
}

// Make changeSlide function available globally
window.changeSlide = function(direction) {
    const slides = document.querySelectorAll('.slide');
    slides[currentSlide].classList.remove('active');
    
    currentSlide = (currentSlide + direction + slides.length) % slides.length;
    
    slides[currentSlide].classList.add('active');
    document.querySelector('.image-count').textContent = `${currentSlide + 1}/${slides.length}`;
};

// Update the preview functionality to show current active image and allow navigation
window.showCurrentImage = function() {
    const activeSlide = document.querySelector('.slide.active');
    if (activeSlide) {
        const previewOverlay = document.createElement('div');
        previewOverlay.className = 'image-preview-overlay';
        previewOverlay.innerHTML = `
            <div class="preview-content">
                <img src="${activeSlide.src}" alt="Preview">
                <button class="close-preview">
                    <span class="material-symbols-outlined">close</span>
                </button>
                <button class="preview-nav prev">❮</button>
                <button class="preview-nav next">❯</button>
                <span class="preview-count">${currentSlide + 1}/${currentImages.length}</span>
            </div>
        `;

        document.body.appendChild(previewOverlay);

        // Setup navigation for preview
        const prevBtn = previewOverlay.querySelector('.preview-nav.prev');
        const nextBtn = previewOverlay.querySelector('.preview-nav.next');
        const previewImg = previewOverlay.querySelector('img');
        const previewCount = previewOverlay.querySelector('.preview-count');

        prevBtn.onclick = (e) => {
            e.stopPropagation();
            let newIndex = (currentSlide - 1 + currentImages.length) % currentImages.length;
            previewImg.src = currentImages[newIndex];
            currentSlide = newIndex;
            previewCount.textContent = `${currentSlide + 1}/${currentImages.length}`;
            
            // Also update the main slider
            const mainSlides = document.querySelectorAll('.slide');
            mainSlides.forEach(slide => slide.classList.remove('active'));
            mainSlides[currentSlide].classList.add('active');
            document.querySelector('.image-count').textContent = `${currentSlide + 1}/${currentImages.length}`;
        };

        nextBtn.onclick = (e) => {
            e.stopPropagation();
            let newIndex = (currentSlide + 1) % currentImages.length;
            previewImg.src = currentImages[newIndex];
            currentSlide = newIndex;
            previewCount.textContent = `${currentSlide + 1}/${currentImages.length}`;
            
            // Also update the main slider
            const mainSlides = document.querySelectorAll('.slide');
            mainSlides.forEach(slide => slide.classList.remove('active'));
            mainSlides[currentSlide].classList.add('active');
            document.querySelector('.image-count').textContent = `${currentSlide + 1}/${currentImages.length}`;
        };

        // Add keyboard navigation
        const handleKeyPress = (e) => {
            if (e.key === 'ArrowLeft') prevBtn.click();
            if (e.key === 'ArrowRight') nextBtn.click();
            if (e.key === 'Escape') {
                document.body.removeChild(previewOverlay);
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);

        // Close preview when clicking outside or on close button
        previewOverlay.addEventListener('click', (e) => {
            if (e.target === previewOverlay || e.target.closest('.close-preview')) {
                document.body.removeChild(previewOverlay);
                document.removeEventListener('keydown', handleKeyPress);
            }
        });
    }
}; 

// Function to load provider's packages
async function loadProviderPackages(providerId) {
    try {
        console.log('Loading packages for provider:', providerId);
        const packagesRef = collection(db, "package");
        const q = query(packagesRef, where("serviceProviderId", "==", providerId));
        const querySnapshot = await getDocs(q);
        
        allPackages = []; // Reset packages array
        const packagesGrid = document.getElementById('packagesGrid');
        packagesGrid.innerHTML = '';
        
        console.log('Found packages:', querySnapshot.size);

        if (querySnapshot.empty) {
            packagesGrid.innerHTML = `
                <div class="no-packages">
                    <p>No packages available at the moment.</p>
                </div>
            `;
            return;
        }

        // Process each package
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            console.log('Package data:', data);
            
            const packageData = {
                packageID: doc.id,
                name: data.name || '',
                religion: data.religion || '',
                price: data.price || 0,
                imageUrls: []
            };

            // Load images from package_images folder
            try {
                const packageImagesRef = ref(storage, `package_images/${packageData.packageID}`);
                const imagesList = await listAll(packageImagesRef);
                
                // Get URLs for all images in the package folder
                for (const imageRef of imagesList.items) {
                    const url = await getDownloadURL(imageRef);
                    packageData.imageUrls.push(url);
                }
                
                console.log(`Loaded ${packageData.imageUrls.length} images for package ${packageData.packageID}`);
            } catch (error) {
                console.error(`Error loading images for package ${packageData.packageID}:`, error);
            }

            allPackages.push(packageData);
        }

        // Display all packages initially
        displayFilteredPackages('all');
        
        // Setup filter listeners
        setupFilterListeners();
    } catch (error) {
        console.error("Error loading packages:", error);
    }
}

// Function to display filtered packages
function displayFilteredPackages(religion) {
    const packagesGrid = document.getElementById('packagesGrid');
    packagesGrid.innerHTML = '';
    
    console.log('Filtering for religion:', religion); // Add this for debugging
    
    const filteredPackages = religion.toLowerCase() === 'all' 
        ? allPackages 
        : allPackages.filter(pkg => {
            console.log('Package religion:', pkg.religion); // Add this for debugging
            return pkg.religion && pkg.religion.toLowerCase() === religion.toLowerCase();
        });
    
    console.log('Filtered packages:', filteredPackages); // Add this for debugging
    
    if (filteredPackages.length === 0) {
        packagesGrid.innerHTML = `
            <div class="no-packages">
                <p>No packages available for ${religion}</p>
            </div>
        `;
        return;
    }
    
    filteredPackages.forEach(packageData => {
        const packageCard = createPackageCard(packageData);
        packagesGrid.appendChild(packageCard);
    });
}

/**
 * Recent Changes (Price Formatting Update):
 * ---------------------------------------
 * 1. Added formatPrice function to standardize price display across the application
 * 2. Updated price display to use thousand separators (e.g., 38,888.00)
 * 3. Enforced consistent 2 decimal places for all prices
 * 4. Improved readability for large numbers with proper formatting
 * 5. Matches the formatting used in other pages (package listing, favorites)
 */

// Function to setup filter listeners
function setupFilterListeners() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('Filter clicked:', this.dataset.religion); // Debug log
            
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter packages
            displayFilteredPackages(this.dataset.religion);
        });
    });
}

/**
 * Formats a number as currency with thousand separators and 2 decimal places
 * @param {number} price - The price to format
 * @returns {string} Formatted price (e.g., "38,888.00")
 * 
 * Examples:
 * formatPrice(38800) => "38,800.00"
 * formatPrice(1234.5) => "1,234.50"
 * formatPrice(1000000) => "1,000,000.00"
 * 
 * Features:
 * - Uses toLocaleString for proper number formatting
 * - Always shows 2 decimal places
 * - Adds thousand separators (commas)
 * - Handles any number size correctly
 */
function formatPrice(price) {
    return parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Creates a package card with formatted price and consistent styling
 * @param {Object} packageData - The package information to display
 * @returns {HTMLElement} The created package card element
 */
function createPackageCard(packageData) {
    const div = document.createElement('div');
    div.className = 'package-card';
    
    // Use a default image if no images are available
    const imageUrl = packageData.imageUrls && packageData.imageUrls.length > 0 
        ? packageData.imageUrls[0] 
        : '/Funeral_Industry_Integration_System/Customer/assets/images/default-package.jpg';
    
    div.innerHTML = `
        <img src="${imageUrl}" alt="${packageData.name}" class="package-image">
        <div class="package-details">
            <h3 class="package-name">${packageData.name}</h3>
            <div class="package-religion">${packageData.religion}</div>
            <div class="package-price">RM ${formatPrice(packageData.price)}</div>
            <button class="view-package-btn" onclick="window.location.href='/Funeral_Industry_Integration_System/Customer/package_detail.html?id=${packageData.packageID}'">
                View Package
            </button>
        </div>
    `;
    
    return div;
} 

// Add this function to calculate average rating
async function getProviderAverageRating(providerId) {
    try {
        const feedbackRef = collection(db, "feedback_rating");
        const q = query(feedbackRef, where("serviceProviderId", "==", providerId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return { average: 0, count: 0 };
        }

        let totalRating = 0;
        querySnapshot.forEach((doc) => {
            totalRating += doc.data().rating;
        });

        return {
            average: totalRating / querySnapshot.size,
            count: querySnapshot.size
        };
    } catch (error) {
        console.error("Error getting average rating:", error);
        return { average: 0, count: 0 };
    }
}

// Add this helper function to generate star HTML
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return `
        ${Array(fullStars).fill('<i class="fas fa-star"></i>').join('')}
        ${hasHalfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
        ${Array(emptyStars).fill('<i class="far fa-star"></i>').join('')}
    `;
} 