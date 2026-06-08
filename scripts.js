// Device address validation + UI state + Paystack integration
(function () {
  const input = document.getElementById('password');
  const emailInput = document.getElementById('email');
  const button = document.querySelector('[data-purpose="login-button"]');
  const statusEl = document.getElementById('address-status');
  const contractStatusEl = document.getElementById('contract-status');
  const spacingEl = document.getElementById('proceed-spacing');
  const paymentInfoSection = document.getElementById('payment-info-section');
  const paymentAmountDisplay = document.getElementById('payment-amount-display');
  const form = document.querySelector('form');

  let contractDetails = null;
  let appConfigPromise = null;

  if (!input || !emailInput || !button || !statusEl || !spacingEl || !form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const contractIdFromUrl = urlParams.get('contractId');
  const deviceFromUrl = urlParams.get('device');
  const emailFromUrl = urlParams.get('email');

  if (deviceFromUrl) {
    input.value = deviceFromUrl;
  }

  if (emailFromUrl) {
    emailInput.value = emailFromUrl;
  }

  const isValidDeviceAddress = (value) => {
    const normalized = String(value || '').trim();
    return /^0x[0-9a-fA-F]{40}$/.test(normalized)
      || /^[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}$/.test(normalized);
  };

  const isValidEmail = (value) => {
    const normalized = String(value || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  };

  const getAppConfig = async () => {
    if (!appConfigPromise) {
      appConfigPromise = fetch('/api/v1/config').then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load payment configuration');
        }

        return response.json();
      });
    }

    return appConfigPromise;
  };

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

  const setState = (valid, message = '') => {
    button.disabled = !valid;
    statusEl.textContent = valid ? 'Ready to proceed to payment' : 'Enter a valid device address';
    contractStatusEl.textContent = message;

    if (valid) {
      spacingEl.style.height = '72px';
      spacingEl.style.opacity = '1';
      paymentInfoSection.classList.remove('hidden');
    } else {
      spacingEl.style.height = '0px';
      spacingEl.style.opacity = '0';
      paymentInfoSection.classList.add('hidden');
    }
  };

  const loadPaystack = () => new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Paystack'));
    document.body.appendChild(script);
  });

  const showPaymentSuccess = (response, email) => {
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

  const initPaystackPayment = async (deviceAddress, email, contractId) => {
    const config = await getAppConfig();

    if (!config.paystackPublicKey) {
      alert('Payment is not configured yet. Please add PAYSTACK_PUBLIC_KEY on the server.');
      return;
    }

    const paymentAmount = contractDetails?.payment_amount
      ? Math.round(Number(contractDetails.payment_amount) * 100)
      : 50000;

    const handler = PaystackPop.setup({
      key: config.paystackPublicKey,
      email,
      amount: paymentAmount,
      currency: config.paymentCurrency || 'GHS',
      ref: `${contractId || 'payment'}-${Date.now()}`,
      metadata: {
        contract_id: contractId,
        device_address: deviceAddress
      },
      callback: (response) => {
        showPaymentSuccess(response, email);
      },
      onClose: () => {
        alert('Payment window closed.');
      }
    });

    handler.openIframe();
  };

  const getFormValidity = () => {
    const deviceValid = isValidDeviceAddress(input.value);
    const emailValid = isValidEmail(emailInput.value);
    const contractLoaded = contractIdFromUrl ? Boolean(contractDetails) : true;

    if (!deviceValid) {
      return { valid: false, message: 'Enter a valid device address' };
    }

    if (!emailValid) {
      return { valid: false, message: 'Enter a valid email address' };
    }

    if (!contractLoaded) {
      return { valid: false, message: 'Unable to load contract details' };
    }

    return { valid: true, message: '' };
  };

  const onChange = () => {
    const { valid, message } = getFormValidity();
    setState(valid, message);
  };

  input.addEventListener('input', onChange);
  input.addEventListener('blur', onChange);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const deviceAddress = input.value.trim();
    const email = emailInput.value.trim();
    const { valid, message } = getFormValidity();

    if (!valid) {
      alert(message || 'Please fill in all required fields');
      return;
    }

    try {
      button.disabled = true;
      await loadPaystack();
      await initPaystackPayment(deviceAddress, email, contractIdFromUrl);
    } catch (error) {
      console.error(error);
      alert('Unable to start payment. Please try again.');
    } finally {
      button.disabled = false;
    }
  });

  setState(isValidDeviceAddress(input.value));

  if (contractIdFromUrl) {
    fetchContractDetails(contractIdFromUrl).then(async (contract) => {
      contractDetails = contract;

      if (!contract) {
        setState(false, 'Unable to load contract details');
        return;
      }

      const config = await getAppConfig();
      const currency = config.paymentCurrency || 'GHS';
      const amountValue = Number(contract.payment_amount);

      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        setState(false, 'Invalid contract payment amount');
        return;
      }

      const formatted = amountValue.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      paymentAmountDisplay.textContent = `${currency} ${formatted}`;

      onChange();
    }).catch(() => {
      setState(false, 'Unable to load contract details');
    });
  } else {
    onChange();
  }
})();
