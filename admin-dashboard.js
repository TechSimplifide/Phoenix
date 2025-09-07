      /* ================= CONFIG ================= */
      const API_BASE = "https://library-management-b0nw.onrender.com/api";
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "login.html";
      }
      const HEADERS = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      });

      /* ================= STATE ================= */
      const state = { books: [], users: [], borrows: [], profile: null };
      let editingBookId = null;

      /* ================= HELPERS ================= */
      function toast(msg, ttl = 2200) {
        const wrap = document.getElementById("toasts");
        const el = document.createElement("div");
        el.className = "toast";
        el.textContent = msg;
        wrap.appendChild(el);
        setTimeout(() => {
          el.style.opacity = "0";
          el.style.transform = "translateY(6px)";
        }, ttl - 400);
        setTimeout(() => el.remove(), ttl);
      }
      function esc(s) {
        if (s == null) return "";
        return String(s).replace(
          /[&<>"'`=\/]/g,
          (ch) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
              "/": "&#x2F;",
              "`": "&#x60;",
            }[ch])
        );
      }
      function fmt(d) {
        if (!d) return "—";
        try {
          return new Date(d).toLocaleDateString();
        } catch (e) {
          return "—";
        }
      }

      /* ================= API wrappers ================= */
      async function apiGet(path) {
        const res = await fetch(`${API_BASE}${path}`, { headers: HEADERS() });
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "login.html";
        }
        if (!res.ok) throw await res.json().catch(() => new Error("API error"));
        return res.json();
      }
      async function apiPost(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: HEADERS(),
          body: JSON.stringify(body),
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "login.html";
        }
        if (!res.ok) throw await res.json().catch(() => new Error("API error"));
        return res.json();
      }
      async function apiPut(path, body) {
        const res = await fetch(`${API_BASE}${path}`, {
          method: "PUT",
          headers: HEADERS(),
          body: JSON.stringify(body),
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "login.html";
        }
        if (!res.ok) throw await res.json().catch(() => new Error("API error"));
        return res.json();
      }
      async function apiDelete(path) {
        const res = await fetch(`${API_BASE}${path}`, {
          method: "DELETE",
          headers: HEADERS(),
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "login.html";
        }
        if (!res.ok) throw await res.json().catch(() => new Error("API error"));
        return res.json();
      }

      /* ================= RENDERERS ================= */
      function renderKPIs() {
        const totalQty = state.books.reduce(
          (s, b) => s + (Number(b.quantity) || 0),
          0
        );
        const totalUsers = state.users.length;
        const activeBorrows = state.borrows.filter(
          (r) => r.status === "active"
        ).length;
        const totalFines = state.borrows.reduce(
          (s, r) => s + (Number(r.fine) || 0),
          0
        );
        document.getElementById("k_totalBooks").textContent = totalQty;
        document.getElementById("k_totalUsers").textContent = totalUsers;
        document.getElementById("k_totalBorrows").textContent = activeBorrows;
        document.getElementById("k_totalFines").textContent = totalFines;
      }

      function renderBooks(filter = "ALL", q = "") {
        const tbody = document.querySelector("#booksTable tbody");
        tbody.innerHTML = "";
        let rows = [...state.books];
        if (filter === "AVAILABLE")
          rows = rows.filter((b) => (b.quantity || 0) > 0);
        if (filter === "OUT")
          rows = rows.filter((b) => (b.quantity || 0) === 0);
        if (q)
          rows = rows.filter((b) =>
            (b.title + " " + (b.author || "") + " " + (b.subject || ""))
              .toLowerCase()
              .includes(q.toLowerCase())
          );
        rows.forEach((b) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${esc(b.title)}</td>
      <td>${esc(b.author || "-")}</td>
      <td>${esc(b.subject || "-")}</td>
      <td>${b.quantity ?? 0}</td>
      <td class="tbl-actions">
        <button class="tbl-btn edit" data-act="edit" data-id="${
          b._id
        }">Edit</button>
        <button class="tbl-btn delete" data-act="delete" data-id="${
          b._id
        }">Delete</button>
      </td>`;
          tbody.appendChild(tr);
        });
      }

      function renderUsers(q = "") {
        const adminsT = document.querySelector("#adminsTable tbody");
        adminsT.innerHTML = "";
        const studentsT = document.querySelector("#studentsTable tbody");
        studentsT.innerHTML = "";
        const rows = state.users.filter(
          (u) =>
            !q ||
            (u.name + " " + u.email + " " + (u.role || ""))
              .toLowerCase()
              .includes(q.toLowerCase())
        );
        rows
          .filter((u) => u.role === "admin")
          .forEach((u) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${esc(u.name)}</td><td>${esc(
              u.email
            )}</td><td><button class="tbl-btn delete" data-act="deleteUser" data-id="${
              u._id
            }">Delete</button></td>`;
            adminsT.appendChild(tr);
          });
        rows
          .filter((u) => u.role !== "admin")
          .forEach((u) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${esc(u.name)}</td><td>${esc(
              u.email
            )}</td><td><button class="tbl-btn delete" data-act="deleteUser" data-id="${
              u._id
            }">Delete</button></td>`;
            studentsT.appendChild(tr);
          });
      }

      function renderBorrows(q = "") {
        const tbody = document.querySelector("#borrowTable tbody");
        tbody.innerHTML = "";
        let rows = [...state.borrows];
        if (q)
          rows = rows.filter((r) =>
            (
              (r.userId?.name || "") +
              " " +
              (r.bookId?.title || "") +
              " " +
              (r.status || "")
            )
              .toLowerCase()
              .includes(q.toLowerCase())
          );
        rows.forEach((r) => {
          const uid = r.userId?.name || r.userId || "—";
          const btitle = r.bookId?.title || r.bookId || "—";
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${esc(uid)}</td><td>${esc(btitle)}</td><td>${fmt(
            r.issueDate
          )}</td><td>${fmt(r.dueDate)}</td><td>${fmt(
            r.returnDate
          )}</td><td>${esc(r.status)}</td><td>${r.fine ?? 0}</td>
      <td><button class="tbl-btn delete" data-act="deleteBorrow" data-id="${
        r._id
      }">Delete</button></td>`;
          tbody.appendChild(tr);
        });
      }

      function renderProfile() {
        if (!state.profile) return;
        document.getElementById("pname").textContent =
          state.profile.name || "-";
        document.getElementById("pemail").textContent =
          state.profile.email || "-";
        document.getElementById("prole").textContent =
          state.profile.role || "-";
      }

      /* ================= LOAD DATA ================= */
      async function loadAll() {
        try {
          const [booksRes, usersRes, borrowsRes, profileRes] =
            await Promise.all([
              apiGet("/books"),
              apiGet("/users"),
              apiGet("/borrow"),
              apiGet("/users/profile"),
            ]);
          state.books = Array.isArray(booksRes)
            ? booksRes
            : booksRes?.data || [];
          state.users =
            usersRes?.users || (Array.isArray(usersRes) ? usersRes : []);
          state.borrows = Array.isArray(borrowsRes)
            ? borrowsRes
            : borrowsRes?.data || [];
          state.profile = profileRes || null;
          renderKPIs();
          renderBooks();
          renderUsers();
          renderBorrows();
          renderProfile();
        } catch (err) {
          console.error("loadAll", err);
          toast("Failed to load data — check console");
        }
      }

      /* ================= UI popups & confirm ================= */
      function openOverlay() {
        document.getElementById("overlay").style.display = "flex";
      }
      function closeOverlay() {
        document.getElementById("overlay").style.display = "none";
      }
      function openBookPopup(book = null) {
        editingBookId = book?._id || null;
        document.getElementById("b_title").value = book?.title || "";
        document.getElementById("b_author").value = book?.author || "";
        document.getElementById("b_subject").value = book?.subject || "";
        document.getElementById("b_quantity").value = book?.quantity ?? "";
        document.getElementById("bookPopup").style.display = "block";
        openOverlay();
      }
      function closeBookPopup() {
        document.getElementById("bookPopup").style.display = "none";
        closeOverlay();
      }
      function openAdminPopup() {
        document.getElementById("a_name").value = "";
        document.getElementById("a_email").value = "";
        document.getElementById("a_password").value = "";
        document.getElementById("adminPopup").style.display = "block";
        openOverlay();
      }
      function closeAdminPopup() {
        document.getElementById("adminPopup").style.display = "none";
        closeOverlay();
      }

      function confirmDialog(title, html = "") {
        return new Promise((resolve) => {
          const modal = document.getElementById("confirmModal");
          document.getElementById(
            "confirmBody"
          ).innerHTML = `<h3 style="margin:0 0 8px 0">${title}</h3>${html}`;
          modal.style.display = "block";
          openOverlay();
          const ok = document.getElementById("confirmOk"),
            cancel = document.getElementById("confirmCancel");
          function cleanup() {
            modal.style.display = "none";
            ok.removeEventListener("click", onOk);
            cancel.removeEventListener("click", onCancel);
            closeOverlay();
          }
          function onOk() {
            cleanup();
            resolve(true);
          }
          function onCancel() {
            cleanup();
            resolve(false);
          }
          ok.addEventListener("click", onOk);
          cancel.addEventListener("click", onCancel);
        });
      }

      /* ================= CRUD flows ================= */
      /* Book create/edit */
      document
        .getElementById("openAddBook")
        .addEventListener("click", () => openBookPopup(null));
      document
        .getElementById("bookCancel")
        .addEventListener("click", () => closeBookPopup());
      document
        .getElementById("bookSave")
        .addEventListener("click", async () => {
          const title = document.getElementById("b_title").value.trim();
          if (!title) {
            toast("Title required");
            return;
          }
          const payload = {
            title,
            author: document.getElementById("b_author").value.trim(),
            subject: document.getElementById("b_subject").value.trim(),
            quantity: Number(document.getElementById("b_quantity").value || 0),
          };
          try {
            if (editingBookId) {
              const idx = state.books.findIndex((b) => b._id === editingBookId);
              const old = state.books[idx];
              state.books[idx] = { ...old, ...payload };
              renderBooks();
              renderKPIs();
              await apiPut(`/books/${editingBookId}`, payload);
              toast("Book updated");
            } else {
              const created = await apiPost("/books", payload);
              state.books.unshift(created || payload);
              renderBooks();
              renderKPIs();
              toast("Book created");
            }
          } catch (err) {
            console.error("save book", err);
            toast("Save failed");
            await loadAll();
          } finally {
            closeBookPopup();
          }
        });

      /* Create admin (inside Users) */
      document
        .getElementById("openCreateAdmin")
        .addEventListener("click", () => openAdminPopup());
      document
        .getElementById("adminCancel")
        .addEventListener("click", () => closeAdminPopup());
      document
        .getElementById("adminSave")
        .addEventListener("click", async () => {
          const name = document.getElementById("a_name").value.trim();
          const email = document.getElementById("a_email").value.trim();
          const password = document.getElementById("a_password").value;
          if (!name || !email || !password) {
            toast("Complete all fields");
            return;
          }
          try {
            const res = await apiPost("/auth/create-admin", {
              name,
              email,
              password,
            });
            toast(res?.message || "Admin created");
            closeAdminPopup();
            await loadAll();
          } catch (err) {
            console.error("create admin", err);
            toast("Create admin failed");
          }
        });

      /* delegated actions (edit/delete for books, delete user, delete borrow) */
      document.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const act = btn.dataset.act;
        const id = btn.dataset.id;

        if (act === "edit") {
          const book = state.books.find((b) => b._id === id);
          if (!book) {
            toast("Book not found");
            return;
          }
          openBookPopup(book);
        } else if (act === "delete") {
          const ok = await confirmDialog(
            "Delete Book",
            "<p>Delete this book permanently?</p>"
          );
          if (!ok) return;
          const i = state.books.findIndex((b) => b._id === id);
          if (i >= 0) {
            const removed = state.books.splice(i, 1)[0];
            renderBooks();
            renderKPIs();
            try {
              await apiDelete(`/books/${id}`);
              toast("Book deleted");
            } catch (err) {
              state.books.splice(i, 0, removed);
              renderBooks();
              renderKPIs();
              console.error(err);
              toast("Delete failed");
            }
          }
        } else if (act === "deleteUser") {
          const ok = await confirmDialog(
            "Delete User",
            "<p>Delete this user permanently?</p>"
          );
          if (!ok) return;
          const i = state.users.findIndex((u) => u._id === id);
          if (i >= 0) {
            const removed = state.users.splice(i, 1)[0];
            renderUsers();
            renderKPIs();
            try {
              await apiDelete(`/users/${id}`);
              toast("User deleted");
            } catch (err) {
              state.users.splice(i, 0, removed);
              renderUsers();
              renderKPIs();
              console.error(err);
              toast("Delete failed");
            }
          }
        } else if (act === "deleteBorrow") {
          const ok = await confirmDialog(
            "Delete Borrow",
            "<p>Remove this borrow record?</p>"
          );
          if (!ok) return;
          const i = state.borrows.findIndex((b) => b._id === id);
          if (i >= 0) {
            const removed = state.borrows.splice(i, 1)[0];
            renderBorrows();
            renderKPIs();
            try {
              await apiDelete(`/borrow/${id}`);
              toast("Borrow removed");
            } catch (err) {
              state.borrows.splice(i, 0, removed);
              renderBorrows();
              renderKPIs();
              console.error(err);
              toast("Delete failed");
            }
          }
        }
      });

      /* ================= Search & filters ================= */
      document
        .getElementById("bookFilter")
        .addEventListener("change", () =>
          renderBooks(
            document.getElementById("bookFilter").value,
            document.getElementById("booksSearch").value
          )
        );
      document
        .getElementById("booksSearch")
        .addEventListener("input", (e) =>
          renderBooks(
            document.getElementById("bookFilter").value,
            e.target.value
          )
        );
      document
        .getElementById("usersSearch")
        .addEventListener("input", (e) => renderUsers(e.target.value));
      document
        .getElementById("borrowSearch")
        .addEventListener("input", (e) => renderBorrows(e.target.value));

      /* ================= Navigation & bottom nav ================= */
      function showRoute(route) {
        document
          .querySelectorAll(".nav a")
          .forEach((a) =>
            a.classList.toggle("active", a.dataset.route === route)
          );
        document.getElementById("pageTitle").textContent =
          route.charAt(0).toUpperCase() + route.slice(1);
        ["dashboard", "books", "users", "borrow", "profile"].forEach(
          (id) =>
            (document.getElementById(id).style.display =
              id === route ? "block" : "none")
        );
        closeBookPopup();
        closeAdminPopup();
      }

      document.querySelectorAll(".nav a").forEach((a) =>
        a.addEventListener("click", (ev) => {
          ev.preventDefault();
          showRoute(a.dataset.route);
        })
      );
      document.querySelectorAll("#bottomNav .bn-btn").forEach((b) =>
        b.addEventListener("click", (ev) => {
          const route = b.dataset.route;
          showRoute(route);
        })
      );

      /* ================= Logout ================= */
      document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("token");
        toast("Logged out");
        setTimeout(() => (window.location.href = "login.html"), 700);
      });

      /* overlay click to close */
      document.getElementById("overlay").addEventListener("click", (e) => {
        if (e.target === document.getElementById("overlay")) {
          closeBookPopup();
          closeAdminPopup();
          const cm = document.getElementById("confirmModal");
          if (cm) cm.style.display = "none";
          closeOverlay();
        }
      });

      /* ================= INIT ================= */
      (async function init() {
        const start = location.hash.replace("#", "") || "dashboard";
        showRoute(start);
        await loadAll();
      })();