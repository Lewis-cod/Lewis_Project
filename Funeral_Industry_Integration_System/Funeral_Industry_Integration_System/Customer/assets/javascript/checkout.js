// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc,  getDoc, collection, query, where,  getDocs, deleteDoc,orderBy,limit,setDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// Load cart items
async function loadCartItems() {
    try {
        const customerId = localStorage.getItem('custId');
        if (!customerId) {
            window.location.href = '/Funeral_Industry_Integration_System/Login_Register/customer_login.html';
            return;
        }

        const cartRef = collection(db, "cart");
        const q = query(cartRef, where("customerId", "==", customerId));
        const querySnapshot = await getDocs(q);

        const orderItems = document.querySelector('.order-items');
        let subtotal = 0;

        const items = [];
        for (const docSnap of querySnapshot.docs) {
            const cartData = docSnap.data();
            const packageRef = doc(db, "package", cartData.packageId);
            const packageSnap = await getDoc(packageRef);
            
            if (packageSnap.exists()) {
                const packageData = packageSnap.data();
                const quantity = cartData.quantity || 1;
                const itemTotal = packageData.price * quantity;
                subtotal += itemTotal;

                items.push(`
                    <div class="order-item">
                        <img src="${packageData.imageUrls[0]}" alt="${packageData.name}">
                        <div class="item-details">
                            <h3>${packageData.name}</h3>
                            <p>${packageData.religion}</p>
                            <p>Quantity: ${quantity}</p>
                        </div>
                        <div class="item-price">
                            <p>RM ${formatPrice(packageData.price)} × ${quantity}</p>
                            <strong>RM ${formatPrice(itemTotal)}</strong>
                        </div>
                    </div>
                `);
            }
        }

        if (items.length === 0) {
            window.location.href = '/Funeral_Industry_Integration_System/Customer/cart.html';
            return;
        }

        orderItems.innerHTML = items.join('');
        updateTotals(subtotal);
    } catch (error) {
        console.error("Error loading cart items:", error);
    }
}

// Update totals
function updateTotals(subtotal) {
    const tax = subtotal * 0.06;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `RM ${formatPrice(subtotal)}`;
    document.getElementById('tax').textContent = `RM ${formatPrice(tax)}`;
    document.getElementById('total').textContent = `RM ${formatPrice(total)}`;
    document.getElementById('pay-amount').textContent = formatPrice(total);
}

// Format card number with spaces
function formatCardNumber(input) {
    let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = '';
    
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
        }
        formattedValue += value[i];
    }
    
    input.value = formattedValue;
}

// Format expiry date
function formatExpiry(input) {
    let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2);
    }
    
    input.value = value;
}

