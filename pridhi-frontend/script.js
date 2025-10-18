// 1. FIREBASE SETUP AND AUTH IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// Globals for Firebase Instances
let app;
let db;
let auth;
let userId = null;
let isAuthReady = false;

// 2. INITIALIZE FIREBASE & AUTHENTICATION
document.addEventListener('DOMContentLoaded', async () => {
    // Mandatorily retrieve config and app ID
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    try {
        setLogLevel('Debug');
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Initialize Auth Listener
        onAuthStateChanged(auth, async (user) => {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            if (user) {
                userId = user.uid;
                console.log("Authenticated. User ID:", userId);
                document.getElementById('currentUserId').textContent = userId;
                await loadUserProfile(appId, userId);
            } else {
                // Sign in anonymously if no token is available (for local testing/fallback)
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            }
            isAuthReady = true;
        });

        // Attach event listener for the Feedback Form here
        const feedbackForm = document.getElementById('feedbackForm');
        if (feedbackForm) {
            feedbackForm.onsubmit = submitFeedbackToBackend;
        }
        
    } catch (e) {
        console.error("Failed to initialize Firebase or sign in:", e);
        showMessage("Setup Error", "Failed to initialize Firebase. Check console.", "error");
    }
});


// === EXISTING NAVIGATION, SCROLL, AND STYLE LOGIC (RETAINED) ===

// Define navigation buttons (no Explore)
const NAV_LINKS = [
  { label: "Home", target: "top" },
  { label: "Schedule", target: "scheduleForm" },
  { label: "Leaderboard", target: "leaderboardList" },
  { label: "Feedback", target: "feedbackForm" },
  { label: "Profile", target: "profileSection" },
];

// ====== FIXED NAV BAR (Keep Existing Logic) ======
const nav = document.querySelector('nav');
if (nav) {
    nav.style.position = 'fixed';
    nav.style.top = '0';
    nav.style.width = '100%';
    nav.style.zIndex = '1000';
    nav.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
    // Wait for DOM content to fully load before calculating offset
    document.addEventListener('DOMContentLoaded', () => {
        if (nav) {
             document.body.style.paddingTop = nav.offsetHeight + 'px';
        }
    });

    const navInner = document.querySelector('.nav-inner');
    const navButtons = document.createElement('div');
    navButtons.style.display = 'flex';
    navButtons.style.gap = '12px';
    navButtons.style.alignItems = 'center';
    navButtons.style.marginLeft = '20px';

    const navSearch = document.querySelector('.nav-search');
    if (navInner && navSearch) {
        const oldLink = navSearch.querySelector('.nav-link');
        if (oldLink) oldLink.remove();
        
        navInner.insertBefore(navButtons, navSearch);
    }
    
    NAV_LINKS.forEach(link => {
      const btn = document.createElement('button');
      btn.textContent = link.label;
      btn.className = 'btn btn-outline nav-btn';
      btn.dataset.target = link.target;

      btn.onclick = () => {
        if (link.target === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (link.target === 'profileSection') {
          toggleProfileSection(); 
        } else {
          const section = document.getElementById(link.target);
          if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      };

      navButtons.appendChild(btn);
    });

    // ====== ACTIVE BUTTON HIGHLIGHT ======
    window.addEventListener('scroll', () => {
      const sectionIds = NAV_LINKS
        .filter(l => l.target !== 'top' && l.target !== 'profileSection')
        .map(l => l.target);
      let current = '';
      sectionIds.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
          const sectionTop = section.offsetTop - (nav ? nav.offsetHeight + 20 : 150); 
          if (window.scrollY >= sectionTop) current = id;
        }
      });

      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
        if (btn.dataset.target === current) btn.classList.add('active-nav');
      });
    });

    const style = document.createElement('style');
    style.textContent = `
        .active-nav {
            background-color: #1f2937 !important; 
            color: white !important;
        }
        .nav-btn {
            color: white !important;
            font-weight: 700 !important; 
            width: 100px;
            font-size: 12px; 
        }
    `;
    document.head.appendChild(style);
}


// ====== PROFILE SECTION LOGIC (FIRESTORE) ======

const profileSection = document.getElementById('profileSection');
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.onsubmit = saveProfileToFirestore;
}

// Save profile to Firestore
async function saveProfileToFirestore(e) {
    e.preventDefault();
    if (!isAuthReady || !userId) {
        return showMessage("Authentication Error", "Please wait for user authentication.", "error");
    }
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const profile = {
        name: document.getElementById('profileName').value.trim(),
        skill: document.getElementById('profileSkill').value.trim(),
        bio: document.getElementById('profileBio').value.trim(),
        userId: userId
    };

    if (!profile.name || !profile.skill) {
        return showMessage('Input Required', 'Please fill in your name and skill.', 'error');
    }
    
    try {
        const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
        await setDoc(profileRef, profile);

        document.getElementById('dispName').textContent = profile.name;
        document.getElementById('dispSkill').textContent = profile.skill;
        document.getElementById('dispBio').textContent = profile.bio;
        document.getElementById('profileDisplay').style.display = 'block';
        showMessage('Profile Saved', 'Your profile has been saved successfully to the cloud.', 'success');

    } catch (e) {
        console.error("Error saving profile:", e);
        showMessage('Save Failed', 'Could not save profile data. Check console.', 'error');
    }
}

