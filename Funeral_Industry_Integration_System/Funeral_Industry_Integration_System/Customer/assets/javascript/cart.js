import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, deleteDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// Function to format price
function formatPrice(price) {
    return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Function to create a cart item element
function createCartItem(itemData) {
    // New template with View Details button and reorganized layout
    return `
        <div class="cart-item" data-id="${itemData.packageID}">
            <img src="${itemData.imageUrls[0]}" alt="${itemData.name}" class="item-image">
            <div class="item-details">
                <div>
                    <h3 class="item-name">${itemData.name}</h3>
                    <p class="item-type">${itemData.religion}</p>
                    <!-- New item actions container -->
                    <div class="item-actions">
                        <button class="view-details-btn" onclick="window.location.href='/Funeral_Industry_Integration_System/Customer/package_detail.html?id=${itemData.packageID}'">
                            View Details
                        </button>
                        <button class="remove-btn" onclick="removeFromCart('${itemData.packageID}')">Remove</button>
                    </div>
                </div>
                <!-- Quantity controls -->
                <div class="quantity-controls">
                    <button class="quantity-btn minus" onclick="updateQuantity('${itemData.packageID}', -1)">-</button>
                    <span class="quantity">${itemData.quantity || 1}</span>
                    <button class="quantity-btn plus" onclick="updateQuantity('${itemData.packageID}', 1)">+</button>
                </div>
            </div>
            <div class="item-price">RM ${formatPrice(itemData.price * (itemData.quantity || 1))}</div>
        </div>
    `;
}

// Function to update cart summary (simplified without shipping)
function updateCartSummary(items) {
    const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const tax = subtotal * 0.06; // 6% tax
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `RM ${formatPrice(subtotal)}`;
    document.getElementById('tax').textContent = `RM ${formatPrice(tax)}`;
    document.getElementById('grandTotal').textContent = `RM ${formatPrice(total)}`;
}

// Enhanced quantity update function
window.updateQuantity = async function(packageId, change) {
    try {
        const customerId = localStorage.getItem('custId');
        const cartRef = collection(db, "cart");
        const q = query(cartRef, 
            where("customerId", "==", customerId),
            where("packageId", "==", packageId)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const cartItem = querySnapshot.docs[0];
            const currentQuantity = cartItem.data().quantity || 1;
            // Ensure quantity doesn't go below 1
            const newQuantity = Math.max(1, currentQuantity + change);
            
            await updateDoc(cartItem.ref, {
                quantity: newQuantity
            });
            
            // Update display and totals
            const quantitySpan = document.querySelector(`[data-id="${packageId}"] .quantity`);
            quantitySpan.textContent = newQuantity;
            await loadCart(); // Reload to update all totals
        }
    } catch (error) {
        console.error("Error updating quantity:", error);
    }
}

// Function to remove item from cart
window.removeFromCart = async function(packageId) {
    try {
        const customerId = localStorage.getItem('custId');
        const cartRef = collection(db, "cart");
        const q = query(cartRef, 
            where("customerId", "==", customerId),
            where("packageId", "==", packageId)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            await deleteDoc(querySnapshot.docs[0].ref);
            await loadCart();
        }
    } catch (error) {
        console.error("Error removing item from cart:", error);
    }
}

// Load cart items with improved header count
async function loadCart() {
    try {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const emptyState = document.getElementById('emptyState');
        const cartItems = document.querySelector('.cart-items');
        
        loadingOverlay.style.display = 'flex';

        const customerId = localStorage.getItem('custId');
        if (!customerId) {
            window.location.href = '/Funeral_Industry_Integration_System/Login_Register/customer_login.html';
            return;
        }

        const cartRef = collection(db, "cart");
        const q = query(cartRef, where("customerId", "==", customerId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            emptyState.style.display = 'block';
            document.querySelector('.cart-content').style.display = 'none';
            document.querySelector('.cart-header h1').textContent = 'Your Cart (0 items)';
            return;
        }

        const items = [];
        for (const docSnap of querySnapshot.docs) {
            const cartData = docSnap.data();
            const packageRef = doc(db, "package", cartData.packageId);
            const packageSnap = await getDoc(packageRef);
            if (packageSnap.exists()) {
                const packageData = packageSnap.data();
                packageData.packageID = packageSnap.id;
                // Merge cart data (quantity) with package data
                packageData.quantity = cartData.quantity || 1;
                items.push(packageData);
            }
        }

        if (items.length === 0) {
            // Show empty state
            emptyState.style.display = 'block';
            document.querySelector('.cart-content').style.display = 'none';
            document.querySelector('.cart-header h1').textContent = 'Your Cart (0 items)';
        } else {
            // Show cart content with updated count
            emptyState.style.display = 'none';
            document.querySelector('.cart-content').style.display = 'grid';
            cartItems.innerHTML = items.map(item => createCartItem(item)).join('');
            updateCartSummary(items);

            // Calculate and display total items including quantities
            const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
            document.querySelector('.cart-header h1').textContent = `Your Cart (${totalItems} items)`;
        }

    } catch (error) {
        console.error("Error loading cart:", error);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Load cart when page loads
document.addEventListener('DOMContentLoaded', loadCart);

// Add click handler for checkout button
const checkoutBtn = document.querySelector('.checkout-btn');
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
        window.location.href = '/Funeral_Industry_Integration_System/Customer/checkout.html';
    });
}