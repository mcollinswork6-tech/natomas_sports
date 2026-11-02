// Admin Portal Controller for Natomas Sport Association
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
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
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const tableBody = document.getElementById('registrations-tbody');

  // DOM Elements - Metrics
  const statTotal = document.getElementById('stat-total');
  const stat11u = document.getElementById('stat-11u');
  const statNew = document.getElementById('stat-new');
  const statConfirmed = document.getElementById('stat-confirmed');

  // DOM Elements - Modal
  const playerModal = document.getElementById('player-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalPlayerName = document.getElementById('modal-player-name');
  const modalDocId = document.getElementById('modal-doc-id');
  const modalDivisionBadge = document.getElementById('modal-division-badge');
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
  const modalNotes = document.getElementById('modal-notes');
  const modalAdminNotes = document.getElementById('modal-admin-notes');
  const modalStatusSelect = document.getElementById('modal-status-select');
  const modalSaveNotesBtn = document.getElementById('modal-save-notes-btn');
  const saveNotesFeedback = document.getElementById('save-notes-feedback');

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
  // 3. Google Sign In
  // -------------------------------------------------------------
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      loginError.classList.add('hidden');
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error('Google Sign-in error:', err);
        loginError.textContent = getFriendlyAuthError(err.code, err.message);
        loginError.classList.remove('hidden');
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

    if (statTotal) statTotal.textContent = total;
    if (stat11u) stat11u.textContent = count11u;
    if (statNew) statNew.textContent = countNew;
    if (statConfirmed) statConfirmed.textContent = countConfirmed;
  }

  // -------------------------------------------------------------
  // 7. Filters & Search
  // -------------------------------------------------------------
  function applyFilters() {
    const term = (searchInput?.value || '').toLowerCase().trim();
    const divFilter = filterDivision?.value || 'all';
    const statFilter = filterStatus?.value || 'all';

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

      return `
        <tr class="hover:bg-[#141820]/60 transition-colors">
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

          <!-- DOB -->
          <td class="p-4 text-slate-300 font-medium">
            ${escapeHtml(reg.dob || '--')}
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
          <td class="p-4 pr-6 text-right space-x-2">
            <button type="button" class="view-player-btn px-3 py-1.5 rounded-lg bg-[#17243B] hover:bg-[#202f4a] border border-[#67DDF2]/30 text-[#67DDF2] font-bold text-xs transition-colors" data-id="${reg.id}">
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
    if (modalPlayerName) modalPlayerName.textContent = reg.playerName || 'Unknown Player';
    if (modalDocId) modalDocId.textContent = `#${id}`;
    if (modalDivisionBadge) modalDivisionBadge.textContent = reg.division || 'Bad Hops 11U';
    if (modalStatusBadge) modalStatusBadge.textContent = (reg.status || 'new').toUpperCase();
    if (modalDob) modalDob.textContent = reg.dob || '--';
    if (modalPositions) modalPositions.textContent = reg.positions || 'N/A';
    if (modalBatsThrows) modalBatsThrows.textContent = reg.batsThrows || 'R/R';
    if (modalZip) modalZip.textContent = reg.zipCode || '--';
    if (modalExperience) modalExperience.textContent = reg.experience || 'None specified';
    if (modalParentName) modalParentName.textContent = reg.parentName || '--';
    if (modalPhone) modalPhone.textContent = reg.phone || '--';
    if (modalEmail) modalEmail.textContent = reg.email || '--';
    if (modalCallLink) modalCallLink.href = `tel:${reg.phone || ''}`;
    if (modalEmailLink) modalEmailLink.href = `mailto:${reg.email || ''}`;
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

      const rows = registrations.map(r => [
        r.id || '',
        r.playerName || '',
        r.dob || '',
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
      ]);

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
      default:
        return defaultMsg || 'Authentication failed. Please try again.';
    }
  }
});
