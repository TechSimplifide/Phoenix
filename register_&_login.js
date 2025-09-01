// // ========== PASSWORD TOGGLE FUNCTION ==========
// const setupPasswordToggle = (inputId, toggleId) => {
//   const input = document.getElementById(inputId);
//   const toggle = document.getElementById(toggleId);

// const { use } = require("react");

//   if (input && toggle) {
//     toggle.addEventListener("click", () => {
//       const isPassword = input.type === "password";
//       input.type = isPassword ? "text" : "password";
//       toggle.src = isPassword ? "./src/eye-open.png" : "./src/eye-closed.png";
//     });
//   }
// };

// // Register page (password + confirm)
// setupPasswordToggle("password", "togglePass");
// setupPasswordToggle("confirmPassword", "toggleConfirm");

// // Login page (only password)
// setupPasswordToggle("loginPassword", "toggleLoginPass");

// // ========== REGISTER FORM VALIDATION ==========
// const registerForm = document.getElementById("registerForm");
// if (registerForm) {
//   registerForm.addEventListener("submit", (e) => {
//     e.preventDefault();

//     const password = document.getElementById("password").value.trim();
//     const confirmPassword = document
//       .getElementById("confirmPassword")
//       .value.trim();

//     if (password !== confirmPassword) {
//       alert("Passwords do not match!");
//       return;
//     }
//     if (password.length < 8) {
//       alert("Password must be at least 8 characters!");
//       return;
//     }

//     alert("Registration successful!");
//     // TODO: send data to backend
//   });
// }

// // ========== LOGIN FORM VALIDATION (optional) ==========
// const loginForm = document.getElementById("loginForm");
// if (loginForm) {
//   loginForm.addEventListener("submit", (e) => {
//     e.preventDefault();

//     const password = document.getElementById("loginPassword").value.trim();
//     if (password.length < 8) {
//       alert("Password must be at least 8 characters!");
//       return;
//     }

//     alert("Login successful!");
//     // TODO: send data to backend
//   });
// }

// ========== PASSWORD TOGGLE ==========
const setupPasswordToggle = (inputId, toggleId) => {
  const input = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);

  if (input && toggle) {
    toggle.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      toggle.src = isPassword ? "./src/eye-open.png" : "./src/eye-closed.png";
    });
  }
};

// Register page
setupPasswordToggle("password", "togglePass");
setupPasswordToggle("confirmPassword", "toggleConfirm");

// Login page
setupPasswordToggle("loginPassword", "toggleLoginPass");

// ========== REGISTER FORM ==========
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document
      .getElementById("confirmPassword")
      .value.trim();

    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all fields!");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (password.length < 8) {
      alert("Password must be at least 8 characters!");
      return;
    }

    try {
      const res = await fetch(
        "https://library-management-b0nw.onrender.com/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("Registration successful!");
        registerForm.reset();
        window.location.href = "./login.html"; // redirect to login
      } else {
        alert(data.message || "Registration failed!");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong!");
    }
  });
}

// ========== LOGIN FORM ==========
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      alert("Please fill all fields!");
      return;
    }

    try {
      const res = await fetch(
        "https://library-management-b0nw.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      // if (res.ok) {
      //   alert("Login successful!");
      //   localStorage.setItem("token", data.token); // save JWT token
      //   window.location.href = "./dashboard.html"; // redirect to dashboard
      // } else {
      //   alert(data.message || "Login failed!");
      // }

      if (res.ok) {
        alert("Login successful!");
        const { token, user } = data;
        localStorage.setItem("token", token);
        localStorage.setItem("userRole", user.role); // save role
        localStorage.setItem("userName", user.name);

        // Redirect based on role
        if (user.role === "admin") {
          window.location.href = "./admin-dashboard.html";
        } else if (user.role === "student") {
          window.location.href = "./student-dashboard.html";
        } else {
          alert(data.message || "Login failed!");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong!");
    }
  });
}
