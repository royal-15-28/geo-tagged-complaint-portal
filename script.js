import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


/* =====================================================
   FIREBASE CONFIGURATION
===================================================== */

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

const db = getFirestore(app);


/* =====================================================
   AGENT ACCOUNT
===================================================== */

const AGENT_EMAIL = "agent@geotagged.com";


/* =====================================================
   PAGE NAVIGATION
===================================================== */

function showPage(id) {

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
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


/* =====================================================
   CITIZEN LOGIN
===================================================== */

async function login(e) {

  e.preventDefault();

  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  try {

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;


    /* ---------------------------------------------
       AGENT LOGIN THROUGH NORMAL LOGIN
    --------------------------------------------- */

    if (
      email.toLowerCase() ===
      AGENT_EMAIL.toLowerCase()
    ) {

      await loadAgentDashboard();

      showPage("agentDashboard");

      return;
    }


    /* ---------------------------------------------
       CITIZEN LOGIN
    --------------------------------------------- */

    const name =
      user.displayName ||
      email
        .split("@")[0]
        .replace(/[._-]/g, " ");

    const userName =
      document.getElementById("userName");

    if (userName) {

      userName.textContent =
        name.replace(
          /\b\w/g,
          c => c.toUpperCase()
        );
    }

    await loadCitizenComplaints();

    showPage("dashboard");

  } catch (error) {

    console.error(error);

    alert(
      "Login failed.\n\n" +
      "Please check your email and password."
    );
  }
}


/* =====================================================
   AGENT LOGIN
===================================================== */

async function agentLogin(e) {

  e.preventDefault();

  const email =
    document.getElementById("agentEmail").value.trim();

  const password =
    document.getElementById("agentPassword").value;


  /* Only the configured agent account can use
     the agent login page. */

  if (
    email.toLowerCase() !==
    AGENT_EMAIL.toLowerCase()
  ) {

    alert(
      "This account is not authorized as an agent."
    );

    return;
  }


  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    await loadAgentDashboard();

    showPage("agentDashboard");

  } catch (error) {

    console.error(error);

    alert(
      "Agent login failed.\n\n" +
      "Please check your agent email and password."
    );
  }
}


/* =====================================================
   CITIZEN SIGNUP
===================================================== */

async function signup(e) {

  e.preventDefault();

  const name =
    document.getElementById("signupName").value.trim();

  const email =
    document.getElementById("signupEmail").value.trim();

  const password =
    document.getElementById("signupPassword").value;

  const confirmPassword =
    document.getElementById("confirmPassword").value;


  if (password !== confirmPassword) {

    alert("Passwords do not match.");

    return;
  }


  try {

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;


    await updateProfile(user, {
      displayName: name
    });


    const userName =
      document.getElementById("userName");

    if (userName) {
      userName.textContent = name;
    }


    alert("Account created successfully!");


    showPage("dashboard");

  } catch (error) {

    console.error(error);


    if (
      error.code ===
      "auth/email-already-in-use"
    ) {

      alert(
        "This email already has an account."
      );

    } else if (
      error.code ===
      "auth/weak-password"
    ) {

      alert(
        "Password should be at least 6 characters."
      );

    } else if (
      error.code ===
      "auth/invalid-email"
    ) {

      alert(
        "Please enter a valid email address."
      );

    } else {

      alert(
        "Account creation failed.\n\n" +
        error.message
      );
    }
  }
}


/* =====================================================
   LOCATION
===================================================== */

function getLocation() {

  const text =
    document.getElementById("locationText");


  if (!navigator.geolocation) {

    text.textContent =
      "Geolocation is not supported by this browser.";

    return;
  }


  text.textContent =
    "Detecting your location...";


  navigator.geolocation.getCurrentPosition(

    position => {

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;


      text.textContent =
        `Latitude: ${latitude.toFixed(5)}, ` +
        `Longitude: ${longitude.toFixed(5)}`;


      window.currentLocation = {
        latitude: latitude,
        longitude: longitude
      };
    },


    () => {

      text.textContent =
        "Location permission denied.";
    }
  );
}


/* =====================================================
   SUBMIT COMPLAINT
===================================================== */

async function submitComplaint(e) {

  e.preventDefault();


  const user = auth.currentUser;


  if (!user) {

    alert("Please login first.");

    showPage("login");

    return;
  }


  const category =
    document.getElementById(
      "complaintCategory"
    ).value;


  const priority =
    document.getElementById(
      "complaintPriority"
    ).value;


  const description =
    document.getElementById(
      "complaintDescription"
    ).value.trim();


  if (!category || !description) {

    alert(
      "Please complete the complaint details."
    );

    return;
  }


  if (!window.currentLocation) {

    alert(
      "Please select your current location first."
    );

    return;
  }


  try {

    await addDoc(
      collection(db, "complaints"),
      {

        category: category,

        priority: priority,

        description: description,

        latitude:
          window.currentLocation.latitude,

        longitude:
          window.currentLocation.longitude,

        userId: user.uid,

        userEmail: user.email,

        userName:
          user.displayName || "Citizen",

        status: "Pending",

        createdAt: serverTimestamp()
      }
    );


    alert(
      "Complaint submitted successfully!"
    );


    e.target.reset();


    window.currentLocation = null;


    document.getElementById(
      "locationText"
    ).textContent =
      "Location not selected";


    await loadCitizenComplaints();


    showPage("dashboard");

  } catch (error) {

    console.error(error);

    alert(
      "Complaint submission failed.\n\n" +
      error.message
    );
  }
}


/* =====================================================
   CITIZEN COMPLAINTS
===================================================== */

