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

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('q');
    
    if (searchQuery) {
        document.getElementById('searchHeader').textContent = `Search Results for "${searchQuery}"`;
        performSearch(searchQuery);
    }
});

async function performSearch(searchTerm) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    try {
        loadingOverlay.style.display = 'flex';
        
        const providersRef = collection(db, "service_provider");
        // Create a case-insensitive search by converting to lowercase
        const searchTermLower = searchTerm.toLowerCase();
        
        // Get all approved providers
        const q = query(providersRef, where("partner_Status", "==", "approved"));
        const querySnapshot = await getDocs(q);
        
        const listingGrid = document.querySelector('.listing-grid');
        listingGrid.innerHTML = '';
        
        const results = [];
        
        // Filter providers by company name
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.provider_companyName.toLowerCase().includes(searchTermLower)) {
                results.push(data);
            }
        });
        
        if (results.length === 0) {
            listingGrid.innerHTML = `
                <div class="no-results">
                    <p>No service providers found matching "${searchTerm}"</p>
                </div>
            `;
            return;
        }

        // Display results
        for (const provider of results) {
            // Load provider images
            const imagesRef = ref(storage, `service_provider_img/${provider.provider_ID}`);
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

            const card = await createListingCard({
                id: provider.provider_ID,
                name: provider.provider_companyName,
                state: provider.business_state,
                images: imageUrls,
                serviceType: provider.service_Type || 'General Service'
            });

            listingGrid.appendChild(card);
        }
    } catch (error) {
        console.error("Error performing search:", error);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Add the createListingCard and other necessary functions from funeral_list.js
async function createListingCard(provider) {
    const div = document.createElement('div');
    div.className = 'listing-card';
    div.setAttribute('data-state', provider.state.toLowerCase());

    // Get provider's rating
    const rating = await getProviderAverageRating(provider.id);
    const stars = generateStarRating(rating.average);

    const imagesHTML = provider.images.length > 0 
        ? `<div class="image-container">
            <img src="${provider.images[0]}" alt="Property">
           </div>`
        : `<div class="image-container">
            <img src="/Funeral_Industry_Integration_System/Customer/assets/images/default-provider.jpg" alt="Default Image">
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
                <button class="details-btn" onclick="window.location.href='/Funeral_Industry_Integration_System/Customer/details.html?id=${provider.id}'">
                    View details
                </button>
            </div>
        </div>
    `;

    return div;
}

// Add the rating functions from funeral_list.js
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