// ========== NAVBAR HAMBURGER ==========
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navLinks.classList.toggle("active");
  document.body.classList.toggle("nav-open");
});

// Close menu when clicking on a nav link
document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navLinks.classList.remove("active");
    document.body.classList.remove("nav-open");
  });
});

// ========== NAVBAR SCROLL EFFECT ==========
const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar.style.background = "rgba(10, 25, 47, 0.95)";
    navbar.style.boxShadow = "0 5px 20px rgba(0,0,0,0.4)";
  } else {
    navbar.style.background = "rgba(10, 25, 47, 0.75)";
    navbar.style.boxShadow = "none";
  }
});

// ========== SMOOTH SCROLL ==========
document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", e => {
    const href = link.getAttribute("href");

    // Only smooth scroll if the link is an in-page anchor (#)
    if (href.startsWith("#")) {
      e.preventDefault();
      const targetId = href.substring(1);
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        window.scrollTo({
          top: targetSection.offsetTop - 80,
          behavior: "smooth"
        });
      }
    }
    // If it's an external page (like register.html), let it work normally
  });
});


