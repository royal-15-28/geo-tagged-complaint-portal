import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7PAZlZgM9SIfMUJKGA5z7_TAmOa-r_JM",
  authDomain: "geotagged-complaint-portal.firebaseapp.com",
  projectId: "geotagged-complaint-portal",
  storageBucket: "geotagged-complaint-portal.firebasestorage.app",
  messagingSenderId: "1040449501813",
  appId: "1:1040449501813:web:437c3e3e8063c577e3963c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


function showPage(id) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });

  const page = document.getElementById(id);

  if (page) {
    page.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


async function login(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    const name =
      user.displayName ||
      email.split("@")[0].replace(/[._-]/g, " ");

    document.getElementById("userName").textContent =
      name.replace(/\b\w/g, c => c.toUpperCase());

    showPage("dashboard");

  } catch (error) {
    console.error(error);

    alert(
      "Login failed.\n\n" +
      "Please check your email and password."
    );
  }
}


async function signup(e) {
  e.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    await updateProfile(user, {
      displayName: name
    });

    document.getElementById("userName").textContent = name;

    alert("Account created successfully!");

    showPage("dashboard");

  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-in-use") {
      alert("This email already has an account.");
    } else if (error.code === "auth/weak-password") {
      alert("Password should be at least 6 characters.");
    } else if (error.code === "auth/invalid-email") {
      alert("Please enter a valid email address.");
    } else {
      alert("Account creation failed. Please try again.");
    }
  }
}


function getLocation() {
  const text = document.getElementById("locationText");

  if (!navigator.geolocation) {
    text.textContent =
      "Geolocation is not supported by this browser.";
    return;
  }

  text.textContent = "Detecting your location...";

  navigator.geolocation.getCurrentPosition(
    pos => {
      text.textContent =
        `Latitude: ${pos.coords.latitude.toFixed(5)}, ` +
        `Longitude: ${pos.coords.longitude.toFixed(5)}`;
    },

    () => {
      text.textContent =
        "Location permission denied.";
    }
  );
}


function submitComplaint(e) {
  e.preventDefault();

  alert(
    "Complaint submitted successfully!"
  );

  showPage("dashboard");
}


window.showPage = showPage;
window.login = login;
window.signup = signup;
window.getLocation = getLocation;
window.submitComplaint = submitComplaint;
window.logout = async function () {
  await signOut(auth);
  showPage("home");
};