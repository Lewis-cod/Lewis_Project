import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    getDoc,
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

// Add at the top with other variables
let allFeedback = [];
let currentFilter = 'all';

async function loadFeedback() {
    try {
        const providerId = localStorage.getItem('providerID');
        console.log("Loading feedback for provider:", providerId);

        // Get feedback
        const feedbackRef = collection(db, "feedback_rating");
        const q = query(
            feedbackRef, 
            where("serviceProviderId", "==", providerId),
            orderBy("feedback_date", "desc")
        );
        const feedbackSnapshot = await getDocs(q);

        let totalRating = 0;
        let feedbackCount = 0;
        const ratingCounts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
        let feedbackHTML = '';

        // Process each feedback
        feedbackSnapshot.forEach((doc) => {
            const feedback = doc.data();
            console.log("Processing feedback:", feedback);

            // Update rating counts
            const rating = parseInt(feedback.rating || 0);
            if (rating > 0) {
                totalRating += rating;
                feedbackCount++;
                ratingCounts[rating]++;
            }

            // Create feedback card
            feedbackHTML += `
                <div class="feedback-card">
                    <div class="rating-date">
                        <div class="rating-text">
                            ${rating}/5
                            <span class="stars">
                                ${Array(5).fill('').map((_, i) => 
                                    `<i class="fas fa-star${i < rating ? ' filled' : ''}"></i>`
                                ).join('')}
                            </span>
                        </div>
                        <span class="date">${feedback.feedback_date}</span>
                    </div>
                    <div class="feedback-categories">
                        ${Array.isArray(feedback.categories) ? feedback.categories.map(cat => 
                            `<span class="category-tag">${cat}</span>`
                        ).join('') : ''}
                    </div>
                    <div class="feedback-comment">
                        ${feedback.comments || 'No comments provided'}
                    </div>
                </div>
            `;
        });

        // Update rating distribution
        let distributionHTML = '';
        for (let rating = 5; rating >= 1; rating--) {
            const count = ratingCounts[rating];
            const percentage = feedbackCount > 0 ? (count / feedbackCount * 100) : 0;
            
            distributionHTML += `
                <div class="rating-row">
                    <span class="rating-number">${rating}</span>
                    <div class="rating-bar">
                        <div class="bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="rating-count">${count}</span>
                </div>
            `;
        }

        // Update UI
        document.querySelector('.rating-bars').innerHTML = distributionHTML;
        document.querySelector('.feedback-list').innerHTML = feedbackHTML || '<p>No feedback available</p>';
        
        // Update average rating
        const averageRating = feedbackCount > 0 ? (totalRating / feedbackCount).toFixed(1) : '0.0';
        document.getElementById('averageRating').textContent = averageRating;
        document.getElementById('totalReviews').textContent = `${feedbackCount} total reviews`;

        // Store all feedback
        allFeedback = [];
        feedbackSnapshot.forEach((doc) => {
            const feedback = doc.data();
            if (feedback.rating) {
                allFeedback.push(feedback);
            }
        });

        // Initial display
        updateFeedbackDisplay(allFeedback);

    } catch (error) {
        console.error('Error loading feedback:', error);
        document.querySelector('.feedback-list').innerHTML = '<p>Error loading feedback. Please try again.</p>';
        document.getElementById('averageRating').textContent = '0.0';
        document.getElementById('totalReviews').textContent = '0 total reviews';
    }
}

function filterFeedback(rating) {
    currentFilter = rating;
    
    // Update active button state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.rating === rating);
    });

    // Filter feedback
    const filteredFeedback = rating === 'all' 
        ? allFeedback 
        : allFeedback.filter(f => f.rating === parseInt(rating));

    // Update display
    updateFeedbackDisplay(filteredFeedback);
}

function updateFeedbackDisplay(feedbackToShow) {
    let feedbackHTML = '';
    
    feedbackToShow.forEach(feedback => {
        feedbackHTML += `
            <div class="feedback-card">
                <div class="rating-date">
                    <div class="rating-text">
                        ${feedback.rating}/5
                        <span class="stars">
                            ${Array(5).fill('').map((_, i) => 
                                `<i class="fas fa-star${i < feedback.rating ? ' filled' : ''}"></i>`
                            ).join('')}
                        </span>
                    </div>
                    <span class="date">${feedback.feedback_date}</span>
                </div>
                <div class="feedback-categories">
                    ${Array.isArray(feedback.categories) ? feedback.categories.map(cat => 
                        `<span class="category-tag">${cat}</span>`
                    ).join('') : ''}
                </div>
                <div class="feedback-comment">
                    ${feedback.comments || 'No comments provided'}
                </div>
            </div>
        `;
    });

    document.querySelector('.feedback-list').innerHTML = feedbackHTML || '<p>No feedback available</p>';
}

// Add event listeners for filters
document.addEventListener('DOMContentLoaded', () => {
    loadFeedback();
    
    // Add filter button listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterFeedback(btn.dataset.rating));
    });
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', loadFeedback); 