function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}
function login(e){
  e.preventDefault();
  const email=document.getElementById("loginEmail").value;
  const name=email.split("@")[0].replace(/[._-]/g," ");
  document.getElementById("userName").textContent=name.replace(/\b\w/g,c=>c.toUpperCase()) || "Citizen";
  showPage("dashboard");
}
function signup(e){
  e.preventDefault();
  const name=document.getElementById("signupName").value || "Citizen";
  document.getElementById("userName").textContent=name;
  alert("Account created successfully! This is a prototype, so no real database is connected yet.");
  showPage("dashboard");
}
function getLocation(){
  const text=document.getElementById("locationText");
  if(!navigator.geolocation){
    text.textContent="Geolocation is not supported by this browser.";
    return;
  }
  text.textContent="Detecting your location...";
  navigator.geolocation.getCurrentPosition(
    pos=>text.textContent=`Latitude: ${pos.coords.latitude.toFixed(5)}, Longitude: ${pos.coords.longitude.toFixed(5)}`,
    ()=>text.textContent="Location permission denied. Demo location: Padur, Chennai"
  );
}
function submitComplaint(e){
  e.preventDefault();
  alert("Complaint submitted successfully! In the full version, this will be stored in the database and sent to the concerned authority.");
  showPage("dashboard");
}