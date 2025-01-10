// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

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
const storage = getStorage(app);

// Function to load slideshow images
async function loadSlideShowImages() {
    try {
        // Reference to the slideshow images folder
        const slideshowRef = ref(storage, 'customer_index_img-vid/slide_img');
        
        // Get list of all images in the folder
        const result = await listAll(slideshowRef);
        
        // Container for the slides
        const slideshowContainer = document.querySelector('.slideshow-container');
        slideshowContainer.innerHTML = ''; // Clear existing slides
        
        // Create slides for each image
        for (let i = 0; i < result.items.length; i++) {
            const imageRef = result.items[i];
            const url = await getDownloadURL(imageRef);
            
            const slideDiv = document.createElement('div');
            slideDiv.className = 'mySlides fade';
            
            const img = document.createElement('img');
            img.src = url;
            img.style.width = '100%';
            img.style.height = '550px';
            
            slideDiv.appendChild(img);
            slideshowContainer.appendChild(slideDiv);
        }
        
        // Add navigation buttons
        const prevButton = document.createElement('a');
        prevButton.className = 'prev';
        prevButton.onclick = () => plusSlides(-1);
        prevButton.innerHTML = '&#10094;';
        
        const nextButton = document.createElement('a');
        nextButton.className = 'next';
        nextButton.onclick = () => plusSlides(1);
        nextButton.innerHTML = '&#10095;';
        
        slideshowContainer.appendChild(prevButton);
        slideshowContainer.appendChild(nextButton);
        
        // Start the slideshow
        showSlides(slideIndex);
    } catch (error) {
        console.error("Error loading slideshow images:", error);
    }
}

// Function to load card images
async function loadCardImages() {
    try {
        // Load pre-plan image
        const prePlanRef = ref(storage, 'customer_index_img-vid/card_img/pre-plan.jpg');
        const prePlanUrl = await getDownloadURL(prePlanRef);
        document.getElementById('pre-plan-img').src = prePlanUrl;
        
        // Load buddhist image
        const buddhistRef = ref(storage, 'customer_index_img-vid/card_img/buddhist.jpg');
        const buddhistUrl = await getDownloadURL(buddhistRef);
        document.getElementById('buddhist-img').src = buddhistUrl;
        
        // Load taoist image
        const taoistRef = ref(storage, 'customer_index_img-vid/card_img/taoist.jpeg');
        const taoistUrl = await getDownloadURL(taoistRef);
        document.getElementById('taoist-img').src = taoistUrl;
        
        // Load christian image
        const christianRef = ref(storage, 'customer_index_img-vid/card_img/christian.jpg');
        const christianUrl = await getDownloadURL(christianRef);
        document.getElementById('christian-img').src = christianUrl;
    } catch (error) {
        console.error("Error loading card images:", error);
    }
}

// Function to load home video
async function loadHomeVideo() {
    try {
        const videoRef = ref(storage, 'customer_index_img-vid/video/Funeral Video Australia on location with White Lady Funerals Sutherland.mp4');
        const videoUrl = await getDownloadURL(videoRef);
        const videoSource = document.getElementById('home-video');
        const videoElement = document.querySelector('.home_video');
        
        videoSource.src = videoUrl;
        // Force the video to load the new source
        videoElement.load();
        
        // Add error handling for video loading
        videoElement.onerror = () => {
            console.error("Error: Video failed to load");
            videoElement.style.display = 'none';
        };
    } catch (error) {
        console.error("Error loading home video:", error);
        // Hide video element if loading fails
        document.querySelector('.home_video').style.display = 'none';
    }
}

// Existing slideshow functionality
let slideIndex = 1;

function plusSlides(n) {
    showSlides(slideIndex += n);
}

function currentSlide(n) {
    showSlides(slideIndex = n);
}

function showSlides(n) {
    const slides = document.getElementsByClassName("mySlides");
    if (!slides.length) return;
    
    if (n > slides.length) {
        slideIndex = 1;
    }
    if (n < 1) {
        slideIndex = slides.length;
    }
    
    for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    
    slides[slideIndex - 1].style.display = "block";
}

// Load images when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadSlideShowImages();
    await loadCardImages();
    await loadHomeVideo();
});

// Auto advance slides every 5 seconds
setInterval(() => {
    plusSlides(1);
}, 5000);

// Keep existing search functionality
function openSearch() {
    document.getElementById("SearchOverlay").style.display = "block";
}

function closeSearch() {
    document.getElementById("SearchOverlay").style.display = "none";
}

// Close search overlay when clicking ESC key
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeSearch();
    }
});