import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, query, getDocs, where } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
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

// Store all providers globally so we can filter them without re-fetching
let allProviders = [];

// Add event listeners for filters
document.addEventListener('DOMContentLoaded', () => {
    loadServiceProviders();
    
    // Add filter button listeners
    document.querySelector('.filter-apply-btn').addEventListener('click', applyFilters);
    document.querySelector('.filter-reset-btn').addEventListener('click', resetFilters);
});

async function applyFilters() {
    const stateFilter = document.getElementById('state').value;
    const listingGrid = document.querySelector('.listing-grid');
    listingGrid.innerHTML = '';

    const filteredProviders = stateFilter 
        ? allProviders.filter(provider => provider.state.toLowerCase() === stateFilter.toLowerCase())
        : allProviders;

    for (const provider of filteredProviders) {
        const card = await createListingCard(provider);
        listingGrid.appendChild(card);
    }
}

function resetFilters() {
    document.getElementById('state').value = '';
    renderProviders(allProviders);
}

async function renderProviders(providers) {
    const listingGrid = document.querySelector('.listing-grid');
    listingGrid.innerHTML = '';
    
    for (const provider of providers) {
        const card = await createListingCard(provider);
        listingGrid.appendChild(card);
    }
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

// Update the createListingCard function
async function createListingCard(provider) {
    const div = document.createElement('div');
    div.className = 'listing-card';
    div.setAttribute('data-state', provider.state.toLowerCase());

    // Get provider's rating
    const rating = await getProviderAverageRating(provider.id);
    const stars = generateStarRating(rating.average);

    // Create image slider HTML if there are multiple images
    const imagesHTML = provider.images.length > 1 
        ? `<div class="image-container" data-card-index="${provider.id}">
            ${provider.images.map((url, index) => `
                <img src="${url}" class="slide ${index === 0 ? 'active' : ''}" 
                    alt="Property" data-index="${index}">
            `).join('')}
            <button class="nav-btn prev" onclick="changeSlide(-1, '${provider.id}')">❮</button>
            <button class="nav-btn next" onclick="changeSlide(1, '${provider.id}')">❯</button>
            <span class="image-count">1/${provider.images.length}</span>
           </div>`
        : `<div class="image-container">
            <img src="${provider.images[0]}" alt="Property">
           </div>`;

    div.innerHTML = `
        <div class="property-images">
            ${imagesHTML}
        </div>
        <div class="property-details">
            <h3>${provider.name}</h3>
            <div class="rating-container">
                <div class="stars">${stars}</div>
                <span class="rating-count">(${rating.count} reviews)</span>
            </div>
            <div class="religion">${provider.serviceType}</div>
            <p class="location">${provider.state}</p>
            <div class="action-buttons">
                <button class="details-btn" onclick="viewDetails('${provider.id}')">
                    View details
                </button>
            </div>
        </div>
    `;

    return div;
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

// Update the loadServiceProviders function
async function loadServiceProviders() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    try {
        loadingOverlay.style.display = 'flex';
        const listingGrid = document.querySelector('.listing-grid');
        listingGrid.innerHTML = '';

        const serviceProvidersRef = collection(db, "service_provider");
        const q = query(serviceProvidersRef, where("partner_Status", "==", "approved"));
        const querySnapshot = await getDocs(q);

        allProviders = []; // Reset the global providers array

        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            
            const imagesRef = ref(storage, `service_provider_img/${data.provider_ID}`);
            let imageUrls = [];
            try {
                const imagesList = await listAll(imagesRef);
                for (const imageRef of imagesList.items) {
                    const url = await getDownloadURL(imageRef);
                    imageUrls.push(url);
                }
            } catch (error) {
                console.error("Error loading images:", error);
            }

            // Create provider object
            const provider = {
                id: data.provider_ID,
                name: data.provider_companyName,
                state: data.business_state,
                images: imageUrls,
                serviceType: data.service_Type || 'General Service'
            };

            allProviders.push(provider);
        }

        // Render all providers initially
        await renderProviders(allProviders);

    } catch (error) {
        console.error("Error loading service providers:", error);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Make these functions available globally
window.changeSlide = function(direction, cardId) {
    const container = document.querySelector(`[data-card-index="${cardId}"]`);
    const slides = container.querySelectorAll('.slide');
    const currentSlide = container.querySelector('.active');
    const currentIndex = parseInt(currentSlide.dataset.index);
    
    let newIndex = (currentIndex + direction + slides.length) % slides.length;
    
    currentSlide.classList.remove('active');
    slides[newIndex].classList.add('active');
    
    container.querySelector('.image-count').textContent = `${newIndex + 1}/${slides.length}`;
};

window.viewDetails = function(id) {
    window.location.href = `/Funeral_Industry_Integration_System/Customer/details.html?id=${id}`;
}; 