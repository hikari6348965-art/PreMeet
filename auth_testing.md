# Auth Testing (PreMeet)

App issues its OWN JWT for both password and Google login.
- Password: POST /api/auth/login {email,password} -> {token}
- Google (Emergent managed): frontend redirects to https://auth.emergentagent.com/?redirect=<origin>/app,
  returns to /app#session_id=..., AuthCallback posts POST /api/auth/google-session {session_id}
  -> backend calls Emergent session-data, finds/creates user by email (links to existing password account), returns {token, onboarded,...}
- Token stored in localStorage `bc_token`, sent as Bearer; also httpOnly cookies.
- Invalid session_id -> 401 "Google sign-in failed. Please try again."

## Testing Google path without real Google
Real consent can't be automated. Verify: buttons google-login-btn / google-signup-btn navigate to auth.emergentagent.com with redirect=<origin>/app;
visiting /app#session_id=bogus shows auth-callback loader then redirects to /login with an error toast.
Simulate a Google-created user: insert users doc {email, name, role:'user', onboarded:true, google_linked:true} (no password_hash) and mint a JWT via
`python -c "import sys;sys.path.insert(0,'/app/backend');from dotenv import load_dotenv;load_dotenv('/app/backend/.env');import auth;print(auth.create_access_token('<id>','<email>'))"`.
Password login for an email that has no password_hash must return 401 (not 500).
