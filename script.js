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
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
});

// ==========================================
// MOBILE MENU TOGGLE
// ==========================================
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    });
}

// ==========================================
// NAVBAR SCROLL EFFECT
// ==========================================
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ==========================================
// COUNT-UP ANIMATION FOR STATS
// ==========================================
function animateCounter(element, target, duration) {
    duration = duration || 2000;
    const startTime = performance.now();
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = Math.floor(target * easeOutExpo);
        element.textContent = current.toLocaleString();
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target.toLocaleString();
        }
    }
    requestAnimationFrame(updateCounter);
}

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number[data-target]');
            statNumbers.forEach(statNumber => {
                const target = parseInt(statNumber.getAttribute('data-target'));
                if (statNumber.textContent === '0') {
                    animateCounter(statNumber, target, 2000);
                }
            });
        }
    });
}, { threshold: 0.3 });

const statsRow = document.querySelector('.stats-row');
if (statsRow) statsObserver.observe(statsRow);

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
    hvac: {
        url: 'https://hvac.thesmartlayer.com',
        name: 'HVAC Services'
    },
    dental: {
        url: '/coming-soon.html',
        name: 'Dental Office'
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

            industryCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            if (loadingOverlay) {
                loadingOverlay.classList.add('active');
                if (loadingIndustry) loadingIndustry.textContent = industryData.name;
            }

            if (demoUrl) demoUrl.textContent = industryData.url.replace('https://', '');
            if (demoIframe) demoIframe.src = industryData.url;

            if (demoIframe) {
                demoIframe.addEventListener('load', () => {
                    setTimeout(() => {
                        if (loadingOverlay) loadingOverlay.classList.remove('active');
                    }, 500);
                }, { once: true });
            }

            // Show notice for coming-soon industries
            if (demoNotice) {
                if (industry === 'auto' || industry === 'hvac') {
                    demoNotice.classList.remove('active');
                } else {
                    demoNotice.classList.add('active');
                }
            }
        });
    });
}

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
        const currentSrc = demoIframe ? demoIframe.src : '';
        const currentUrl = demoUrl ? demoUrl.textContent : '';
        if (fullscreenIframe) fullscreenIframe.src = currentSrc;
        if (fullscreenUrlText) fullscreenUrlText.textContent = currentUrl;
        if (fullscreenOverlay) fullscreenOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Hide chatbot in fullscreen
        const chatbot = document.getElementById('smartlayer-chatbot');
        if (chatbot) chatbot.style.display = 'none';
    });
}

if (fullscreenClose) {
    fullscreenClose.addEventListener('click', () => {
        if (fullscreenOverlay) fullscreenOverlay.classList.remove('active');
        if (fullscreenIframe) fullscreenIframe.src = '';
        document.body.style.overflow = '';
        // Show chatbot again
        const chatbot = document.getElementById('smartlayer-chatbot');
        if (chatbot) chatbot.style.display = '';
    });
}

// ==========================================
// FAQ ACCORDION
// ==========================================
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const faqItem = question.parentElement;
        const isActive = faqItem.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));
        if (!isActive) faqItem.classList.add('active');
    });
});

// ==========================================
// CONTACT FORM SUBMISSION
// ==========================================
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(contactForm);
        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formData).toString()
        }).then(response => {
            if (response.ok) {
                alert('Thank you! We\'ll be in touch within 24 hours.');
                contactForm.reset();
            } else {
                alert('Something went wrong. Please try again or call us at (855) 404-AIAI.');
            }
        }).catch(() => {
            alert('Connection error. Please try again or call us at (855) 404-AIAI.');
        });
    });
}

// ==========================================
// AUDIT FORM TOGGLE & SUBMISSION
// ==========================================
const auditToggleBtn = document.getElementById('audit-toggle-btn');
const auditFormContainer = document.getElementById('audit-form-container');
const auditForm = document.getElementById('audit-form');

if (auditToggleBtn && auditFormContainer) {
    auditToggleBtn.addEventListener('click', () => {
        auditFormContainer.classList.toggle('active');
        if (auditFormContainer.classList.contains('active')) {
            auditToggleBtn.textContent = 'Close Form';
            auditFormContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            auditToggleBtn.innerHTML = '<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Request Your Free Audit';
        }
    });
}

