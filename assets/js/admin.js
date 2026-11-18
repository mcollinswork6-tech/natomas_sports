// Admin Portal Controller for Natomas Sport Association
import {
  auth,
  db,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  isAuthorizedStaff
} from './firebase-config.js';

// Application State
let registrations = [];
let filteredRegistrations = [];
let activeDocId = null;
let unsubscribeSnapshot = null;

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Views
  const authView = document.getElementById('auth-view');
  const dashboardView = document.getElementById('dashboard-view');
  const userDisplayEmail = document.getElementById('user-display-email');

  // DOM Elements - Auth
  const loginForm = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const googleLoginBtn = document.getElementById('google-login-btn');
  const signoutBtn = document.getElementById('signout-btn');

  // DOM Elements - Table & Controls
  const searchInput = document.getElementById('search-input');
  const filterDivision = document.getElementById('filter-division');
  const filterStatus = document.getElementById('filter-status');
  const filterEligibility = document.getElementById('filter-eligibility');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const tableBody = document.getElementById('registrations-tbody');

  // DOM Elements - Metrics
  const statTotal = document.getElementById('stat-total');
  const stat11u = document.getElementById('stat-11u');
  const statNew = document.getElementById('stat-new');
  const statConfirmed = document.getElementById('stat-confirmed');
  const statIneligible = document.getElementById('stat-ineligible');

  // DOM Elements - Modal
  const playerModal = document.getElementById('player-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalPlayerName = document.getElementById('modal-player-name');
  const modalDocId = document.getElementById('modal-doc-id');
  const modalDivisionBadge = document.getElementById('modal-division-badge');
  const modalEligibilityBadge = document.getElementById('modal-eligibility-badge');
  const modalStatusBadge = document.getElementById('modal-status-badge');
  const modalDob = document.getElementById('modal-dob');
  const modalPositions = document.getElementById('modal-positions');
  const modalBatsThrows = document.getElementById('modal-bats-throws');
  const modalZip = document.getElementById('modal-zip');
  const modalExperience = document.getElementById('modal-experience');
  const modalParentName = document.getElementById('modal-parent-name');
  const modalPhone = document.getElementById('modal-phone');
  const modalEmail = document.getElementById('modal-email');
  const modalCallLink = document.getElementById('modal-call-link');
  const modalEmailLink = document.getElementById('modal-email-link');
  const modalEmailBtn = document.getElementById('modal-email-btn');
  const bulkEmailBtn = document.getElementById('bulk-email-btn');

  // DOM Elements - Email Composer Modal
  const emailModal = document.getElementById('email-modal');
  const emailModalCloseBtn = document.getElementById('email-modal-close-btn');
  const emailModalTitle = document.getElementById('email-modal-title');
  const emailModeBadge = document.getElementById('email-mode-badge');
  const emailSenderDisplay = document.getElementById('email-sender-display');
  const emailRecipientCount = document.getElementById('email-recipient-count');
  const emailRecipientPreview = document.getElementById('email-recipient-preview');
  const emailTemplateSelect = document.getElementById('email-template-select');
  const emailSubjectInput = document.getElementById('email-subject-input');
  const emailBodyInput = document.getElementById('email-body-input');
  const emailSingleOptions = document.getElementById('email-single-options');
  const emailAutoUpdateStatus = document.getElementById('email-auto-update-status');
  const emailCopyBtn = document.getElementById('email-copy-btn');
  const emailCopyBtnText = document.getElementById('email-copy-btn-text');
  const emailOpenMailLink = document.getElementById('email-open-mail-link');
  const emailSendGmailBtn = document.getElementById('email-send-gmail-btn');
  const modalNotes = document.getElementById('modal-notes');
  const modalAdminNotes = document.getElementById('modal-admin-notes');
  const modalStatusSelect = document.getElementById('modal-status-select');
  const modalSaveNotesBtn = document.getElementById('modal-save-notes-btn');
  const saveNotesFeedback = document.getElementById('save-notes-feedback');

  // -------------------------------------------------------------
  // USSSA 11U Age & Eligibility Checker
  // Season year cutoff: April 30 of the competition season
  // For the 2026/2027 season cycle (cutoff April 30, 2027):
  // - Born May 1, 2015 – April 30, 2016: 11U Eligible (Standard)
  // - Born on or after May 1, 2016: Younger (10U/9U - Eligible to play up)
  // - Born May 1, 2014 – April 30, 2015: 12 on May 1 (Grade Exception ONLY if in 5th grade)
  // - Born prior to May 1, 2014: Too Old (Over Max Age Cap / 13+)
  // -------------------------------------------------------------
  function checkUsssa11uEligibility(dobString, seasonYear = 2027) {
    if (!dobString || typeof dobString !== 'string') {
      return {
        status: 'unknown',
        badgeHtml: '<span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">DOB Missing</span>',
        message: 'No date of birth provided',
        ageOnCutoff: null,
        isOverAge: false
      };
    }

    const trimmed = dobString.trim();
    // Parse formats like YYYY-MM-DD or MM/DD/YYYY
    let birthDate = null;
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      if (parts.length === 3) {
        birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    } else if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        birthDate = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
      }
    }

    if (!birthDate || isNaN(birthDate.getTime())) {
      return {
        status: 'unknown',
        badgeHtml: `<span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">Invalid DOB</span>`,
        message: `Could not parse date (${escapeHtml(trimmed)})`,
        ageOnCutoff: null,
        isOverAge: false
      };
    }

    // USSSA cutoff is April 30 of season year
    const cutoffDate = new Date(seasonYear, 3, 30); // April 30 (month index 3)

    // Calculate age as of April 30 cutoff
    let age = cutoffDate.getFullYear() - birthDate.getFullYear();
    const m = cutoffDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && cutoffDate.getDate() < birthDate.getDate())) {
      age--;
    }

    // Strict USSSA Thresholds:
    // Normal 11U: born May 1, 2015 to April 30, 2016 -> age 11 on April 30, 2027
    const standardMinDob = new Date(seasonYear - 12, 4, 1); // May 1, 2015
    const standardMaxDob = new Date(seasonYear - 11, 3, 30); // April 30, 2016
    const olderCapMinDob = new Date(seasonYear - 13, 4, 1); // May 1, 2014

    if (birthDate < olderCapMinDob) {
      // Turns 13 prior to season cutoff -> Strictly Ineligible / Over Maximum Age Cap
      return {
        status: 'too-old',
        isOverAge: true,
        ageOnCutoff: age,
        badgeHtml: `
          <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-950/80 text-red-300 border border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.35)]" title="Turns ${age} before April 30, ${seasonYear}. Exceeds 11U maximum age cap.">
            <span>⚠️</span>
            <span>TOO OLD (${age}yo)</span>
          </span>
        `,
        message: `Too Old for 11U: Player turns ${age} before cutoff (April 30, ${seasonYear}). Exceeds maximum age limit.`
      };
    } else if (birthDate < standardMinDob) {
      // Turns 12 prior to May 1 (Born May 1, 2014 to April 30, 2015)
      // Allowed ONLY under Grade Exception (5th grade) - max 3 per roster
      return {
        status: 'grade-exception',
        isOverAge: true,
        ageOnCutoff: age,
        badgeHtml: `
          <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]" title="Turns 12 before May 1, ${seasonYear}. Eligible ONLY if currently in 5th grade (Grade Exception). Max 3 per team.">
            <span>⚠️</span>
            <span>GRADE EXCEPTION (${age}yo)</span>
          </span>
        `,
        message: `Age Flag: Turns 12 before May 1. Eligible for 11U ONLY if currently in 5th grade (max 3 grade exceptions allowed on roster).`
      };
    } else if (birthDate > standardMaxDob) {
      // Younger player (10U or 9U eligible playing up)
      return {
        status: 'playing-up',
        isOverAge: false,
        ageOnCutoff: age,
        badgeHtml: `
          <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-950/70 text-blue-300 border border-blue-500/40" title="Player is ${age} on April 30, ${seasonYear} (Playing Up)">
            <span>⭐</span>
            <span>PLAYING UP (${age}U)</span>
          </span>
        `,
        message: `Playing Up: Player is ${age} years old as of April 30, ${seasonYear} and is eligible to play up in 11U.`
      };
    } else {
      // Standard 11U Age Eligible
      return {
        status: 'eligible',
        isOverAge: false,
        ageOnCutoff: age,
        badgeHtml: `
          <span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950/70 text-[#B7F52A] border border-[#B7F52A]/40 shadow-[0_0_10px_rgba(183,245,42,0.2)]" title="USSSA 11U Age Eligible (Cutoff April 30, ${seasonYear})">
            <span>✓</span>
            <span>11U ELIGIBLE</span>
          </span>
        `,
        message: `USSSA 11U Eligible: Born within standard birth window (May 1, ${seasonYear - 12} – April 30, ${seasonYear - 11}).`
      };
    }
  }

  // -------------------------------------------------------------
  // 1. Firebase Authentication State Listener
  // -------------------------------------------------------------
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Verify coach / staff authorization
      const authorized = await isAuthorizedStaff(user);

      if (!authorized) {
        // Sign out unauthorized user immediately
        await signOut(auth);
        dashboardView.classList.add('hidden');
        authView.classList.remove('hidden');
        if (loginError) {
          loginError.innerHTML = `
            <div class="space-y-1">
              <p class="font-bold text-red-300">🚫 Access Restricted</p>
              <p>Account <strong class="text-white">${escapeHtml(user.email || 'this user')}</strong> is not on the authorized coaches & staff whitelist.</p>
              <p class="text-[11px] text-slate-400">Please contact the Natomas Sport Association administrator to grant access to this portal.</p>
            </div>
          `;
          loginError.classList.remove('hidden');
        }
        return;
      }

      // User is verified authorized coach/staff
      loginError.classList.add('hidden');
      authView.classList.add('hidden');
      dashboardView.classList.remove('hidden');
      if (userDisplayEmail) {
        userDisplayEmail.textContent = user.email || user.displayName || 'Authorized Coach';
      }
      initRealtimeRegistrations();
    } else {
      // User is logged out
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      dashboardView.classList.add('hidden');
      authView.classList.remove('hidden');
      registrations = [];
      filteredRegistrations = [];
    }
  });

  // -------------------------------------------------------------
  // 2. Email & Password Sign In
  // -------------------------------------------------------------
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.classList.add('hidden');
      const email = document.getElementById('admin-email').value.trim();
      const password = document.getElementById('admin-password').value;

      loginBtn.disabled = true;
      loginBtn.textContent = 'Verifying Credentials...';

      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        console.error('Sign-in error:', err);
        loginError.textContent = getFriendlyAuthError(err.code, err.message);
        loginError.classList.remove('hidden');
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In to Portal';
      }
    });
  }

  // -------------------------------------------------------------
  // 3. Google Sign In (with Popup & Redirect Fallback)
  // -------------------------------------------------------------
  // Listen for redirect sign-in completion when returning to portal
  getRedirectResult(auth).then((result) => {
    if (result && result.user) {
      console.log('Redirect sign-in completed successfully for:', result.user.email);
    }
  }).catch((err) => {
    console.warn('Redirect result check note:', err);
    if (loginError && err.code && err.code !== 'auth/null-user') {
      loginError.textContent = getFriendlyAuthError(err.code, err.message);
      loginError.classList.remove('hidden');
    }
  });

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      loginError.classList.add('hidden');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const originalBtnHtml = googleLoginBtn.innerHTML;
      googleLoginBtn.disabled = true;

      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.warn('Google popup sign-in encountered an issue:', err);

        // If popup was blocked, closed prematurely, or interrupted by Cross-Origin-Opener-Policy (COOP)
        const isPopupBlockedOrCancelled = 
          err.code === 'auth/popup-blocked' ||
          err.code === 'auth/popup-closed-by-user' ||
          err.code === 'auth/cancelled-popup-request' ||
          (err.message && err.message.toLowerCase().includes('cross-origin-opener-policy'));

        if (isPopupBlockedOrCancelled) {
          try {
            googleLoginBtn.innerHTML = `
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg> Redirecting to Google...
            `;
            await signInWithRedirect(auth, provider);
            return;
          } catch (redirectErr) {
            console.error('Redirect sign-in failed:', redirectErr);
            loginError.textContent = getFriendlyAuthError(redirectErr.code, redirectErr.message);
            loginError.classList.remove('hidden');
          }
        } else {
          loginError.textContent = getFriendlyAuthError(err.code, err.message);
          loginError.classList.remove('hidden');
        }
      } finally {
        if (!auth.currentUser) {
          googleLoginBtn.disabled = false;
          googleLoginBtn.innerHTML = originalBtnHtml;
        }
      }
    });
  }

  // -------------------------------------------------------------
  // 4. Sign Out
  // -------------------------------------------------------------
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Sign out error:', err);
      }
    });
  }

  // -------------------------------------------------------------
  // 5. Firestore Realtime Listener
  // -------------------------------------------------------------
  function initRealtimeRegistrations() {
    try {
      const q = query(collection(db, 'tryout_registrations'), orderBy('submittedAt', 'desc'));

      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        registrations = [];
        snapshot.forEach((docSnapshot) => {
          registrations.push({
            id: docSnapshot.id,
            ...docSnapshot.data()
          });
        });

        applyFilters();
        updateMetrics();
      }, (error) => {
        console.error('Firestore listener error:', error);
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-8 text-red-400">
              <p class="font-bold">Error loading tryouts: ${error.message}</p>
              <p class="text-[11px] text-slate-500 mt-1">Make sure you are signed in with an authorized admin account and security rules allow read access.</p>
            </td>
          </tr>
        `;
      });
    } catch (err) {
      console.error('Init snapshot error:', err);
    }
  }

  // -------------------------------------------------------------
  // 6. Metrics Calculation
  // -------------------------------------------------------------
  function updateMetrics() {
    const total = registrations.length;
    const count11u = registrations.filter(r => (r.division || '').includes('11U')).length;
    const countNew = registrations.filter(r => (r.status || 'new') === 'new').length;
    const countConfirmed = registrations.filter(r => r.status === 'confirmed').length;
    const countIneligible = registrations.filter(r => {
      const elig = checkUsssa11uEligibility(r.dob);
      return elig.status === 'too-old' || elig.status === 'grade-exception';
    }).length;

    if (statTotal) statTotal.textContent = total;
    if (stat11u) stat11u.textContent = count11u;
    if (statNew) statNew.textContent = countNew;
    if (statConfirmed) statConfirmed.textContent = countConfirmed;
    if (statIneligible) statIneligible.textContent = countIneligible;
  }

  // -------------------------------------------------------------
  // 7. Filters & Search
  // -------------------------------------------------------------
  function applyFilters() {
    const term = (searchInput?.value || '').toLowerCase().trim();
    const divFilter = filterDivision?.value || 'all';
    const statFilter = filterStatus?.value || 'all';
    const eligFilter = filterEligibility?.value || 'all';

    filteredRegistrations = registrations.filter(reg => {
      // Division check
      if (divFilter !== 'all') {
        if (!reg.division || !reg.division.toLowerCase().includes(divFilter.toLowerCase())) {
          return false;
        }
      }

      // Status check
      if (statFilter !== 'all') {
        const currentStat = reg.status || 'new';
        if (currentStat.toLowerCase() !== statFilter.toLowerCase()) {
          return false;
        }
      }

      // Eligibility check
      if (eligFilter !== 'all') {
        const elig = checkUsssa11uEligibility(reg.dob);
        if (eligFilter === 'too-old' && elig.status !== 'too-old') {
          return false;
        }
        if (eligFilter === 'grade-exception' && elig.status !== 'grade-exception') {
          return false;
        }
        if (eligFilter === 'flagged' && elig.status !== 'too-old' && elig.status !== 'grade-exception') {
          return false;
        }
        if (eligFilter === 'eligible' && elig.status !== 'eligible' && elig.status !== 'playing-up') {
          return false;
        }
      }

      // Search term
      if (term) {
        const matchesPlayer = (reg.playerName || '').toLowerCase().includes(term);
        const matchesParent = (reg.parentName || '').toLowerCase().includes(term);
        const matchesEmail = (reg.email || '').toLowerCase().includes(term);
        const matchesPhone = (reg.phone || '').toLowerCase().includes(term);
        const matchesPos = (reg.positions || '').toLowerCase().includes(term);
        return matchesPlayer || matchesParent || matchesEmail || matchesPhone || matchesPos;
      }

      return true;
    });

    renderTable();
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (filterDivision) filterDivision.addEventListener('change', applyFilters);
  if (filterStatus) filterStatus.addEventListener('change', applyFilters);
  if (filterEligibility) filterEligibility.addEventListener('change', applyFilters);

  // -------------------------------------------------------------
  // 8. Table Rendering
  // -------------------------------------------------------------
  function renderTable() {
    if (!tableBody) return;

    if (filteredRegistrations.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-12 text-slate-500">
            <svg class="w-8 h-8 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <p class="font-bold text-slate-400">No tryout registrations match your filter.</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filteredRegistrations.map(reg => {
      const formattedDate = formatTimestamp(reg.submittedAt);
      const statusBadge = getStatusBadge(reg.status || 'new');
      const is11u = (reg.division || '').includes('11U');
      const usssaEligibility = checkUsssa11uEligibility(reg.dob);
      const isOverAgeRow = usssaEligibility.status === 'too-old';

      return `
        <tr class="hover:bg-[#141820]/60 transition-colors ${isOverAgeRow ? 'bg-red-950/20' : ''}">
          <!-- Player Name -->
          <td class="p-4 pl-6 font-bold text-white">
            <button type="button" class="text-left hover:text-[#67DDF2] transition-colors view-player-btn flex items-center space-x-2" data-id="${reg.id}">
              <span>${escapeHtml(reg.playerName || 'Unknown Player')}</span>
              <svg class="w-3.5 h-3.5 text-[#67DDF2] inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </button>
          </td>

          <!-- Division -->
          <td class="p-4">
            <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${is11u ? 'bg-[#F02AA8]/20 text-[#F02AA8] border border-[#F02AA8]/40' : 'bg-slate-800 text-slate-300'}">
              ${escapeHtml(reg.division || '11U')}
            </span>
          </td>

          <!-- DOB & USSSA 11U Eligibility Flag -->
          <td class="p-4">
            <div class="text-slate-300 font-medium">${escapeHtml(reg.dob || '--')}</div>
            <div class="mt-1">${usssaEligibility.badgeHtml}</div>
          </td>

          <!-- Positions & Bats/Throws -->
          <td class="p-4 text-slate-300">
            <div class="font-semibold text-white">${escapeHtml(reg.positions || 'N/A')}</div>
            <div class="text-[10px] text-slate-500 font-mono">${escapeHtml(reg.batsThrows || 'R/R')}</div>
          </td>

          <!-- Parent Contact -->
          <td class="p-4">
            <div class="font-bold text-white text-xs">${escapeHtml(reg.parentName || '--')}</div>
            <div class="flex items-center space-x-2 mt-0.5">
              <a href="tel:${escapeHtml(reg.phone || '')}" class="text-[11px] text-[#B7F52A] hover:underline">${escapeHtml(reg.phone || '--')}</a>
              <span class="text-slate-600">•</span>
              <a href="mailto:${escapeHtml(reg.email || '')}" class="text-[11px] text-[#67DDF2] hover:underline">${escapeHtml(reg.email || '--')}</a>
            </div>
          </td>

          <!-- Status Dropdown -->
          <td class="p-4">
            <select class="status-quick-select px-2.5 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#67DDF2]" data-id="${reg.id}">
              <option value="new" ${(reg.status || 'new') === 'new' ? 'selected' : ''}>New</option>
              <option value="contacted" ${reg.status === 'contacted' ? 'selected' : ''}>Contacted</option>
              <option value="confirmed" ${reg.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="archived" ${reg.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </td>

          <!-- Submitted Date -->
          <td class="p-4 text-slate-400 text-[11px]">
            ${formattedDate}
          </td>

          <!-- Actions -->
          <td class="p-4 pr-6 text-right space-x-1.5 whitespace-nowrap">
            <button type="button" class="email-player-btn px-2.5 py-1.5 rounded-lg bg-[#67DDF2]/10 hover:bg-[#67DDF2]/20 border border-[#67DDF2]/40 text-[#67DDF2] font-bold text-xs inline-flex items-center space-x-1 transition-colors" data-id="${reg.id}" title="Email Family">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              <span>Email</span>
            </button>
            <button type="button" class="view-player-btn px-3 py-1.5 rounded-lg bg-[#17243B] hover:bg-[#202f4a] border border-[#67DDF2]/30 text-white font-bold text-xs transition-colors" data-id="${reg.id}">
              Details
            </button>
            <button type="button" class="delete-reg-btn p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors" title="Delete Registration" data-id="${reg.id}">
              <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach event listeners to row buttons
    tableBody.querySelectorAll('.view-player-btn').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.dataset.id));
    });

    tableBody.querySelectorAll('.email-player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = registrations.find(r => r.id === btn.dataset.id);
        if (target) openSingleEmailModal(target);
      });
    });

    tableBody.querySelectorAll('.status-quick-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const id = select.dataset.id;
        const newStatus = e.target.value;
        try {
          await updateDoc(doc(db, 'tryout_registrations', id), { status: newStatus });
        } catch (err) {
          console.error('Status update failed:', err);
          alert('Could not update status: ' + err.message);
        }
      });
    });

    tableBody.querySelectorAll('.delete-reg-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const target = registrations.find(r => r.id === id);
        const name = target ? target.playerName : 'this athlete';
        if (confirm(`Are you sure you want to remove the tryout registration for ${name}?`)) {
          try {
            await deleteDoc(doc(db, 'tryout_registrations', id));
          } catch (err) {
            console.error('Delete failed:', err);
            alert('Could not delete registration: ' + err.message);
          }
        }
      });
    });
  }

  // -------------------------------------------------------------
  // 9. Player Detail Modal
  // -------------------------------------------------------------
  function openModal(id) {
    const reg = registrations.find(r => r.id === id);
    if (!reg) return;

    activeDocId = id;
    const usssaEligibility = checkUsssa11uEligibility(reg.dob);

    if (modalPlayerName) modalPlayerName.textContent = reg.playerName || 'Unknown Player';
    if (modalDocId) modalDocId.textContent = `#${id}`;
    if (modalDivisionBadge) modalDivisionBadge.textContent = reg.division || 'Bad Hops 11U';
    if (modalEligibilityBadge) modalEligibilityBadge.innerHTML = usssaEligibility.badgeHtml;
    if (modalStatusBadge) modalStatusBadge.textContent = (reg.status || 'new').toUpperCase();
    if (modalDob) {
      modalDob.innerHTML = `
        <span>${escapeHtml(reg.dob || '--')}</span>
        <div class="mt-1 text-[11px] text-slate-300 font-normal">${usssaEligibility.message}</div>
      `;
    }
    if (modalPositions) modalPositions.textContent = reg.positions || 'N/A';
    if (modalBatsThrows) modalBatsThrows.textContent = reg.batsThrows || 'R/R';
    if (modalZip) modalZip.textContent = reg.zipCode || '--';
    if (modalExperience) modalExperience.textContent = reg.experience || 'None specified';
    if (modalParentName) modalParentName.textContent = reg.parentName || '--';
    if (modalPhone) modalPhone.textContent = reg.phone || '--';
    if (modalEmail) modalEmail.textContent = reg.email || '--';
    if (modalCallLink) modalCallLink.href = `tel:${reg.phone || ''}`;
    if (modalEmailLink) modalEmailLink.href = `mailto:${reg.email || ''}`;
    if (modalEmailBtn) {
      modalEmailBtn.onclick = () => {
        closeModal();
        openSingleEmailModal(reg);
      };
    }
    if (modalNotes) modalNotes.textContent = reg.notes || 'None provided';
    if (modalAdminNotes) modalAdminNotes.value = reg.adminNotes || '';
    if (modalStatusSelect) modalStatusSelect.value = reg.status || 'new';

    if (saveNotesFeedback) saveNotesFeedback.classList.add('hidden');
    playerModal.classList.remove('hidden');
  }

  function closeModal() {
    activeDocId = null;
    playerModal.classList.add('hidden');
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (playerModal) {
    playerModal.addEventListener('click', (e) => {
      if (e.target === playerModal) closeModal();
    });
  }

  // Save Modal Notes & Status
  if (modalSaveNotesBtn) {
    modalSaveNotesBtn.addEventListener('click', async () => {
      if (!activeDocId) return;
      const notesValue = modalAdminNotes.value.trim();
      const statusValue = modalStatusSelect.value;

      modalSaveNotesBtn.disabled = true;
      modalSaveNotesBtn.textContent = 'Saving...';

      try {
        await updateDoc(doc(db, 'tryout_registrations', activeDocId), {
          adminNotes: notesValue,
          status: statusValue
        });

        if (saveNotesFeedback) {
          saveNotesFeedback.classList.remove('hidden');
          setTimeout(() => saveNotesFeedback.classList.add('hidden'), 3000);
        }
      } catch (err) {
        console.error('Error saving notes:', err);
        alert('Failed to save notes: ' + err.message);
      } finally {
        modalSaveNotesBtn.disabled = false;
        modalSaveNotesBtn.textContent = 'Save Changes';
      }
    });
  }

  // -------------------------------------------------------------
  // 10. CSV Roster Export
  // -------------------------------------------------------------
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (registrations.length === 0) {
        alert('No registrations available to export.');
        return;
      }

      const headers = [
        'Registration ID',
        'Player Name',
        'Date of Birth',
        'USSSA 11U Eligibility Status',
        'Age as of April 30 Cutoff',
        'Division',
        'Positions',
        'Bats / Throws',
        'Experience',
        'Parent Name',
        'Parent Phone',
        'Parent Email',
        'Zip Code',
        'Medical / Player Notes',
        'Waiver Accepted',
        'Status',
        'Coach Evaluation Notes',
        'Submitted Date'
      ];

      const rows = registrations.map(r => {
        const elig = checkUsssa11uEligibility(r.dob);
        return [
          r.id || '',
          r.playerName || '',
          r.dob || '',
          elig.status.toUpperCase(),
          elig.ageOnCutoff !== null ? String(elig.ageOnCutoff) : '--',
          r.division || '',
          r.positions || '',
          r.batsThrows || '',
          r.experience || '',
          r.parentName || '',
          r.phone || '',
          r.email || '',
          r.zipCode || '',
          r.notes || '',
          r.waiverAccepted ? 'Yes' : 'No',
          r.status || 'new',
          r.adminNotes || '',
          formatTimestamp(r.submittedAt)
        ];
      });

      const csvContent = [
        headers.map(escapeCsvCell).join(','),
        ...rows.map(row => row.map(escapeCsvCell).join(','))
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `BadHops_11U_Tryouts_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // -------------------------------------------------------------
  // 10. Coach Email Composer System
  // -------------------------------------------------------------
  let currentEmailContext = null;

  const EMAIL_TEMPLATES = {
    'tryout-details': {
      subject: 'Bad Hops 11U Baseball — Tryout Details & Schedule (North Natomas Field 2)',
      body: `Hi {ParentName},

Thank you for registering {PlayerName} for the Bad Hops 11U Travel Baseball evaluations with Natomas Sport Association!

Here are the key details for your upcoming evaluation:
• Location: North Natomas Regional Park (Field 2) — 2601 New Market Dr, Sacramento, CA
• Age Division: {Division}
• Equipment Needed: Baseball glove, cleats, bat, batting helmet, baseball pants, and plenty of water.
• Arrival: Please arrive 15 minutes before your scheduled slot to check in at the field desk and warm up.

If you have any questions or schedule conflicts prior to evaluations, please reply directly to this email or reach out to our coaching staff.

We're excited to see {PlayerName} out on the field!

Coach Collins & Bad Hops Coaching Staff
Natomas Sport Association
https://natomassportsassociation.org`
    },
    'tryout-confirmed': {
      subject: 'Bad Hops 11U — Tryout Registration Confirmed',
      body: `Hi {ParentName},

This is a confirmation from the Bad Hops coaching staff that {PlayerName}'s tryout registration is confirmed!

Please ensure your player is dressed in baseball attire and ready 15 minutes prior to start time at North Natomas Regional Park (Field 2).

If you have any questions or need to make changes to your schedule, reply directly to this email.

Best regards,
Bad Hops 11U Coaching Staff
Natomas Sport Association`
    },
    'evaluation-followup': {
      subject: 'Bad Hops 11U — Evaluation Follow-Up & Next Steps',
      body: `Hi {ParentName},

Thank you for bringing {PlayerName} out to evaluations with Bad Hops 11U and Natomas Sport Association. Our coaches were thrilled to see the hustle, attitude, and talent on display.

Our coaching staff is currently finalizing roster evaluations and will be reaching out regarding team placement and next steps for the upcoming 2027 season.

Thank you again for being part of our Natomas youth sports community!

Best regards,
Bad Hops 11U Coaching Staff
Natomas Sport Association`
    },
    'private-eval': {
      subject: 'Bad Hops 11U — Private Evaluation Request',
      body: `Hi {ParentName},

We received your request for a private evaluation for {PlayerName} for the Bad Hops 11U team.

Our coaching staff conducts private workouts at North Natomas Regional Park. Please reply with 2-3 dates and times that work best for your family this week so we can coordinate with our coaching schedule.

Best regards,
Bad Hops 11U Coaching Staff
Natomas Sport Association`
    },
    'custom': {
      subject: '',
      body: ''
    }
  };

  function openSingleEmailModal(reg) {
    if (!reg || !reg.email) {
      alert('This athlete does not have an email address on file.');
      return;
    }
    currentEmailContext = { type: 'single', reg };

    if (emailModalTitle) emailModalTitle.textContent = `Email ${reg.playerName || 'Family'}`;
    if (emailModeBadge) {
      emailModeBadge.textContent = 'Single Athlete';
      emailModeBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B7F52A]/20 text-[#B7F52A] border border-[#B7F52A]/40';
    }
    if (emailRecipientCount) emailRecipientCount.textContent = '1 family';
    if (emailRecipientPreview) {
      emailRecipientPreview.innerHTML = `<span class="text-white">${escapeHtml(reg.parentName || 'Parent')}</span> &lt;<span class="text-[#67DDF2]">${escapeHtml(reg.email)}</span>&gt; <span class="text-slate-400 font-normal">(Athlete: ${escapeHtml(reg.playerName || 'Player')})</span>`;
    }
    if (emailSenderDisplay) {
      emailSenderDisplay.textContent = auth.currentUser?.email || 'headcoach.badhops@gmail.com';
    }
    if (emailSingleOptions) emailSingleOptions.classList.remove('hidden');
    if (emailTemplateSelect) emailTemplateSelect.value = 'tryout-details';

    applyEmailTemplate('tryout-details');
    if (emailModal) emailModal.classList.remove('hidden');
  }

  function openBulkEmailModal() {
    const list = (filteredRegistrations.length ? filteredRegistrations : registrations).filter(r => r.email && r.email.trim());
    if (!list.length) {
      alert('No registrations with valid email addresses found to send to.');
      return;
    }
    currentEmailContext = { type: 'bulk', list };

    if (emailModalTitle) emailModalTitle.textContent = 'Email Roster (Bulk)';
    if (emailModeBadge) {
      emailModeBadge.textContent = `Bulk Roster (${list.length} Families)`;
      emailModeBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#67DDF2]/20 text-[#67DDF2] border border-[#67DDF2]/40';
    }
    if (emailRecipientCount) emailRecipientCount.textContent = `${list.length} families (BCC)`;
    if (emailRecipientPreview) {
      const sample = list.slice(0, 5).map(r => r.email).join(', ');
      emailRecipientPreview.textContent = list.length > 5 ? `${sample} ... and ${list.length - 5} more` : sample;
    }
    if (emailSenderDisplay) {
      emailSenderDisplay.textContent = auth.currentUser?.email || 'headcoach.badhops@gmail.com';
    }
    if (emailSingleOptions) emailSingleOptions.classList.add('hidden');
    if (emailTemplateSelect) emailTemplateSelect.value = 'tryout-details';

    applyEmailTemplate('tryout-details');
    if (emailModal) emailModal.classList.remove('hidden');
  }

  function closeEmailModal() {
    currentEmailContext = null;
    if (emailModal) emailModal.classList.add('hidden');
  }

  function applyEmailTemplate(templateKey) {
    const template = EMAIL_TEMPLATES[templateKey] || EMAIL_TEMPLATES['custom'];
    if (!currentEmailContext) return;

    let parentName = 'Family';
    let playerName = 'your player';
    let division = 'Bad Hops 11U';

    if (currentEmailContext.type === 'single') {
      const reg = currentEmailContext.reg;
      parentName = reg.parentName || 'Family';
      playerName = reg.playerName || 'Athlete';
      division = reg.division || 'Bad Hops 11U';
    } else {
      parentName = 'Bad Hops Families';
      playerName = 'your athlete';
      division = filterDivision?.value !== 'all' ? filterDivision.value : 'Bad Hops 11U';
    }

    const sub = (template.subject || '')
      .replace(/{PlayerName}/g, playerName)
      .replace(/{ParentName}/g, parentName)
      .replace(/{Division}/g, division);

    const body = (template.body || '')
      .replace(/{PlayerName}/g, playerName)
      .replace(/{ParentName}/g, parentName)
      .replace(/{Division}/g, division);

    if (emailSubjectInput) emailSubjectInput.value = sub;
    if (emailBodyInput) emailBodyInput.value = body;
    updateEmailLinks();
  }

  function updateEmailLinks() {
    if (!currentEmailContext) return null;
    const subject = emailSubjectInput?.value.trim() || '';
    const body = emailBodyInput?.value.trim() || '';

    let to = '';
    let bcc = '';

    if (currentEmailContext.type === 'single') {
      to = currentEmailContext.reg.email || '';
    } else {
      bcc = currentEmailContext.list.map(r => r.email).filter(Boolean).join(',');
    }

    // Build standard mailto URL
    const queryParts = [];
    if (bcc) queryParts.push(`bcc=${encodeURIComponent(bcc)}`);
    if (subject) queryParts.push(`subject=${encodeURIComponent(subject)}`);
    if (body) queryParts.push(`body=${encodeURIComponent(body)}`);
    const mailtoUrl = `mailto:${encodeURIComponent(to)}${queryParts.length ? '?' + queryParts.join('&') : ''}`;
    if (emailOpenMailLink) emailOpenMailLink.href = mailtoUrl;

    return { to, bcc, subject, body };
  }

  // Event Listeners for Email Composer
  if (emailTemplateSelect) {
    emailTemplateSelect.addEventListener('change', () => {
      applyEmailTemplate(emailTemplateSelect.value);
    });
  }

  if (emailSubjectInput) emailSubjectInput.addEventListener('input', updateEmailLinks);
  if (emailBodyInput) emailBodyInput.addEventListener('input', updateEmailLinks);

  if (emailModalCloseBtn) emailModalCloseBtn.addEventListener('click', closeEmailModal);
  if (emailModal) {
    emailModal.addEventListener('click', (e) => {
      if (e.target === emailModal) closeEmailModal();
    });
  }

  if (bulkEmailBtn) {
    bulkEmailBtn.addEventListener('click', openBulkEmailModal);
  }

  // Send via Gmail Button
  if (emailSendGmailBtn) {
    emailSendGmailBtn.addEventListener('click', async () => {
      const data = updateEmailLinks();
      if (!data) return;

      let gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
      if (data.to) gmailUrl += `&to=${encodeURIComponent(data.to)}`;
      if (data.bcc) gmailUrl += `&bcc=${encodeURIComponent(data.bcc)}`;
      if (data.subject) gmailUrl += `&su=${encodeURIComponent(data.subject)}`;
      if (data.body) gmailUrl += `&body=${encodeURIComponent(data.body)}`;

      // Open Gmail in a new tab
      window.open(gmailUrl, '_blank');

      // Auto-update single registration in Firestore if enabled
      if (currentEmailContext?.type === 'single' && emailAutoUpdateStatus?.checked) {
        const reg = currentEmailContext.reg;
        try {
          const coachEmail = auth.currentUser?.email || 'headcoach.badhops@gmail.com';
          const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const newNoteEntry = `[${today}] Emailed "${data.subject}" by ${coachEmail}`;
          const updatedNotes = reg.adminNotes ? `${reg.adminNotes}\n${newNoteEntry}` : newNoteEntry;

          await updateDoc(doc(db, 'tryout_registrations', reg.id), {
            status: 'contacted',
            adminNotes: updatedNotes
          });
        } catch (err) {
          console.warn('Could not auto-update registration status in Firestore:', err);
        }
      }

      closeEmailModal();
    });
  }

  // Copy Message to Clipboard
  if (emailCopyBtn) {
    emailCopyBtn.addEventListener('click', async () => {
      const subject = emailSubjectInput?.value.trim() || '';
      const body = emailBodyInput?.value.trim() || '';
      let textToCopy = `Subject: ${subject}\n\n${body}`;

      if (currentEmailContext?.type === 'bulk') {
        const emails = currentEmailContext.list.map(r => r.email).filter(Boolean).join(', ');
        textToCopy = `Recipients (BCC):\n${emails}\n\nSubject: ${subject}\n\n${body}`;
      }

      try {
        await navigator.clipboard.writeText(textToCopy);
        if (emailCopyBtnText) emailCopyBtnText.textContent = 'Copied to Clipboard!';
        setTimeout(() => {
          if (emailCopyBtnText) emailCopyBtnText.textContent = 'Copy Message';
        }, 2500);
      } catch (err) {
        alert('Could not copy to clipboard: ' + err.message);
      }
    });
  }

  // Helper Functions
  function escapeCsvCell(cell) {
    const stringVal = String(cell ?? '');
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  }

  function formatTimestamp(ts) {
    if (!ts) return '--';
    if (ts.toDate && typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return String(ts);
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'contacted':
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800">Contacted</span>';
      case 'confirmed':
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-950 text-[#B7F52A] border border-[#B7F52A]/40">Confirmed</span>';
      case 'archived':
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400">Archived</span>';
      default:
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#67DDF2]/10 text-[#67DDF2] border border-[#67DDF2]/30">New</span>';
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getFriendlyAuthError(code, defaultMsg) {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password. Please verify your coach account details.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please wait a moment and try again.';
      case 'auth/user-disabled':
        return 'This coach account has been deactivated.';
      case 'auth/popup-closed-by-user':
        return 'Google Sign-in popup was closed before completing.';
      case 'auth/unauthorized-domain':
        return 'This domain (natomassportsassociation.org) is not authorized in Firebase yet. In Firebase Console, go to Authentication > Settings > Authorized Domains, and add natomassportsassociation.org.';
      case 'auth/operation-not-allowed':
        return 'Google sign-in is not enabled in your Firebase Authentication providers. Please enable Google in Firebase Console > Authentication > Sign-in method.';
      default:
        return defaultMsg || 'Authentication failed. Please try again.';
    }
  }
});