// Function to generate order ID
async function generateOrderId() {
    try {
        const orderRef = collection(db, "orders");
        const q = query(orderRef, orderBy("orderID", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        
        let nextNumber = 1;
        
        if (!querySnapshot.empty) {
            // Get the last order ID
            const lastOrder = querySnapshot.docs[0].data();
            const lastNumber = parseInt(lastOrder.orderID.substring(2));
            nextNumber = lastNumber + 1;
        }
        
        // Format the new order ID with leading zeros
        return `OD${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error("Error generating order ID:", error);
        throw error;
    }
}

// Function to generate payment ID
async function generatePaymentId() {
    try {
        const paymentRef = collection(db, "payments");
        const q = query(paymentRef, orderBy("paymentID", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        
        let nextNumber = 1;
        
        if (!querySnapshot.empty) {
            // Get the last payment ID
            const lastPayment = querySnapshot.docs[0].data();
            const lastNumber = parseInt(lastPayment.paymentID.substring(2));
            nextNumber = lastNumber + 1;
        }
        
        // Format the new payment ID with leading zeros
        return `PY${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error("Error generating payment ID:", error);
        throw error;
    }
}

// Add this function to generate notification ID
async function generateNotificationId() {
    try {
        const notificationRef = collection(db, "customer_notification");
        const q = query(notificationRef, orderBy("notificationID", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        
        let nextNumber = 1;
        
        if (!querySnapshot.empty) {
            // Get the last notification ID
            const lastNotification = querySnapshot.docs[0].data();
            const lastNumber = parseInt(lastNotification.notificationID.substring(4));
            nextNumber = lastNumber + 1;
        }
        
        // Format the new notification ID with leading zeros
        return `CNOT${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error("Error generating notification ID:", error);
        throw error;
    }
}

// Update the processPayment function to include notification creation
async function processPayment(event) {
    event.preventDefault();
    
    // Check if form is valid before proceeding
    if (!validateForm()) {
        alert('Please fill in all fields correctly');
        return;
    }

    const loadingOverlay = document.getElementById('loadingOverlay');
    
    try {
        loadingOverlay.style.display = 'flex';
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get customer ID
        const customerId = localStorage.getItem('custId');
        
        // Generate order ID
        const orderId = await generateOrderId();
        
        // Get current date and time
        const now = new Date();
        const orderDate = now.toISOString().split('T')[0];
        const orderTime = now.toTimeString().split(' ')[0];

        // Get cart items for order details
        const cartRef = collection(db, "cart");
        const cartQuery = query(cartRef, where("customerId", "==", customerId));
        const cartSnapshot = await getDocs(cartQuery);
        
        // Collect package details
        const orderItems = [];
        let totalAmount = 0;

        for (const cartDoc of cartSnapshot.docs) {
            const cartData = cartDoc.data();
            const packageRef = doc(db, "package", cartData.packageId);
            const packageSnap = await getDoc(packageRef);
            
            if (packageSnap.exists()) {
                const packageData = packageSnap.data();
                const quantity = cartData.quantity || 1;
                const itemTotal = packageData.price * quantity;
                totalAmount += itemTotal;

                orderItems.push({
                    packageId: cartData.packageId,
                    quantity: quantity,
                    price: packageData.price,
                    subtotal: itemTotal
                });
            }
        }
        
        // Create order in database with orderId as document ID
        const orderRef = doc(db, "orders", orderId);
        await setDoc(orderRef, {
            orderID: orderId,
            customerId: customerId,
            order_date: orderDate,
            order_time: orderTime,
            order_status: "Paid",
            items: orderItems,
            total_amount: totalAmount
        });

        // Generate payment ID using the new function
        const paymentId = await generatePaymentId();

        // Create payment record with paymentId as document ID
        const paymentRef = doc(db, "payments", paymentId);
        await setDoc(paymentRef, {
            paymentID: paymentId,
            orderID: orderId,
            payment_method: "Credit Card",
            payment_date: orderDate,
            payment_time: orderTime,
            payment_amount: totalAmount,
            payment_status: "Completed"
        });

        // Add these debug logs
        console.log("Starting notification creation...");
        const notificationId = await generateNotificationId();
        console.log("Generated notification ID:", notificationId);
        
        const notificationRef = doc(db, "customer_notification", notificationId);
        console.log("Creating notification with data:", {
            notificationID: notificationId,
            customerId: customerId,
            type: "payment_success",
            title: "Payment Successful",
            message: `Your payment of RM ${formatPrice(totalAmount)} for order ${orderId} has been processed successfully.`,
            timestamp: now.toISOString(),
            isRead: false,
            orderId: orderId
        });
        
        await setDoc(notificationRef, {
            notificationID: notificationId,
            customerId: customerId,
            type: "payment_success",
            title: "Payment Successful",
            message: `Your payment of RM ${formatPrice(totalAmount)} for order ${orderId} has been processed successfully.`,
            timestamp: now.toISOString(),
            isRead: false,
            orderId: orderId
        });
        console.log("Notification created successfully");

        // Clear cart
        for (const doc of cartSnapshot.docs) {
            await deleteDoc(doc.ref);
        }

        // Show success message
        loadingOverlay.style.display = 'none';
        document.getElementById('successOverlay').style.display = 'flex';

        // Add click handler for success overlay button
        document.querySelector('#successOverlay button').addEventListener('click', () => {
            window.location.href = '/Funeral_Industry_Integration_System/Customer/order_history.html';
        });

    } catch (error) {
        console.error("Detailed error in payment processing:", error);
        loadingOverlay.style.display = 'none';
        alert('Payment failed. Please try again.');
    }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadCartItems();

    const cardNumber = document.getElementById('card-number');
    const expiry = document.getElementById('expiry');
    const cvv = document.getElementById('cvv');
    const form = document.getElementById('payment-form');

    cardNumber.addEventListener('input', () => formatCardNumber(cardNumber));
    expiry.addEventListener('input', () => formatExpiry(expiry));
    cvv.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    form.addEventListener('submit', processPayment);
});

// Validation for name (only alphabets and spaces)
const cardNameInput = document.getElementById('card-name');
cardNameInput.addEventListener('input', (e) => {
    // Remove any non-alphabetic characters except spaces
    let value = e.target.value.replace(/[^A-Za-z ]/g, '');
    // Remove multiple spaces
    value = value.replace(/\s+/g, ' ');
    e.target.value = value;
});

// Validation for expiry date
const expiryInput = document.getElementById('expiry');
expiryInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value.length >= 2) {
        const month = parseInt(value.substring(0, 2));
        
        // Validate month (1-12)
        if (month > 12) {
            value = '12' + value.substring(2);
        } else if (month < 1) {
            value = '01' + value.substring(2);
        }
        
        // Add slash after month
        value = value.substring(0, 2) + '/' + value.substring(2);
    }
    
    // Limit to MM/YY format
    value = value.substring(0, 5);
    e.target.value = value;
});

// Validate expiry date on form submit
document.getElementById('payment-form').addEventListener('submit', function(e) {
    const expiryValue = expiryInput.value;
    if (expiryValue.length === 5) {
        const [month, year] = expiryValue.split('/');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
        const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
        const enteredYear = parseInt(year);
        const maxYear = currentYear + 10;

        // Check if year is within valid range
        if (enteredYear < currentYear || enteredYear > maxYear) {
            e.preventDefault();
            alert(`Year must be between ${currentYear} and ${maxYear}`);
            return;
        }

        // Check if card is expired
        if (enteredYear === currentYear && parseInt(month) < currentMonth) {
            e.preventDefault();
            alert('Card has expired');
            return;
        }
    }
});

// Format card number with spaces
const cardNumberInput = document.getElementById('card-number');
cardNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    // Add space after every 4 digits
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    // Limit to 16 digits plus spaces
    value = value.substring(0, 19);
    e.target.value = value;
});

// Validate CVV (only numbers, max 3 digits)
const cvvInput = document.getElementById('cvv');
cvvInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    value = value.substring(0, 3); // Limit to 3 digits
    e.target.value = value;
});

// Add event listeners for real-time validation
document.addEventListener('DOMContentLoaded', () => {
    // Initial validation
    validateForm();

    // Add input event listeners
    const inputs = ['card-name', 'card-number', 'expiry', 'cvv'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            validateForm();
            updatePayButton();
        });
    });
});

// Function to update pay button state
function updatePayButton() {
    const payButton = document.querySelector('.pay-button');
    const isValid = validateForm();
    
    if (isValid) {
        payButton.disabled = false;
        payButton.style.opacity = '1';
        payButton.style.cursor = 'pointer';
        payButton.style.backgroundColor = '#000'; // Original color
    } else {
        payButton.disabled = true;
        payButton.style.opacity = '0.5';
        payButton.style.cursor = 'not-allowed';
        payButton.style.backgroundColor = '#cccccc';
    }
}

// Update validateForm to be more strict
function validateForm() {
    const cardName = document.getElementById('card-name').value.trim();
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    const expiry = document.getElementById('expiry').value;
    const cvv = document.getElementById('cvv').value;

    // Name validation - require at least 2 characters for each word
    const nameWords = cardName.split(/\s+/);
    const isNameValid = cardName.length >= 2 && /^[A-Za-z ]+$/.test(cardName);

    // Card number must be exactly 16 digits
    const isCardValid = cardNumber.length === 16 && /^\d{16}$/.test(cardNumber);

    // Validate expiry date
    let isExpiryValid = false;
    if (expiry.length === 5) {
        const [month, year] = expiry.split('/');
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;
        const enteredYear = parseInt(year);
        const enteredMonth = parseInt(month);

        isExpiryValid = (
            enteredMonth >= 1 && 
            enteredMonth <= 12 && 
            enteredYear >= currentYear && 
            enteredYear <= currentYear + 10 && 
            !(enteredYear === currentYear && enteredMonth < currentMonth)
        );
    }

    // CVV must be exactly 3 digits
    const isCvvValid = /^\d{3}$/.test(cvv);

    // Update visual feedback
    const fields = [
        { id: 'card-name', valid: isNameValid },
        { id: 'card-number', valid: isCardValid },
        { id: 'expiry', valid: isExpiryValid },
        { id: 'cvv', valid: isCvvValid }
    ];

    fields.forEach(field => {
        const element = document.getElementById(field.id);
        element.style.borderColor = field.valid ? '#28a745' : '#dc3545';
    });

    return isNameValid && isCardValid && isExpiryValid && isCvvValid;
}

// Add CSS for disabled button
const style = document.createElement('style');
style.textContent = `
    .pay-button:disabled {
        background: #cccccc;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style); 