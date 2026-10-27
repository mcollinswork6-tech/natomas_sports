// Natomas Sports Association Interactive Scripts - Neon Cyber Athletic Theme
document.addEventListener('DOMContentLoaded', () => {
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
        navbar.classList.add('shadow-xl', 'bg-[#060709]/95', 'backdrop-blur-md', 'border-b', 'border-[#39ff14]/30');
        navbar.classList.remove('bg-[#060709]');
      } else {
        navbar.classList.remove('shadow-xl', 'bg-[#060709]/95', 'backdrop-blur-md', 'border-[#39ff14]/30');
        navbar.classList.add('bg-[#060709]');
      }
    });
  }

  // 3. Dynamic Current Year in Footer
  const yearSpans = document.querySelectorAll('.current-year');
  const currentYear = new Date().getFullYear();
  yearSpans.forEach(el => {
    el.textContent = currentYear;
  });

  // 4. Client-side Form Handling (Contact / Tryout Interest)
  const forms = document.querySelectorAll('form[data-ajax-notify]');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
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

      // Simulate submission
      setTimeout(() => {
        const feedbackContainer = form.querySelector('.form-feedback') || document.createElement('div');
        feedbackContainer.className = 'form-feedback p-4 mt-4 rounded-xl bg-[#39ff14]/10 border border-[#39ff14]/40 text-[#39ff14] text-sm font-semibold animate-fade-in shadow-[0_0_15px_rgba(57,255,20,0.2)]';
        feedbackContainer.innerHTML = `
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 flex-shrink-0 text-[#39ff14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Thank you! Your information has been received. Natomas Sports Association will contact you shortly!</span>
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

        // Auto hide notification after 8 seconds
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
