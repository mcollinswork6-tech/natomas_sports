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
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
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
        syncEvaluationRoster();
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
              <button type="button" class="quick-gmail-btn text-[11px] text-[#67DDF2] hover:text-[#B7F52A] hover:underline transition-colors font-mono inline-flex items-center space-x-1" data-id="${reg.id}" title="Compose in Gmail">
                <span>${escapeHtml(reg.email || '--')}</span>
              </button>
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
            <button type="button" class="email-player-btn px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#B7F52A]/10 to-[#67DDF2]/10 hover:from-[#B7F52A]/20 hover:to-[#67DDF2]/20 border border-[#67DDF2]/40 text-[#67DDF2] font-bold text-xs inline-flex items-center space-x-1.5 transition-all" data-id="${reg.id}" title="Compose in Gmail">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
              <span>Gmail</span>
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

    tableBody.querySelectorAll('.quick-gmail-btn').forEach(btn => {
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

  // Send via Gmail Button (Opens directly in Gmail with pre-selected coach account)
  if (emailSendGmailBtn) {
    emailSendGmailBtn.addEventListener('click', async () => {
      const data = updateEmailLinks();
      if (!data) return;

      const coachEmail = auth.currentUser?.email || 'headcoach.badhops@gmail.com';
      let gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
      if (coachEmail) {
        gmailUrl += `&authuser=${encodeURIComponent(coachEmail)}`;
      }
      if (data.to) gmailUrl += `&to=${encodeURIComponent(data.to)}`;
      if (data.bcc) gmailUrl += `&bcc=${encodeURIComponent(data.bcc)}`;
      if (data.subject) gmailUrl += `&su=${encodeURIComponent(data.subject)}`;
      if (data.body) gmailUrl += `&body=${encodeURIComponent(data.body)}`;

      // Open Gmail in a new tab directly
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

  // -------------------------------------------------------------
  // 11. Bad Hops 11U Master Evaluation Matrix System
  // -------------------------------------------------------------
  const tabBtnRegistrations = document.getElementById('tab-btn-registrations');
  const tabBtnEvaluations = document.getElementById('tab-btn-evaluations');
  const viewRegistrations = document.getElementById('view-registrations');
  const viewEvaluations = document.getElementById('view-evaluations');

  const evalSyncAthletesBtn = document.getElementById('eval-sync-athletes-btn');
  const evalExportCsvBtn = document.getElementById('eval-export-csv-btn');
  const evalSaveBtn = document.getElementById('eval-save-btn');
  const evalSaveBtnText = document.getElementById('eval-save-btn-text');

  const evalStationTabs = document.querySelectorAll('.eval-station-tab');
  const stationPanels = document.querySelectorAll('.station-panel');

  const evalMasterTbody = document.getElementById('eval-master-tbody');
  const evalHittingTbody = document.getElementById('eval-hitting-tbody');
  const evalDefenseTbody = document.getElementById('eval-defense-tbody');
  const evalPitchingTbody = document.getElementById('eval-pitching-tbody');
  const evalCatchingTbody = document.getElementById('eval-catching-tbody');

  const evalMasterAvgRow = document.getElementById('eval-master-avg-row');
  const evalHittingAvgRow = document.getElementById('eval-hitting-avg-row');
  const evalDefenseAvgRow = document.getElementById('eval-defense-avg-row');
  const evalPitchingAvgRow = document.getElementById('eval-pitching-avg-row');
  const evalCatchingAvgRow = document.getElementById('eval-catching-avg-row');

  let evaluationRoster = [];

  // Toggle between Registrations View and Evaluation Matrix View
  if (tabBtnRegistrations && tabBtnEvaluations && viewRegistrations && viewEvaluations) {
    tabBtnRegistrations.addEventListener('click', () => {
      viewRegistrations.classList.remove('hidden');
      viewEvaluations.classList.add('hidden');

      tabBtnRegistrations.className = 'px-5 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all bg-[#17243B] text-[#67DDF2] border border-[#67DDF2]/40 shadow-[0_0_12px_rgba(103,221,242,0.2)]';
      tabBtnEvaluations.className = 'px-5 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all bg-[#111317] text-slate-400 hover:text-white border border-slate-800';
    });

    tabBtnEvaluations.addEventListener('click', () => {
      viewRegistrations.classList.add('hidden');
      viewEvaluations.classList.remove('hidden');

      tabBtnEvaluations.className = 'px-5 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all bg-[#17243B] text-[#B7F52A] border border-[#B7F52A]/40 shadow-[0_0_12px_rgba(183,245,42,0.2)]';
      tabBtnRegistrations.className = 'px-5 py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all bg-[#111317] text-slate-400 hover:text-white border border-slate-800';

      if (!evaluationRoster.length) {
        syncEvaluationRoster();
      }
    });
  }

  // Station Sub-Tabs switching
  evalStationTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const station = tab.dataset.station;

      evalStationTabs.forEach(t => {
        t.className = 'eval-station-tab px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all bg-[#17243B] text-slate-300 hover:text-white';
      });
      tab.className = 'eval-station-tab px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all bg-[#67DDF2] text-[#111317] shadow-[0_0_10px_rgba(103,221,242,0.3)]';

      stationPanels.forEach(p => p.classList.add('hidden'));
      const activePanel = document.getElementById(`station-panel-${station}`);
      if (activePanel) activePanel.classList.remove('hidden');
    });
  });

  // Calculation helpers
  function calcHittingTotal(p) {
    return (Number(p.bunting) || 0) + (Number(p.swingMech) || 0) + (Number(p.hittingAbility) || 0);
  }

  function getHittingTier(score) {
    if (score >= 12) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-950 text-[#B7F52A] border border-[#B7F52A]/40">Elite Hitter</span>';
    if (score >= 9) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-[#67DDF2] border border-[#67DDF2]/40">Travel Avg</span>';
    if (score > 0) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400">Developing</span>';
    return '<span class="text-slate-600 text-[10px]">--</span>';
  }

  function calcDefenseTotal(p) {
    return (Number(p.gbFootwork) || 0) + (Number(p.popFlies) || 0) + (Number(p.throwMove) || 0) + (Number(p.baseRunning) || 0) + (Number(p.baseballIq) || 0);
  }

  function getDefenseTier(score) {
    if (score >= 20) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-950 text-[#B7F52A] border border-[#B7F52A]/40">Elite Defender</span>';
    if (score >= 15) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-[#67DDF2] border border-[#67DDF2]/40">Solid Travel</span>';
    if (score > 0) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400">Developing</span>';
    return '<span class="text-slate-600 text-[10px]">--</span>';
  }

  function calcPitchingTotal(p) {
    return (Number(p.speedScore) || 0) + (Number(p.accuracy) || 0) + (Number(p.addPitches) || 0);
  }

  function getPitchingTier(score) {
    if (score >= 12) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-950 text-[#F02AA8] border border-[#F02AA8]/40">Rotation Ace</span>';
    if (score >= 9) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-[#67DDF2] border border-[#67DDF2]/40">Travel Bullpen</span>';
    if (score > 0) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400">Developing</span>';
    return '<span class="text-slate-600 text-[10px]">--</span>';
  }

  function calcCatchingTotal(p) {
    return (Number(p.blockingMvt) || 0) + (Number(p.framing) || 0) + (Number(p.armStrength) || 0);
  }

  function getCatchingTier(score) {
    if (score >= 12) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-950 text-[#F02AA8] border border-[#F02AA8]/40">Core Catcher</span>';
    if (score >= 9) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-[#67DDF2] border border-[#67DDF2]/40">Travel Backup</span>';
    if (score > 0) return '<span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400">Developing</span>';
    return '<span class="text-slate-600 text-[10px]">--</span>';
  }

  function calcPosTotal(p) {
    return calcHittingTotal(p) + calcDefenseTotal(p);
  }

  function getPosTier(posTotal) {
    if (posTotal >= 32) return '<span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-950 text-[#B7F52A] border border-[#B7F52A]/40 shadow-[0_0_8px_rgba(183,245,42,0.2)]">Core Lock</span>';
    if (posTotal >= 25) return '<span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-[#67DDF2] border border-[#67DDF2]/40">Contributor</span>';
    if (posTotal > 0) return '<span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400">Rec / Academy</span>';
    return '<span class="text-slate-600 text-[10px]">--</span>';
  }

  function calcPcCombined(p) {
    const pcBonus = Math.max(calcPitchingTotal(p), calcCatchingTotal(p));
    return calcPosTotal(p) + pcBonus;
  }

  function getPcTier(pcScore) {
    if (pcScore >= 44) return '<span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-950 text-[#F02AA8] border border-[#F02AA8]/40 shadow-[0_0_8px_rgba(240,42,168,0.2)]">Core P/C Lock</span>';
    if (pcScore >= 36) return '<span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-950 text-[#67DDF2] border border-[#67DDF2]/40">Travel P/C</span>';
    if (pcScore > 0) return '<span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400">Dev P/C</span>';
    return '<span class="text-slate-600 text-[10px]">--</span>';
  }

  // Create athlete evaluation record
  function createEvalRecord(reg, index) {
    const batsThrowsParts = (reg.batsThrows || 'R/R').split('/');
    return {
      id: reg.id || `eval_${index + 1}`,
      jersey: index + 1,
      playerName: reg.playerName || 'Unknown Player',
      primaryPos: reg.positions || 'Utility',
      bats: (batsThrowsParts[0] || 'R').toUpperCase().trim(),
      throws: (batsThrowsParts[1] || 'R').toUpperCase().trim(),
      bunting: 0,
      swingMech: 0,
      hittingAbility: 0,
      cageNotes: '',
      gbFootwork: 0,
      popFlies: 0,
      throwMove: 0,
      baseRunning: 0,
      baseballIq: 0,
      fieldNotes: '',
      fbVelo: '',
      speedScore: 0,
      accuracy: 0,
      addPitches: 0,
      pitchingNotes: '',
      popTime: '',
      blockingMvt: 0,
      framing: 0,
      armStrength: 0,
      catchingNotes: '',
      masterNotes: ''
    };
  }

  // Synchronize athletes from Registrations
  async function syncEvaluationRoster() {
    if (!registrations || !registrations.length) return;

    let savedData = {};
    // Check Firestore first
    try {
      const evalDoc = await getDoc(doc(db, 'tryout_evaluations', 'nov21_2026'));
      if (evalDoc.exists() && Array.isArray(evalDoc.data().athletes)) {
        evalDoc.data().athletes.forEach(a => {
          if (a.id) savedData[a.id] = a;
          if (a.playerName) savedData[a.playerName.toLowerCase()] = a;
        });
      }
    } catch (e) {
      console.warn('Firestore eval load:', e);
    }

    // Also check localStorage
    try {
      const local = JSON.parse(localStorage.getItem('badhops_tryout_eval_2026') || '{}');
      if (Array.isArray(local)) {
        local.forEach(a => {
          if (a.id && !savedData[a.id]) savedData[a.id] = a;
          if (a.playerName && !savedData[a.playerName.toLowerCase()]) savedData[a.playerName.toLowerCase()] = a;
        });
      }
    } catch (e) {
      console.warn('Local storage eval load:', e);
    }

    const updated = [];
    registrations.forEach((reg, idx) => {
      const key = reg.id;
      const nameKey = (reg.playerName || '').toLowerCase();
      const existing = savedData[key] || savedData[nameKey] || evaluationRoster.find(e => e.id === reg.id || e.playerName.toLowerCase() === nameKey);

      const record = createEvalRecord(reg, idx);
      if (existing) {
        record.jersey = existing.jersey !== undefined ? existing.jersey : (idx + 1);
        record.primaryPos = existing.primaryPos || record.primaryPos;
        record.bats = existing.bats || record.bats;
        record.throws = existing.throws || record.throws;

        record.bunting = Number(existing.bunting) || 0;
        record.swingMech = Number(existing.swingMech) || 0;
        record.hittingAbility = Number(existing.hittingAbility) || 0;
        record.cageNotes = existing.cageNotes || '';

        record.gbFootwork = Number(existing.gbFootwork) || 0;
        record.popFlies = Number(existing.popFlies) || 0;
        record.throwMove = Number(existing.throwMove) || 0;
        record.baseRunning = Number(existing.baseRunning) || 0;
        record.baseballIq = Number(existing.baseballIq) || 0;
        record.fieldNotes = existing.fieldNotes || '';

        record.fbVelo = existing.fbVelo || '';
        record.speedScore = Number(existing.speedScore) || 0;
        record.accuracy = Number(existing.accuracy) || 0;
        record.addPitches = Number(existing.addPitches) || 0;
        record.pitchingNotes = existing.pitchingNotes || '';

        record.popTime = existing.popTime || '';
        record.blockingMvt = Number(existing.blockingMvt) || 0;
        record.framing = Number(existing.framing) || 0;
        record.armStrength = Number(existing.armStrength) || 0;
        record.catchingNotes = existing.catchingNotes || '';

        record.masterNotes = existing.masterNotes || '';
      }
      updated.push(record);
    });

    evaluationRoster = updated;
    renderAllEvaluationTables();
  }

  // Render All Evaluation Tables
  function renderAllEvaluationTables() {
    renderMasterTable();
    renderHittingTable();
    renderDefenseTable();
    renderPitchingTable();
    renderCatchingTable();
  }

  // Render Master Summary Table
  function renderMasterTable() {
    if (!evalMasterTbody) return;
    if (!evaluationRoster.length) {
      evalMasterTbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-slate-500">No athletes registered yet. Athletes will appear here automatically once signups are received.</td></tr>`;
      return;
    }

    evalMasterTbody.innerHTML = evaluationRoster.map(p => {
      const hit = calcHittingTotal(p);
      const def = calcDefenseTotal(p);
      const pit = calcPitchingTotal(p);
      const cat = calcCatchingTotal(p);
      const pos = hit + def;
      const pc = calcPcCombined(p);

      return `
        <tr class="hover:bg-slate-800/40 transition-colors" data-id="${p.id}">
          <td class="p-3 pl-5">
            <input type="number" min="0" max="99" value="${p.jersey}" data-field="jersey"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-white font-mono font-bold text-center focus:ring-1 focus:ring-[#67DDF2] focus:outline-none">
          </td>
          <td class="p-3 font-bold text-white whitespace-nowrap">
            ${escapeHtml(p.playerName)}
          </td>
          <td class="p-3">
            <input type="text" value="${escapeHtml(p.primaryPos)}" data-field="primaryPos"
              class="eval-input w-24 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-slate-200 text-center font-bold text-xs focus:ring-1 focus:ring-[#67DDF2] focus:outline-none">
          </td>
          <td class="p-3 text-center font-bold text-[#67DDF2] cell-hitting-tot text-sm">${hit || '--'}</td>
          <td class="p-3 text-center font-bold text-[#67DDF2] cell-defense-tot text-sm">${def || '--'}</td>
          <td class="p-3 text-center font-bold text-[#F02AA8] cell-pitching-tot text-sm">${pit || '--'}</td>
          <td class="p-3 text-center font-bold text-[#F02AA8] cell-catching-tot text-sm">${cat || '--'}</td>
          <td class="p-3 text-center font-black text-[#B7F52A] cell-pos-tot text-sm">${pos || '--'}</td>
          <td class="p-3 text-center cell-pos-tier">${getPosTier(pos)}</td>
          <td class="p-3 text-center cell-pc-combined">
            <span class="font-black text-[#B7F52A] text-sm">${pc || '--'}</span>
            <div class="mt-0.5">${getPcTier(pc)}</div>
          </td>
          <td class="p-3 pr-5">
            <input type="text" value="${escapeHtml(p.masterNotes)}" placeholder="Evaluation remarks..." data-field="masterNotes"
              class="eval-input w-full min-w-[140px] px-2.5 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-[#67DDF2] focus:outline-none">
          </td>
        </tr>
      `;
    }).join('');

    updateMasterAverages();
  }

  function updateMasterAverages() {
    if (!evalMasterAvgRow) return;
    const count = evaluationRoster.length;
    if (!count) { evalMasterAvgRow.innerHTML = ''; return; }
    const totHit = evaluationRoster.reduce((sum, p) => sum + calcHittingTotal(p), 0);
    const totDef = evaluationRoster.reduce((sum, p) => sum + calcDefenseTotal(p), 0);
    const totPit = evaluationRoster.reduce((sum, p) => sum + calcPitchingTotal(p), 0);
    const totCat = evaluationRoster.reduce((sum, p) => sum + calcCatchingTotal(p), 0);
    const totPos = evaluationRoster.reduce((sum, p) => sum + calcPosTotal(p), 0);
    const totPc = evaluationRoster.reduce((sum, p) => sum + calcPcCombined(p), 0);

    evalMasterAvgRow.innerHTML = `
      <td class="p-3 pl-5" colspan="3">TRYOUT GROUP AVERAGE</td>
      <td class="p-3 text-center text-[#67DDF2]">${(totHit / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#67DDF2]">${(totDef / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#F02AA8]">${(totPit / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#F02AA8]">${(totCat / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#B7F52A] font-black">${(totPos / count).toFixed(1)}</td>
      <td class="p-3 text-center"></td>
      <td class="p-3 text-center text-[#B7F52A] font-black">${(totPc / count).toFixed(1)}</td>
      <td class="p-3 pr-5"></td>
    `;
  }

  // Render Hitting Table
  function renderHittingTable() {
    if (!evalHittingTbody) return;
    if (!evaluationRoster.length) {
      evalHittingTbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-500">No athletes loaded.</td></tr>`;
      return;
    }

    evalHittingTbody.innerHTML = evaluationRoster.map(p => {
      const tot = calcHittingTotal(p);
      return `
        <tr class="hover:bg-slate-800/40 transition-colors" data-id="${p.id}">
          <td class="p-3 pl-5 font-mono font-bold text-white">#${p.jersey}</td>
          <td class="p-3 font-bold text-white whitespace-nowrap">${escapeHtml(p.playerName)}</td>
          <td class="p-3">
            <select data-field="bats" class="eval-input px-2 py-1 rounded bg-[#17243B] border border-slate-700 text-[#B7F52A] font-bold text-xs">
              <option value="R" ${p.bats === 'R' ? 'selected' : ''}>R</option>
              <option value="L" ${p.bats === 'L' ? 'selected' : ''}>L</option>
              <option value="S" ${p.bats === 'S' ? 'selected' : ''}>S</option>
            </select>
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.bunting || ''}" data-field="bunting" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#67DDF2]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.swingMech || ''}" data-field="swingMech" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#67DDF2]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.hittingAbility || ''}" data-field="hittingAbility" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#67DDF2]">
          </td>
          <td class="p-3 text-center font-black text-[#67DDF2] text-sm cell-hitting-tot">${tot || '--'}</td>
          <td class="p-3 text-center cell-hitting-tier">${getHittingTier(tot)}</td>
          <td class="p-3 pr-5">
            <input type="text" value="${escapeHtml(p.cageNotes)}" placeholder="Cage remarks..." data-field="cageNotes"
              class="eval-input w-full min-w-[140px] px-2.5 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-[#67DDF2]">
          </td>
        </tr>
      `;
    }).join('');

    updateHittingAverages();
  }

  function updateHittingAverages() {
    if (!evalHittingAvgRow) return;
    const count = evaluationRoster.length;
    if (!count) { evalHittingAvgRow.innerHTML = ''; return; }
    const totBunt = evaluationRoster.reduce((sum, p) => sum + (Number(p.bunting) || 0), 0);
    const totSwing = evaluationRoster.reduce((sum, p) => sum + (Number(p.swingMech) || 0), 0);
    const totHitAb = evaluationRoster.reduce((sum, p) => sum + (Number(p.hittingAbility) || 0), 0);
    const totHit = evaluationRoster.reduce((sum, p) => sum + calcHittingTotal(p), 0);

    evalHittingAvgRow.innerHTML = `
      <td class="p-3 pl-5" colspan="3">HITTING GROUP AVERAGE</td>
      <td class="p-3 text-center text-[#67DDF2]">${(totBunt / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#67DDF2]">${(totSwing / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#67DDF2]">${(totHitAb / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#67DDF2] font-black">${(totHit / count).toFixed(1)}</td>
      <td class="p-3 text-center" colspan="2"></td>
    `;
  }

  // Render Defense Table
  function renderDefenseTable() {
    if (!evalDefenseTbody) return;
    if (!evaluationRoster.length) {
      evalDefenseTbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-slate-500">No athletes loaded.</td></tr>`;
      return;
    }

    evalDefenseTbody.innerHTML = evaluationRoster.map(p => {
      const tot = calcDefenseTotal(p);
      return `
        <tr class="hover:bg-slate-800/40 transition-colors" data-id="${p.id}">
          <td class="p-3 pl-5 font-mono font-bold text-white">#${p.jersey}</td>
          <td class="p-3 font-bold text-white whitespace-nowrap">${escapeHtml(p.playerName)}</td>
          <td class="p-3 text-slate-300 font-bold">${escapeHtml(p.primaryPos)}</td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.gbFootwork || ''}" data-field="gbFootwork" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#67DDF2]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.popFlies || ''}" data-field="popFlies" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#67DDF2]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.throwMove || ''}" data-field="throwMove" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#67DDF2]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.baseRunning || ''}" data-field="baseRunning" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#67DDF2]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.baseballIq || ''}" data-field="baseballIq" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#67DDF2]">
          </td>
          <td class="p-3 text-center font-black text-[#67DDF2] text-sm cell-defense-tot">${tot || '--'}</td>
          <td class="p-3 text-center cell-defense-tier">${getDefenseTier(tot)}</td>
          <td class="p-3 pr-5">
            <input type="text" value="${escapeHtml(p.fieldNotes)}" placeholder="Fielding remarks..." data-field="fieldNotes"
              class="eval-input w-full min-w-[140px] px-2.5 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-[#67DDF2]">
          </td>
        </tr>
      `;
    }).join('');

    updateDefenseAverages();
  }

  function updateDefenseAverages() {
    if (!evalDefenseAvgRow) return;
    const count = evaluationRoster.length;
    if (!count) { evalDefenseAvgRow.innerHTML = ''; return; }
    const totGb = evaluationRoster.reduce((sum, p) => sum + (Number(p.gbFootwork) || 0), 0);
    const totPop = evaluationRoster.reduce((sum, p) => sum + (Number(p.popFlies) || 0), 0);
    const totThr = evaluationRoster.reduce((sum, p) => sum + (Number(p.throwMove) || 0), 0);
    const totBase = evaluationRoster.reduce((sum, p) => sum + (Number(p.baseRunning) || 0), 0);
    const totIq = evaluationRoster.reduce((sum, p) => sum + (Number(p.baseballIq) || 0), 0);
    const totDef = evaluationRoster.reduce((sum, p) => sum + calcDefenseTotal(p), 0);

    evalDefenseAvgRow.innerHTML = `
      <td class="p-3 pl-5" colspan="3">INFIELD & IQ GROUP AVERAGE</td>
      <td class="p-3 text-center text-[#67DDF2]">${(totGb / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#67DDF2]">${(totPop / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#67DDF2]">${(totThr / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#67DDF2]">${(totBase / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#67DDF2]">${(totIq / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#67DDF2] font-black">${(totDef / count).toFixed(1)}</td>
      <td class="p-3 text-center" colspan="2"></td>
    `;
  }

  // Render Pitching Table
  function renderPitchingTable() {
    if (!evalPitchingTbody) return;
    if (!evaluationRoster.length) {
      evalPitchingTbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500">No athletes loaded.</td></tr>`;
      return;
    }

    evalPitchingTbody.innerHTML = evaluationRoster.map(p => {
      const tot = calcPitchingTotal(p);
      return `
        <tr class="hover:bg-slate-800/40 transition-colors" data-id="${p.id}">
          <td class="p-3 pl-5 font-mono font-bold text-white">#${p.jersey}</td>
          <td class="p-3 font-bold text-white whitespace-nowrap">${escapeHtml(p.playerName)}</td>
          <td class="p-3">
            <select data-field="throws" class="eval-input px-2 py-1 rounded bg-[#17243B] border border-slate-700 text-[#F02AA8] font-bold text-xs">
              <option value="R" ${p.throws === 'R' ? 'selected' : ''}>R</option>
              <option value="L" ${p.throws === 'L' ? 'selected' : ''}>L</option>
            </select>
          </td>
          <td class="p-3 text-center">
            <input type="text" value="${escapeHtml(p.fbVelo)}" data-field="fbVelo" placeholder="mph"
              class="eval-input w-16 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#F02AA8]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.speedScore || ''}" data-field="speedScore" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#F02AA8]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.accuracy || ''}" data-field="accuracy" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#F02AA8]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.addPitches || ''}" data-field="addPitches" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#F02AA8]">
          </td>
          <td class="p-3 text-center font-black text-[#F02AA8] text-sm cell-pitching-tot">${tot || '--'}</td>
          <td class="p-3 text-center cell-pitching-tier">${getPitchingTier(tot)}</td>
          <td class="p-3 pr-5">
            <input type="text" value="${escapeHtml(p.pitchingNotes)}" placeholder="Arm action / strike %..." data-field="pitchingNotes"
              class="eval-input w-full min-w-[140px] px-2.5 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-[#F02AA8] focus:outline-none">
          </td>
        </tr>
      `;
    }).join('');

    updatePitchingAverages();
  }

  function updatePitchingAverages() {
    if (!evalPitchingAvgRow) return;
    const count = evaluationRoster.length;
    if (!count) { evalPitchingAvgRow.innerHTML = ''; return; }
    const totSpeed = evaluationRoster.reduce((sum, p) => sum + (Number(p.speedScore) || 0), 0);
    const totAcc = evaluationRoster.reduce((sum, p) => sum + (Number(p.accuracy) || 0), 0);
    const totAddP = evaluationRoster.reduce((sum, p) => sum + (Number(p.addPitches) || 0), 0);
    const totPit = evaluationRoster.reduce((sum, p) => sum + calcPitchingTotal(p), 0);

    evalPitchingAvgRow.innerHTML = `
      <td class="p-3 pl-5" colspan="4">PITCHING GROUP AVERAGE</td>
      <td class="p-3 text-center text-[#F02AA8]">${(totSpeed / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#F02AA8]">${(totAcc / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#F02AA8]">${(totAddP / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#F02AA8] font-black">${(totPit / count).toFixed(1)}</td>
      <td class="p-3 text-center" colspan="2"></td>
    `;
  }

  // Render Catching Table
  function renderCatchingTable() {
    if (!evalCatchingTbody) return;
    if (!evaluationRoster.length) {
      evalCatchingTbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500">No athletes loaded.</td></tr>`;
      return;
    }

    evalCatchingTbody.innerHTML = evaluationRoster.map(p => {
      const tot = calcCatchingTotal(p);
      return `
        <tr class="hover:bg-slate-800/40 transition-colors" data-id="${p.id}">
          <td class="p-3 pl-5 font-mono font-bold text-white">#${p.jersey}</td>
          <td class="p-3 font-bold text-white whitespace-nowrap">${escapeHtml(p.playerName)}</td>
          <td class="p-3">
            <select data-field="throws" class="eval-input px-2 py-1 rounded bg-[#17243B] border border-slate-700 text-[#F02AA8] font-bold text-xs">
              <option value="R" ${p.throws === 'R' ? 'selected' : ''}>R</option>
              <option value="L" ${p.throws === 'L' ? 'selected' : ''}>L</option>
            </select>
          </td>
          <td class="p-3 text-center">
            <input type="text" value="${escapeHtml(p.popTime)}" data-field="popTime" placeholder="2.35"
              class="eval-input w-16 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#F02AA8]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.blockingMvt || ''}" data-field="blockingMvt" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#F02AA8]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.framing || ''}" data-field="framing" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#F02AA8]">
          </td>
          <td class="p-3 text-center">
            <input type="number" min="0" max="5" value="${p.armStrength || ''}" data-field="armStrength" placeholder="1-5"
              class="eval-input w-14 px-2 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-center font-bold text-white text-xs focus:ring-1 focus:ring-[#F02AA8]">
          </td>
          <td class="p-3 text-center font-black text-[#F02AA8] text-sm cell-catching-tot">${tot || '--'}</td>
          <td class="p-3 text-center cell-catching-tier">${getCatchingTier(tot)}</td>
          <td class="p-3 pr-5">
            <input type="text" value="${escapeHtml(p.catchingNotes)}" placeholder="Pop / stance / transfer..." data-field="catchingNotes"
              class="eval-input w-full min-w-[140px] px-2.5 py-1 rounded-lg bg-[#17243B] border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-[#F02AA8] focus:outline-none">
          </td>
        </tr>
      `;
    }).join('');

    updateCatchingAverages();
  }

  function updateCatchingAverages() {
    if (!evalCatchingAvgRow) return;
    const count = evaluationRoster.length;
    if (!count) { evalCatchingAvgRow.innerHTML = ''; return; }
    const totBlk = evaluationRoster.reduce((sum, p) => sum + (Number(p.blockingMvt) || 0), 0);
    const totFrm = evaluationRoster.reduce((sum, p) => sum + (Number(p.framing) || 0), 0);
    const totArm = evaluationRoster.reduce((sum, p) => sum + (Number(p.armStrength) || 0), 0);
    const totCat = evaluationRoster.reduce((sum, p) => sum + calcCatchingTotal(p), 0);

    evalCatchingAvgRow.innerHTML = `
      <td class="p-3 pl-5" colspan="4">CATCHING GROUP AVERAGE</td>
      <td class="p-3 text-center text-[#F02AA8]">${(totBlk / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#F02AA8]">${(totFrm / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#F02AA8]">${(totArm / count).toFixed(1)}</td>
      <td class="p-3 text-center text-[#F02AA8] font-black">${(totCat / count).toFixed(1)}</td>
      <td class="p-3 text-center" colspan="2"></td>
    `;
  }

  // Handle Live Score and Data Changes
  function setupLiveEvaluationInputs() {
    const bodies = [evalMasterTbody, evalHittingTbody, evalDefenseTbody, evalPitchingTbody, evalCatchingTbody];

    bodies.forEach(tbody => {
      if (!tbody) return;

      tbody.addEventListener('input', (e) => {
        const input = e.target;
        if (!input.classList.contains('eval-input')) return;

        const row = input.closest('tr');
        if (!row) return;

        const id = row.dataset.id;
        const field = input.dataset.field;
        const player = evaluationRoster.find(p => p.id === id);
        if (!player) return;

        let val = input.value;
        if (input.type === 'number') {
          val = val === '' ? 0 : Number(val);
        }
        player[field] = val;

        // Autosave to localStorage
        try {
          localStorage.setItem('badhops_tryout_eval_2026', JSON.stringify(evaluationRoster));
        } catch (err) {
          console.warn('Autosave error:', err);
        }

        // Dynamically update this row's totals & tiers in current view
        const hit = calcHittingTotal(player);
        const def = calcDefenseTotal(player);
        const pit = calcPitchingTotal(player);
        const cat = calcCatchingTotal(player);
        const pos = hit + def;
        const pc = calcPcCombined(player);

        const rowHitTot = row.querySelector('.cell-hitting-tot');
        if (rowHitTot) rowHitTot.textContent = hit || '--';
        const rowHitTier = row.querySelector('.cell-hitting-tier');
        if (rowHitTier) rowHitTier.innerHTML = getHittingTier(hit);

        const rowDefTot = row.querySelector('.cell-defense-tot');
        if (rowDefTot) rowDefTot.textContent = def || '--';
        const rowDefTier = row.querySelector('.cell-defense-tier');
        if (rowDefTier) rowDefTier.innerHTML = getDefenseTier(def);

        const rowPitTot = row.querySelector('.cell-pitching-tot');
        if (rowPitTot) rowPitTot.textContent = pit || '--';
        const rowPitTier = row.querySelector('.cell-pitching-tier');
        if (rowPitTier) rowPitTier.innerHTML = getPitchingTier(pit);

        const rowCatTot = row.querySelector('.cell-catching-tot');
        if (rowCatTot) rowCatTot.textContent = cat || '--';
        const rowCatTier = row.querySelector('.cell-catching-tier');
        if (rowCatTier) rowCatTier.innerHTML = getCatchingTier(cat);

        const rowPosTot = row.querySelector('.cell-pos-tot');
        if (rowPosTot) rowPosTot.textContent = pos || '--';
        const rowPosTier = row.querySelector('.cell-pos-tier');
        if (rowPosTier) rowPosTier.innerHTML = getPosTier(pos);

        const rowPcCombined = row.querySelector('.cell-pc-combined');
        if (rowPcCombined) {
          rowPcCombined.innerHTML = `<span class="font-black text-[#B7F52A] text-sm">${pc || '--'}</span><div class="mt-0.5">${getPcTier(pc)}</div>`;
        }

        // Also update Master row if not currently on master
        if (tbody !== evalMasterTbody && evalMasterTbody) {
          const masterRow = evalMasterTbody.querySelector(`tr[data-id="${id}"]`);
          if (masterRow) {
            const mHit = masterRow.querySelector('.cell-hitting-tot');
            if (mHit) mHit.textContent = hit || '--';
            const mDef = masterRow.querySelector('.cell-defense-tot');
            if (mDef) mDef.textContent = def || '--';
            const mPit = masterRow.querySelector('.cell-pitching-tot');
            if (mPit) mPit.textContent = pit || '--';
            const mCat = masterRow.querySelector('.cell-catching-tot');
            if (mCat) mCat.textContent = cat || '--';
            const mPos = masterRow.querySelector('.cell-pos-tot');
            if (mPos) mPos.textContent = pos || '--';
            const mPosTier = masterRow.querySelector('.cell-pos-tier');
            if (mPosTier) mPosTier.innerHTML = getPosTier(pos);
            const mPc = masterRow.querySelector('.cell-pc-combined');
            if (mPc) mPc.innerHTML = `<span class="font-black text-[#B7F52A] text-sm">${pc || '--'}</span><div class="mt-0.5">${getPcTier(pc)}</div>`;
          }
        }

        // Update current station average rows
        updateMasterAverages();
        updateHittingAverages();
        updateDefenseAverages();
        updatePitchingAverages();
        updateCatchingAverages();
      });
    });
  }

  setupLiveEvaluationInputs();

  // Sync Athletes Button
  if (evalSyncAthletesBtn) {
    evalSyncAthletesBtn.addEventListener('click', () => {
      syncEvaluationRoster();
      alert(`Synchronized ${evaluationRoster.length} registered athletes into the Evaluation Matrix!`);
    });
  }

  // Save Scores Button (Cloud & Local)
  if (evalSaveBtn) {
    evalSaveBtn.addEventListener('click', async () => {
      evalSaveBtn.disabled = true;
      if (evalSaveBtnText) evalSaveBtnText.textContent = 'Saving...';

      try {
        localStorage.setItem('badhops_tryout_eval_2026', JSON.stringify(evaluationRoster));

        // Save to Firestore
        await setDoc(doc(db, 'tryout_evaluations', 'nov21_2026'), {
          athletes: evaluationRoster,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.email || 'Coach'
        }, { merge: true });

        if (evalSaveBtnText) evalSaveBtnText.textContent = 'Saved to Cloud!';
        setTimeout(() => {
          if (evalSaveBtnText) evalSaveBtnText.textContent = 'Save Scores';
          evalSaveBtn.disabled = false;
        }, 2500);
      } catch (err) {
        console.error('Error saving evaluations:', err);
        if (evalSaveBtnText) evalSaveBtnText.textContent = 'Saved Locally!';
        setTimeout(() => {
          if (evalSaveBtnText) evalSaveBtnText.textContent = 'Save Scores';
          evalSaveBtn.disabled = false;
        }, 2500);
      }
    });
  }

  // Generate Excel / CSV Content Matching User's Template
  function generateEvaluationMatrixCsv() {
    const lines = [];

    // 1. MASTER EVALUATION SUMMARY
    lines.push('BAD HOPS 11U — MASTER EVALUATION SUMMARY,,,,,,,,,,');
    lines.push('"Date: Nov 21, 2026   |   Location: North Natomas Regional Park (Field 2)   |   Enter Roster Here — Station Tabs Auto-Sync",,,,,,,,,,');
    lines.push(',,,,,,,,,,');
    lines.push('PLAYER ROSTER,,,STATION SCORES (AUTO-PULLED),,,,COMPOSITE TOTALS & ROSTER TIER,,,');
    lines.push('Jersey #,Player Name,Primary Pos,"Hitting\n(Max 15)","Field & IQ\n(Max 25)","Pitching\n(Max 15)","Catching\n(Max 15)","POS TOTAL\n(Max 40)",Pos Tier,"P/C COMBINED\n(Max 55)",Coach Notes');

    let totHit = 0, totDef = 0, totPit = 0, totCat = 0, totPos = 0, totPc = 0, count = evaluationRoster.length;

    evaluationRoster.forEach(p => {
      const hit = calcHittingTotal(p);
      const def = calcDefenseTotal(p);
      const pit = calcPitchingTotal(p);
      const cat = calcCatchingTotal(p);
      const pos = hit + def;
      const pc = calcPcCombined(p);
      const posTierText = pos >= 32 ? 'Core Lock' : (pos >= 25 ? 'Travel Contributor' : (pos > 0 ? 'Rec / Academy' : ''));

      totHit += hit; totDef += def; totPit += pit; totCat += cat; totPos += pos; totPc += pc;

      lines.push([
        escapeCsvCell(p.jersey),
        escapeCsvCell(p.playerName),
        escapeCsvCell(p.primaryPos),
        hit || '',
        def || '',
        pit || '',
        cat || '',
        pos || '',
        escapeCsvCell(posTierText),
        pc || '',
        escapeCsvCell(p.masterNotes)
      ].join(','));
    });

    const avgHit = count ? (totHit / count).toFixed(1) : '0.0';
    const avgDef = count ? (totDef / count).toFixed(1) : '0.0';
    const avgPit = count ? (totPit / count).toFixed(1) : '0.0';
    const avgCat = count ? (totCat / count).toFixed(1) : '0.0';
    const avgPos = count ? (totPos / count).toFixed(1) : '0.0';
    const avgPc = count ? (totPc / count).toFixed(1) : '0.0';

    lines.push(`TRYOUT GROUP AVERAGE,,,${avgHit},${avgDef},${avgPit},${avgCat},${avgPos},,${avgPc},`);
    lines.push(',,,,,,,,,,');
    lines.push('HOW IT WORKS:,,"Enter Jersey #, Name, and Primary Pos on this Master Summary tab. All 4 station sheets auto-populate player names and feed scores back here.",,,,,,,,');
    lines.push('POSITION CUTOFFS:,,32–40 pts = Core Lock (Up-the-middle / Top of order)   |   25–31 pts = Travel Roster Contributor   |   <25 pts = Winter Academy / Rec,,,,,,,,');
    lines.push('P/C CUTOFFS:,,44–55 pts = Core Pitcher/Catcher Lock   |   36–43 pts = Travel Roster P/C   |   <36 pts = Developmental P/C,,,,,,,,');

    // 2. HITTING & BUNTING
    lines.push('BAD HOPS 11U — HITTING & BUNTING EVALUATION (BATTING CAGE),,,,,,,,');
    lines.push('12-Pitch Cage Round: 3 Bunt Attempts (Sac/Drag) + 4 Front-Toss Swings + 5 Machine/Live-Arm Swings,,,,,,,,');
    lines.push(',,,,,,,,');
    lines.push('PLAYER INFO,,,CAGE EVALUATION METRICS (15 PTS MAX),,,,STATION SUMMARY,');
    lines.push('Jersey #,Player Name,"Bats\n(R/L/S)","Bunting\n(1-5)","Swing Mech\n(1-5)","Hitting Ability\n(1-5)","HITTING TOT\n(Max 15)",Hitting Tier,Cage Coach Notes');

    let totBunt = 0, totSwing = 0, totHitAb = 0;
    evaluationRoster.forEach(p => {
      const tot = calcHittingTotal(p);
      const tier = tot >= 12 ? 'Elite Hitter' : (tot >= 9 ? 'Travel Avg' : (tot > 0 ? 'Developing' : ''));
      totBunt += Number(p.bunting) || 0;
      totSwing += Number(p.swingMech) || 0;
      totHitAb += Number(p.hittingAbility) || 0;

      lines.push([
        escapeCsvCell(p.jersey),
        escapeCsvCell(p.playerName),
        escapeCsvCell(p.bats),
        p.bunting || '',
        p.swingMech || '',
        p.hittingAbility || '',
        tot || '',
        escapeCsvCell(tier),
        escapeCsvCell(p.cageNotes)
      ].join(','));
    });

    const avgBunt = count ? (totBunt / count).toFixed(1) : '0.0';
    const avgSwing = count ? (totSwing / count).toFixed(1) : '0.0';
    const avgHitAb = count ? (totHitAb / count).toFixed(1) : '0.0';
    lines.push(`HITTING GROUP AVERAGE,,,${avgBunt},${avgSwing},${avgHitAb},${avgHit},,`);
    lines.push(',,,,,,,,');
    lines.push('BUNTING (3 Pitches):,,"1 = Stabs/misses/pops up 2+   |   3 = Squares early, deadens 2/3 in fair territory   |   5 = Cushions down either line on command",,,,,,');
    lines.push('SWING MECHANICS:,,"1 = Bat drag/lunging/off-balance   |   3 = Connected load, direct path, balanced finish   |   5 = Explosive hip-shoulder separation, stays inside",,,,,,');
    lines.push('HITTING ABILITY:,,"1 = Weak pull rollovers/whiffs   |   3 = Barrels 60%+ strikes, middle-field line drives   |   5 = Hard gap-to-gap line drives, adjusts to location",,,,,,');

    // 3. INFIELD, DEFENSE, BASE RUNNING & IQ
    lines.push('"BAD HOPS 11U — INFIELD, DEFENSE, BASE RUNNING & IQ EVALUATION",,,,,,,,,,');
    lines.push('"5 Ground Balls (2 Straight, 2 Forehand/Backhand, 1 Slow Roller) + 4 Fly Balls + Timed Bases + 3 Situational 50/70 IQ Prompts",,,,,,,,,,');
    lines.push(',,,,,,,,,,');
    lines.push('PLAYER INFO,,,FIELDING & ATHLETICISM (20 PTS MAX),,,,,SITUATIONAL IQ & TOTAL (25 PTS MAX),,');
    lines.push('Jersey #,Player Name,Primary Pos,"GB & Footwork\n(1-5)","Pop Flies\n(1-5)","Throw (Move)\n(1-5)","Base Running\n(1-5)","Baseball IQ\n(1-5)","FIELD & IQ TOT\n(Max 25)",Defense Tier,Field Coach Notes');

    let totGb = 0, totPop = 0, totThr = 0, totBase = 0, totIq = 0;
    evaluationRoster.forEach(p => {
      const tot = calcDefenseTotal(p);
      const tier = tot >= 20 ? 'Elite Defender' : (tot >= 15 ? 'Solid Travel' : (tot > 0 ? 'Developing' : ''));
      totGb += Number(p.gbFootwork) || 0;
      totPop += Number(p.popFlies) || 0;
      totThr += Number(p.throwMove) || 0;
      totBase += Number(p.baseRunning) || 0;
      totIq += Number(p.baseballIq) || 0;

      lines.push([
        escapeCsvCell(p.jersey),
        escapeCsvCell(p.playerName),
        escapeCsvCell(p.primaryPos),
        p.gbFootwork || '',
        p.popFlies || '',
        p.throwMove || '',
        p.baseRunning || '',
        p.baseballIq || '',
        tot || '',
        escapeCsvCell(tier),
        escapeCsvCell(p.fieldNotes)
      ].join(','));
    });

    const avgGb = count ? (totGb / count).toFixed(1) : '0.0';
    const avgPop = count ? (totPop / count).toFixed(1) : '0.0';
    const avgThr = count ? (totThr / count).toFixed(1) : '0.0';
    const avgBase = count ? (totBase / count).toFixed(1) : '0.0';
    const avgIq = count ? (totIq / count).toFixed(1) : '0.0';
    lines.push(`INFIELD & IQ GROUP AVERAGE,,,${avgGb},${avgPop},${avgThr},${avgBase},${avgIq},${avgDef},,`);
    lines.push(',,,,,,,,,,');
    lines.push('GB & POP FLIES:,,"GB: 1 = Flat-footed/deep | 3 = Right-left through ball, soft hands | 5 = Prep step, fields on run.   Pop Fly: 3 = Drop-step, two hands above shoulder.",,,,,,,,');
    lines.push('THROW & BASES:,,"Throw: 3 = Quick exchange, 4-seam grip, chest-high on run | 5 = Multi-slot carry.   Bases: 3 = Explosive 1st 3 steps, tight turns, 70-ft secondary lead.",,,,,,,,');
    lines.push('BASEBALL IQ (50/70):,,"Test 3 live/verbal scenarios (e.g., R1 1-out GB to SS; Bases loaded 2-outs; cutoff alignment). 1 = Freezes | 3 = Knows force/cutoffs | 5 = Anticipates pre-pitch.",,,,,,,,');

    // 4. PITCHING
    lines.push('BAD HOPS 11U — PITCHING EVALUATION (10-PITCH BULLPEN),,,,,,,,,');
    lines.push('6 Fastballs + 4 Secondary/Off-Speed Pitches (50-ft Mound)   |   Enter Jersey # for Pitchers Testing,,,,,,,,,');
    lines.push(',,,,,,,,,');
    lines.push('PITCHER INFO,,,BULLPEN METRICS (15 PTS MAX),,,,,PITCHING SUMMARY,');
    lines.push('Jersey #,Player Name,"Throws\n(R/L)","FB Velo\n(MPH)","Speed Score\n(1-5)","Accuracy\n(1-5)","Add. Pitches\n(1-5)","PITCHING TOT\n(Max 15)",Pitching Tier,Pitching Coach Notes (Arm Action / Strike % / Secondary)');

    let totSpeed = 0, totAcc = 0, totAddP = 0;
    evaluationRoster.forEach(p => {
      const tot = calcPitchingTotal(p);
      const tier = tot >= 12 ? 'Rotation Ace' : (tot >= 9 ? 'Travel Bullpen' : (tot > 0 ? 'Developing' : ''));
      totSpeed += Number(p.speedScore) || 0;
      totAcc += Number(p.accuracy) || 0;
      totAddP += Number(p.addPitches) || 0;

      lines.push([
        escapeCsvCell(p.jersey),
        escapeCsvCell(p.playerName),
        escapeCsvCell(p.throws),
        escapeCsvCell(p.fbVelo),
        p.speedScore || '',
        p.accuracy || '',
        p.addPitches || '',
        tot || '',
        escapeCsvCell(tier),
        escapeCsvCell(p.pitchingNotes)
      ].join(','));
    });

    const avgSpeed = count ? (totSpeed / count).toFixed(1) : '0.0';
    const avgAcc = count ? (totAcc / count).toFixed(1) : '0.0';
    const avgAddP = count ? (totAddP / count).toFixed(1) : '0.0';
    lines.push(`PITCHING GROUP AVERAGE,,,,${avgSpeed},${avgAcc},${avgAddP},${avgPit},,`);
    lines.push(',,,,,,,,,');
    lines.push('SPEED (VELOCITY):,,1 = <46 mph (arm-only)   |   3 (Travel Avg) = 48–53 mph (uses lower half)   |   5 (Elite 11U) = 55+ mph (clean kinetic chain & hip drive),,,,,,,');
    lines.push('ACCURACY (COMMAND):,,"1 = <40% strikes (erratic misses)   |   3 (Travel Avg) = 55–65% strikes around zone   |   5 (Elite 11U) = 70%+ strikes, works down & hits corners",,,,,,,');
    lines.push('ADDITIONAL PITCHES:,,"1 = Fastball only (or unsafe/uncontrolled breaking ball)   |   3 = Reliable changeup w/ arm-speed deception   |   5 = Plus CH or safe, commanded CB/SL",,,,,,,');

    // 5. CATCHING
    lines.push('"BAD HOPS 11U — CATCHING EVALUATION (BLOCKING, FRAMING & ARM)",,,,,,,,,');
    lines.push('5 Dirt Blocks + 5 Borderline Frames + 3 Pop-Time Throws to 2B (70-ft Bases)   |   Enter Jersey # for Catchers Testing,,,,,,,,,');
    lines.push(',,,,,,,,,');
    lines.push('CATCHER INFO,,,CATCHING METRICS (15 PTS MAX),,,,,CATCHING SUMMARY,');
    lines.push('Jersey #,Player Name,"Throws\n(R/L)","Pop Time\n(Sec)","Blocking/Mvt\n(1-5)","Framing\n(1-5)","Arm Strength\n(1-5)","CATCHING TOT\n(Max 15)",Catching Tier,Catching Coach Notes (Stance / Exchange / Footwork)');

    let totBlk = 0, totFrm = 0, totArm = 0;
    evaluationRoster.forEach(p => {
      const tot = calcCatchingTotal(p);
      const tier = tot >= 12 ? 'Core Catcher' : (tot >= 9 ? 'Travel Backup' : (tot > 0 ? 'Developing' : ''));
      totBlk += Number(p.blockingMvt) || 0;
      totFrm += Number(p.framing) || 0;
      totArm += Number(p.armStrength) || 0;

      lines.push([
        escapeCsvCell(p.jersey),
        escapeCsvCell(p.playerName),
        escapeCsvCell(p.throws),
        escapeCsvCell(p.popTime),
        p.blockingMvt || '',
        p.framing || '',
        p.armStrength || '',
        tot || '',
        escapeCsvCell(tier),
        escapeCsvCell(p.catchingNotes)
      ].join(','));
    });

    const avgBlk = count ? (totBlk / count).toFixed(1) : '0.0';
    const avgFrm = count ? (totFrm / count).toFixed(1) : '0.0';
    const avgArm = count ? (totArm / count).toFixed(1) : '0.0';
    lines.push(`CATCHING GROUP AVERAGE,,,,${avgBlk},${avgFrm},${avgArm},${avgCat},,`);
    lines.push(',,,,,,,,,');
    lines.push('BLOCKING & MOVEMENT:,,"1 = Reaches w/ glove, kicks balls away   |   3 (Travel Avg) = Drops knees quickly, keeps within reach   |   5 (Elite) = Explodes laterally, smothers dead",,,,,,,');
    lines.push('FRAMING (RECEIVING):,,"1 = Stabs/pulls borderline strikes out   |   3 (Travel Avg) = Quiet glove, sticks borderline pitches   |   5 (Elite) = Smooth bottom-up presentation, quiet body",,,,,,,');
    lines.push('ARM STRENGTH (70-FT):,,"1 = Rainbow throws, >2.60s pop time   |   3 (Travel Avg) = Clean transfer, accurate to 2B (~2.30–2.50s pop)   |   5 (Elite) = Firm line-drive carry (<2.25s pop)",,,,,,,');

    return lines.join('\r\n');
  }

  // Export CSV Button Event
  if (evalExportCsvBtn) {
    evalExportCsvBtn.addEventListener('click', () => {
      const csvData = generateEvaluationMatrixCsv();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bad_Hops_11U_Tryouts_Master_Evaluation_Nov21_2026.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
