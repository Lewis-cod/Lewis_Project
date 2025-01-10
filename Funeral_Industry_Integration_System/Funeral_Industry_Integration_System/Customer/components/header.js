import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
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

// Add this function to handle logout
function handleLogout() {
    localStorage.removeItem('custId');
    localStorage.removeItem('appointmentData');
    window.location.href = '/Funeral_Industry_Integration_System/startingPage.html';
}

class Header extends HTMLElement {
    constructor() {
        super();
    }

    async connectedCallback() {
        // Get logo URL from Firebase Storage first
        try {
            const storage = getStorage();
            const logoRef = ref(storage, 'customer_index_img-vid/logo.png');
            const logoUrl = await getDownloadURL(logoRef);
            // Render header with the logo URL from database
            this.renderHeader(logoUrl);
            // Initialize notification badge after header is rendered
            updateNotificationBadge();
        } catch (error) {
            console.error("Error loading logo:", error);
            // Render header without logo if there's an error
            this.renderHeader('');
            // Still initialize notification badge even if logo fails
            updateNotificationBadge();
        }
    }

    renderHeader(logoUrl) {
        this.innerHTML = `
            <header>
                <nav class="navbar">
                    <div class="logo-section">
                        <img src="${logoUrl}" alt="Logo" class="logo">
                        <h1 class="company-name">Funeral Integration Platform</h1>
                    </div>

                    <div class="nav-group">
                        <a href="/Funeral_Industry_Integration_System/Customer/index.html" class="nav-item">
                            <i class="fas fa-home"></i>
                            <span>Home</span>
                        </a>
                        
                        <div class="nav-item dropdown">
                            <a href="#" class="nav-link">
                                <i class="far fa-calendar-alt"></i>
                                <span>Appointment</span>
                                <i class="fas fa-chevron-down"></i>
                            </a>
                            <div class="dropdown-content">
                                <a href="/Funeral_Industry_Integration_System/Customer/make_appointment.html">Make Appointment</a>
                                <a href="/Funeral_Industry_Integration_System/Customer/view_appointment.html">View Appointment</a>
                            </div>
                        </div>

                        <div class="nav-item dropdown">
                            <a href="#" class="nav-link">
                                <i class="fas fa-list"></i>
                                <span>Funeral</span>
                                <i class="fas fa-chevron-down"></i>
                            </a>
                            <div class="dropdown-content">
                                <a href="/Funeral_Industry_Integration_System/Customer/funeral_list.html">Funeral List</a>
                                <a href="/Funeral_Industry_Integration_System/Customer/funeral_package.html">Funeral Package</a>
                            </div>
                        </div>
                        
                        <a href="/Funeral_Industry_Integration_System/Customer/cart.html" class="nav-item">
                            <div class="cart-icon-container">
                                <i class="fas fa-shopping-cart"></i>
                            </div>
                            <span>Cart</span>
                        </a>

                        <a href="/Funeral_Industry_Integration_System/Customer/order_history.html" class="nav-item">
                            <i class="fas fa-history"></i>
                            <span>Order History</span>
                        </a>

                        <a href="#" class="nav-item" onclick="openSearch()">
                            <i class="fas fa-search"></i>
                            <span>Search</span>
                        </a>

                        <a href="/Funeral_Industry_Integration_System/Customer/notifications.html" class="nav-item">
                            <div class="notification-icon">
                                <i class="fas fa-bell"></i>
                                <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
                            </div>
                            <span>Notifications</span>
                        </a>

                        <div class="profile-dropdown">
                            <button class="nav-item user-icon">
                                <i class="fas fa-user-circle"></i>
                            </button>
                            <div class="profile-content">
                                <a href="/Funeral_Industry_Integration_System/Customer/customer_profile.html">Profile</a>
                                <a href="#" onclick="handleLogout()">Logout</a>
                            </div>
                        </div>
                    </div>
                </nav>
                
                <div class="search-overlay" id="searchOverlay">
                    <button class="close-search" onclick="closeSearch()">×</button>
                    <div class="search-container">
                        <div class="search-input-group">
                            <input type="text" id="searchInput" placeholder="Search...">
                            <button class="search-btn" onclick="performSearch()">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }
}

customElements.define('header-component', Header);

// Function to update notification badge
function updateNotificationBadge() {
    const custId = localStorage.getItem('custId');
    if (!custId) {
        console.log('No customer ID found');
        return;
    }

    try {
        const db = getFirestore();
        const notificationsRef = collection(db, "customer_notification");
        const q = query(
            notificationsRef,
            where("customerId", "==", custId),
            where("isRead", "==", false)
        );

        // Set up real-time listener
        onSnapshot(q, (snapshot) => {
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                const count = snapshot.size;
                console.log('Unread notifications:', count); // Debug log
                badge.textContent = count;
                badge.style.display = count > 0 ? 'block' : 'none';
            }
        });
    } catch (error) {
        console.error("Error getting notifications:", error);
    }
}

// Search functionality
function openSearch() {
    document.getElementById('searchOverlay').classList.add('active');
    document.getElementById('searchInput').focus();
}

function closeSearch() {
    document.getElementById('searchOverlay').classList.remove('active');
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm) {
        window.location.href = `/Funeral_Industry_Integration_System/Customer/search_results.html?q=${encodeURIComponent(searchTerm)}`;
    }
}

// Add event listener for Enter key in search input
document.getElementById('searchInput')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Make functions available globally
window.handleLogout = handleLogout;
window.openSearch = openSearch;
window.closeSearch = closeSearch;
window.performSearch = performSearch; 