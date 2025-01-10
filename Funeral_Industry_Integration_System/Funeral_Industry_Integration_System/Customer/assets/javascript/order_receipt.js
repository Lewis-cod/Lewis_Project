// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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

// Format price function
function formatPrice(price) {
    return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Get order ID from URL
function getOrderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('orderId');
}

// Add this function to fetch package details
async function getPackageDetails(packageId) {
    try {
        console.log('Fetching package details for ID:', packageId);
        const packageRef = doc(db, "package", packageId);
        const packageSnap = await getDoc(packageRef);
        console.log('Package data:', packageSnap.data());
        return packageSnap.exists() ? packageSnap.data() : null;
    } catch (error) {
        console.error('Error fetching package details:', error);
        return null;
    }
}

// Load receipt details
async function loadReceipt() {
    try {
        const orderId = getOrderIdFromUrl();
        console.log("Order ID from URL:", orderId);

        if (!orderId) {
            alert('No order ID provided');
            return;
        }

        // Get order details
        const ordersRef = collection(db, "orders");
        const orderQuery = query(ordersRef, where("orderID", "==", orderId));
        const orderSnapshot = await getDocs(orderQuery);

        if (orderSnapshot.empty) {
            alert('Order not found');
            return;
        }

        const orderData = orderSnapshot.docs[0].data();

        // Get payment details from payments collection
        const paymentsRef = collection(db, "payments");
        const paymentQuery = query(paymentsRef, where("orderID", "==", orderId));
        const paymentSnapshot = await getDocs(paymentQuery);

        let paymentData = {
            paymentID: 'N/A',
            payment_method: 'N/A'
        };

        if (!paymentSnapshot.empty) {
            paymentData = paymentSnapshot.docs[0].data();
        }

        // Get customer details
        const customerRef = doc(db, "customer", orderData.customerId);
        const customerSnap = await getDoc(customerRef);
        const customerData = customerSnap.exists() ? customerSnap.data() : null;

        // Update receipt details
        try {
            // Order details
            document.getElementById('orderId').textContent = orderData.orderID || 'N/A';
            document.getElementById('orderDate').textContent = orderData.order_date || 'N/A';
            document.getElementById('orderTime').textContent = orderData.order_time || 'N/A';
            document.getElementById('orderStatus').textContent = orderData.order_status || 'N/A';

            // Payment details
            document.getElementById('paymentId').textContent = paymentData.paymentID || 'N/A';
            document.getElementById('paymentMethod').textContent = paymentData.payment_method || 'N/A';

            // Customer details
            document.getElementById('customerId').textContent = orderData.customerId || 'N/A';
            document.getElementById('customerName').textContent = customerData?.cust_name || 'N/A';

            // Update package list
            const packageList = document.getElementById('packageList');
            if (packageList) {
                // Fetch all package details first
                const packagePromises = orderData.items.map(item => getPackageDetails(item.packageId));
                const packages = await Promise.all(packagePromises);
                
                console.log('All package data:', packages);
                
                // Create the package list HTML
                packageList.innerHTML = orderData.items.map((item, index) => {
                    const packageData = packages[index];
                    console.log('Package data for item:', packageData);
                    return `
                        <div class="package-item">
                            <div class="package-name">
                                <strong>${packageData?.name || packageData?.package_name || 'Unknown Package'}</strong>
                                <div class="package-id">ID: ${item.packageId}</div>
                            </div>
                            <div class="quantity">× ${item.quantity}</div>
                            <div class="price">RM ${formatPrice(item.price)}</div>
                            <div class="subtotal">RM ${formatPrice(item.subtotal)}</div>
                        </div>
                    `;
                }).join('');
            }

            // Update totals
            const subtotal = orderData.total_amount / 1.06;
            const tax = orderData.total_amount - subtotal;
            
            document.getElementById('subtotal').textContent = `RM ${formatPrice(subtotal)}`;
            document.getElementById('tax').textContent = `RM ${formatPrice(tax)}`;
            document.getElementById('totalAmount').textContent = `RM ${formatPrice(orderData.total_amount)}`;

        } catch (updateError) {
            console.error("Error updating DOM:", updateError);
        }

    } catch (error) {
        console.error("Error loading receipt:", error);
        console.log("Full error details:", error);
    }
}

// Load receipt when page opens
document.addEventListener('DOMContentLoaded', async () => {
    await loadCompanyLogo(); // Load logo first
    await loadReceipt();     // Then load receipt
});

// Add this function to load the logo
async function loadCompanyLogo() {
    const storage = getStorage();
    const logoRef = ref(storage, 'customer_index_img-vid/logo.png');
    
    try {
        const url = await getDownloadURL(logoRef);
        document.getElementById('companyLogo').src = url;
    } catch (error) {
        console.error("Error loading logo:", error);
        // Optionally set a fallback image
        document.getElementById('companyLogo').src = '/Funeral_Industry_Integration_System/Customer/assets/customer_module_img/logo.png';
    }
}

// Call this function when the page loads
window.addEventListener('DOMContentLoaded', () => {
    loadCompanyLogo();
    // ... other initialization code ...
});

// Add this function to handle printing
async function handlePrint() {
    // Wait for the logo to be fully loaded
    const logo = document.getElementById('companyLogo');
    if (logo.complete) {
        window.print();
    } else {
        logo.onload = () => {
            window.print();
        };
        logo.onerror = () => {
            console.error('Error loading logo for print');
            window.print(); // Print anyway even if logo fails
        };
    }
}

// Make it available to the window object for the onclick handler
window.handlePrint = handlePrint; 