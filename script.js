
/* =====================================================
   ACADEMIC SLA, DUPLICATE DETECTION & TRANSLATION
===================================================== */
function getSlaBadge(createdAt, status) {
  if (status === "Resolved") {
    return '<span class="sla-badge resolved">✅ Resolved</span>';
  }
  const created = new Date(createdAt || Date.now()).getTime();
  const now = Date.now();
  const elapsedDays = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
  
  if (elapsedDays > 12) {
    return `<span class="sla-badge overdue">⚠️ Day ${elapsedDays}/12 — Overdue (Escalated to Zonal Authority)</span>`;
  } else if (elapsedDays >= 10) {
    return `<span class="sla-badge target">⏱ Day ${elapsedDays}/12 — Target Resolution Window</span>`;
  } else if (elapsedDays >= 4) {
    return `<span class="sla-badge progress">🔄 Day ${elapsedDays}/12 — Work in Progress</span>`;
  } else {
    return `<span class="sla-badge assigned">📋 Day ${elapsedDays}/12 — Acknowledged & Assigned</span>`;
  }
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function checkProximityDuplicates(lat, lng) {
  const noticeBox = document.getElementById("duplicateNoticeBox");
  if (!noticeBox) return;
  try {
    const { data, error } = await supabase
      .from("complaints")
      .select("id, category, latitude, longitude, status")
      .limit(50);
    if (error || !data) return;
    
    const nearby = data.find(c => {
      if (c.status === "Resolved") return false;
      const dist = getDistanceMeters(lat, lng, c.latitude, c.longitude);
      return dist <= 150;
    });

    if (nearby) {
      const dist = Math.round(getDistanceMeters(lat, lng, nearby.latitude, nearby.longitude));
      noticeBox.style.display = "block";
      noticeBox.innerHTML = `
        <span>⚠️ <strong>Proximity Alert (Duplicate Check):</strong> A similar complaint (Docket #${nearby.id.slice(0, 8)}) was detected ~${dist}m from your location. Your report will be linked to prevent redundant municipal dispatch.</span>
      `;
    } else {
      noticeBox.style.display = "none";
    }
  } catch (e) {
    console.warn("Duplicate check warning:", e);
  }
}

function civicTranslate(text, lang) {
  const hiMap = {
    "pothole": "सड़क पर गड्ढा (Pothole)",
    "road": "सड़क (Road)",
    "garbage": "कचरा (Garbage)",
    "waste": "अपशिष्ट (Waste)",
    "street light": "स्ट्रीट लाइट (Streetlight)",
    "water": "पानी की आपूर्ति (Water Supply)",
    "drainage": "नाली की समस्या (Drainage)"
  };
  const taMap = {
    "pothole": "சாலையில் குழி (Pothole)",
    "road": "சாலை (Road)",
    "garbage": "குப்பை (Garbage)",
    "waste": "கழிவு (Waste)",
    "street light": "தெரு விளக்கு (Streetlight)",
    "water": "குடிநீர் விநியோகம் (Water Supply)",
    "drainage": "வடிகால் அடைப்பு (Drainage)"
  };
  const map = lang === "hi" ? hiMap : taMap;
  let res = text;
  for (const [k, v] of Object.entries(map)) {
    res = res.replace(new RegExp(k, "gi"), v);
  }
  return res !== text ? res : (lang === "hi" ? "नागरिक समस्या: " + text : "குடிமக்கள் புகார்: " + text);
}

window.toggleTranslation = function(btn) {
  const descEl = btn.closest(".complaint-info, .agent-card-section")?.querySelector(".complaint-desc, .agent-card-description");
  if (!descEl) return;
  const original = descEl.getAttribute("data-original") || descEl.textContent.trim();
  if (!descEl.getAttribute("data-original")) {
    descEl.setAttribute("data-original", original);
  }
  const currentLang = descEl.getAttribute("data-lang") || "en";
  
  if (currentLang === "en") {
    descEl.textContent = civicTranslate(original, "hi");
    descEl.setAttribute("data-lang", "hi");
    btn.textContent = "🌐 Show Tamil";
  } else if (currentLang === "hi") {
    descEl.textContent = civicTranslate(original, "ta");
    descEl.setAttribute("data-lang", "ta");
    btn.textContent = "🌐 Show Original";
  } else {
    descEl.textContent = original;
    descEl.setAttribute("data-lang", "en");
    btn.textContent = "🌐 Translate";
  }
};

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =====================================================
   SUPABASE
===================================================== */

const SUPABASE_URL =
  "https://ebhofxeusrlwfizmopqx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable__bVIV2ItJS47Ac1V2_QvzQ_49vjdqad";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const AGENT_EMAIL = "agent@geotagged.com";

/* =====================================================
   GLOBALS
===================================================== */

let complaintMap = null;
let locationMap = null;
let locationMarker = null;
let agentMap = null;

let complaintMarkers = [];
let agentMarkers = [];

window.currentLocation = null;

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

  if (id === "dashboard") {
    setTimeout(() => {
      initComplaintMap();
      loadCitizenComplaints();
      loadCitizenWallet();
    }, 150);
  }

  if (id === "complaint") {
    setTimeout(() => {
      initLocationMap();
    }, 150);
  }

  if (id === "agentDashboard") {
    setTimeout(() => {
      initAgentMap();
      loadAgentDashboard();
    }, 150);
  }
}

