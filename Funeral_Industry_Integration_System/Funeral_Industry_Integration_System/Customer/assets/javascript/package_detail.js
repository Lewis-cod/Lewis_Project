// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, addDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

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

// Global variables for image navigation
let currentImageIndex = 0;
let packageImages = [];
let currentPackageId = null;

// Function to get package ID from URL
function getPackageIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Function to format price
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

// Function to add to cart
async function confirmAddToCart() {
    try {
        const customerId = localStorage.getItem('custId');
        if (!customerId) {
            window.location.href = '/Funeral_Industry_Integration_System/Login_Register/customer_login.html';
            return;
        }

        // Get the package ID from URL if currentPackageId is not set
        if (!currentPackageId) {
            currentPackageId = getPackageIdFromUrl();
        }

        if (!currentPackageId) {
            throw new Error('No package ID found');
        }

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
            closeCartOverlay();
            showSuccessOverlay();
        } else {
            // Update existing item's quantity
            const cartItem = querySnapshot.docs[0];
            const currentQuantity = cartItem.data().quantity || 1;
            await updateDoc(cartItem.ref, {
                quantity: currentQuantity + 1
            });
            closeCartOverlay();
            showSuccessOverlay();
        }
    } catch (error) {
        console.error("Error adding to cart:", error);
        closeCartOverlay();
        alert('Failed to add package to cart. Please try again.');
    }
}

// Make functions available globally
window.showCartOverlay = showCartOverlay;
window.closeCartOverlay = closeCartOverlay;
window.confirmAddToCart = confirmAddToCart;

// Function to show cart confirmation overlay
function showCartOverlay(packageId) {
    currentPackageId = packageId;
    document.getElementById('cartOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Function to close cart overlay
function closeCartOverlay() {
    document.getElementById('cartOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentPackageId = null;
}

// Function to load package details
async function loadPackageDetails() {
    try {
        const packageId = getPackageIdFromUrl();
        if (!packageId) {
            console.error("No package ID provided");
            return;
        }

        // Set currentPackageId when loading package details
        currentPackageId = packageId;
        
        // Get package data from Firestore
        const packageRef = doc(db, "package", packageId);
        const packageDoc = await getDoc(packageRef);

        if (!packageDoc.exists()) {
            console.error("Package not found");
            return;
        }

        const packageData = packageDoc.data();
        console.log("Package Data:", packageData); // Debug log

        // Get provider data
        if (!packageData.serviceProviderId) {
            console.error("No provider ID in package data");
            return;
        }
        const providerRef = doc(db, "service_provider", packageData.serviceProviderId);
        const providerDoc = await getDoc(providerRef);
        console.log("Provider Doc:", providerDoc.exists()); // Debug log
        const providerData = providerDoc.data();

        // Update UI with package details
        document.getElementById('package-name').textContent = packageData.name;
        document.getElementById('package-type').textContent = packageData.religion;
        document.getElementById('package-cost').textContent = `RM ${formatPrice(packageData.price)}`;
        document.getElementById('package-description').textContent = packageData.description;

        // Load package images
        if (packageData.imageUrls && packageData.imageUrls.length > 0) {
            packageImages = packageData.imageUrls;
            updateImage();
            
            // Show/hide navigation buttons based on image count
            const navButtons = document.querySelectorAll('.nav-btn');
            navButtons.forEach(btn => {
                btn.style.display = packageImages.length > 1 ? 'flex' : 'none';
            });
            
            // Update image counter
            document.querySelector('.image-count').textContent = `1/${packageImages.length}`;
        } else {
            console.error("No images available for this package");
            document.getElementById('package-img').src = '/Funeral_Industry_Integration_System/Customer/assets/customer_module_img/funeral_card_img_home/default.jpg';
            // Hide navigation elements
            document.querySelectorAll('.nav-btn, .image-count').forEach(el => el.style.display = 'none');
        }

        // Populate provider information
        if (providerDoc.exists()) {
            document.getElementById('provider-name').textContent = providerData.provider_companyName;
            document.getElementById('provider-contact').textContent = providerData.provider_Contact;
            document.getElementById('provider-email').textContent = providerData.provider_email;
            document.getElementById('provider-address').textContent = providerData.business_Address;
        } else {
            console.error("Provider not found");
        }

        // Update the cart and purchase button handlers
        const cartButton = document.querySelector('.save-to-favorites');
        const purchaseButton = document.querySelector('.purchase');

        cartButton.textContent = 'Add to Cart';
        
        // Add click handler for cart button
        cartButton.addEventListener('click', () => showCartOverlay(packageId));

        // Update purchase handler to go to checkout
        purchaseButton.addEventListener('click', async () => {
            const customerId = localStorage.getItem('custId');
            if (!customerId) {
                window.location.href = '/Funeral_Industry_Integration_System/Login_Register/customer_login.html';
                return;
            }

            try {
                // Add item to cart first
                const cartRef = collection(db, "cart");
                // Clear existing cart items
                const q = query(cartRef, where("customerId", "==", customerId));
                const querySnapshot = await getDocs(q);
                
                // Delete all existing cart items
                const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);

                // Add new item to cart
                await addDoc(cartRef, {
                    customerId: customerId,
                    packageId: packageId,
                    quantity: 1,
                    createdAt: new Date()
                });

                // Redirect to checkout
                window.location.href = '/Funeral_Industry_Integration_System/Customer/checkout.html';
            } catch (error) {
                console.error("Error preparing checkout:", error);
                alert('Error occurred while processing. Please try again.');
            }
        });

    } catch (error) {
        console.error("Error loading package details:", error);
    }
}

// Function to update displayed image
function updateImage() {
    document.getElementById('package-img').src = packageImages[currentImageIndex];
    document.getElementById('modal-img').src = packageImages[currentImageIndex];
    document.querySelector('.image-count').textContent = 
        `${currentImageIndex + 1}/${packageImages.length}`;
    document.querySelector('.modal-count').textContent = 
        `${currentImageIndex + 1}/${packageImages.length}`;
}

// Function to show next image
window.nextImage = function() {
    if (currentImageIndex < packageImages.length - 1) {
        currentImageIndex++;
    } else {
        currentImageIndex = 0;
    }
    updateImage();
}

// Function to show previous image
window.prevImage = function() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
    } else {
        currentImageIndex = packageImages.length - 1;
    }
    updateImage();
}

// Function to open modal
window.openModal = function() {
    document.getElementById('imageModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

// Function to close modal
window.closeModal = function() {
    document.getElementById('imageModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Add these functions
function showSuccessOverlay() {
    document.getElementById('successOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSuccessOverlay() {
    document.getElementById('successOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Make them available globally
window.closeSuccessOverlay = closeSuccessOverlay;

// Load package details when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load package details
    loadPackageDetails();

    // Close modal when clicking outside the image
    document.addEventListener('click', function(event) {
        const modal = document.getElementById('imageModal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // Close modal with escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });

    // Close overlay when clicking outside
    const overlay = document.getElementById('cartOverlay');
    overlay.addEventListener('click', function(event) {
        if (event.target === overlay) {
            closeCartOverlay();
        }
    });

    // Add click handler for success overlay
    const successOverlay = document.getElementById('successOverlay');
    successOverlay.addEventListener('click', function(event) {
        if (event.target === successOverlay) {
            closeSuccessOverlay();
        }
    });
}); 