// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    orderBy 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// Load order history
async function loadOrderHistory() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const emptyState = document.getElementById('emptyState');
    const ordersList = document.querySelector('.orders-list');

    try {
        loadingOverlay.style.display = 'flex';

        // Get logged in customer ID
        const customerId = localStorage.getItem('custId');

        // Get orders for this customer, ordered by orderID (newest first)
        const ordersRef = collection(db, "orders");
        const q = query(
            ordersRef, 
            where("customerId", "==", customerId),
            orderBy("orderID", "desc")  // Sort by orderID descending to get newest first
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            emptyState.style.display = 'block';
            ordersList.style.display = 'none';
            return;
        }

        const orders = [];
        for (const orderDoc of querySnapshot.docs) {
            const order = orderDoc.data();
            
            // Get package details for each item
            const itemsWithDetails = await Promise.all(order.items.map(async (item) => {
                const packageRef = doc(db, "package", item.packageId);
                const packageSnap = await getDoc(packageRef);
                const packageData = packageSnap.exists() ? packageSnap.data() : null;
                return {
                    ...item,
                    name: packageData?.name || 'Package Not Found',
                    religion: packageData?.religion || 'N/A'
                };
            }));

            orders.push(`
                <div class="order-card" data-order-id="${order.orderID}">
                    <div class="order-header">
                        <div class="order-info">
                            <div class="order-id">Order ${order.orderID}</div>
                            <div class="order-details">
                                <p>Date: ${order.order_date}</p>
                                <p>Time: ${order.order_time}</p>
                                <p>Status: ${order.order_status}</p>
                            </div>
                            <div class="package-details">
                                ${itemsWithDetails.map(item => `
                                    <div class="package-item">
                                        <p>Package: ${item.name}</p>
                                        <p>Religion: ${item.religion}</p>
                                        <p>Quantity: ${item.quantity}</p>
                                        <p>Price: RM ${formatPrice(item.price)} × ${item.quantity}</p>
                                        <p>Subtotal: RM ${formatPrice(item.subtotal)}</p>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="order-total">
                                Total Amount: RM ${formatPrice(order.total_amount)}
                            </div>
                            <div class="order-actions">
                                <button class="print-btn" onclick="printReceipt('${order.orderID}')">
                                    <i class="fas fa-print"></i> Print Receipt
                                </button>
                                <button class="feedback-btn" onclick="giveFeedback('${order.orderID}')">
                                    <i class="fas fa-star"></i> Feedback & Rating
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        }

        ordersList.innerHTML = orders.join('');
        ordersList.style.display = 'block';
        emptyState.style.display = 'none';

    } catch (error) {
        console.error("Error loading orders:", error);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Load when page opens
document.addEventListener('DOMContentLoaded', loadOrderHistory); 

// Add these functions at the bottom of the file
function printReceipt(orderId) {
    window.location.href = `/Funeral_Industry_Integration_System/Customer/order_receipt.html?orderId=${orderId}`;
}

function giveFeedback(orderId) {
    // TODO: Implement feedback functionality
    console.log(`Opening feedback form for order ${orderId}`);
    // You can redirect to a feedback page or open a modal
    window.location.href = `/Funeral_Industry_Integration_System/Customer/feedback.html?orderId=${orderId}`;
}

// Make functions available globally
window.printReceipt = printReceipt;
window.giveFeedback = giveFeedback; 