/* =====================================================
   AUTH HELPERS
===================================================== */

async function getCurrentUser() {
  const {
    data,
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Auth error:", error);
    return null;
  }

  return data.user;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) return null;

  const {
    data,
    error
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Profile error:", error);
    return null;
  }

  return data;
}

/* =====================================================
   LOGIN
===================================================== */

async function login(e) {
  e.preventDefault();

  const email =
    document.getElementById("loginEmail")
      ?.value.trim();

  const password =
    document.getElementById("loginPassword")
      ?.value;

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  try {
    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const profile =
      await getCurrentProfile();

    if (
      profile?.role === "agent" ||
      email.toLowerCase() === AGENT_EMAIL
    ) {
      if (profile?.role !== "agent") {
        alert(
          "This account is not configured as an agent."
        );
        await supabase.auth.signOut();
        return;
      }

      await loadAgentDashboard();
      showPage("agentDashboard");
      return;
    }

    setUserName(data.user);

    await loadCitizenComplaints();
    await loadCitizenWallet();

    showPage("dashboard");

  } catch (error) {
    console.error(error);

    alert(
      "Login failed.\n\n" +
      (error.message || "Invalid login details.")
    );
  }
}

/* =====================================================
   AGENT LOGIN
===================================================== */

async function agentLogin(e) {
  e.preventDefault();

  const email =
    document.getElementById("agentEmail")
      ?.value.trim();

  const password =
    document.getElementById("agentPassword")
      ?.value;

  if (!email || !password) {
    alert("Please enter agent email and password.");
    return;
  }

  if (
    email.toLowerCase() !==
    AGENT_EMAIL.toLowerCase()
  ) {
    alert("Unauthorized agent account.");
    return;
  }

  try {
    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const profile =
      await getCurrentProfile();

    if (profile?.role !== "agent") {
      alert(
        "Agent account is not configured in Supabase yet."
      );

      await supabase.auth.signOut();
      return;
    }

    await loadAgentDashboard();
    showPage("agentDashboard");

  } catch (error) {
    console.error(error);

    alert(
      "Agent login failed.\n\n" +
      (error.message || "Invalid agent credentials.")
    );
  }
}

/* =====================================================
   SIGNUP
===================================================== */

