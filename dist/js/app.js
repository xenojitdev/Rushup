/* ==========================================================================
   RUSHUP ESPORTS - JAVASCRIPT APP LOGIC
   Features: Particle Canvas, Dynamic 6-Screenshot Slider, FAQ Accordion, Mobile Menu,
             Cloudflare Worker Support Form Integration with Image Upload
   ========================================================================== */

// Cloudflare Worker Production Endpoint
const CONTACT_WORKER_URL = 'https://rushup-contact-api.developer-xenojit.workers.dev/api/contact';

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Background Particle Canvas ---
  initBackgroundCanvas();

  // --- 2. Scroll Progress Bar & Sticky Header ---
  initScrollEffects();

  // --- 3. Mobile Menu Drawer ---
  initMobileMenu();

  // --- 4. FAQ Accordions ---
  initFaqAccordion();

  // --- 5. Dynamic Touch & Drag Screenshot Slider ---
  initTouchScreenshotSlider();

  // --- 6. Ripple Effect on Buttons ---
  initRippleEffect();

  // --- 7. Back to Top Button ---
  initBackToTop();

  // --- 8. Contact Support Form Integration ---
  initContactForm();
});

/* --- 1. Particle Canvas Engine --- */
function initBackgroundCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particleCount = Math.min(Math.floor(width / 30), 40);
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 2 + 1,
      alpha: Math.random() * 0.4 + 0.2,
      color: Math.random() > 0.3 ? 'rgba(168, 85, 247, ' : 'rgba(255, 193, 7, ',
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particleCount; i++) {
      let p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${p.alpha})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#6C2BFF';
      ctx.fill();

      for (let j = i + 1; j < particleCount; j++) {
        let p2 = particles[j];
        let dx = p.x - p2.x;
        let dy = p.y - p2.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(108, 43, 255, ${0.12 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(render);
  }

  render();
}

/* --- 2. Scroll Progress & Sticky Navbar --- */
function initScrollEffects() {
  const progressBar = document.getElementById('scroll-progress');
  const navbar = document.querySelector('.navbar');

  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;

    if (progressBar) {
      progressBar.style.width = scrolled + '%';
    }

    if (navbar) {
      if (winScroll > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });
}

/* --- 3. Mobile Menu Navigation --- */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const menuOverlay = document.querySelector('.mobile-menu-overlay');
  const closeBtn = document.querySelector('.mobile-menu-close');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !menuOverlay) return;

  function openMenu() {
    menuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    toggleBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    menuOverlay.classList.remove('active');
    document.body.style.overflow = '';
    toggleBtn.setAttribute('aria-expanded', 'false');
  }

  toggleBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  navLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

/* --- 4. FAQ Accordion --- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      faqItems.forEach((otherItem) => {
        otherItem.classList.remove('active');
        const otherBtn = otherItem.querySelector('.faq-question');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      });

      if (!isActive) {
        item.classList.add('active');
        questionBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* --- 5. Dynamic Touch & Drag Screenshot Slider --- */
