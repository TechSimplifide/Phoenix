/* ================= CONFIG ================= */
const API = "https://library-management-b0nw.onrender.com/api";
const token = localStorage.getItem("token") || null; // if you store JWT after login
const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

const DAY = 24 * 60 * 60 * 1000;
const FINE_PER_DAY = 5,
  FINE_CAP = 200;

const request = async (url, opts = {}) => {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...authHeaders,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    throw new Error("Invalid JSON from API");
  }
  if (!res.ok) {
    const msg = data && data.message ? data.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
};

/* ================ STATE ================ */
const state = {
  route: "dashboard",
  profile: null,
  books: [],
  records: [],
  query: "",
  filters: { status: "ALL", subject: "ALL" },
};

/* ================ HELPERS ================ */
const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "-");
const today = () => new Date();
const calcFine = (dueISO, retISO) => {
  const due = new Date(dueISO),
    ret = new Date(retISO);
  const days = Math.max(0, Math.ceil((ret - due) / DAY));
  return Math.min(days * FINE_PER_DAY, FINE_CAP);
};
const statusChip = (s) => {
  if (s === "active") return `<span class="chip active">Active</span>`;
  if (s === "returned") return `<span class="chip returned">Returned</span>`;
  return `<span class="chip">${s}</span>`;
};
const subjectsFromBooks = (books) => {
  const set = new Set(books.map((b) => b.subject || "Uncategorized"));
  return ["ALL", ...Array.from(set)];
};
const matchQuery = (b, q) =>
  [b.title, b.author, b.subject]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes((q || "").toLowerCase());

/* ================ UI UTIL ================ */
const app = document.getElementById("app");
const toastBox = document.getElementById("toast");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalOk = document.getElementById("modalOk");
const modalCancel = document.getElementById("modalCancel");

const showToast = (msg) => {
  const el = document.createElement("div");
  el.className = "t";
  el.textContent = msg;
  toastBox.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
  }, 2200);
  setTimeout(() => el.remove(), 2700);
};

const confirmDialog = (title, html) =>
  new Promise((resolve) => {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.style.display = "flex";
    const ok = () => {
      cleanup();
      resolve(true);
    };
    const cancel = () => {
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      modal.style.display = "none";
      modalOk.removeEventListener("click", ok);
      modalCancel.removeEventListener("click", cancel);
      modal.removeEventListener("click", outside);
    };
    const outside = (e) => {
      if (e.target === modal) cancel();
    };
    modalOk.addEventListener("click", ok);
    modalCancel.addEventListener("click", cancel);
    modal.addEventListener("click", outside);
  });

/* ================ RENDERERS ================ */
const kpi = (label, value) =>
  `<div class="card"><div class="title">${label}</div><div class="value">${value}</div></div>`;

const renderDashboard = () => {
  const totalQty = state.books.reduce((s, b) => s + (b.quantity || 0), 0);
  const active = state.records.filter((r) => r.status === "active").length;
  const returned = state.records.filter((r) => r.status === "returned").length;
  const fines = state.records
    .filter((r) => r.status === "active" && new Date(r.dueDate) < today())
    .reduce((s, r) => s + calcFine(r.dueDate, today()), 0);

  const recent = state.records
    .slice()
    .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
    .slice(0, 6);

  return `
    <section class="section">
      <h2>Overview</h2>
      <div class="kpis">
        ${kpi("Books Available (total qty)", totalQty)}
        ${kpi("Active Loans", active)}
        ${kpi("Returned", returned)}
        ${kpi("Estimated Fines (₹)", fines)}
      </div>
    </section>

    <section class="section">
      <h2>Recent Activity</h2>
      <div class="activity">
        ${
          recent.length
            ? recent
                .map(
                  (r) =>
                    `<div class="act"><span>${
                      r.status === "returned" ? "📘 Return" : "📗 Issue"
                    }</span><span>${r.bookId?.title || "-"}</span><span>${fmt(
                      r.status === "returned" ? r.returnDate : r.issueDate
                    )}</span></div>`
                )
                .join("")
            : `<div class="act">No activity</div>`
        }
      </div>
    </section>
  `;
};

