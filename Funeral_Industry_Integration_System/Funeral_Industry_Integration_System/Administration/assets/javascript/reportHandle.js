import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// firebase config
const config = {
    firebase: {
        apiKey: "AIzaSyA3QJpuhNnEtDivnLXc2BsX2ltcJ87bDHY",
        authDomain: "funeral-integrationsyste-3988c.firebaseapp.com",
        projectId: "funeral-integrationsyste-3988c",
        storageBucket: "funeral-integrationsyste-3988c.firebasestorage.app",
        messagingSenderId: "449055794833",
        appId: "1:449055794833:web:b68ec0d31dba9b77ce8130",
        measurementId: "G-25GELPQ29Y"
    },
    charts: {
        rating: {
            type: 'bar',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Rating Distribution Analysis',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Ratings' }
                    }
                }
            }
        },
        provider: {
            type: 'bar',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Service Provider Rating Comparison',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 5,
                        title: { display: true, text: 'Average Rating' }
                    }
                }
            }
        }
    }
};

// firebase init
const app = initializeApp(config.firebase);
const db = getFirestore(app);

// chart state management
let charts = {
    rating: null,
    provider: null
};

// chart init function
const initCharts = () => {
    const getContext = id => document.getElementById(id)?.getContext('2d');
    const ratingCtx = getContext('ratingChart');
    const providerCtx = getContext('providerChart');

    if (!ratingCtx || !providerCtx) {
        console.error('Canvas elements not found');
        return;
    }

    // clear existing charts
    Object.values(charts).forEach(chart => chart?.destroy());

    // create rating chart
    charts.rating = new Chart(ratingCtx, {
        type: config.charts.rating.type,
        data: {
            labels: ['1★', '2★', '3★', '4★', '5★'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#FF6B6B', '#FFA06B', '#FFD93D', '#6BCB77', '#4D96FF'],
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: config.charts.rating.options
    });

    // create provider chart
    charts.provider = new Chart(providerCtx, {
        type: config.charts.provider.type,
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: '#4D96FF',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: config.charts.provider.options
    });
};

// data processing function
const processData = (providers, feedbacks) => {
    const stats = {
        providers: {},
        overallRatings: [0, 0, 0, 0, 0]
    };

    // init provider data
    providers.forEach(doc => {
        stats.providers[doc.id] = {
            name: doc.data().provider_companyName,
            totalRating: 0,
            totalFeedback: 0,
            ratings: [0, 0, 0, 0, 0]
        };
    });

    // process feedback data
    feedbacks.forEach(doc => {
        const data = doc.data();
        const rating = parseInt(data.rating);
        const provider = stats.providers[data.serviceProviderId];

        if (provider && rating >= 1 && rating <= 5) {
            provider.ratings[rating - 1]++;
            provider.totalRating += rating;
            provider.totalFeedback++;
            stats.overallRatings[rating - 1]++;
        }
    });

    return stats;
};

// filter data function
const filterData = (stats, analysisType) => {
    if (analysisType === 'all') return stats;

    const filtered = { ...stats };
    const providers = { ...stats.providers };
    
    Object.entries(providers).forEach(([key, data]) => {
        const avgRating = data.totalFeedback > 0 ? data.totalRating / data.totalFeedback : 0;
        if (analysisType === 'high' && avgRating < 4) delete providers[key];
        if (analysisType === 'low' && avgRating >= 3) delete providers[key];
    });

    filtered.providers = providers;
    return filtered;
};

// UI update function
const updateUI = (stats) => {
    // update charts
    charts.rating.data.datasets[0].data = stats.overallRatings;
    charts.rating.update();

    const providerStats = Object.entries(stats.providers)
        .map(([id, data]) => ({
            id,
            name: data.name,
            avgRating: data.totalFeedback > 0 ? data.totalRating / data.totalFeedback : 0,
            totalFeedback: data.totalFeedback,
            ratings: data.ratings
        }))
        .sort((a, b) => b.avgRating - a.avgRating);

    // update provider chart
    charts.provider.data.labels = providerStats.map(p => p.name);
    charts.provider.data.datasets[0].data = providerStats.map(p => p.avgRating);
    charts.provider.update();

    // update stats
    const totalFeedback = stats.overallRatings.reduce((a, b) => a + b, 0);
    const avgRating = totalFeedback > 0 
        ? (stats.overallRatings.reduce((sum, count, i) => sum + count * (i + 1), 0) / totalFeedback).toFixed(1)
        : '0.0';

    document.getElementById('avgRating').innerHTML = `
        <span class="rating-value">
            ${avgRating}
            <span class="rating-stars">${'★'.repeat(Math.round(parseFloat(avgRating)))}</span>
        </span>
    `;

    document.getElementById('totalFeedback').innerHTML = `
        <span class="feedback-count">${totalFeedback}</span>
        <span class="feedback-label">Total Reviews</span>
    `;

    // update provider info
    const topProvider = providerStats[0];
    const lowProvider = providerStats[providerStats.length - 1];

    const updateProviderInfo = (elementId, provider) => {
        document.getElementById(elementId).innerHTML = provider ? `
            <div class="provider-name">${provider.name}</div>
            <div class="provider-rating">
                ${provider.avgRating.toFixed(1)}
                <span class="rating-stars">${'★'.repeat(Math.round(provider.avgRating))}</span>
                <span class="provider-feedback">(${provider.totalFeedback} reviews)</span>
            </div>
        ` : 'No ratings yet';
    };

    updateProviderInfo('topProvider', topProvider);
    updateProviderInfo('lowProvider', lowProvider);

    // update table
    const tbody = document.getElementById('providerAnalysisTable').querySelector('tbody');
    tbody.innerHTML = providerStats.map(provider => {
        const ratingDistribution = provider.totalFeedback > 0 
            ? provider.ratings.map((count, index) => {
                const percentage = (count / provider.totalFeedback * 100).toFixed(1);
                return `
                    <div class="rating-bar">
                        <span class="rating-label">
                            <span>${index + 1}</span><span class="star">★</span>
                        </span>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${percentage}%"></div>
                        </div>
                        <span class="percentage">${percentage}%</span>
                    </div>
                `;
            }).join('') 
            : '<div class="no-data">No ratings yet</div>';

        const getStatus = (rating) => {
            if (rating === 0) return 'no-data';
            if (rating >= 4.5) return 'excellent';
            if (rating >= 4.0) return 'good';
            if (rating >= 3.0) return 'average';
            return 'needs-improvement';
        };

        const getStatusText = (rating) => {
            if (rating === 0) return 'No Data';
            if (rating >= 4.5) return 'Excellent';
            if (rating >= 4.0) return 'Good';
            if (rating >= 3.0) return 'Average';
            return 'Needs Improvement';
        };

        return `
            <tr>
                <td>
                    <div class="provider-info">
                        <div class="provider-name">${provider.name}</div>
                        <div class="provider-stats">${provider.totalFeedback} reviews</div>
                    </div>
                </td>
                <td>
                    <div class="rating-display">
                        <span class="rating-number">${provider.totalFeedback > 0 ? provider.avgRating.toFixed(1) : '-'}</span>
                        <span class="rating-stars">${provider.totalFeedback > 0 ? '★'.repeat(Math.round(provider.avgRating)) : ''}</span>
                    </div>
                </td>
                <td>${provider.totalFeedback}</td>
                <td class="rating-distribution">
                    ${ratingDistribution}
                </td>
                <td class="status-${getStatus(provider.avgRating)}">
                    ${getStatusText(provider.avgRating)}
                </td>
            </tr>
        `;
    }).join('');

    // resize for print report
    const resizeCharts = () => {
        if (window.matchMedia('print').matches) {
            Object.values(charts).forEach(chart => {
                if (chart && chart.resize) {
                    // set chart size for print
                    const parent = chart.canvas.parentElement;
                    const width = parent.offsetWidth;
                    const height = parent.offsetHeight;
                    
                    chart.resize(width, height);
                    
                    // force redraw to ensure correct display
                    chart.render();
                }
            });
        }
    };

    // add event listeners for print
    window.addEventListener('beforeprint', resizeCharts);
    resizeCharts();
};

// initialize date range
const initDateRange = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];
    
    document.getElementById('startDate').value = lastMonthStr;
    document.getElementById('endDate').value = today;
};

//  report generation function
const generateReport = async () => {
    try {
        document.body.classList.add('loading');
        const analysisType = document.getElementById('ratingAnalysis').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        const [providersSnapshot, feedbackSnapshot] = await Promise.all([
            getDocs(collection(db, "service_provider")),
            getDocs(collection(db, "feedback_rating"))
        ]);

        // filter feedbacks within date range
        const filteredFeedbacks = feedbackSnapshot.docs.filter(doc => {
            const data = doc.data();
            const feedbackDate = data.feedback_date;
            return feedbackDate >= startDate && feedbackDate <= endDate;
        });

        const stats = processData(providersSnapshot.docs, filteredFeedbacks);
        const filteredStats = filterData(stats, analysisType);
        updateUI(filteredStats);

    } catch (error) {
        console.error("Error generating report:", error);
        alert("Error generating report");
    } finally {
        document.body.classList.remove('loading');
    }
};

// print report function
const printReport = () => {
    window.print();
};

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initDateRange();
    initCharts();
    
    // add event listeners
    document.getElementById('generateReport').addEventListener('click', generateReport);
    document.getElementById('printReport').addEventListener('click', printReport);
    
    // initial load
    generateReport();
});
