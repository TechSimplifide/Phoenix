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

function showMessage(message, type = "success", duration = 3000) {
  const box = document.getElementById("customMessageBox");
  const text = document.getElementById("messageText");
  const closeBtn = document.getElementById("closeMessage");

  text.textContent = message;
  box.className = `message-box ${type} show`;

  const timeoutId = setTimeout(() => {
    box.classList.remove("show");
  }, duration);

  closeBtn.onclick = () => {
    box.classList.remove("show");
    clearTimeout(timeoutId);
  };
}

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
      showMessage("Please fill all fields!", "error");
      return;
    }
    if (password !== confirmPassword) {
      showMessage("Passwords do not match!", "error");
      return;
    }
    if (password.length < 8) {
      showMessage("Password must be at least 8 characters!", "error");
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
        showMessage("Registration successful!", "success");
        registerForm.reset();
        setTimeout(() => {
          window.location.href = "./login.html"; // redirect to login
        }, 1500);
      } else {
        showMessage(data.message || "Registration failed!", "error");
      }
    } catch (err) {
      console.error(err);
      showMessage("Something went wrong. Please try again later.", "error");
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
      showMessage("Please fill all fields!", "error");
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

      if (res.ok) {
        showMessage("Login successful!", "success");
        const { token, user } = data;
        localStorage.setItem("token", token);
        localStorage.setItem("userRole", user.role); // save role
        localStorage.setItem("userName", user.name);

        // Redirect based on role
        if (user.role === "admin") {
          setTimeout(() => {
            window.location.href = "./admin-dashboard.html";
          }, 1500);
        } else if (user.role === "student") {
          setTimeout(() => {
            window.location.href = "./student-dashboard.html";
          }, 1500);
        }
      } else {
        showMessage(data.message || "Unknown role. Contact support.", "error");
      }
    } catch (err) {
      console.error(err);
      showMessage("Server error. Please try again later.", "error");
    }
  });
}
