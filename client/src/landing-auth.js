import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;

try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
}

// Check for existing session and handle OAuth callback
async function checkSession() {
  if (!supabase) return;

  try {
    // Check if URL has OAuth callback parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasOAuthParams = hashParams.has('access_token') || hashParams.has('error');

    if (hasOAuthParams) {
      console.log('Detected OAuth callback, processing...');
      // Let Supabase handle the OAuth callback from URL automatically
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data.session) {
        console.log('OAuth successful, redirecting to main app');
        // Clear the hash from URL to remove tokens
        window.location.hash = '';
        // Redirect to main app
        window.location.replace('./');
      }
    } else {
      // Normal session check
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.replace('./');
      }
    }
  } catch (error) {
    console.error('Session check error:', error);
  }
}

checkSession();

// Google OAuth handler
const googleBtn = document.querySelector('.btn-google');
if (googleBtn) {
  googleBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!supabase) {
      alert('Authentication not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.');
      return;
    }
    try {
      const redirectUrl = window.location.origin + '/';
      console.log('Redirecting to:', redirectUrl);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google auth error:', error);
      alert('Authentication failed: ' + error.message);
    }
  });
}

// Form submission handler with actual auth logic
const authForm = document.getElementById('auth-form');
if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const name = document.getElementById('name-input').value;

    if (!supabase) {
      alert('Authentication not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.');
      return;
    }

    try {
      if (window.isSignUpMode) {
        if (!email || !password || !name) {
          alert('Please fill in all fields');
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          alert('Account created! You can now sign in.');
          window.setFormMode(false);
        }
      } else {
        if (!email || !password) {
          alert('Please fill in email and password');
          return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (data.session) {
          window.location.replace('./');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert(error.message || 'Authentication failed. Please try again.');
    }
  });
}
