// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    setDoc, 
    orderBy, 
    limit 
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

// Get order ID from URL
function getOrderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('orderId');
}

// Load order details
async function loadOrderDetails() {
    const orderId = getOrderIdFromUrl();
    if (!orderId) return;

    try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("orderID", "==", orderId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const orderData = querySnapshot.docs[0].data();
            
            // Group packages by service provider
            const packagesByProvider = {};
            for (const item of orderData.items) {
                // Get package details to find service provider
                const packageRef = doc(db, "package", item.packageId);
                const packageDoc = await getDoc(packageRef);
                if (packageDoc.exists()) {
                    const packageData = packageDoc.data();
                    const providerId = packageData.serviceProviderId;
                    
                    if (!packagesByProvider[providerId]) {
                        packagesByProvider[providerId] = [];
                    }
                    packagesByProvider[providerId].push({
                        ...item,
                        packageName: packageData.name,
                        packageId: item.packageId
                    });
                }
            }

            // Create feedback forms container
            const container = document.querySelector('.feedback-content');
            container.innerHTML = '<h1>Feedback & Rating</h1>';

            // Create feedback form for each service provider
            for (const providerId in packagesByProvider) {
                const isRated = await checkIfOrderRated(orderId, providerId);
                const packages = packagesByProvider[providerId];
                
                // Get service provider details
                const providerRef = doc(db, "service_provider", providerId);
                const providerDoc = await getDoc(providerRef);
                const providerData = providerDoc.exists() ? providerDoc.data() : {};

                const formSection = document.createElement('div');
                formSection.className = 'provider-feedback-section';
                
                if (isRated) {
                    // Show existing rating
                    const feedbackData = await getFeedbackData(orderId, providerId);
                    formSection.innerHTML = `
                        <div class="provider-info">
                            <h2>${providerData.provider_companyName}</h2>
                            <div class="packages-list">
                                ${packages.map(pkg => `
                                    <p>
                                        <strong>Package ID:</strong> ${pkg.packageId}<br>
                                        <strong>Package Name:</strong> ${pkg.packageName}
                                    </p>
                                `).join('')}
                            </div>
                        </div>
                        <div class="already-rated-message" style="text-align: center; padding: 2rem;">
                            <div style="margin-bottom: 1rem; font-size: 2em;">
                                ${Array(5).fill('').map((_, index) => 
                                    `<i class="fas fa-star" style="color: ${index < feedbackData.rating ? '#ffc107' : '#ddd'}"></i>`
                                ).join('')}
                            </div>
                            <h3>Feedback Already Submitted</h3>
                            <p>You have already provided feedback for this service provider.</p>
                        </div>
                    `;
                } else {
                    // Create feedback form
                    formSection.innerHTML = `
                        <div class="provider-info">
                            <h2>${providerData.provider_companyName}</h2>
                            <div class="packages-list">
                                ${packages.map(pkg => `
                                    <p>
                                        <strong>Package ID:</strong> ${pkg.packageId}<br>
                                        <strong>Package Name:</strong> ${pkg.packageName}
                                    </p>
                                `).join('')}
                            </div>
                        </div>
                        <form class="feedback-form" data-provider-id="${providerId}">
                            <div class="rating-section">
                                <h3>Rate your experience</h3>
                                <div class="star-rating">
                                    ${Array(5).fill('').map((_, i) => 
                                        `<i class="fas fa-star" data-rating="${i + 1}"></i>`
                                    ).join('')}
                                </div>
                                <p class="rating-text">Click to rate</p>
                            </div>
                            <div class="feedback-categories">
                                <h3>What did you like about our service?</h3>
                                <div class="categories">
                                    <label class="category-item">
                                        <input type="checkbox" name="categories" value="Service Quality">
                                        <span>Service Quality</span>
                                    </label>
                                    <label class="category-item">
                                        <input type="checkbox" name="categories" value="Package Value">
                                        <span>Package Value</span>
                                    </label>
                                    <label class="category-item">
                                        <input type="checkbox" name="categories" value="Staff Service">
                                        <span>Staff Service</span>
                                    </label>
                                    <label class="category-item">
                                        <input type="checkbox" name="categories" value="Facilities">
                                        <span>Facilities</span>
                                    </label>
                                </div>
                            </div>
                            <div class="feedback-comments">
                                <h3>Additional Comments</h3>
                                <textarea name="comments" placeholder="Share your experience with us..." maxlength="500"></textarea>
                                <div class="char-count">0/500</div>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="submit-btn">
                                    <i class="fas fa-paper-plane"></i> Submit Feedback
                                </button>
                            </div>
                        </form>
                    `;
                }
                container.appendChild(formSection);
            }

            // Add back button at the bottom
            const backButton = document.createElement('button');
            backButton.className = 'back-btn';
            backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Order History';
            backButton.onclick = () => window.history.back();
            container.appendChild(backButton);

            // Initialize all unrated forms
            document.querySelectorAll('.feedback-form').forEach(form => {
                initializeStarRating(form);
                initializeCharCount(form);
                form.addEventListener('submit', submitFeedback);
            });
        }
    } catch (error) {
        console.error("Error loading order details:", error);
    }
}