// Load profile from Firestore
async function loadUserProfile(appId, userId) {
    try {
        const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
        const docSnap = await getDoc(profileRef);

        if (docSnap.exists()) {
            const savedProfile = docSnap.data();
            document.getElementById('profileName').value = savedProfile.name || '';
            document.getElementById('profileSkill').value = savedProfile.skill || '';
            document.getElementById('profileBio').value = savedProfile.bio || '';

            document.getElementById('dispName').textContent = savedProfile.name || '';
            document.getElementById('dispSkill').textContent = savedProfile.skill || '';
            document.getElementById('dispBio').textContent = savedProfile.bio || '';
            document.getElementById('profileDisplay').style.display = 'block';
            console.log("Profile loaded from Firestore.");
        } else {
            console.log("No profile found for this user. Starting fresh.");
        }
    } catch (e) {
        console.error("Error loading profile:", e);
    }
}

// Toggle show/hide for profile section
function toggleProfileSection() {
    if (!profileSection) return; 
    if (profileSection.style.display === 'none' || profileSection.style.display === '') {
        profileSection.style.display = 'block';
        setTimeout(() => {
            profileSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    } else {
        profileSection.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}


// ====== FEEDBACK SUBMISSION TO FLASK API (PORT 5000) ======

/**
 * Submits feedback to the Flask backend's /contact API (which saves to SQLite).
 */
async function submitFeedbackToBackend(e) {
    e.preventDefault();
    const name = document.getElementById('feedbackName').value.trim();
    const email = document.getElementById('feedbackEmail').value.trim();
    const message = document.getElementById('feedbackInput').value.trim();

    if (!message) {
        return showMessage('Input Required', 'Please type some feedback.', 'error');
    }
    
    // Clear form fields immediately to give visual feedback
    document.getElementById('feedbackInput').value = '';
    document.getElementById('feedbackName').value = '';
    document.getElementById('feedbackEmail').value = '';

    try {
        // 🚨 Using port 5000
        const response = await fetch("http://127.0.0.1:5000/contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, message })
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            showMessage('Feedback Submitted', data.message, 'success');
        } else {
            // Handle server-side error messages
            throw new Error(data.message || `Server Error: ${response.status}`);
        }

    } catch (error) {
        console.error("Error submitting feedback:", error);
        showMessage('Submission Failed', `Error: ${error.message}. Check backend console.`, 'error');
    }
}

// ====== BACKEND CONNECTION TEST (PORT 5000) ======

/**
 * Function to test the connection to the Flask backend's /test route.
 * * NOTE: The backend is now expected to be running on port 5000.
 */
function testBackendConnection() {
    // 🚨 Using port 5000
    const backendUrl = "http://127.0.0.1:5000/test"; 

    console.log("Attempting to connect to:", backendUrl);

    fetch(backendUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
            name: "Skill Barter Frontend",
            test_type: "Connection Check"
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json(); 
    })
    .then(data => {
        console.log("✅ Success! Response from Backend:", data);
        showMessage("Backend Test Successful", "Message from server: " + data.message, "success");
    })
    .catch(error => {
        console.error("❌ Error connecting to backend:", error);
        showMessage("Connection Error", "Could not connect to the backend (or CORS issue). Check console for details. Ensure Flask server is running on port 5000.", "error");
    });
}

/**
 * Custom function to show a message box (instead of alert()).
 */
function showMessage(title, message, type) {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
         console.warn(`Message container not found. Message: ${title} - ${message}`);
         return;
    }
    
    const msgBox = document.createElement('div');
    msgBox.className = `fixed top-4 right-4 p-4 rounded-lg shadow-xl text-white z-50 transition-opacity duration-300`;

    if (type === 'success') {
        msgBox.classList.add('bg-green-600');
    } else if (type === 'error') {
        msgBox.classList.add('bg-red-600');
    } else {
         msgBox.classList.add('bg-blue-600');
    }

    msgBox.innerHTML = `
        <strong class="block text-lg">${title}</strong>
        <p class="mt-1">${message}</p>
    `;

    messageContainer.appendChild(msgBox);

    // Automatically remove the message after 5 seconds
    setTimeout(() => {
        msgBox.style.opacity = '0';
        setTimeout(() => msgBox.remove(), 300); // Remove element after fade
    }, 5000);
}