const renderCatalog = () => {
  const q = state.query || "";
  const st = state.filters.status;
  const subj = state.filters.subject;
  const subjects = subjectsFromBooks(state.books);

  let list = state.books.filter((b) => matchQuery(b, q));
  if (st !== "ALL") {
    if (st === "AVAILABLE") list = list.filter((b) => (b.quantity || 0) > 0);
    if (st === "OUT") list = list.filter((b) => (b.quantity || 0) === 0);
  }
  if (subj !== "ALL")
    list = list.filter((b) => (b.subject || "Uncategorized") === subj);

  return `
    <section class="section">
      <h2>Catalog</h2>
      <div class="tools">
        <input id="q" placeholder="Search title/author/subject" value="${q}" />
        <select id="fStatus">${["ALL", "AVAILABLE", "OUT"]
          .map((s) => `<option ${s === st ? "selected" : ""}>${s}</option>`)
          .join("")}</select>
        <select id="fSubject">${subjects
          .map((s) => `<option ${s === subj ? "selected" : ""}>${s}</option>`)
          .join("")}</select>
      </div>

      <div class="grid" id="bookGrid">
        ${list
          .map(
            (b) => `
          <div class="card book">
            <div>
              <div class="row"><h4>${b.title}</h4><span class="chip ${
              (b.quantity || 0) > 0 ? "avail" : "out"
            }">${
              (b.quantity || 0) > 0 ? "Available" : "Out of stock"
            }</span></div>
              <div class="row"><span class="muted">by ${
                b.author || "-"
              }</span><span class="muted">Qty: ${b.quantity ?? 0}</span></div>
              <div class="muted mb8">${b.subject ? "#" + b.subject : ""}</div>
            </div>
            <div class="row">
              <button class="btn" data-act="issue" data-id="${b._id}" ${
              (b.quantity || 0) <= 0 ? "disabled" : ""
            }>Issue</button>
              <button class="btn secondary" data-act="details" data-id="${
                b._id
              }">Details</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </section>
  `;
};

const renderLoans = () => {
  const active = state.records.filter((r) => r.status === "active");
  return `
    <section class="section">
      <h2>My Active Loans</h2>
      <div class="card">
        <table aria-label="Active loans">
          <thead><tr><th>Book</th><th>Issued On</th><th>Due</th><th>Actions</th></tr></thead>
          <tbody>
            ${
              active.length
                ? active
                    .map((l) => {
                      const isOver = new Date(l.dueDate) < today();
                      return `<tr>
                <td>${l.bookId?.title || "-"}</td>
                <td>${fmt(l.issueDate)}</td>
                <td><span class="chip ${isOver ? "out" : "active"}">${fmt(
                        l.dueDate
                      )}${isOver ? " • Overdue" : ""}</span></td>
                <td><button class="btn" data-act="return" data-id="${
                  l._id
                }">Return</button></td>
              </tr>`;
                    })
                    .join("")
                : '<tr><td colspan="4">No active loans</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
};

