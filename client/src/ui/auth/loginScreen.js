import { signIn, signUp } from '../../services/authService.js';

/**
 * Login / Sign-up screen component.
 * Renders a centered card that toggles between sign-in and sign-up modes.
 * Uses existing CSS variables from main.css.
 */

const CONTAINER_ID = 'auth-screen';

export function renderLoginScreen() {
  // Remove previous instance if any
  const existing = document.getElementById(CONTAINER_ID);
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = CONTAINER_ID;
  overlay.innerHTML = `
    <style>
      #${CONTAINER_ID} {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg);
      }
      .auth-card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
        padding: 40px 32px 32px;
        width: 100%;
        max-width: 400px;
        margin: 16px;
      }
      .auth-card h2 {
        text-align: center;
        margin-bottom: 8px;
        color: var(--text);
        font-size: 1.6rem;
      }
      .auth-card .auth-subtitle {
        text-align: center;
        color: var(--text-muted);
        margin-bottom: 24px;
        font-size: 0.95rem;
      }
      .auth-card .form-group {
        margin-bottom: 16px;
      }
      .auth-card .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: var(--text);
        font-size: 0.9rem;
      }
      .auth-card .form-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--bg);
        color: var(--text);
        font-size: 1rem;
        transition: border-color 0.2s;
      }
      .auth-card .form-input:focus {
        outline: none;
        border-color: var(--primary);
      }
      .auth-error {
        background: rgba(239, 68, 68, 0.1);
        color: var(--danger);
        border: 1px solid var(--danger);
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 16px;
        font-size: 0.9rem;
        display: none;
      }
      .auth-card .btn-auth {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 6px;
        background: var(--primary);
        color: white;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s, transform 0.2s;
      }
      .auth-card .btn-auth:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      .auth-card .btn-auth:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      .auth-toggle {
        text-align: center;
        margin-top: 20px;
        color: var(--text-muted);
        font-size: 0.9rem;
      }
      .auth-toggle a {
        color: var(--info);
        cursor: pointer;
        text-decoration: underline;
        font-weight: 500;
      }
      .auth-toggle a:hover {
        opacity: 0.8;
      }
      .auth-success {
        background: rgba(16, 185, 129, 0.1);
        color: var(--secondary);
        border: 1px solid var(--secondary);
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 16px;
        font-size: 0.9rem;
        display: none;
      }
    </style>

    <div class="auth-card">
      <h2 id="auth-title">Sign In</h2>
      <p class="auth-subtitle" id="auth-subtitle">Welcome back! Enter your credentials.</p>

      <div class="auth-error" id="auth-error"></div>
      <div class="auth-success" id="auth-success"></div>

      <form id="auth-form" autocomplete="on">
        <div class="form-group" id="username-group" style="display:none;">
          <label for="auth-username">Username</label>
          <input type="text" id="auth-username" class="form-input" placeholder="Your name" autocomplete="name" />
        </div>
        <div class="form-group">
          <label for="auth-email">Email</label>
          <input type="email" id="auth-email" class="form-input" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" class="form-input" placeholder="Enter password" required autocomplete="current-password" minlength="6" />
        </div>
        <button type="submit" class="btn-auth" id="auth-submit">Sign In</button>
      </form>

      <div class="auth-toggle">
        <span id="auth-toggle-text">Don't have an account?</span>
        <a id="auth-toggle-link">Sign Up</a>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // State
  let isSignUp = false;

  const form = document.getElementById('auth-form');
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const submitBtn = document.getElementById('auth-submit');
  const toggleText = document.getElementById('auth-toggle-text');
  const toggleLink = document.getElementById('auth-toggle-link');
  const errorDiv = document.getElementById('auth-error');
  const successDiv = document.getElementById('auth-success');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const usernameInput = document.getElementById('auth-username');
  const usernameGroup = document.getElementById('username-group');

  function showError(msg) {
    successDiv.style.display = 'none';
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
  }

  function showSuccess(msg) {
    errorDiv.style.display = 'none';
    successDiv.textContent = msg;
    successDiv.style.display = 'block';
  }

  function clearMessages() {
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
  }

  function toggleMode() {
    isSignUp = !isSignUp;
    clearMessages();
    if (isSignUp) {
      title.textContent = 'Sign Up';
      subtitle.textContent = 'Create an account to get started.';
      submitBtn.textContent = 'Sign Up';
      toggleText.textContent = 'Already have an account?';
      toggleLink.textContent = 'Sign In';
      passwordInput.setAttribute('autocomplete', 'new-password');
      usernameGroup.style.display = 'block';
      usernameInput.required = true;
    } else {
      title.textContent = 'Sign In';
      subtitle.textContent = 'Welcome back! Enter your credentials.';
      submitBtn.textContent = 'Sign In';
      toggleText.textContent = "Don't have an account?";
      toggleLink.textContent = 'Sign Up';
      passwordInput.setAttribute('autocomplete', 'current-password');
      usernameGroup.style.display = 'none';
      usernameInput.required = false;
    }
  }

  toggleLink.addEventListener('click', toggleMode);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const username = usernameInput.value.trim();

    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }

    if (isSignUp && !username) {
      showError('Please enter a username.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isSignUp ? 'Creating account...' : 'Signing in...';

    try {
      if (isSignUp) {
        const data = await signUp(email, password, username);
        // If email confirmation is required, the session may be null
        if (data.session) {
          // Auto-signed in — the onAuthStateChange listener will handle the rest
        } else {
          showSuccess('Account created! Check your email to confirm, then sign in.');
          toggleMode(); // Switch back to sign-in
        }
      } else {
        await signIn(email, password);
        // onAuthStateChange listener will hide the login screen
      }
    } catch (err) {
      showError(err.message || 'Authentication failed.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    }
  });

  // Focus email input
  emailInput.focus();
}

export function removeLoginScreen() {
  const el = document.getElementById(CONTAINER_ID);
  if (el) el.remove();
}
