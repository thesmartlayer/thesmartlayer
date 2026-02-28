// ==========================================
// SMOOTH SCROLL FOR NAVIGATION LINKS
// ==========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        // Skip links with data-demo — those are handled separately
        if (this.hasAttribute('data-demo')) return;
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
        url: 'https://demositeauto.netlify.app',
        name: 'Auto Repair'
    },
    dental: {
        url: 'https://demositeauto.netlify.app',
        name: 'Dental Office'
    },
    hvac: {
        url: 'https://hvac.thesmartlayer.com',
        name: 'HVAC Services'
    },
    home: {
        url: 'https://demositeauto.netlify.app',
        name: 'Home Services'
    },
    restaurant: {
        url: 'https://demositeauto.netlify.app',
        name: 'Restaurant'
    },
    professional: {
        url: 'https://demositeauto.netlify.app',
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
const contactForm = document.getElementById('contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form data
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData);

        console.log('Form submitted:', data);

        // Here you would typically send the data to your backend
        // For now, just show a success message
        alert('Thank you for your interest! We\'ll be in touch soon.');

        // Reset form
        contactForm.reset();
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

// ==========================================
// INDUSTRY DEMO LINKS (from Industries section)
// ==========================================
document.querySelectorAll('.industry-link[data-demo]').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const industry = this.getAttribute('data-demo');
        const card = document.querySelector('.industry-card[data-industry="' + industry + '"]');

        // Simulate clicking the industry card in the demo section
        if (card) {
            card.click();
        }

        // Scroll to demo section
        const demoSection = document.getElementById('demo');
        if (demoSection) {
            setTimeout(function () {
                demoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    });
});

// ==========================================
// FREE AI AUDIT FORM TOGGLE
// ==========================================
const auditToggleBtn = document.getElementById('audit-toggle-btn');
const auditFormContainer = document.getElementById('audit-form-container');

if (auditToggleBtn && auditFormContainer) {
    auditToggleBtn.addEventListener('click', () => {
        // Toggle the active class to show/hide the form
        const isActive = auditFormContainer.classList.toggle('active');
        
        // Change the button text based on state
        if (isActive) {
            auditToggleBtn.textContent = 'Close Audit Form';
            auditToggleBtn.classList.add('btn-secondary');
            auditToggleBtn.classList.remove('btn-primary');
            
            // Optional: Smooth scroll slightly down so the form is fully in view
            setTimeout(() => {
                auditFormContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        } else {
            auditToggleBtn.textContent = 'Request Your Free Audit';
            auditToggleBtn.classList.add('btn-primary');
            auditToggleBtn.classList.remove('btn-secondary');
        }
    });
}

console.log('ðŸš€ The Smart Layer - Scripts loaded successfully!');

// ==========================================
// FULLSCREEN DEMO & VIEW TOGGLES
// ==========================================
const maximizeBtn = document.getElementById('maximize-btn');
const fullscreenOverlay = document.getElementById('fullscreen-overlay');
const fullscreenClose = document.getElementById('fullscreen-close');
const fullscreenIframe = document.getElementById('fullscreen-iframe');
const fullscreenUrlText = document.getElementById('fullscreen-url-text');
const demoIframeMain = document.getElementById('demo-iframe');
const demoUrlText = document.getElementById('demo-url');

// Handle the Maximize Button
if (maximizeBtn && fullscreenOverlay) {
    maximizeBtn.addEventListener('click', () => {
        fullscreenUrlText.textContent = demoUrlText.textContent;
        fullscreenIframe.src = demoIframeMain.src;
        fullscreenOverlay.classList.add('active');
    });
}

// Handle the Fullscreen Close Button
if (fullscreenClose) {
    fullscreenClose.addEventListener('click', () => {
        fullscreenOverlay.classList.remove('active');
        // Clear iframe source after a slight delay so audio/video stops playing
        setTimeout(() => { fullscreenIframe.src = ''; }, 300);
    });
}

// Handle Owner vs Customer View Toggles
const ownerBtn = document.getElementById('demo-owner-btn');
const customerBtn = document.getElementById('demo-customer-btn');

if (ownerBtn && customerBtn) {
    ownerBtn.addEventListener('click', () => {
        ownerBtn.classList.replace('btn-secondary', 'btn-primary');
        customerBtn.classList.replace('btn-primary', 'btn-secondary');
        alert('This changes the demo to the Business Owner Dashboard view.');
    });

    customerBtn.addEventListener('click', () => {
        customerBtn.classList.replace('btn-secondary', 'btn-primary');
        ownerBtn.classList.replace('btn-primary', 'btn-secondary');
        alert('This changes the demo to the Customer-facing Website view.');
    });
}

// ==========================================
// CONTACT MODAL
// ==========================================
var contactModal = document.getElementById('contact-modal');
var contactModalClose = document.getElementById('contact-modal-close');
var contactChatBtn = document.getElementById('contact-chat');

if (contactModal) {
    document.querySelectorAll('.contact-trigger').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            contactModal.classList.add('active');
        });
    });

    if (contactModalClose) {
        contactModalClose.addEventListener('click', function() {
            contactModal.classList.remove('active');
        });
    }

    contactModal.addEventListener('click', function(e) {
        if (e.target === contactModal) {
            contactModal.classList.remove('active');
        }
    });

if (contactChatBtn) {
    contactChatBtn.addEventListener('click', function() {
        contactModal.classList.remove('active');
        var chatBtn = document.getElementById('smartlayer-chat-btn');
        if (chatBtn) chatBtn.click();
    });
}

document.addEventListener('click', function(e) {
    if (e.target.closest('.vapi-call-btn')) {
        e.preventDefault();
        contactModal.classList.remove('active');
        if (!window._retellClient) {
            window.location.href = 'tel:+18554042424';
        }
    }
});
}