function initTouchScreenshotSlider() {
  const track = document.getElementById('slider-track');
  if (!track) return;

  let slides = track.querySelectorAll('.phone-slide');
  if (slides.length === 0) return;

  const dotsContainer = document.getElementById('slider-dots');
  const prevBtn = document.getElementById('slider-prev');
  const nextBtn = document.getElementById('slider-next');

  let currentIndex = 0;
  const slideCount = slides.length;
  let autoSlideTimer = null;

  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < slideCount; i++) {
      const dot = document.createElement('button');
      dot.className = `slider-dot ${i === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  function updateSlider() {
    slides = track.querySelectorAll('.phone-slide');
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.slider-dot');
      dots.forEach((dot, index) => {
        if (index === currentIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
  }

  function goToSlide(index) {
    currentIndex = (index + slideCount) % slideCount;
    updateSlider();
    resetAutoSlide();
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  function startAutoSlide() {
    stopAutoSlide();
    autoSlideTimer = setInterval(nextSlide, 4000);
  }

  function stopAutoSlide() {
    if (autoSlideTimer) clearInterval(autoSlideTimer);
  }

  function resetAutoSlide() {
    stopAutoSlide();
    startAutoSlide();
  }

  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  function handleTouchStart(e) {
    stopAutoSlide();
    isDragging = true;
    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    currentX = startX;
  }

  function handleTouchMove(e) {
    if (!isDragging) return;
    currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
  }

  function handleTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    const diffX = startX - currentX;

    if (Math.abs(diffX) > 35) {
      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    } else {
      resetAutoSlide();
    }
  }

  const sliderViewport = track.parentElement;
  if (sliderViewport) {
    sliderViewport.addEventListener('touchstart', handleTouchStart, { passive: true });
    sliderViewport.addEventListener('touchmove', handleTouchMove, { passive: true });
    sliderViewport.addEventListener('touchend', handleTouchEnd);

    sliderViewport.addEventListener('mousedown', handleTouchStart);
    sliderViewport.addEventListener('mousemove', handleTouchMove);
    sliderViewport.addEventListener('mouseup', handleTouchEnd);
    sliderViewport.addEventListener('mouseleave', handleTouchEnd);
  }

  updateSlider();
  startAutoSlide();
}

/* --- 6. Ripple Effect --- */
function initRippleEffect() {
  const buttons = document.querySelectorAll('.btn');

  buttons.forEach((btn) => {
    btn.addEventListener('click', function (e) {
      let rippleContainer = this.querySelector('.ripple-container');

      if (!rippleContainer) {
        rippleContainer = document.createElement('div');
        rippleContainer.className = 'ripple-container';
        this.appendChild(rippleContainer);
      }

      const rect = this.getBoundingClientRect();
      const circle = document.createElement('div');
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.className = 'ripple-effect';

      const existingRipple = rippleContainer.querySelector('.ripple-effect');
      if (existingRipple) {
        existingRipple.remove();
      }

      rippleContainer.appendChild(circle);
    });
  });
}

/* --- 7. Back to Top Button --- */
function initBackToTop() {
  const backBtn = document.getElementById('back-to-top');
  if (!backBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backBtn.classList.add('show');
    } else {
      backBtn.classList.remove('show');
    }
  });

  backBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  });
}

/* --- 8. Contact Support Form Integration --- */
function initContactForm() {
  const contactForm = document.getElementById('contact-form');
  if (!contactForm) return;

  const preferenceSelect = document.getElementById('c-preference');
  const telegramWrapper = document.getElementById('c-telegram-wrapper');
  const telegramInput = document.getElementById('c-telegram-username');
  const mobileInput = document.getElementById('c-mobile');
  const fileInput = document.getElementById('c-screenshot');
  const fileInfo = document.getElementById('file-info-text');

  // Handle Dynamic Telegram Username Field visibility & animation
  function updatePreferenceField() {
    if (!preferenceSelect || !telegramWrapper || !telegramInput) return;
    if (preferenceSelect.value === 'Telegram') {
      telegramWrapper.classList.add('active');
      telegramInput.required = true;
    } else {
      telegramWrapper.classList.remove('active');
      telegramInput.required = false;
      telegramInput.value = '';
    }
  }

  if (preferenceSelect) {
    preferenceSelect.addEventListener('change', updatePreferenceField);
    updatePreferenceField();
  }

  // Auto-add '@' to Telegram Username if missing
  if (telegramInput) {
    telegramInput.addEventListener('blur', () => {
      let val = telegramInput.value.trim();
      if (val && !val.startsWith('@')) {
        telegramInput.value = '@' + val;
      }
    });
  }

  // Restrict Mobile Number input to numbers only (no symbols, no spaces, max 10 digits)
  if (mobileInput) {
    mobileInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
  }

  // Real-time file validation feedback
  if (fileInput && fileInfo) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        // Validate Max Size 5MB (5 * 1024 * 1024)
        if (file.size > 5 * 1024 * 1024) {
          showToast('⚠️ Image size exceeds 5 MB limit. Please select a smaller image.', 'error');
          fileInput.value = '';
          fileInfo.textContent = 'Maximum file size: 5 MB (JPG, PNG, WEBP)';
          fileInfo.style.color = '#F43F5E';
          return;
        }
        fileInfo.textContent = `✓ Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        fileInfo.style.color = 'var(--gold)';
      } else {
        fileInfo.textContent = 'Maximum file size: 5 MB (JPG, PNG, WEBP)';
        fileInfo.style.color = 'var(--secondary-text)';
      }
    });
  }

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // Get input field values
    const name = document.getElementById('c-name')?.value.trim();
    let mobile = document.getElementById('c-mobile')?.value.trim();
    const contactPreference = preferenceSelect?.value.trim();
    let telegramUsername = telegramInput?.value.trim() || '';
    const subject = document.getElementById('c-subject')?.value.trim();
    const message = document.getElementById('c-message')?.value.trim();

    // Required Base Field Validations
    if (!name || !mobile || !contactPreference || !subject || !message) {
      showToast('⚠️ Please fill out all required fields marked with *.', 'error');
      return;
    }

    // Strict Mobile Validation: Exactly 10 digits, numbers only
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
      showToast('⚠️ Mobile Number must be exactly 10 digits (numbers only, no spaces or symbols).', 'error');
      return;
    }

    // Telegram Username validation & auto-formatting
    if (contactPreference === 'Telegram') {
      if (!telegramUsername) {
        showToast('⚠️ Please enter your Telegram Username.', 'error');
        return;
      }
      if (!telegramUsername.startsWith('@')) {
        telegramUsername = '@' + telegramUsername;
        if (telegramInput) telegramInput.value = telegramUsername;
      }
    } else {
      telegramUsername = '';
    }

    // Process Optional Image Upload
    let screenshotBase64 = null;
    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showToast('⚠️ Image size exceeds 5 MB limit. Please select a smaller file.', 'error');
        return;
      }

      try {
        screenshotBase64 = await readFileAsBase64(file);
      } catch (err) {
        console.error('File reading error:', err);
        showToast('⚠️ Failed to read uploaded screenshot.', 'error');
        return;
      }
    }

    // Show loading state & disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Submitting Request...';

    try {
      const response = await fetch(CONTACT_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          mobile,
          email: `${mobile}@rushupesports.com`,
          contactPreference,
          telegramUsername,
          subject,
          message,
          screenshotBase64,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        submitBtn.innerHTML = '✓ Submitted!';
        contactForm.reset();
        updatePreferenceField();
        if (fileInfo) {
          fileInfo.textContent = 'Maximum file size: 5 MB (JPG, PNG, WEBP)';
          fileInfo.style.color = 'var(--secondary-text)';
        }
        showToast('Your support request has been submitted successfully. Our support team will contact you through your selected contact method.', 'success');
      } else {
        let rawError = result.error || 'Failed to submit support request.';
        if (rawError.toLowerCase().includes('email')) {
          rawError = 'Failed to submit support request. Please try again.';
        }
        throw new Error(rawError);
      }
    } catch (err) {
      console.error('Support Form Submission Error:', err);
      let errMsg = err.message || 'Error submitting request. Please try again.';
      if (errMsg.toLowerCase().includes('email')) {
        errMsg = 'Error submitting request. Please try again.';
      }
      showToast(`⚠️ ${errMsg}`, 'error');
    } finally {
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }, 3500);
    }
  });
}

// File to Base64 Promise Helper
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/* --- Toast Notification Popup Helper --- */
function showToast(message, type = 'success') {
  let existingToast = document.querySelector('.toast-popup');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast-popup toast-${type}`;
  toast.innerHTML = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 50);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}