// Handle star rating
function initializeStarRating(form) {
    const stars = form.querySelectorAll('.star-rating i');
    const ratingText = form.querySelector('.rating-text');
    let currentRating = 0;

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            currentRating = rating;
            updateStars(rating);
            updateRatingText(rating);
        });

        star.addEventListener('mouseover', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            updateStars(rating);
        });

        star.addEventListener('mouseout', () => {
            updateStars(currentRating);
        });
    });

    function updateStars(rating) {
        stars.forEach(star => {
            const starRating = parseInt(star.getAttribute('data-rating'));
            star.classList.toggle('active', starRating <= rating);
        });
    }

    function updateRatingText(rating) {
        const texts = [
            'Click to rate',
            'Poor',
            'Fair',
            'Good',
            'Very Good',
            'Excellent'
        ];
        ratingText.textContent = texts[rating] || texts[0];
    }
}

// Handle character count
function initializeCharCount(form) {
    const textarea = form.querySelector('.feedback-comments textarea');
    const charCount = form.querySelector('.char-count');

    textarea.addEventListener('input', () => {
        const count = textarea.value.length;
        charCount.textContent = `${count}/500`;
    });
}

// Add this function to generate the next feedback ID
async function generateNextFeedbackId() {
    try {
        const feedbackRef = collection(db, "feedback_rating");
        const querySnapshot = await getDocs(feedbackRef);
        
        let maxNumber = 0;
        querySnapshot.forEach((doc) => {
            const feedbackId = doc.data().feedbackId || '';
            if (feedbackId.startsWith('FRT')) {
                const num = parseInt(feedbackId.substring(3));
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });
        
        const nextNumber = maxNumber + 1;
        return `FRT${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
        console.error("Error generating feedback ID:", error);
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
            const lastNotification = querySnapshot.docs[0].data();
            const lastNumber = parseInt(lastNotification.notificationID.substring(4));
            nextNumber = lastNumber + 1;
        }
        
        return `CNOT${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
        console.error("Error generating notification ID:", error);
        throw error;
    }
}

// Update the showSuccessOverlay function
function showSuccessOverlay() {
    const overlay = document.getElementById('successOverlay');
    overlay.classList.add('show');
    
    // Add event listener to the button
    const backButton = overlay.querySelector('button');
    backButton.addEventListener('click', redirectToOrderHistory);
}

// Update the redirectToOrderHistory function
function redirectToOrderHistory() {
    window.location.href = '/Funeral_Industry_Integration_System/Customer/order_history.html';
}

// Add this function to check if order has been rated
async function checkIfOrderRated(orderId, providerId) {
    try {
        const feedbackRef = collection(db, "feedback_rating");
        const q = query(feedbackRef, 
            where("orderID", "==", orderId),
            where("serviceProviderId", "==", providerId)
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error("Error checking order rating:", error);
        return false;
    }
}

// Add function to get existing feedback data
async function getFeedbackData(orderId, providerId) {
    const feedbackRef = collection(db, "feedback_rating");
    const q = query(feedbackRef, 
        where("orderID", "==", orderId),
        where("serviceProviderId", "==", providerId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs[0].data();
}

// Update the submitFeedback function
async function submitFeedback(event) {
    event.preventDefault();
    const form = event.target;
    const providerId = form.dataset.providerId;
    const orderId = getOrderIdFromUrl();
    
    if (!orderId || !providerId) return;

    try {
        // Check if already rated
        const isRated = await checkIfOrderRated(orderId, providerId);
        if (isRated) {
            alert('This service has already been rated.');
            return;
        }

        // Get form data
        const rating = form.querySelectorAll('.star-rating i.active').length;
        const categories = Array.from(form.querySelectorAll('input[name="categories"]:checked'))
            .map(checkbox => checkbox.value);
        const comments = form.querySelector('textarea[name="comments"]').value;

        // Validate rating
        if (rating === 0) {
            alert('Please provide a rating before submitting.');
            return;
        }

        // Get customer ID
        const customerId = localStorage.getItem('custId');

        // Generate feedback ID
        const feedbackId = await generateNextFeedbackId();

        // Get service provider name
        const providerDoc = await getDoc(doc(db, "service_provider", providerId));
        const providerName = providerDoc.exists() ? providerDoc.data().provider_companyName : "the service provider";

        // Submit feedback
        const feedbackRef = collection(db, "feedback_rating");
        await setDoc(doc(feedbackRef, feedbackId), {
            feedbackId: feedbackId,
            orderID: orderId,
            serviceProviderId: providerId,
            rating: rating,
            categories: categories,
            comments: comments,
            customerId: customerId,
            feedback_date: new Date().toISOString().split('T')[0],
            feedback_time: new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: "2-digit", 
                minute: "2-digit", 
                second: "2-digit" 
            })
        });

        // Create notification
        const notificationId = await generateNotificationId();
        const notificationData = {
            notificationID: notificationId,
            customerId: customerId,
            type: "feedback_submitted",
            title: "Feedback Submitted",
            message: `Thank you for providing feedback for ${providerName}. Your rating: ${rating} stars.`,
            timestamp: new Date().toISOString(),
            isRead: false,
            orderId: orderId,
            feedbackId: feedbackId
        };

        // Save notification
        await setDoc(doc(db, "customer_notification", notificationId), notificationData);

        // Reload the page to show updated status
        location.reload();

    } catch (error) {
        console.error("Error submitting feedback:", error);
        alert('Error submitting feedback. Please try again.');
    }
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadOrderDetails();
    initializeStarRating();
    initializeCharCount();

    // Add form submit handler
    document.getElementById('feedbackForm').addEventListener('submit', submitFeedback);
}); 