if (auditForm) {
    auditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(auditForm);
        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formData).toString()
        }).then(response => {
            if (response.ok) {
                auditFormContainer.innerHTML = '<div style="text-align: center; padding: 2rem;"><h3 style="color: var(--blue-primary); margin-bottom: 1rem;">✓ Audit Request Received!</h3><p style="color: var(--gray-300);">We\'ll deliver your personalized AI visibility report within 24 hours.</p></div>';
                auditToggleBtn.style.display = 'none';
            } else {
                alert('Something went wrong. Please try again or call us at (855) 404-AIAI.');
            }
        }).catch(() => {
            alert('Connection error. Please try again or call us at (855) 404-AIAI.');
        });
    });
}

// ==========================================
// FADE-IN ANIMATION ON SCROLL
// ==========================================
const fadeElements = document.querySelectorAll('.feature-card, .testimonial-card, .pricing-card, .industry-card:not([data-industry])');
const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, index * 100);
            fadeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

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
    heroImage.addEventListener('load', () => { heroImage.style.opacity = '1'; });
    if (heroImage.complete) heroImage.style.opacity = '1';
}

// ==========================================
// TRIPLE CONTACT MODAL
// ==========================================
const contactModal = document.getElementById('contact-modal');
const contactModalClose = document.getElementById('contact-modal-close');
const contactChat = document.getElementById('contact-chat');
const contactTriggers = document.querySelectorAll('.contact-trigger');

// Open modal
contactTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        if (contactModal) contactModal.classList.add('active');
    });
});

// Close modal
if (contactModalClose) {
    contactModalClose.addEventListener('click', () => {
        if (contactModal) contactModal.classList.remove('active');
    });
}

// Close on backdrop click
if (contactModal) {
    contactModal.addEventListener('click', (e) => {
        if (e.target === contactModal) contactModal.classList.remove('active');
    });
}

// "Chat with AI" opens the chatbot
if (contactChat) {
    contactChat.addEventListener('click', () => {
        contactModal.classList.remove('active');
        const chatBtn = document.querySelector('#smartlayer-chatbot button');
        if (chatBtn) chatBtn.click();
    });
}

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
        }).then(response => {
            if (response.ok) {
                subscribeForm.innerHTML = '<p class="success-message">✓ You\'re subscribed! Watch your inbox.</p>';
            } else {
                alert('Something went wrong. Please try again.');
            }
        }).catch(() => {
            alert('Connection error. Please try again.');
        });
    });
}

// ==========================================
// DASHBOARD PREVIEW BUTTONS
// ==========================================
const demoOwnerBtn = document.getElementById('demo-owner-btn');
const demoCustomerBtn = document.getElementById('demo-customer-btn');

function loadDashboardInIframe(url, urlText) {
    const iframe = document.getElementById('demo-iframe');
    const urlDisplay = document.getElementById('demo-url');
    const loadOverlay = document.getElementById('loading-overlay');
    const loadIndustry = document.getElementById('loading-industry');

    if (loadOverlay) {
        loadOverlay.classList.add('active');
        if (loadIndustry) loadIndustry.textContent = 'Dashboard';
    }
    if (urlDisplay) urlDisplay.textContent = urlText;
    if (iframe) {
        iframe.src = url;
        iframe.addEventListener('load', () => {
            setTimeout(() => {
                if (loadOverlay) loadOverlay.classList.remove('active');
            }, 500);
        }, { once: true });
    }

    document.querySelectorAll('.industry-card[data-industry]').forEach(c => c.classList.remove('active'));

    const demoSection = document.getElementById('demo');
    if (demoSection) demoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

if (demoOwnerBtn) {
    demoOwnerBtn.addEventListener('click', () => {
        loadDashboardInIframe('https://auto.thesmartlayer.com/autodashboard.html', 'auto.thesmartlayer.com/dashboard');
    });
}

if (demoCustomerBtn) {
    demoCustomerBtn.addEventListener('click', () => {
        loadDashboardInIframe('https://auto.thesmartlayer.com/autodashboard.html', 'auto.thesmartlayer.com/dashboard');
    });
}

console.log('🚀 The Smart Layer - Scripts loaded successfully!');