const renderHistory = () => {
  return `
    <section class="section">
      <h2>Transaction History</h2>
      <div class="card">
        <table aria-label="History">
          <thead><tr><th>Book</th><th>Status</th><th>Issue Date</th><th>Due Date</th><th>Return Date</th></tr></thead>
          <tbody>
            ${
              state.records.length
                ? state.records
                    .slice()
                    .reverse()
                    .map(
                      (r) => `<tr>
              <td>${r.bookId?.title || "-"}</td>
              <td>${
                r.status === "active"
                  ? '<span class="chip active">Active</span>'
                  : '<span class="chip returned">Returned</span>'
              }</td>
              <td>${fmt(r.issueDate)}</td>
              <td>${fmt(r.dueDate)}</td>
              <td>${fmt(r.returnDate)}</td>
            </tr>`
                    )
                    .join("")
                : '<tr><td colspan="5">No records</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
};

const renderFines = () => {
  const items = state.records
    .filter((r) => r.status === "active" && new Date(r.dueDate) < today())
    .map((r) => ({
      title: r.bookId?.title || "-",
      amount: calcFine(r.dueDate, today()),
    }));
  const total = items.reduce((s, i) => s + i.amount, 0);
  return `
    <section class="section">
      <h2>Fines</h2>
      <div class="kpis">
        ${kpi("Outstanding (₹)", total)}
        ${kpi("Overdue items", items.length)}
        ${kpi("Rate (₹/day)", FINE_PER_DAY)}
        ${kpi("Cap (₹)", FINE_CAP)}
      </div>
      <div class="card">
        <table aria-label="Fines">
          <thead><tr><th>Book</th><th>Amount (₹)</th></tr></thead>
          <tbody>${
            items.length
              ? items
                  .map(
                    (i) => `<tr><td>${i.title}</td><td>${i.amount}</td></tr>`
                  )
                  .join("")
              : '<tr><td colspan="2">No outstanding fines</td></tr>'
          }</tbody>
        </table>
      </div>
    </section>
  `;
};

const renderProfile = () => {
  const p = state.profile || {};
  return `
    <section class="section">
      <h2>Profile</h2>
      <div class="card">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><div class="title">Name</div><div class="value">${
            p.name || "-"
          }</div></div>
          <div><div class="title">Email</div><div class="value">${
            p.email || "-"
          }</div></div>
          <div><div class="title">Role</div><div class="value">${
            p.role || "-"
          }</div></div>
          <div><div class="title">Actions</div><div style="margin-top:8px"><button id="logoutBtnInline" class="btn secondary">Logout</button></div></div>
        </div>
      </div>
    </section>
  `;
};

const views = {
  dashboard: renderDashboard,
  catalog: renderCatalog,
  loans: renderLoans,
  history: renderHistory,
  fines: renderFines,
  profile: renderProfile,
};

/* ================ ROUTER ================ */
const routes = Object.keys(views);
const setRoute = (r) => {
  state.route = r;
  window.location.hash = r;
  highlightNav();
  render();
};
window.addEventListener("hashchange", () => {
  const h = location.hash.replace("#", "");
  if (routes.includes(h)) {
    state.route = h;
    highlightNav();
    render();
  }
});
const highlightNav = () =>
  document
    .querySelectorAll("#sideNav a, #bottomTabs a")
    .forEach((a) =>
      a.classList.toggle("active", a.dataset.route === state.route)
    );

/* ================ RENDER ENTRY ================ */
const render = () => {
  app.innerHTML = views[state.route]();
  bindInView();
};

/* ================ DATA LOADS ================ */
const loadProfile = async () => {
  try {
    state.profile = await request(`${API}/users/profile`);
  } catch (e) {
    console.warn("profile load:", e.message);
  }
};
const loadBooks = async () => {
  try {
    state.books = []; // reset books before fetching
    state.books = await request(`${API}/books`);
  } catch (e) {
    console.warn("books load:", e.message);
  }
};
const loadRecords = async () => {
  try {
    state.records = []; //reset records before fetching
    state.records = await request(`${API}/borrow/my-records`);
  } catch (e) {
    console.warn("records load:", e.message);
  }
};

/* ================ ACTION BINDINGS ================ */
const bindInView = () => {
  // catalog interactions
  if (state.route === "catalog") {
    document.getElementById("q")?.addEventListener("input", (e) => {
      state.query = e.target.value;
      render();
    });
    document.getElementById("fStatus")?.addEventListener("change", (e) => {
      state.filters.status = e.target.value;
      render();
    });
    document.getElementById("fSubject")?.addEventListener("change", (e) => {
      state.filters.subject = e.target.value;
      render();
    });

    document.querySelectorAll('[data-act="issue"]').forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const book = state.books.find((b) => b._id === id);
        if (!book || (book.quantity || 0) <= 0) return;
        const ok = await confirmDialog(
          "Issue Book",
          `<p>Issue <b>${book.title}</b> by ${
            book.author || "-"
          }?<br><small>Due date will be set by the system.</small></p>`
        );
        if (!ok) return;
        try {
          const resp = await request(`${API}/borrow/issue`, {
            method: "POST",
            body: JSON.stringify({ bookId: id }),
          });
          showToast(resp.message || "Book issued");
          await Promise.all([loadBooks(), loadRecords()]);
          render();
        } catch (err) {
          showToast("Issue failed: " + err.message);
        }
      })
    );

    document.querySelectorAll('[data-act="details"]').forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const b = state.books.find((x) => x._id === id);
        if (!b) return;
        confirmDialog(
          "Book details",
          `<div><p><b>Title:</b> ${b.title}</p><p><b>Author:</b> ${
            b.author || "-"
          }</p><p><b>Subject:</b> ${b.subject || "-"}</p><p><b>Quantity:</b> ${
            b.quantity || 0
          }</p></div>`
        );
      })
    );
  }

  // loans interactions
  if (state.route === "loans") {
    document.querySelectorAll('[data-act="return"]').forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        const rec = state.records.find((r) => r._id === id);
        if (!rec) return;
        const overdueNote =
          new Date(rec.dueDate) < today()
            ? "<br><small>Item appears overdue; a fine may apply.</small>"
            : "";
        const ok = await confirmDialog(
          "Return Book",
          `<p>Return <b>${rec.bookId?.title || "-"}</b>?${overdueNote}</p>`
        );
        if (!ok) return;
        try {
          const resp = await request(`${API}/borrow/return`, {
            method: "POST",
            body: JSON.stringify({ recordId: id }),
          });
          showToast(resp.message || "Book returned");
          await Promise.all([loadBooks(), loadRecords()]);
          render();
        } catch (err) {
          showToast("Return failed: " + err.message);
        }
      })
    );
  }

  // profile logout
  document
    .getElementById("logoutBtnInline")
    ?.addEventListener("click", doLogout);
};

/* ================ GLOBAL SEARCH & NAV ================ */
document.getElementById("globalSearch").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    state.route = "catalog";
    state.query = e.target.value;
    render();
    highlightNav();
  }
});
document.getElementById("searchBtn").addEventListener("click", () => {
  state.route = "catalog";
  state.query = document.getElementById("globalSearch").value;
  render();
  highlightNav();
});

// Create a mapping of route names to image URLs
const routeIcons = {
  dashboard: "./src/home-button.png",
  catalog: "./src/book.png",
  loans: "./src/received.png",
  history: "./src/history.png",
  fines: "./src/fine.png",
  profile: "./src/user.png", // default/fallback
};

// Create bottom tabs container
const bottomTabsContainer = document.createElement("div");
bottomTabsContainer.id = "bottomTabs";
bottomTabsContainer.className = "tabs";

bottomTabsContainer.innerHTML = `<div class="tabbar" style="display:flex;justify-content:space-around;padding:0px;">
  ${routes
    .map((r) => {
      const icon = routeIcons[r] || routeIcons.profile;
      return `<a href="#${r}" data-route="${r}" style="display:flex;flex-direction:column;align-items:center;text-decoration:none;font-size:12px;">
                <img src="${icon}" alt="${r}" style="width:24px;height:24px;margin-bottom:4px;">
                <span>${r[0].toUpperCase() + r.slice(1)}</span>
              </a>`;
    })
    .join("")}
</div>`;

document.body.appendChild(bottomTabsContainer);

// Attach click event listeners
document.querySelectorAll("#sideNav a, #bottomTabs a").forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    setRoute(e.currentTarget.dataset.route);
  })
);

//

/* logout */
document.getElementById("logoutBtnTop").addEventListener("click", doLogout);
function doLogout() {
  localStorage.removeItem("token");
  showToast("Logged out");
  // redirect to your login page
  setTimeout(() => (window.location.href = "login.html"), 700);
}

/* ================ INIT ================ */
(async function init() {
  // initial route from hash
  const hash = location.hash.replace("#", "");
  if (routes.includes(hash)) state.route = hash;
  // load data (profile may fail if token missing; it's ok)
  await Promise.allSettled([loadBooks(), loadRecords(), loadProfile()]);
  // ensure profile name in topbar if loaded
  if (state.profile && state.profile.name) {
    // inject small name into topbar (right side)
    const topbar = document.querySelector(".topbar");
    let nameSpan = document.getElementById("topNameSpan");
    if (!nameSpan) {
      nameSpan = document.createElement("span");
      nameSpan.id = "topNameSpan";
      nameSpan.style.marginLeft = "12px";
      nameSpan.style.fontWeight = "600";
      nameSpan.style.color = "var(--orange)";
      topbar.appendChild(nameSpan);
    }
    nameSpan.textContent = state.profile.name;
  }
  highlightNav();
  render();
})();
