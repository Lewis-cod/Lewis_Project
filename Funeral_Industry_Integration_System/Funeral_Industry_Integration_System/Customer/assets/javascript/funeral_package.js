import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit, startAfter, addDoc, deleteDoc, where, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// Constants
const PACKAGES_PER_PAGE = 9;
const PACKAGES_PER_ROW = 3;
let currentPage = 1;
let totalPages = 1;
let currentPackages = [];
let allPackages = []; // Store all packages before filtering
let currentPackageId = null;
/**
 * Formats a number as currency with thousand separators
 * Shows decimal places only when they're not zero
 * @param {number} price - The price to format
 * @returns {string} Formatted price (e.g., "38,888" or "38,888.50")
 * 
 * Examples:
 * formatPrice(38800) => "38,800"
 * formatPrice(1234.5) => "1,234.50"
 * formatPrice(1000000) => "1,000,000"
 */
function formatPrice(price) {
    // Check if price has decimal places
    const hasDecimal = price % 1 !== 0;
    
    return price.toLocaleString('en-US', {
        minimumFractionDigits: hasDecimal ? 2 : 0, // Show decimals only if they exist
        maximumFractionDigits: 2  // Limit to 2 decimal places
    });
}

// Function to create a package card with cart status
async function createPackageCard(packageData) {
    // Truncate description to first 3 items
    const descriptionItems = packageData.description.split('\n').slice(0, 3);
    const hasMoreItems = packageData.description.split('\n').length > 3;

    return `
        <div class="package-card">
            <div class="package-images">
                <div class="image-container" data-card-index="${packageData.packageID}">
                    ${packageData.imageUrls.map((url, index) => `
                        <img src="${url}" 
                             class="slide ${index === 0 ? 'active' : ''}" 
                             alt="Package Image ${index + 1}"
                             data-index="${index}"
                        />
                    `).join('')}
                    ${packageData.imageUrls.length > 1 ? `
                        <button class="nav-btn prev" onclick="changeSlide(-1, '${packageData.packageID}')">❮</button>
                        <button class="nav-btn next" onclick="changeSlide(1, '${packageData.packageID}')">❯</button>
                        <span class="image-count">1/${packageData.imageUrls.length}</span>
                    ` : ''}
                </div>
            </div>
            <div class="package-details">
                <div class="price">RM ${formatPrice(packageData.price)}</div>
                <h3>${packageData.name}</h3>
                <div class="religion">${packageData.religion}</div>
                <div class="package-info">
                    <p>Basic Package Includes:</p>
                    <ul>
                        ${descriptionItems.map(item => `<li>${item}</li>`).join('')}
                        ${hasMoreItems ? `<li class="more-items">...</li>` : ''}
                    </ul>
                </div>
                <div class="action-buttons">
                    <button class="save-btn" onclick="showCartOverlay('${packageData.packageID}')">
                        Add to Cart
                    </button>
                    <button class="details-btn" onclick="window.location.href='/Funeral_Industry_Integration_System/Customer/package_detail.html?id=${packageData.packageID}'">
                        View details
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Add event listeners for filter buttons
document.addEventListener('DOMContentLoaded', async () => {
    await loadPackages();

    // Check for religion parameter in URL
    const religionParam = getUrlParameter('religion');
    if (religionParam) {
        // Set the religion dropdown value
        const religionSelect = document.getElementById('religion');
        if (religionSelect) {
            religionSelect.value = religionParam;
            // Trigger the filter
            applyFilters();
        }
    }

    // Add filter button event listeners
    document.querySelector('.filter-apply-btn').addEventListener('click', applyFilters);
    document.querySelector('.filter-reset-btn').addEventListener('click', resetFilters);

    // Add click handlers for overlays
    const cartOverlay = document.getElementById('cartOverlay');
    const successOverlay = document.getElementById('successOverlay');

    cartOverlay.addEventListener('click', function(event) {
        if (event.target === cartOverlay) {
            closeCartOverlay();
        }
    });

    successOverlay.addEventListener('click', function(event) {
        if (event.target === successOverlay) {
            closeSuccessOverlay();
        }
    });
});

/**
 * Gets a parameter value from the URL
 * @param {string} name - The name of the parameter to get
 * @returns {string|null} The parameter value or null if not found
 * 
 * Example:
 * URL: /funeral_package.html?religion=Buddhism
 * getUrlParameter('religion') returns 'Buddhism'
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function applyFilters() {
    const religionFilter = document.getElementById('religion').value;
    const priceFilter = document.getElementById('price').value;

    // Filter packages based on selected criteria
    currentPackages = allPackages.filter(pkg => {
        let matchesReligion = true;
        let matchesPrice = true;

        // Check religion filter
        if (religionFilter) {
            matchesReligion = pkg.religion === religionFilter;
        }

        // Check price filter
        if (priceFilter) {
            matchesPrice = matchPriceRange(pkg.price, priceFilter);
        }

        return matchesReligion && matchesPrice;
    });

    // Reset to first page and update display
    currentPage = 1;
    totalPages = Math.ceil(currentPackages.length / PACKAGES_PER_PAGE);
    displayCurrentPage();
    updatePagination();
}

/**
 * Matches a price against a price range filter
 * @param {number} price - The package price to check
 * @param {string} range - The price range to match against
 * @returns {boolean} True if price matches the range
 * 
 * Ranges:
 * - 0-5000: Below RM 5,000
 * - 5000-10000: RM 5,000 - RM 10,000
 * - 10000-20000: RM 10,000 - RM 20,000
 * - 20000+: Above RM 20,000
 */
function matchPriceRange(price, range) {
    switch(range) {
        case '0-5000':
            return price <= 5000;
        case '5000-10000':
            return price > 5000 && price <= 10000;
        case '10000-20000':
            return price > 10000 && price <= 20000;
        case '20000+':
            return price > 20000;
        default:
            return true;
    }
}

// Function to reset filters
function resetFilters() {
    document.getElementById('religion').value = '';
    document.getElementById('price').value = '';
    currentPackages = [...allPackages];
    currentPage = 1;
    totalPages = Math.ceil(currentPackages.length / PACKAGES_PER_PAGE);
    displayCurrentPage();
    updatePagination();
}

// Function to load packages
async function loadPackages() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    try {
        loadingOverlay.style.display = 'flex';
        const packagesRef = collection(db, "package");
        const q = query(packagesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        allPackages = [];
        querySnapshot.forEach(doc => {
            const packageData = doc.data();
            packageData.packageID = doc.id; // Add the document ID to the data
            allPackages.push(packageData);
        });

        currentPackages = [...allPackages];
        totalPages = Math.ceil(currentPackages.length / PACKAGES_PER_PAGE);
        displayCurrentPage();
        updatePagination();
    } catch (error) {
        console.error("Error loading packages:", error);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Updated to handle async card creation
async function displayCurrentPage() {
    const listingGrid = document.querySelector('.listing-grid');
    const startIndex = (currentPage - 1) * PACKAGES_PER_PAGE;
    const endIndex = startIndex + PACKAGES_PER_PAGE;
    const packagesForPage = currentPackages.slice(startIndex, endIndex);

    // Create all cards in parallel for better performance
    const packageCards = await Promise.all(
        packagesForPage.map(packageData => createPackageCard(packageData))
    );

    // Update the grid with all cards at once
    listingGrid.innerHTML = packageCards.join('');
}

// Function to update pagination
function updatePagination() {
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    // Update page numbers
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            currentPage = i;
            displayCurrentPage();
            updatePagination();
        };
        pageNumbers.appendChild(pageBtn);
    }

    // Update prev/next buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// Event listeners for pagination
document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayCurrentPage();
        updatePagination();
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        displayCurrentPage();
        updatePagination();
    }
});

// Image slider function
window.changeSlide = function(direction, cardIndex) {
    const container = document.querySelector(`[data-card-index="${cardIndex}"]`);
    const slides = container.querySelectorAll('.slide');
    const imageCount = container.querySelector('.image-count');
    let currentIndex = parseInt(container.querySelector('.active').dataset.index);
    
    let newIndex = currentIndex + direction;
    if (newIndex >= slides.length) newIndex = 0;
    if (newIndex < 0) newIndex = slides.length - 1;

    slides[currentIndex].classList.remove('active');
    slides[newIndex].classList.add('active');
    imageCount.textContent = `${newIndex + 1}/${slides.length}`;
};

// Add these functions
function showCartOverlay(packageId) {
    currentPackageId = packageId;
    document.getElementById('cartOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeCartOverlay() {
    document.getElementById('cartOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentPackageId = null;
}

function showSuccessOverlay() {
    document.getElementById('successOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSuccessOverlay() {
    document.getElementById('successOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Make functions available globally
window.showCartOverlay = showCartOverlay;
window.closeCartOverlay = closeCartOverlay;
window.closeSuccessOverlay = closeSuccessOverlay;
window.confirmAddToCart = confirmAddToCart;

// Function to add to cart
async function confirmAddToCart() {
    const customerId = localStorage.getItem('custId');
    if (!customerId) {
        window.location.href = '/Funeral_Industry_Integration_System/Login_Register/customer_login.html';
        return;
    }

    try {
        const cartRef = collection(db, "cart");
        // Check if already in cart
        const q = query(cartRef, 
            where("customerId", "==", customerId),
            where("packageId", "==", currentPackageId)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            // Add to cart as new item
            await addDoc(cartRef, {
                customerId: customerId,
                packageId: currentPackageId,
                quantity: 1,
                createdAt: new Date()
            });
        } else {
            // Update existing item's quantity
            const cartItem = querySnapshot.docs[0];
            const currentQuantity = cartItem.data().quantity || 1;
            await updateDoc(cartItem.ref, {
                quantity: currentQuantity + 1
            });
        }
        // Show success message in both cases
        closeCartOverlay();
        showSuccessOverlay();
    } catch (error) {
        console.error("Error adding to cart:", error);
        closeCartOverlay();
        alert('Failed to add package to cart. Please try again.');
    }
}