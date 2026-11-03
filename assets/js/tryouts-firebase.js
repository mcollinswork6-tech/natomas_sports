// Tryouts Registration Firebase Handler for Natomas Sport Association & Bad Hops 11U
import { db, collection, addDoc, serverTimestamp } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('tryout-form');
  if (!form) return;

  const submitBtn = document.getElementById('submit-btn');
  const alertBox = document.getElementById('form-alert');
  const successCard = document.getElementById('form-success-card');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous alert
    if (alertBox) {
      alertBox.classList.add('hidden');
      alertBox.textContent = '';
    }

    // Collect values
    const playerFirstName = document.getElementById('playerFirstName')?.value.trim() || '';
    const playerLastName = document.getElementById('playerLastName')?.value.trim() || '';
    const playerName = `${playerFirstName} ${playerLastName}`.trim();

    const dob = document.getElementById('dob')?.value.trim();
    const division = document.getElementById('division')?.value.trim();
    const positions = document.getElementById('positions')?.value.trim() || 'N/A';
    const batsThrows = document.getElementById('batsThrows')?.value.trim() || 'R/R';
    const experience = document.getElementById('experience')?.value.trim() || 'None specified';

    const parentFirstName = document.getElementById('parentFirstName')?.value.trim() || '';
    const parentLastName = document.getElementById('parentLastName')?.value.trim() || '';
    const parentName = `${parentFirstName} ${parentLastName}`.trim();

    const phone = document.getElementById('phone')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const zipCode = document.getElementById('zipCode')?.value.trim();
    const notes = document.getElementById('notes')?.value.trim() || '';
    const waiverAccepted = document.getElementById('waiver')?.checked === true;

    // Client-side validation checks
    if (!playerFirstName || !playerLastName || !dob || !division || !parentFirstName || !parentLastName || !phone || !email || !zipCode) {
      showAlert('Please fill in all required fields marked with an asterisk (*).', 'error');
      return;
    }

    if (!waiverAccepted) {
      showAlert('You must accept the athletic liability waiver to proceed with tryout registration.', 'error');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Please enter a valid email address.', 'error');
      return;
    }

    // Prepare UI for submission
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg> Saving Registration to Firebase...
    `;

    try {
      const registrationData = {
        playerName,
        dob,
        division,
        positions,
        batsThrows,
        experience,
        parentName,
        phone,
        email,
        zipCode,
        notes,
        waiverAccepted: true,
        status: 'new',
        adminNotes: '',
        submittedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'tryout_registrations'), registrationData);
      const referenceId = docRef.id;

      // Show success UI
      form.classList.add('hidden');
      if (successCard) {
        successCard.classList.remove('hidden');
        const refSpan = document.getElementById('confirmation-ref-id');
        if (refSpan) refSpan.textContent = referenceId;
        const nameSpan = document.getElementById('confirmation-player-name');
        if (nameSpan) nameSpan.textContent = playerName;
        const divSpan = document.getElementById('confirmation-division');
        if (divSpan) divSpan.textContent = division;

        // Smooth scroll to success message
        successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

    } catch (error) {
      console.error('Error saving tryout registration to Firestore:', error);
      showAlert(`Unable to submit registration: ${error.message || 'Please check your connection and try again.'}`, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

  function showAlert(message, type = 'error') {
    if (!alertBox) return;
    alertBox.className = type === 'error' 
      ? 'p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-sm font-semibold mb-6 animate-fade-in'
      : 'p-4 rounded-xl bg-[#67DDF2]/20 border border-[#67DDF2]/50 text-[#67DDF2] text-sm font-semibold mb-6 animate-fade-in';
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
