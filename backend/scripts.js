// Device address validation + UI state + Paystack integration
(function () {
  const input = document.getElementById('password'); // labeled "Device address" in the UI
  const emailInput = document.getElementById('email');
  const button = document.querySelector('[data-purpose="login-button"]');
  const statusEl = document.getElementById('address-status');
  const spacingEl = document.getElementById('proceed-spacing');
  const paymentInfoSection = document.getElementById('payment-info-section');
  const paymentAmountDisplay = document.getElementById('payment-amount-display');
  const form = document.querySelector('form');

  if (!input || !button || !statusEl || !spacingEl) return;

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const contractIdFromUrl = urlParams.get('contractId');
  const deviceFromUrl = urlParams.get('device');
  const emailFromUrl = urlParams.get('email');

  // Pre-fill fields if available from URL
  if (deviceFromUrl) {
    input.value = deviceFromUrl;
  }
  if (emailFromUrl) {
    emailInput.value = emailFromUrl;
  }

  const isValidDeviceAddress = (value) => {
    const v = String(value || '').trim();
    // Trial rule: 0x + 40 hex chars
    return /^0x[0-9a-fA-F]{40}$/.test(v);
  };

  // Fetch contract details to show payment amount
  const fetchContractDetails = async (contractId) => {
    try {
      const response = await fetch(`/api/v1/contracts/${contractId}`);
      if (!response.ok) {
        console.error('Failed to fetch contract details');
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching contract:', error);
      return null;
    }
  };

  const setState = (valid) => {
    // enable/disable proceed button
    button.disabled = !valid;

    // update status text
    statusEl.textContent = valid
      ? 'Ready to proceed to payment'
      : 'Enter a valid device address';

    // animate spacing between input and button
    if (valid) {
      statusEl.classList.remove('text-gray-500');
      statusEl.classList.add('text-gray-500');
      spacingEl.style.height = 'auto';
      spacingEl.style.height = '72px';
      spacingEl.style.opacity = '1';
      paymentInfoSection.classList.remove('hidden');
    } else {
      spacingEl.style.height = '0px';
      spacingEl.style.opacity = '0';
      paymentInfoSection.classList.add('hidden');
    }
  };

  const onChange = () => {
    const valid = isValidDeviceAddress(input.value);
    setState(valid);
  };

  input.addEventListener('input', onChange);
  input.addEventListener('blur', onChange);

  // Handle form submission - initialize Paystack payment
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const deviceAddress = input.value.trim();
    const email = emailInput.value.trim();

    if (!isValidDeviceAddress(deviceAddress) || !email) {
      alert('Please fill in all required fields');
      return;
    }

    // Load Paystack script if not already loaded
    if (!window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => initPaystackPayment(deviceAddress, email, contractIdFromUrl);
      document.body.appendChild(script);
    } else {
      initPaystackPayment(deviceAddress, email, contractIdFromUrl);
    }
  });

  // Initialize Paystack payment
  const initPaystackPayment = (deviceAddress, email, contractId) => {
    // Get payment amount from contract (in frontend, we'll use a default or fetch it)
    // For now, using a default monthly payment amount
    const paymentAmount = 50000; // Amount in kobo (₦500.00)

    const handler = PaystackPop.setup({
      key: 'pk_live_994fe2e9209103bf98de6fcd47ad430b4d9bdda7', // Replace with your Paystack public key from env
      email: email,
      amount: paymentAmount,
      currency: 'GHS',
      ref: `${contractId}-${Date.now()}`,
      metadata: {
        deviceAddress: deviceAddress,
        contractId: contractId
      },
      onClose: () => {
        alert('Payment window closed.');
      },
      onSuccess: (response) => {
        // Payment successful, show success message
        showPaymentSuccess(response, deviceAddress, email, contractId);
      }
    });

    handler.openIframe();
  };

  const showPaymentSuccess = (response, deviceAddress, email, contractId) => {
    // Hide form and show success message
    form.classList.add('hidden');
    
    const successDiv = document.createElement('div');
    successDiv.className = 'space-y-6 text-center';
    successDiv.innerHTML = `
      <div class="mb-6">
        <svg class="w-16 h-16 mx-auto text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h2 class="text-3xl font-bold text-black mb-2">Payment Successful!</h2>
        <p class="text-gray-600 text-lg">Reference: ${response.reference}</p>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left">
        <h3 class="font-bold text-gray-800 mb-3">What's next?</h3>
        <ol class="space-y-2 text-sm text-gray-700">
          <li class="flex items-start">
            <span class="font-bold mr-3">1.</span>
            <span>Check your email at <strong>${email}</strong> for an unlock code</span>
          </li>
          <li class="flex items-start">
            <span class="font-bold mr-3">2.</span>
            <span>Return to your locked device and enter the code</span>
          </li>
          <li class="flex items-start">
            <span class="font-bold mr-3">3.</span>
            <span>Your device will unlock and you're all set!</span>
          </li>
        </ol>
      </div>

      <div class="pt-6 border-t border-gray-200">
        <p class="text-xs text-gray-500 mb-3">Didn't receive the code?</p>
        <button onclick="location.reload()" class="text-sm text-blue-600 hover:text-blue-800 font-semibold underline">Try again</button>
      </div>
    `;

    const formParent = form.parentElement;
    form.remove();
    formParent.appendChild(successDiv);
  };

  // Initial state
  setState(isValidDeviceAddress(input.value));

  // If contract ID is in URL, fetch and display details
  if (contractIdFromUrl) {
    fetchContractDetails(contractIdFromUrl).then(contract => {
      if (contract && contract.payment_amount) {
        // Format amount for display (assuming backend returns in kobo or naira)
        const amountInNaira = contract.payment_amount / 100;
        paymentAmountDisplay.textContent = `₦${amountInNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
      }
    });
  }
})();


