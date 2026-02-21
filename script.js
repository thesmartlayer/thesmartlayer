// ==========================================
// SMOOTH SCROLL FOR NAVIGATION LINKS
// ==========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// ==========================================
// MOBILE MENU TOGGLE
// ==========================================
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');
const body = document.body;

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        body.classList.toggle('menu-open');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuToggle.classList.remove('active');
            navMenu.classList.remove('active');
            body.classList.remove('menu-open');
        });
    });
}

// ==========================================
// NAVBAR SCROLL EFFECT
// ==========================================
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ==========================================
// COUNT-UP ANIMATION FOR STATS
// ==========================================
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation (easeOutExpo)
        const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        const current = Math.floor(start + (target - start) * easeOutExpo);
        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target.toLocaleString();
        }
    }

    requestAnimationFrame(updateCounter);
}

// Create Intersection Observer for stats
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number[data-target]');

            statNumbers.forEach(statNumber => {
                const target = parseInt(statNumber.getAttribute('data-target'));

                // Only animate if not already animated
                if (statNumber.textContent === '0') {
                    animateCounter(statNumber, target, 2000);
                }
            });

            // Optional: Unobserve after animation to prevent re-triggering
            // statsObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.3, // Trigger when 30% of the element is visible
    rootMargin: '0px'
});

// Observe the stats row
const statsRow = document.querySelector('.stats-row');
if (statsRow) {
    statsObserver.observe(statsRow);
}

// ==========================================
// DEMO INDUSTRY SELECTOR
// ==========================================
const industryCards = document.querySelectorAll('.industry-card[data-industry]');
const demoIframe = document.getElementById('demo-iframe');
const demoUrl = document.getElementById('demo-url');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingIndustry = document.getElementById('loading-industry');
const demoNotice = document.getElementById('demo-notice');

const industryUrls = {
    auto: {
        url: 'https://auto.thesmartlayer.com',
        name: 'Auto Repair'
    },
    dental: {
        url: '/coming-soon.html',
        name: 'Dental Office'
    },
    hvac: {
        url: '/coming-soon.html',
        name: 'HVAC Services'
    },
    home: {
        url: '/coming-soon.html',
        name: 'Home Services'
    },
    restaurant: {
        url: '/coming-soon.html',
        name: 'Restaurant'
    },
    professional: {
        url: '/coming-soon.html',
        name: 'Professional Services'
    }
};

if (industryCards.length > 0) {
    industryCards.forEach(card => {
        card.addEventListener('click', () => {
            const industry = card.getAttribute('data-industry');
            const industryData = industryUrls[industry];

            if (!industryData) return;

            // Remove active class from all cards
            industryCards.forEach(c => c.classList.remove('active'));

            // Add active class to clicked card
            card.classList.add('active');

            // Show loading overlay
            if (loadingOverlay) {
                loadingOverlay.classList.add('active');
                if (loadingIndustry) {
                    loadingIndustry.textContent = industryData.name;
                }
            }

            // Update URL display
            if (demoUrl) {
                demoUrl.textContent = industryData.url.replace('https://', '');
            }

            // Update iframe src
            if (demoIframe) {
                demoIframe.src = industryData.url;
            }

            // Hide loading overlay after iframe loads
            if (demoIframe) {
                demoIframe.addEventListener('load', () => {
                    setTimeout(() => {
                        if (loadingOverlay) {
                            loadingOverlay.classList.remove('active');
                        }
                    }, 500);
                }, { once: true });
            }

            // Show/hide notice for non-auto industries
            if (demoNotice) {
                if (industry === 'auto') {
                    demoNotice.classList.remove('active');
                } else {
                    demoNotice.classList.add('active');
                }
            }
        });
    });
}

// ==========================================
// FAQ ACCORDION
// ==========================================
const faqQuestions = document.querySelectorAll('.faq-question');

faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const faqItem = question.parentElement;
        const isActive = faqItem.classList.contains('active');

        // Close all FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });

        // Toggle current item
        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});

// ==========================================
// FORM SUBMISSION (Contact Form)
// ==========================================
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(contactForm);
        
        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formData).toString()
        })
        .then(response => {
            if (response.ok) {
                contactForm.innerHTML = '<div style="text-align: center; padding: 3rem 0;"><h3 style="color: var(--blue-primary); margin-bottom: 1rem;">Thank You!</h3><p style="color: var(--gray-300);">We\'ll be in touch within 24 hours.</p></div>';
            } else {
                alert('Something went wrong. Please email us directly at contact@thesmartlayer.com');
            }
        })
        .catch(() => {
            alert('Connection error. Please email us directly at contact@thesmartlayer.com');
        });
    });
}

// ==========================================
// FADE-IN ANIMATION ON SCROLL
// ==========================================
const fadeElements = document.querySelectorAll('.feature-card, .testimonial-card, .pricing-card, .industry-card');

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            // Add staggered animation delay
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, index * 100);

            fadeObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

fadeElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    fadeObserver.observe(element);
});

// ==========================================
// HERO IMAGE LOAD ANIMATION
// ==========================================
const heroImage = document.getElementById('heroImage');

if (heroImage) {
    heroImage.addEventListener('load', () => {
        heroImage.style.opacity = '1';
    });

    // If image is already loaded (cached)
    if (heroImage.complete) {
        heroImage.style.opacity = '1';
    }
}

console.log('🚀 The Smart Layer - Scripts loaded successfully!');

// ==========================================
// FULLSCREEN DEMO OVERLAY
// ==========================================
const maximizeBtn = document.getElementById('maximize-btn');
const fullscreenOverlay = document.getElementById('fullscreen-overlay');
const fullscreenClose = document.getElementById('fullscreen-close');
const fullscreenIframe = document.getElementById('fullscreen-iframe');
const fullscreenUrlText = document.getElementById('fullscreen-url-text');

if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => {
        const currentSrc = document.getElementById('demo-iframe').src;
        const currentUrl = document.getElementById('demo-url').textContent;

        fullscreenIframe.src = currentSrc;
        fullscreenUrlText.textContent = currentUrl;
        fullscreenOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
}

if (fullscreenClose) {
    fullscreenClose.addEventListener('click', () => {
        fullscreenOverlay.classList.remove('active');
        fullscreenIframe.src = '';
        document.body.style.overflow = '';
    });
}

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fullscreenOverlay && fullscreenOverlay.classList.contains('active')) {
        fullscreenClose.click();
    }
});

// ==========================================
// EMAIL SUBSCRIBE FORM
// ==========================================
const subscribeForm = document.querySelector('.subscribe-form');

if (subscribeForm) {
    subscribeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(subscribeForm);

        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formData).toString()
        })
        .then(response => {
            if (response.ok) {
                subscribeForm.innerHTML = '<p class="success-message">✓ You\'re subscribed! Watch your inbox.</p>';
            } else {
                alert('Something went wrong. Please try again.');
            }
        })
        .catch(() => {
            alert('Connection error. Please try again.');
        });
    });
}
