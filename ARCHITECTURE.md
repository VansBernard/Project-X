# Project X Architecture

## 1. Core Architecture & Tech Stack

- **The Brain (Cloud Server):**
  - Built with **Node.js (Express)** or **Go**
  - Uses **PostgreSQL** as the primary database
  - Lives online and receives payment updates from **Paystack API**
  - Tracks payment milestones and contract status
  - Acts as the cryptographic source of truth for offline unlock tokens

- **The Guard (Client Laptop App):**
  - Native **C# .NET 8 Worker Service** with a **WPF or WinForms** overlay
  - Runs locally on the financed laptop under **NT AUTHORITY\SYSTEM**
  - Enforces the lock screen and deadline checks
  - Performs offline token validation without contacting the server

## 2. Cryptographic Offline Handshake

- **The Secret Key:**
  - Shared between the Cloud Server and Laptop Client
  - A hardcoded string used as the **HMAC secret key**

- **The Hardware Fingerprint:**
  - The laptop app reads the motherboard or BIOS serial number from WMI
  - This value is captured as `hardware_uuid`
  - It binds each unlock token to a single physical device

- **Token Formula:**
  - `Token = First 8 Hex Characters of HMAC-SHA256(hardware_uuid + Year + Month, Secret Key) mod 100000000`
  - The resulting value is an 8-digit numeric token

## 3. Payment & Unlock Flow

1. **The Expiration Clock:**
   - The local C# app stores a deadline in the Windows Registry
   - Example: `2026-07-01`
   - If the system date passes this deadline, a full-screen, borderless overlay is shown

2. **The Checkout:**
   - Customer pays the installment via Paystack on their phone

3. **The Webhook Engine:**
   - Paystack sends a callback to `/api/v1/paystack-webhook`
   - The server updates the customer record and `amount_paid_to_date`

4. **Token Processing:**
   - If the customer still owes money, the server:
     - Extends the due date by one month
     - Computes the 8-digit token for the target month/year
     - Sends the token to the user by email/SMS
   - If the total cost is paid in full, the server marks the account `Fully_Paid`

5. **Offline Verification:**
   - The user enters the token into the locked overlay
   - The C# client recomputes the token locally using the same formula
   - On match, the client updates the Registry deadline and unlocks the laptop

## 4. Security & Safety Mitigations

- **Alt+F4 & Task Manager Prevention:**
  - The lock UI is borderless and `Topmost`
  - Keyboard hooks block `Alt+F4`, `Ctrl+Alt+Delete`, and minimize attempts where possible

- **Time Tampering Protection:**
  - The background agent tracks system uptime timestamps
  - If the system clock moves backwards, the client triggers a safety lockout

## 5. Notes

- The architecture is deliberately split between an online authoritative server and an offline-capable local enforcement agent.
- The shared HMAC secret and hardware fingerprint ensure that unlock tokens are both device-specific and time-bound.
- This design supports cases where the laptop cannot always reach the cloud server, while still enforcing payment-based access control.