async function loadCitizenComplaints() {

  const user = auth.currentUser;


  if (!user) {
    return;
  }


  const container =
    document.getElementById(
      "citizenComplaints"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "Loading complaints...";


  try {

    const q = query(
      collection(db, "complaints"),
      where("userId", "==", user.uid)
    );


    const snapshot =
      await getDocs(q);


    container.innerHTML = "";


    let pending = 0;

    let resolved = 0;


    snapshot.forEach(docSnapshot => {

      const complaint =
        docSnapshot.data();


      if (
        complaint.status === "Pending"
      ) {

        pending++;
      }


      if (
        complaint.status === "Resolved"
      ) {

        resolved++;
      }


      const row =
        document.createElement("div");


      row.className =
        "complaint-row";


      row.innerHTML = `

        <div class="complaint-icon">
          📋
        </div>

        <div class="complaint-info">

          <strong>
            ${escapeHtml(
              complaint.category
            )}
          </strong>

          <span>
            📍
            ${Number(
              complaint.latitude
            ).toFixed(5)},
            ${Number(
              complaint.longitude
            ).toFixed(5)}
          </span>

          <span>
            ${escapeHtml(
              complaint.description
            )}
          </span>

        </div>

        <span class="tag ${String(
          complaint.status || "Pending"
        ).toLowerCase().replace(
          /\s+/g,
          "-"
        )}">
          ${escapeHtml(
            complaint.status || "Pending"
          )}
        </span>

      `;


      container.appendChild(row);
    });


    if (snapshot.empty) {

      container.innerHTML =
        "<p class='muted'>" +
        "No complaints submitted yet." +
        "</p>";
    }


    const totalElement =
      document.getElementById(
        "totalComplaints"
      );


    const pendingElement =
      document.getElementById(
        "pendingComplaints"
      );


    const resolvedElement =
      document.getElementById(
        "resolvedComplaints"
      );


    if (totalElement) {

      totalElement.textContent =
        snapshot.size;
    }


    if (pendingElement) {

      pendingElement.textContent =
        pending;
    }


    if (resolvedElement) {

      resolvedElement.textContent =
        resolved;
    }

  } catch (error) {

    console.error(error);

    container.innerHTML =
      "<p>Unable to load complaints.</p>";
  }
}


/* =====================================================
   AGENT DASHBOARD
===================================================== */

async function loadAgentDashboard() {

  const container =
    document.getElementById(
      "agentComplaints"
    );


  if (!container) {

    console.error(
      "agentComplaints element not found."
    );

    return;
  }


  container.innerHTML =
    "Loading complaints...";


  try {

    const q = query(
      collection(db, "complaints"),
      orderBy("createdAt", "desc")
    );


    const snapshot =
      await getDocs(q);


    container.innerHTML = "";


    if (snapshot.empty) {

      container.innerHTML =
        "<p class='muted'>" +
        "No complaints submitted yet." +
        "</p>";

      return;
    }


    snapshot.forEach(docSnapshot => {

      const complaint =
        docSnapshot.data();


      const row =
        document.createElement("div");


      row.className =
        "complaint-row agent-row";


      row.innerHTML = `

        <div class="complaint-icon">
          📋
        </div>


        <div class="complaint-info">

          <strong>
            ${escapeHtml(
              complaint.category ||
              "Complaint"
            )}
          </strong>


          <span>
            👤
            ${escapeHtml(
              complaint.userName ||
              "Citizen"
            )}
          </span>


          <span>
            ✉️
            ${escapeHtml(
              complaint.userEmail ||
              ""
            )}
          </span>


          <span>
            📍
            ${Number(
              complaint.latitude || 0
            ).toFixed(5)},
            ${Number(
              complaint.longitude || 0
            ).toFixed(5)}
          </span>


          <span>
            ${escapeHtml(
              complaint.description ||
              ""
            )}
          </span>


          <span>
            Priority:
            ${escapeHtml(
              complaint.priority ||
              "Normal"
            )}
          </span>

        </div>


        <select
          onchange="
            updateComplaintStatus(
              '${docSnapshot.id}',
              this.value
            )
          "
        >

          <option
            value="Pending"
            ${
              complaint.status === "Pending"
                ? "selected"
                : ""
            }
          >
            Pending
          </option>


          <option
            value="In Progress"
            ${
              complaint.status === "In Progress"
                ? "selected"
                : ""
            }
          >
            In Progress
          </option>


          <option
            value="Resolved"
            ${
              complaint.status === "Resolved"
                ? "selected"
                : ""
            }
          >
            Resolved
          </option>

        </select>

      `;


      container.appendChild(row);
    });

  } catch (error) {

    console.error(error);

    container.innerHTML =
      "<p>Unable to load complaints.</p>";
  }
}


/* =====================================================
   UPDATE COMPLAINT STATUS
===================================================== */

async function updateComplaintStatus(
  complaintId,
  newStatus
) {

  try {

    await updateDoc(
      doc(
        db,
        "complaints",
        complaintId
      ),
      {
        status: newStatus
      }
    );


    alert(
      "Complaint status updated."
    );


    await loadAgentDashboard();

  } catch (error) {

    console.error(error);

    alert(
      "Could not update complaint status.\n\n" +
      error.message
    );
  }
}


/* =====================================================
   HTML SAFETY
===================================================== */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =====================================================
   LOGOUT
===================================================== */

window.logout = async function () {

  await signOut(auth);

  showPage("home");
};


/* =====================================================
   MAKE FUNCTIONS AVAILABLE TO HTML
===================================================== */

window.showPage = showPage;

window.login = login;

window.agentLogin = agentLogin;

window.signup = signup;

window.getLocation = getLocation;

window.submitComplaint = submitComplaint;

window.updateComplaintStatus =
  updateComplaintStatus;