async function signup(e) {
  e.preventDefault();

  const name =
    document.getElementById("signupName")
      ?.value.trim();

  const email =
    document.getElementById("signupEmail")
      ?.value.trim();

  const password =
    document.getElementById("signupPassword")
      ?.value;

  const confirmPassword =
    document.getElementById("confirmPassword")
      ?.value;

  if (!name || !email || !password) {
    alert("Please complete all fields.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (password.length < 6) {
    alert("Password must contain at least 6 characters.");
    return;
  }

  try {
    const {
      data,
      error
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error(
        "Account creation failed."
      );
    }

    if (!data.session) {
      alert(
        "Account created.\n\n" +
        "Please verify your email, then log in."
      );

      showPage("login");
      return;
    }

    alert("Account created successfully!");

    setUserName(data.user);

    await loadCitizenComplaints();
    await loadCitizenWallet();

    showPage("dashboard");

  } catch (error) {
    console.error(error);

    alert(
      "Signup failed.\n\n" +
      (error.message || "Unable to create account.")
    );
  }
}

/* =====================================================
   USER NAME
===================================================== */

function setUserName(user) {
  const element =
    document.getElementById("userName");

  if (!element) return;

  const name =
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Citizen";

  element.textContent =
    name
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
}

/* =====================================================
   LOGOUT
===================================================== */

async function logout() {
  try {
    const {
      error
    } = await supabase.auth.signOut();

    if (error) throw error;

    window.currentLocation = null;

    showPage("home");

  } catch (error) {
    console.error(error);
    alert(
      "Logout failed.\n\n" +
      error.message
    );
  }
}

/* =====================================================
   LOCATION
===================================================== */

function getLocation() {
  const locationText =
    document.getElementById("locationText");

  if (!navigator.geolocation) {
    if (locationText) {
      locationText.textContent =
        "Geolocation is not supported.";
    }

    return;
  }

  if (locationText) {
    locationText.textContent =
      "Detecting your location...";
  }

  navigator.geolocation.getCurrentPosition(
    position => {

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      window.currentLocation = {
        latitude,
        longitude
      };
      checkProximityDuplicates(latitude, longitude);

      updateLocationText(
        latitude,
        longitude
      );

      if (locationMap) {
        locationMap.setView(
          [latitude, longitude],
          16
        );
      }

      if (locationMarker) {
        locationMarker.setLatLng([
          latitude,
          longitude
        ]);
      }
    },

    error => {
      console.error(
        "Geolocation error:",
        error
      );

      if (locationText) {
        locationText.textContent =
          "Unable to detect location. Select it on the map.";
      }
    }
  );
}

function updateLocationText(
  latitude,
  longitude
) {
  const element =
    document.getElementById("locationText");

  if (!element) return;

  element.textContent =
    `Latitude: ${latitude.toFixed(5)}, ` +
    `Longitude: ${longitude.toFixed(5)}`;
}

/* =====================================================
   COMPLAINT LOCATION MAP
===================================================== */

function initLocationMap() {
  const element =
    document.getElementById("locationMap");

  if (!element || typeof L === "undefined") {
    return;
  }

  if (locationMap) {
    setTimeout(() => {
      locationMap.invalidateSize();
    }, 100);

    return;
  }

  let latitude = 20.5937;
  let longitude = 78.9629;

  if (window.currentLocation) {
    latitude =
      window.currentLocation.latitude;

    longitude =
      window.currentLocation.longitude;
  }

  locationMap =
    L.map("locationMap")
      .setView(
        [latitude, longitude],
        13
      );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(locationMap);

  locationMarker =
    L.marker(
      [latitude, longitude],
      {
        draggable: true
      }
    ).addTo(locationMap);

  window.currentLocation = {
    latitude,
    longitude
  };

  locationMap.on(
    "click",
    event => {

      const lat =
        event.latlng.lat;

      const lng =
        event.latlng.lng;

      locationMarker.setLatLng([
        lat,
        lng
      ]);

      window.currentLocation = {
        latitude: lat,
        longitude: lng
      };

      updateLocationText(lat, lng);
    }
  );

  locationMarker.on(
    "dragend",
    () => {

      const position =
        locationMarker.getLatLng();

      window.currentLocation = {
        latitude: position.lat,
        longitude: position.lng
      };

      updateLocationText(
        position.lat,
        position.lng
      );
    }
  );

  setTimeout(() => {
    locationMap.invalidateSize();
  }, 200);

  updateLocationText(
    latitude,
    longitude
  );
}

/* =====================================================
   CITIZEN DASHBOARD MAP
===================================================== */

function initComplaintMap() {
  const element =
    document.getElementById("complaintMap");

  if (!element || typeof L === "undefined") {
    return;
  }

  if (complaintMap) {
    setTimeout(() => {
      complaintMap.invalidateSize();
    }, 100);

    return;
  }

  complaintMap =
    L.map("complaintMap")
      .setView(
        [20.5937, 78.9629],
        5
      );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(complaintMap);

  setTimeout(() => {
    complaintMap.invalidateSize();
  }, 200);
}

/* =====================================================
   SUBMIT COMPLAINT
===================================================== */

async function submitComplaint(e) {
  e.preventDefault();

  const user =
    await getCurrentUser();

  if (!user) {
    alert("Please login first.");
    showPage("login");
    return;
  }

  const category =
    document.getElementById(
      "complaintCategory"
    )?.value;

  const priority =
    document.getElementById(
      "complaintPriority"
    )?.value;

  const description =
    document.getElementById(
      "complaintDescription"
    )?.value.trim();

  const fileInput =
    document.querySelector(".file-input");

  const file =
    fileInput?.files?.[0] || null;

  if (!category || !description) {
    alert(
      "Please complete the complaint details."
    );
    return;
  }

  
  // ---------- Duplicate check before proceeding ----------
  const isDuplicate = await checkProximityDuplicates(
    window.currentLocation.latitude,
    window.currentLocation.longitude
  );
  if (isDuplicate) {
    // Show error banner and abort submission
    const duplicateBox = document.getElementById('duplicateNoticeBox');
    if (duplicateBox) {
      duplicateBox.textContent = '⚠️ A similar complaint already exists within 150 m. Please verify before submitting.';
      duplicateBox.classList.add('error');
      duplicateBox.style.display = 'block';
    }
    return; // stop submission
  }


  if (file) {

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        "Only JPG, PNG, and WebP images are allowed."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(
        "Photo must be smaller than 5 MB."
      );
      return;
    }
  }

  try {

    let photoPath = null;

    /* -------------------------------
       PHOTO UPLOAD
    -------------------------------- */

    if (file) {

      const safeName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

      photoPath =
        `${user.id}/${Date.now()}-${safeName}`;

      const {
        error
      } = await supabase.storage
        .from("complaint-photos")
        .upload(
          photoPath,
          file,
          {
            contentType: file.type,
            upsert: false
          }
        );

      if (error) {
        throw error;
      }
    }

    /* -------------------------------
       COMPLAINT INSERT
    -------------------------------- */

    const userName =
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Citizen";

    const {
      error
    } = await supabase
      .from("complaints")
      .insert({
        user_id: user.id,
        user_name: userName,
        user_email: user.email,
        category,
        priority,
        description,
        latitude:
          window.currentLocation.latitude,
        longitude:
          window.currentLocation.longitude,
        status: "Pending",
        photo_path: photoPath,
        reward_given: false
      });

    if (error) {

      if (photoPath) {
        await supabase.storage
          .from("complaint-photos")
          .remove([photoPath]);
      }

      throw error;
    }

    alert(
      "Complaint submitted successfully!"
    );

    if (e.target?.reset) {
      e.target.reset();
    }

    window.currentLocation = null;

    const locationText =
      document.getElementById(
        "locationText"
      );

    if (locationText) {
      locationText.textContent =
        "Location not selected";
    }

    await loadCitizenComplaints();
    await loadCitizenWallet();

    showPage("dashboard");

  } catch (error) {
    console.error(
      "Complaint submission error:",
      error
    );

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

  const user =
    await getCurrentUser();

  if (!user) return;

  const container =
    document.getElementById(
      "citizenComplaints"
    );

  if (!container) return;

  container.innerHTML =
    "Loading complaints...";

  try {

    const {
      data,
      error
    } = await supabase
      .from("complaints")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false
      });

    if (error) throw error;

    const complaints =
      data || [];

    container.innerHTML = "";

    let pending = 0;
    let resolved = 0;

    complaints.forEach(complaint => {

      if (
        complaint.status ===
        "Pending"
      ) {
        pending++;
      }

      if (
        complaint.status ===
        "Resolved"
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
              complaint.category ||
              "Complaint"
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

          <span class="complaint-desc" data-original="${escapeHtml(complaint.description || "")}">
            ${escapeHtml(
              complaint.description ||
              ""
            )}
          </span>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:6px;">
            ${getSlaBadge(complaint.created_at, complaint.status)}
            <button type="button" class="trans-btn" onclick="toggleTranslation(this)">🌐 Translate</button>
          </div>
        </div>

        <span class="tag ${statusClass(
          complaint.status
        )}">
          ${escapeHtml(
            complaint.status ||
            "Pending"
          )}
        </span>
      `;

      container.appendChild(row);
    });

    if (complaints.length === 0) {
      container.innerHTML =
        "<p>No complaints submitted yet.</p>";
    }

    setText(
      "totalComplaints",
      complaints.length
    );

    setText(
      "pendingComplaints",
      pending
    );

    setText(
      "resolvedComplaints",
      resolved
    );

    addCitizenMapMarkers(
      complaints
    );

  } catch (error) {

    console.error(error);

    container.innerHTML =
      "<p>Unable to load complaints.</p>";
  }
}

/* =====================================================
   CITIZEN MAP MARKERS
===================================================== */

function addCitizenMapMarkers(
  complaints
) {
  if (!complaintMap) return;

  complaintMarkers.forEach(
    marker => marker.remove()
  );

  complaintMarkers = [];

  complaints.forEach(complaint => {

    const lat =
      Number(complaint.latitude);

    const lng =
      Number(complaint.longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    const marker =
      L.marker([
        lat,
        lng
      ]).addTo(complaintMap);

    marker.bindPopup(`
      <strong>
        ${escapeHtml(
          complaint.category ||
          "Complaint"
        )}
      </strong>
      <br>
      Status:
      ${escapeHtml(
        complaint.status ||
        "Pending"
      )}
    `);

    complaintMarkers.push(marker);
  });
}

/* =====================================================
   WALLET
===================================================== */

async function loadCitizenWallet() {

  const user =
    await getCurrentUser();

  if (!user) return;

  const wallet =
    document.getElementById(
      "walletCredits"
    );

  if (!wallet) return;

  try {

    const {
      data,
      error
    } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    wallet.textContent =
      data?.credits ?? 0;

  } catch (error) {

    console.error(
      "Wallet error:",
      error
    );

    wallet.textContent = "0";
  }
}

/* =====================================================
   AGENT DASHBOARD
===================================================== */
let agentComplaintMap = null;
let agentComplaintMarkers = [];

async function initAgentComplaintMap() {

  const mapElement =
    document.getElementById("agentComplaintMap");

  if (!mapElement) {
    return;
  }

  try {

    const {
      data: complaints,
      error
    } = await supabase
      .from("complaints")
      .select(
        "id, category, description, latitude, longitude, status"
      )
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) {
      console.error(
        "Agent map complaints error:",
        error
      );
      return;
    }

    if (!agentComplaintMap) {

      agentComplaintMap =
        L.map("agentComplaintMap")
          .setView(
            [20.5937, 78.9629],
            5
          );

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            "&copy; OpenStreetMap contributors"
        }
      ).addTo(agentComplaintMap);

    }

    agentComplaintMarkers.forEach(
      marker => marker.remove()
    );

    agentComplaintMarkers = [];

    const bounds = [];

    complaints.forEach(
      complaint => {

        const latitude =
          Number(complaint.latitude);

        const longitude =
          Number(complaint.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return;
        }

        const marker =
          L.marker([
            latitude,
            longitude
          ]).addTo(agentComplaintMap);

        marker.bindPopup(`
          <strong>
            ${escapeHtml(
              complaint.category ||
              "Complaint"
            )}
          </strong>

          <br>

          Status:
          ${escapeHtml(
            complaint.status ||
            "Pending"
          )}

          <br>

          ${escapeHtml(
            complaint.description ||
            "No description"
          )}

          <br><br>

          📍 ${latitude.toFixed(5)},
          ${longitude.toFixed(5)}
        `);

        agentComplaintMarkers.push(
          marker
        );

        bounds.push([
          latitude,
          longitude
        ]);

      }
    );

    if (bounds.length > 0) {

      agentComplaintMap.fitBounds(
        bounds,
        {
          padding: [30, 30],
          maxZoom: 15
        }
      );

    }

    setTimeout(() => {

      agentComplaintMap.invalidateSize();

    }, 300);

  } catch (error) {

    console.error(
      "Agent map error:",
      error
    );

  }
}
async function loadAgentDashboard() {

  const container =
    document.getElementById(
      "agentComplaints"
    );

  if (!container) return;

  container.innerHTML =
    "Loading complaints...";

  try {

    const profile =
      await getCurrentProfile();

    if (profile?.role !== "agent") {
      throw new Error(
        "Only agents can access this dashboard."
      );
    }

    const {
      data,
      error
    } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) throw error;

    const complaints =
      data || [];

    container.innerHTML = "";

    updateAgentStats(
      complaints
    );

    if (complaints.length === 0) {

      container.innerHTML =
        "<p>No complaints submitted yet.</p>";

    } else {

      for (
        const complaint of complaints
      ) {
        const card =
          await createAgentCard(
            complaint
          );

        container.appendChild(card);
      }
    }

    await initAgentComplaintMap();

  } catch (error) {

    console.error(error);

    container.innerHTML =
      "<p>Unable to load complaints.</p>";
  }
}

/* =====================================================
   AGENT STATS
===================================================== */

function updateAgentStats(
  complaints
) {

  const pending =
    complaints.filter(
      c => c.status === "Pending"
    ).length;

  const review =
    complaints.filter(
      c =>
        c.status ===
        "Under Review"
    ).length;

  const progress =
    complaints.filter(
      c =>
        c.status ===
        "In Progress"
    ).length;

  const resolved =
    complaints.filter(
      c =>
        c.status ===
        "Resolved"
    ).length;

  const total =
    complaints.length;

  setFirstText(
    [
      "agentTotalComplaints",
      "totalAgentComplaints"
    ],
    total
  );

  setFirstText(
    [
      "agentPendingComplaints",
      "pendingAgentComplaints"
    ],
    pending
  );

  setFirstText(
    [
      "agentInProgressComplaints",
      "inProgressAgentComplaints"
    ],
    progress
  );

  setFirstText(
    [
      "agentResolvedComplaints",
      "resolvedAgentComplaints"
    ],
    resolved
  );
}

/* =====================================================
   AGENT CARD
===================================================== */

async function createAgentCard(complaint) {

  let submittedDate = "";

  if (complaint.created_at) {
    try {
      submittedDate =
        new Date(
          complaint.created_at
        ).toLocaleString();
    } catch {
      submittedDate = "";
    }
  }

  const category =
    escapeHtml(
      complaint.category ||
      "Complaint"
    );

  const description =
    escapeHtml(
      complaint.description ||
      "No description provided."
    );

  const priority =
    escapeHtml(
      complaint.priority ||
      "Normal"
    );

  const citizenName =
    escapeHtml(
      complaint.user_name ||
      "Citizen"
    );

  const citizenEmail =
    escapeHtml(
      complaint.user_email ||
      "Email unavailable"
    );

  const latitude =
    Number(
      complaint.latitude || 0
    ).toFixed(5);

  const longitude =
    Number(
      complaint.longitude || 0
    ).toFixed(5);

  let photoHtml = `
    <div class="agent-empty-photo">
      📷 No photo attached
    </div>
  `;

  if (complaint.photo_path) {

    const {
      data: photoData,
      error: photoError
    } = await supabase.storage
      .from("complaint-photos")
      .createSignedUrl(
        complaint.photo_path,
        3600
      );

    if (
      !photoError &&
      photoData?.signedUrl
    ) {

      const url =
        escapeHtml(
          photoData.signedUrl
        );

      photoHtml = `
        <a
          href="${url}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="${url}"
            alt="Complaint evidence"
            class="agent-evidence-image"
          >
        </a>

        <a
          href="${url}"
          target="_blank"
          rel="noopener noreferrer"
          class="agent-photo-link"
        >
          Click to view full photo
        </a>
      `;

    } else {

      photoHtml = `
        <div class="agent-empty-photo">
          📷 Photo unavailable
        </div>
      `;
    }
  }

  const card =
    document.createElement("div");

  card.className =
    "agent-complaint-card";

  const status =
    complaint.status ||
    "Pending";

  card.innerHTML = `

    <!-- COMPLAINT -->

    <div class="agent-card-section">

      <span class="agent-card-label">
        Complaint
      </span>

      <div class="agent-card-title">
        ${category}
      </div>

      ${
        submittedDate
          ? `
            <div style="
              font-size:12px;
              color:#7a8580;
              margin-bottom:10px;
            ">
              Submitted:
              ${escapeHtml(submittedDate)}
            </div>
          `
          : ""
      }

      <div class="agent-card-description" data-original="${escapeHtml(description)}">
        ${description}
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:6px;">
        ${getSlaBadge(complaint.created_at, complaint.status)}
        <button type="button" class="trans-btn" onclick="toggleTranslation(this)">🌐 Translate</button>
      </div>

      <span class="agent-priority">
        ⚠️ ${priority} Priority
      </span>

    </div>


    <!-- CITIZEN + LOCATION -->

    <div>

      <div
        class="agent-card-section"
        style="margin-bottom:14px;"
      >

        <span class="agent-card-label">
          Citizen Details
        </span>

        <div class="agent-card-info">
          👤 ${citizenName}
        </div>

        <div
          class="agent-card-info"
          style="margin-top:4px;"
        >
          ✉️ ${citizenEmail}
        </div>

      </div>


      <div class="agent-card-section">

        <span class="agent-card-label">
          Location
        </span>

        <div class="agent-card-info">
          📍 Latitude: ${latitude}
        </div>

        <div class="agent-card-info">
          Longitude: ${longitude}
        </div>

      </div>

    </div>


    <!-- EVIDENCE PHOTO -->

    <div class="agent-card-section">

      <span class="agent-card-label">
        Evidence Photo
      </span>

      ${photoHtml}

    </div>


    <!-- STATUS -->

    <div
      class="agent-card-section agent-status-section"
    >

      <span class="agent-card-label">
        Status
      </span>

      <select
        class="agent-status-select"
      >

        <option
          value="Pending"
          ${status === "Pending" ? "selected" : ""}
        >
          Pending
        </option>

        <option
          value="Under Review"
          ${status === "Under Review" ? "selected" : ""}
        >
          Under Review
        </option>

        <option
          value="In Progress"
          ${status === "In Progress" ? "selected" : ""}
        >
          In Progress
        </option>

        <option
          value="Resolved"
          ${status === "Resolved" ? "selected" : ""}
        >
          Resolved
        </option>

      </select>

    </div>

  `;

  const select =
    card.querySelector(
      ".agent-status-select"
    );

  if (select) {

    select.addEventListener(
      "change",
      () => {

        updateComplaintStatus(
          complaint.id,
          select.value
        );

      }
    );

  }

  return card;
}

/* =====================================================
   UPDATE STATUS
===================================================== */

async function updateComplaintStatus(
  complaintId,
  newStatus
) {

  try {

    const profile =
      await getCurrentProfile();

    if (profile?.role !== "agent") {
      throw new Error(
        "Only agents can update complaints."
      );
    }

    if (
      newStatus ===
      "Resolved"
    ) {

      const {
        error
      } = await supabase.rpc(
        "resolve_complaint",
        {
          complaint_id:
            complaintId
        }
      );

      if (error) throw error;

      alert(
        "Complaint resolved.\n\n" +
        "50 credits awarded to the citizen."
      );

    } else {

      const {
        error
      } = await supabase
        .from("complaints")
        .update({
          status: newStatus
        })
        .eq(
          "id",
          complaintId
        );

      if (error) throw error;

      alert(
        "Complaint status updated."
      );
    }

    await loadAgentDashboard();

  } catch (error) {

    console.error(error);

    alert(
      "Status update failed.\n\n" +
      error.message
    );

    await loadAgentDashboard();
  }
}

/* =====================================================
   AGENT MAP
===================================================== */

function initAgentMap() {

  const element =
    document.getElementById(
      "agentComplaintMap"
    );

  if (
    !element ||
    typeof L === "undefined"
  ) {
    return;
  }

  if (agentMap) {
    setTimeout(() => {
      agentMap.invalidateSize();
    }, 100);

    return;
  }

  agentMap =
    L.map(
      "agentComplaintMap"
    ).setView(
      [20.5937, 78.9629],
      5
    );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(agentMap);

  setTimeout(() => {
    agentMap.invalidateSize();
  }, 200);
}

function addAgentMapMarkers(
  complaints
) {

  if (!agentMap) return;

  agentMarkers.forEach(
    marker => marker.remove()
  );

  agentMarkers = [];

  const valid =
    complaints.filter(
      complaint =>
        Number.isFinite(
          Number(
            complaint.latitude
          )
        ) &&
        Number.isFinite(
          Number(
            complaint.longitude
          )
        )
    );

  valid.forEach(complaint => {

    const lat =
      Number(
        complaint.latitude
      );

    const lng =
      Number(
        complaint.longitude
      );

    const marker =
      L.marker([
        lat,
        lng
      ]).addTo(agentMap);

    marker.bindPopup(`
      <strong>
        ${escapeHtml(
          complaint.category ||
          "Complaint"
        )}
      </strong>

      <br>

      Status:
      ${escapeHtml(
        complaint.status ||
        "Pending"
      )}

      <br>

      Citizen:
      ${escapeHtml(
        complaint.user_name ||
        "Citizen"
      )}
    `);

    agentMarkers.push(
      marker
    );
  });

  if (valid.length === 1) {

    agentMap.setView(
      [
        Number(
          valid[0].latitude
        ),
        Number(
          valid[0].longitude
        )
      ],
      15
    );

  } else if (valid.length > 1) {

    const bounds =
      L.latLngBounds(
        valid.map(c => [
          Number(c.latitude),
          Number(c.longitude)
        ])
      );

    agentMap.fitBounds(
      bounds,
      {
        padding: [
          30,
          30
        ],
        maxZoom: 15
      }
    );
  }
}

/* =====================================================
   HELPERS
===================================================== */

function setText(
  id,
  value
) {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function setFirstText(
  ids,
  value
) {
  for (const id of ids) {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        value;

      return;
    }
  }
}

function statusClass(
  status
) {
  return String(
    status ||
    "Pending"
  )
    .toLowerCase()
    .replace(
      /\s+/g,
      "-"
    );
}

function escapeHtml(
  value
) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

/* =====================================================
   AUTH STATE
===================================================== */

supabase.auth.onAuthStateChange(
  (event, session) => {

    console.log(
      "Supabase auth:",
      event
    );

    if (
      event ===
      "SIGNED_OUT"
    ) {
      window.currentLocation =
        null;

      showPage("home");
    }
  }
);

/* =====================================================
   MAKE FUNCTIONS AVAILABLE TO HTML
===================================================== */

window.showPage =
  showPage;

window.login =
  login;

window.agentLogin =
  agentLogin;

window.signup =
  signup;

window.logout =
  logout;

window.getLocation =
  getLocation;

window.submitComplaint =
  submitComplaint;

window.updateComplaintStatus =
  updateComplaintStatus;

window.initLocationMap =
  initLocationMap;

window.initComplaintMap =
  initComplaintMap;

window.initAgentMap =
  initAgentMap;

window.loadCitizenComplaints =
  loadCitizenComplaints;

window.loadCitizenWallet =
  loadCitizenWallet;

window.loadAgentDashboard =
  loadAgentDashboard;

/* =====================================================
   INITIAL PAGE
===================================================== */

(async function initialize() {

  const user =
    await getCurrentUser();

  if (!user) {
    return;
  }

  const profile =
    await getCurrentProfile();

  if (
    profile?.role ===
    "agent"
  ) {

    await loadAgentDashboard();
    showPage(
      "agentDashboard"
    );

  } else {

    setUserName(user);

    await loadCitizenComplaints();
    await loadCitizenWallet();

    showPage(
      "dashboard"
    );
  }

})();