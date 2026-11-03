// Natomas Sport Association Interactive Scripts - Official Brand Identity

// Clean extensionless URLs: automatically strip .html from address bar
(function handleCleanUrls() {
  if (window.location.protocol !== 'file:') {
    const path = window.location.pathname;
    if (path.endsWith('.html')) {
      let cleanPath = path.slice(0, -5);
      if (cleanPath.endsWith('/index')) {
        cleanPath = cleanPath.slice(0, -6) || '/';
      }
      const cleanUrl = cleanPath + window.location.search + window.location.hash;
      window.history.replaceState(null, '', cleanUrl);
    }
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href) return;
        if (href === '/') {
          a.setAttribute('href', 'index.html');
        } else if (href.startsWith('/') && !href.startsWith('//') && !href.includes('.')) {
          const parts = href.slice(1).split('#');
          a.setAttribute('href', parts[0] + '.html' + (parts[1] ? '#' + parts[1] : ''));
        }
      });
    });
  }
})();
document.addEventListener('DOMContentLoaded', () => {
  // Check if page was redirected after successful form submission
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('submitted') === 'true') {
    const successBanner = document.getElementById('form-success-banner');
    if (successBanner) {
      successBanner.classList.remove('hidden');
      successBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Clear any form inputs if browser autofilled from history
    const contactForm = document.querySelector('form[action*="formspree.io"]');
    if (contactForm) {
      contactForm.reset();
    }
    // Clean up the URL in the address bar without reloading
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // 1. Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isHidden = mobileMenu.classList.contains('hidden');
      if (isHidden) {
        mobileMenu.classList.remove('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'true');
      } else {
        mobileMenu.classList.add('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 2. Sticky Header Navbar Effect
  const navbar = document.getElementById('main-nav');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        navbar.classList.add('shadow-xl', 'bg-[#111317]/95', 'backdrop-blur-md', 'border-b', 'border-[#67DDF2]/30');
        navbar.classList.remove('bg-[#111317]');
      } else {
        navbar.classList.remove('shadow-xl', 'bg-[#111317]/95', 'backdrop-blur-md', 'border-[#67DDF2]/30');
        navbar.classList.add('bg-[#111317]');
      }
    });
  }

  // 3. Dynamic Current Year in Footer
  const yearSpans = document.querySelectorAll('.current-year');
  const currentYear = new Date().getFullYear();
  yearSpans.forEach(el => {
    el.textContent = currentYear;
  });

  // 4. Client-side Form Handling with AJAX
  const forms = document.querySelectorAll('form[data-ajax-notify]');
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      // If the form has an action endpoint (like Formspree), submit via fetch
      const action = form.getAttribute('action');
      if (action && action.includes('formspree.io')) {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : 'Submit';

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-slate-950 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg> Sending Message...
          `;
        }

        try {
          const formData = new FormData(form);
          const response = await fetch(action, {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json'
            }
          });

          const feedbackContainer = form.querySelector('.form-feedback') || document.createElement('div');

          if (response.ok) {
            feedbackContainer.className = 'form-feedback p-4 mt-4 rounded-xl bg-[#39ff14]/10 border border-[#39ff14]/40 text-[#39ff14] text-sm font-semibold animate-fade-in shadow-[0_0_15px_rgba(57,255,20,0.2)]';
            feedbackContainer.innerHTML = `
              <div class="flex items-center space-x-2">
                <svg class="w-5 h-5 flex-shrink-0 text-[#39ff14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Thank you! Your message has been sent. Natomas Sport Association will contact you shortly!</span>
              </div>
            `;
            form.reset();
            if (!form.querySelector('.form-feedback')) {
              form.appendChild(feedbackContainer);
            }
            setTimeout(() => {
              feedbackContainer.remove();
            }, 8000);
          } else {
            // If AJAX gets a 403 (e.g. reCAPTCHA required by Formspree), submit standard form directly
            form.submit();
            return;
          }
        } catch (err) {
          form.submit();
          return;
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
        }
        return;
      }

      // Default fallback simulation for demo forms without action endpoints
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : 'Submit';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-slate-950 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg> Submitting...
        `;
      }

      setTimeout(() => {
        const feedbackContainer = form.querySelector('.form-feedback') || document.createElement('div');
        feedbackContainer.className = 'form-feedback p-4 mt-4 rounded-xl bg-[#67DDF2]/10 border border-[#67DDF2]/40 text-[#67DDF2] text-sm font-semibold animate-fade-in shadow-[0_0_15px_rgba(103,221,242,0.2)]';
        feedbackContainer.innerHTML = `
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 flex-shrink-0 text-[#B7F52A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="text-slate-100">Thank you! Your information has been received. <strong class="text-[#B7F52A]">Natomas Sport Association</strong> will contact you shortly!</span>
          </div>
        `;
        
        if (!form.querySelector('.form-feedback')) {
          form.appendChild(feedbackContainer);
        }

        form.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }

        setTimeout(() => {
          feedbackContainer.remove();
        }, 8000);
      }, 700);
    });
  });

  // 5. Tryouts Age Division Filter (if on tryouts page)
  const divisionButtons = document.querySelectorAll('[data-division-filter]');
  const tryoutCards = document.querySelectorAll('[data-division]');

  if (divisionButtons.length > 0 && tryoutCards.length > 0) {
    divisionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-division-filter');

        // Update active button styling
        divisionButtons.forEach(b => {
          b.classList.remove('bg-[#39ff14]', 'text-[#060709]', 'font-black', 'shadow-[0_0_15px_rgba(57,255,20,0.4)]');
          b.classList.add('bg-[#141820]', 'text-slate-300', 'hover:bg-[#1e2430]');
        });
        btn.classList.add('bg-[#39ff14]', 'text-[#060709]', 'font-black', 'shadow-[0_0_15px_rgba(57,255,20,0.4)]');
        btn.classList.remove('bg-[#141820]', 'text-slate-300', 'hover:bg-[#1e2430]');

        // Filter cards
        tryoutCards.forEach(card => {
          const cardDivision = card.getAttribute('data-division');
          if (filter === 'all' || cardDivision === filter) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      });
    });
  }
});
