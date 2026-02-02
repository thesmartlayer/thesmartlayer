// =====================================================
// The Smart Layer - Client Admin Dashboard JavaScript
// Handles tab navigation and dashboard functionality
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeCharts();
    loadDashboardData();
    startRealtimeUpdates();
});

// =====================================================
// Navigation System
// =====================================================

function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Remove active class from all nav items and tabs
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked nav item and corresponding tab
            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            // Add smooth transition effect
            const activeTab = document.getElementById(tabName);
            activeTab.style.animation = 'none';
            setTimeout(() => {
                activeTab.style.animation = 'fadeIn 0.25s ease';
            }, 10);
        });
    });
}

// =====================================================
// Chart Initialization (Placeholder - ready for Chart.js)
// =====================================================

function initializeCharts() {
    const chartCanvas = document.getElementById('conversation-chart');
    
    if (chartCanvas) {
        // Placeholder for Chart.js implementation
        // You can integrate Chart.js by adding:
        // <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        
        // Example Chart.js code (uncomment when Chart.js is added):
        /*
        const ctx = chartCanvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'AI Conversations',
                    data: [145, 189, 167, 203, 178, 156, 198],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#475569'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            color: '#475569'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
        */
    }
}

// =====================================================
// Dashboard Data Management
// =====================================================

function loadDashboardData() {
    // Simulate loading data - Replace with actual API calls
    updateMetrics();
    updateLeadTable();
    updateActivityLog();
    updateVisibilityStats();
}

function updateMetrics() {
    // These would typically come from your backend API
    const metrics = {
        totalConversations: 1247,
        appointmentsBooked: 183,
        reviewSentiment: 94
    };
    
    // Update DOM with animated counting effect
    animateValue('total-conversations', 0, metrics.totalConversations, 1500);
    animateValue('appointments-booked', 0, metrics.appointmentsBooked, 1500);
    animateValue('review-sentiment', 0, metrics.reviewSentiment, 1500, '%');
}

function animateValue(id, start, end, duration, suffix = '') {
    const element = document.getElementById(id);
    if (!element) return;
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = end.toLocaleString() + suffix;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString() + suffix;
        }
    }, 16);
}

function updateLeadTable() {
    // Sample data - replace with API call
    const leads = [
        {
            name: 'Sarah Martinez',
            email: 'sarah.m@email.com',
            service: 'AI Chatbot Integration',
            time: 'Today, 2:45 PM',
            status: 'new'
        },
        {
            name: 'James Davidson',
            email: 'james.d@company.com',
            service: 'Google Business Optimization',
            time: 'Today, 11:20 AM',
            status: 'contacted'
        }
        // Add more leads as needed
    ];
    
    // You can dynamically update the table here if needed
    console.log('Leads loaded:', leads.length);
}

function updateActivityLog() {
    // Activity log data would come from your backend
    console.log('Activity log updated');
}

function updateVisibilityStats() {
    // Google visibility stats would come from Google Business Profile API
    console.log('Visibility stats updated');
}

// =====================================================
// Real-time Updates (Simulated)
// =====================================================

function startRealtimeUpdates() {
    // Simulate real-time updates every 30 seconds
    setInterval(() => {
        // In production, this would use WebSocket or polling
        addNewActivity();
    }, 30000);
}

function addNewActivity() {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;
    
    const activities = [
        { icon: 'blue', title: 'New lead captured', time: 'Just now' },
        { icon: 'orange', title: 'Appointment scheduled', time: 'Just now' },
        { icon: 'green', title: '5-star review received', time: 'Just now' }
    ];
    
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    
    const activityHTML = `
        <div class="activity-item" style="animation: slideIn 0.3s ease;">
            <div class="activity-icon ${randomActivity.icon}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z"/>
                </svg>
            </div>
            <div class="activity-details">
                <div class="activity-title">${randomActivity.title}</div>
                <div class="activity-time">${randomActivity.time}</div>
            </div>
        </div>
    `;
    
    // Add to top of list
    activityList.insertAdjacentHTML('afterbegin', activityHTML);
    
    // Remove oldest item if more than 5
    const items = activityList.querySelectorAll('.activity-item');
    if (items.length > 5) {
        items[items.length - 1].remove();
    }
}

// =====================================================
// Utility Functions
// =====================================================

// Format time ago
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return Math.floor(seconds) + " seconds ago";
}

// Export data function (for Export Data button)
function exportData() {
    // Implement data export functionality
    console.log('Exporting dashboard data...');
    alert('Export functionality coming soon! This will export your dashboard data to CSV/PDF.');
}

// Mobile menu toggle (for responsive design)
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('mobile-open');
}

// Add event listener for export button
document.addEventListener('DOMContentLoaded', function() {
    const exportBtn = document.querySelector('.btn-secondary');
    if (exportBtn && exportBtn.textContent.includes('Export')) {
        exportBtn.addEventListener('click', exportData);
    }
});

// =====================================================
// Calendly Integration (for Appointments Booked metric)
// =====================================================

// This is a placeholder for Calendly webhook integration
// To get real appointment data, you would:
// 1. Set up Calendly webhook in your Calendly account settings
// 2. Create a backend endpoint to receive webhook events
// 3. Update the dashboard in real-time when appointments are booked

function syncCalendlyData() {
    // Example API call structure:
    /*
    fetch('/api/calendly/appointments', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer YOUR_API_TOKEN'
        }
    })
    .then(response => response.json())
    .then(data => {
        const appointmentCount = data.total;
        document.getElementById('appointments-booked').textContent = appointmentCount;
    })
    .catch(error => console.error('Error fetching Calendly data:', error));
    */
}

console.log('📊 The Smart Layer Dashboard initialized successfully!');
