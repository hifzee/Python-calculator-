const app = document.getElementById("app");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const money = (value, currency) => new Intl.NumberFormat("en-US", { style: "currency", currency: currency || state.user?.currency || "USD", maximumFractionDigits: 0 }).format(value || 0);
const icon = { dashboard: "+", inbox: "@", leads: "L", customers: "C", quotes: "Q", invoices: "I", payments: "$", followups: "F", ai: "*", analytics: "A", settings: "S", billing: "B", profile: "P" };
let state = { user: null, data: null, lists: {}, view: "dashboard", loading: false };
let csrfToken = null;

async function api(path, options = {}) {
  if (
    (options.method || "GET").toUpperCase() !== "GET" &&
    !csrfToken &&
    path !== "/api/auth/csrf" &&
    path !== "/api/auth/register" &&
    path !== "/api/auth/login"
  ) {
    const csrfResponse = await fetch("/api/auth/csrf");
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrf_token;
  }

  options.headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (csrfToken) {
    options.headers["X-CSRF-Token"] = csrfToken;
  }

  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = Error(
      data.error ||
      (response.status + " " + response.statusText) ||
      "Request failed"
    );
    error.code = data.code;
    throw error;
  }

  return data;
}

function payload(form) {
  return Object.fromEntries(new FormData(form));
}

function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = "toast " + type;
  node.innerHTML =
    "<strong>" +
    (type === "error" ? "!" : "OK") +
    "</strong> " +
    escapeHtml(message);

  document.body.append(node);

  setTimeout(() => node.remove(), 2800);
}

function initials(name) {
  return String(name || "Q")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function refresh() {
  state.data = await api("/api/dashboard");
}

async function loadList(path, key) {
  try {
    state.lists[key] = await api(path);
  } catch (error) {
    state.lists[key] = { error: error.message };
  }
}

function renderAuth() {
  app.innerHTML =
    '<main class="auth-page">' +
      '<section class="auth-pitch">' +
        '<div class="brand dark"><span class="brand-mark">Q</span>QuoteFlow</div>' +
        '<div class="pitch-copy">' +
          '<div class="eyebrow">A better way to get work done</div>' +
          '<h1>Find the right help. Win the right work.</h1>' +
          '<p>Customers and service professionals meet, message, quote, and book in one private workspace.</p>' +
          '<div class="pitch-points">' +
            '<span>01 <b>Find trusted providers</b></span>' +
            '<span>02 <b>Turn requests into clear quotes</b></span>' +
            '<span>03 <b>Keep work moving</b></span>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="auth-card">' +
        '<div class="auth-tabs">' +
          '<button class="active" data-auth="register">Create account</button>' +
          '<button data-auth="login">Log in</button>' +
        '</div>' +

        '<h2 id="auth-title">Start your workspace</h2>' +
        '<p id="auth-copy">Choose how you use QuoteFlow.</p>' +

        '<form id="auth-form" class="form auth-form">' +
          '<label id="name-field" class="full">Your name<input name="name" required></label>' +

          '<label class="full">Account type' +
            '<select name="role" id="role-field">' +
              '<option value="customer">Customer</option>' +
              '<option value="service_provider">Service provider</option>' +
            '</select>' +
          '</label>' +

          '<label id="business-field" class="full">Business name<input name="business_name"></label>' +

          '<label>Email<input name="email" type="email" required></label>' +

          '<label id="trade-field">Trade' +
            '<select name="trade">' +
              '<option>Plumber</option>' +
              '<option>Electrician</option>' +
              '<option>Cleaner</option>' +
              '<option>Landscaper</option>' +
              '<option>Contractor</option>' +
              '<option>Handyman</option>' +
              '<option>Other</option>' +
            '</select>' +
          '</label>' +

          '<label>Password<input name="password" type="password" minlength="8" required></label>' +

          '<button class="button full" id="auth-submit">Create account</button>' +
        '</form>' +

        '<small class="auth-note">Your data is private to your workspace.</small>' +
      '</section>' +
    '</main>';

  let register = true;
  const roleField = document.getElementById("role-field");

  const updateRoleFields = () => {
    const provider = roleField.value === "service_provider";

    document.getElementById("business-field").style.display =
      provider && register ? "grid" : "none";

    document.getElementById("trade-field").style.display =
      provider && register ? "grid" : "none";

    document.querySelector('[name="business_name"]').required =
      provider && register;
  };

  roleField.onchange = updateRoleFields;

  document.querySelectorAll("[data-auth]").forEach((tab) => {
    tab.onclick = () => {
      register = tab.dataset.auth === "register";

      document.querySelectorAll("[data-auth]").forEach((item) => {
        item.classList.toggle("active", item === tab);
      });

      document.getElementById("auth-title").textContent =
        register ? "Start your workspace" : "Welcome back";

      document.getElementById("auth-copy").textContent =
        register
          ? "Choose how you use QuoteFlow."
          : "Log in to pick up where you left off.";

      document.getElementById("name-field").style.display =
        register ? "grid" : "none";

      roleField.style.display =
        register ? "grid" : "none";

      updateRoleFields();

      document.getElementById("auth-submit").textContent =
        register ? "Create account" : "Log in";
    };
  });

  const passwordField = document.querySelector('[name="password"]');
  passwordField.id = "auth-password";

  const passwordHelp = document.createElement("small");
  passwordHelp.id = "password-help";
  passwordHelp.textContent =
    "8+ characters, uppercase, lowercase, number, and special symbol.";

  passwordField.parentElement.append(passwordHelp);

  const resendButton = document.createElement("button");
  resendButton.type = "button";
  resendButton.className = "button ghost hidden full";
  resendButton.textContent = "Resend verification email";

  document.getElementById("auth-form").append(resendButton);

  const passwordStatus = () => {
    const value = passwordField.value;

    const valid =
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9]/.test(value);

    passwordHelp.classList.toggle("valid", valid);

    return valid;
  };

  passwordField.addEventListener("input", passwordStatus);

  document.getElementById("auth-form").onsubmit = async (event) => {
    event.preventDefault();

    const submit = document.getElementById("auth-submit");
    submit.disabled = true;

    if (register && !passwordStatus()) {
      toast(
        "Password must contain 8+ characters, uppercase, lowercase, a number, and a special symbol.",
        "error"
      );

      submit.disabled = false;
      return;
    }

    try {
      const result = await api(
        register ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify(payload(event.target))
        }
      );

      if (register) {
        toast(result.message);
        document.querySelector('[data-auth="login"]').click();
      } else {
        window.location.assign(result.dashboard || "/");
      }
    } catch (error) {
      toast(error.message, "error");

      resendButton.classList.toggle(
        "hidden",
        error.code !== "email_not_verified"
      );

      submit.disabled = false;
    }
  };

  resendButton.onclick = async () => {
    try {
      const email = document.querySelector('[name="email"]').value;

      const result = await api(
        "/api/auth/resend-verification",
        {
          method: "POST",
          body: JSON.stringify({ email })
        }
      );

      toast(result.message);
    } catch (error) {
      toast(error.message, "error");
    }
  };

  updateRoleFields();
}

function navItem(key, label, count) {
  return (
    '<button class="nav-item ' +
    (state.view === key ? "active" : "") +
    '" data-view="' +
    key +
    '">' +
    '<span class="nav-icon">' +
    icon[key] +
    "</span>" +
    label +
    (count === undefined
      ? ""
      : '<span class="nav-count">' + count + "</span>") +
    "</button>"
  );
}

function badge(status) {
  const tone =
    status === "Paid" ||
    status === "Accepted" ||
    status === "Won"
      ? "teal"
      : status === "Declined" ||
        status === "Lost"
      ? "rose"
      : status === "Draft" ||
        status === "New"
      ? "amber"
      : "blue";

  return (
    '<span class="badge ' +
    tone +
    '">' +
    escapeHtml(status) +
    "</span>"
  );
}

function empty(title, copy) {
  return (
    '<div class="empty">' +
    '<span class="empty-icon">+</span>' +
    "<strong>" +
    title +
    "</strong>" +
    "<small>" +
    copy +
    "</small>" +
    "</div>"
  );
}

function table(rows, columns) {
  return (
    '<div class="table">' +
    '<div class="table-head">' +
    columns.map((column) => "<span>" + column + "</span>").join("") +
    "</div>" +
    rows +
    "</div>"
  );
}

function leadRows(leads, actions = false) {
  if (!leads.length) {
    return empty(
      "No leads yet",
      "Add your first opportunity to start the pipeline."
    );
  }

  return leads
    .map(
      (lead) =>
        '<div class="table-row">' +
        "<div>" +
        "<strong>" +
        escapeHtml(lead.customer_name) +
        "</strong>" +
        "<small>" +
        escapeHtml(lead.job_title) +
        "</small>" +
        "</div>" +

        '<div class="hide-mobile">' +
        "<small>" +
        escapeHtml(lead.description || "No description yet") +
        "</small>" +
        "</div>" +

        '<div class="hide-mobile">' +
        "<strong>" +
        money(lead.estimated_value) +
        "</strong>" +
        "</div>" +

        '<div class="right">' +
        badge(lead.status) +
        (actions
          ? '<button class="button ghost" data-quote-lead="' +
            lead.id +
            '">Quote</button>'
          : "") +
        "</div>" +

        "</div>"
    )
    .join("");
}

function quoteRows(quotes, actions = false) {
  if (!quotes.length) {
    return empty(
      "No quotes yet",
      "Create a quote from any lead in your pipeline."
    );
  }

  return quotes
    .map(
      (quote) =>
        '<div class="table-row">' +
        "<div>" +
        "<strong>" +
        escapeHtml(quote.number) +
        "</strong>" +
        "<small>" +
        escapeHtml(quote.customer_name) +
        "</small>" +
        "</div>" +

        '<div class="hide-mobile">' +
        "<small>" +
        escapeHtml(quote.description || "Scope to be confirmed") +
        "</small>" +
        "</div>" +

        "<div>" +
        "<strong>" +
        money(quote.total) +
        "</strong>" +
        "</div>" +

        '<div class="right">' +
        badge(quote.status) +
        (actions
          ? '<button class="button ghost" data-quote-action="' +
            quote.id +
            '">' +
            (quote.status === "Draft" ? "Send" : "Invoice") +
            "</button>"
          : "") +
        "</div>" +

        "</div>"
    )
    .join("");
}

function invoiceRows(invoices) {
  if (!invoices.length) {
    return empty(
      "No invoices yet",
      "Convert a quote to begin collecting payment."
    );
  }

  return invoices
    .map(
      (invoice) =>
        '<div class="table-row">' +
        "<div>" +
        "<strong>" +
        escapeHtml(invoice.number) +
        "</strong>" +
        "<small>" +
        escapeHtml(invoice.customer_name) +
        "</small>" +
        "</div>" +

        '<div class="hide-mobile"><small>Invoice balance</small></div>' +

        "<div>" +
        "<strong>" +
        money(invoice.total) +
        "</strong>" +
        "</div>" +

        '<div class="right">' +
        badge(invoice.status) +
        (invoice.status !== "Paid"
          ? '<button class="button ghost" data-pay="' +
            invoice.id +
            '">Record payment</button>'
          : "") +
        "</div>" +

        "</div>"
    )
    .join("");
}

function customerRows(customers) {
  if (!customers.length) {
    return empty(
      "No customers yet",
      "Customers created from your work will appear here."
    );
  }

  return customers
    .map(
      (customer) =>
        '<div class="table-row">' +
        "<div>" +
        "<strong>" +
        escapeHtml(customer.name) +
        "</strong>" +
        "<small>" +
        escapeHtml(customer.email || "No email") +
        "</small>" +
        "</div>" +

        '<div class="hide-mobile"><small>' +
        escapeHtml(customer.phone || "No phone") +
        "</small></div>" +

        '<div class="hide-mobile"><small>' +
        escapeHtml(customer.address || "No address") +
        "</small></div>" +

        '<div class="right"><span class="avatar mini">' +
        initials(customer.name) +
        "</span></div>" +

        "</div>"
    )
    .join("");
}

function followupRows(items) {
  if (!items.length) {
    return empty(
      "No follow-ups scheduled",
      "Keep your next customer touchpoint visible here."
    );
  }

  return items
    .map(
      (item) =>
        '<div class="table-row">' +
        "<div>" +
        "<strong>" +
        escapeHtml(item.message) +
        "</strong>" +
        "<small>Lead #" +
        (item.lead_id || "unassigned") +
        "</small>" +
        "</div>" +

        "<div><small>" +
        new Date(item.due_at).toLocaleString() +
        "</small></div>" +

        "<div></div>" +

        '<div class="right">' +
        (item.completed
          ? badge("Completed")
          : '<button class="button ghost" data-complete="' +
            item.id +
            '">Complete</button>') +
        "</div>" +

        "</div>"
    )
    .join("");
}

function paymentRows(items) {
  if (!items.length) {
    return empty(
      "No payments recorded",
      "Confirmed payments will build your revenue history."
    );
  }

  return items
    .map(
      (item) =>
        '<div class="table-row">' +
        "<div>" +
        "<strong>" +
        money(item.amount) +
        "</strong>" +
        "<small>Invoice #" +
        item.invoice_id +
        "</small>" +
        "</div>" +

        "<div><small>" +
        new Date(item.created_at).toLocaleDateString() +
        "</small></div>" +

        "<div><small>" +
        escapeHtml(item.provider_reference || "Manual") +
        "</small></div>" +

        '<div class="right">' +
        badge(item.status) +
        "</div>" +

        "</div>"
    )
    .join("");
}

function marketplaceRequestRows(items) {
  if (!items || !items.length) {
    return empty(
      "No marketplace requests",
      "Customer requests will appear here."
    );
  }

  return items
    .map(
      (item) =>
        '<div class="table-row">' +
        "<div>" +
        "<strong>" +
        escapeHtml(item.title) +
        "</strong>" +
        "<small>" +
        escapeHtml(item.category) +
        " · " +
        escapeHtml(item.location || "Location not provided") +
        "</small>" +
        "</div>" +

        "<div>" +
        badge(item.status) +
        "</div>" +

        '<div class="right">' +
        '<button class="button ghost" data-analyze-request="' +
        item.id +
        '">Analyze with AI</button>' +

        '<button class="button ghost" data-request-status="' +
        item.id +
        '" data-status="Accepted">Accept</button>' +

        '<button class="button ghost" data-request-status="' +
        item.id +
        '" data-status="Declined">Reject</button>' +

        "</div>" +

        "</div>"
    )
    .join("");
}

function metricCard(label, value, note, tone) {
  return (
    '<div class="stat ' +
    tone +
    '">' +
    '<div class="stat-top">' +
    "<label>" +
    label +
    "</label>" +
    '<span class="stat-dot"></span>' +
    "</div>" +
    "<strong>" +
    value +
    "</strong>" +
    "<small>" +
    note +
    "</small>" +
    "</div>"
  );
}

function quickActions() {
  return (
    '<section class="quick-actions">' +

    '<button class="quick primary" data-action="quote">' +
    '<span class="quick-icon">Q</span>' +
    "<strong>Create Quote</strong>" +
    "<small>Main action</small>" +
    "</button>" +

    '<button class="quick" data-action="lead">' +
    '<span class="quick-icon">L</span>' +
    "<strong>New Lead</strong>" +
    "<small>Add an opportunity</small>" +
    "</button>" +

    '<button class="quick" data-action="customer">' +
    '<span class="quick-icon">C</span>' +
    "<strong>New Customer</strong>" +
    "<small>Add a contact</small>" +
    "</button>" +

    '<button class="quick" data-view="ai">' +
    '<span class="quick-icon">*</span>' +
    "<strong>Ask AI</strong>" +
    "<small>Understand a message</small>" +
    "</button>" +

    '<button class="quick" data-action="invoice">' +
    '<span class="quick-icon">I</span>' +
    "<strong>Create Invoice</strong>" +
    "<small>From a quote</small>" +
    "</button>" +

    '<button class="quick" data-action="followup">' +
    '<span class="quick-icon">F</span>' +
    "<strong>Schedule Follow-up</strong>" +
    "<small>Stay on it</small>" +
    "</button>" +

    "</section>"
  );
}

function quoteGeneratorView() {
  return (
    '<section class="quote-workspace">' +

    '<section class="panel generator-panel">' +
    '<div class="panel-head">' +
    '<div>' +
    '<span class="eyebrow">Core workflow</span>' +
    "<h2>AI Quote Generator</h2>" +
    '<small class="muted">Paste a customer message. Review the brief. Set your own prices.</small>' +
    "</div>" +
    '<span class="badge blue">No invented prices</span>' +
    "</div>" +

    '<form id="quote-generator-form">' +

    '<div class="generator-toolbar">' +

    '<label>Selected trade' +
    '<select id="quote-trade" name="trade">' +
    "<option>Plumber</option>" +
    "<option>Electrician</option>" +
    "<option>Cleaner</option>" +
    "<option>Landscaper</option>" +
    "<option>Contractor</option>" +
    "<option>Handyman</option>" +
    "<option>Other</option>" +
    "</select>" +
    "</label>" +

    '<button class="button" id="generate-quote" type="submit">Generate Quote</button>' +

    "</div>" +

    '<label class="message-label">Customer message' +
    '<textarea id="customer-message" name="message" placeholder="Paste customer message here..." required>Hi, my kitchen sink is leaking and I need someone to fix it tomorrow.</textarea>' +
    "</label>" +

    "</form>" +

    '<div id="ai-notice" class="notice hidden"></div>' +

    "</section>" +

    '<section class="generator-results" id="generator-results">' +

    '<div class="panel brief-panel">' +
    '<div class="panel-head">' +
    '<div>' +
    '<span class="eyebrow">Step 2</span>' +
    "<h2>Structured job brief</h2>" +
    "</div>" +
    '<span class="panel-kicker">waiting for message</span>' +
    "</div>" +

    '<div class="empty">' +
    '<span class="empty-icon">*</span>' +
    "<strong>Your brief will appear here</strong>" +
    "<small>Generate a quote to extract the job details.</small>" +
    "</div>" +

    "</div>" +

    '<div class="panel pricing-panel">' +

    '<div class="panel-head">' +
    '<div>' +
    '<span class="eyebrow">Step 3</span>' +
    "<h2>Build the quote</h2>" +
    "</div>" +
    '<span class="panel-kicker">manual pricing</span>' +
    "</div>" +

    '<div class="pricing-grid">' +

    '<label>Labour<input class="price-input" data-price="labour" type="number" min="0" step=".01" value="0"></label>' +
    '<label>Materials<input class="price-input" data-price="materials" type="number" min="0" step=".01" value="0"></label>' +
    '<label>Call-out fee<input class="price-input" data-price="call_out" type="number" min="0" step=".01" value="0"></label>' +
    '<label>Additional charges<input class="price-input" data-price="additional" type="number" min="0" step=".01" value="0"></label>' +
    '<label>Discount<input class="price-input" data-price="discount" type="number" min="0" step=".01" value="0"></label>' +
    '<label>Tax<input class="price-input" data-price="tax" type="number" min="0" step=".01" value="0"></label>' +

    "</div>" +

    '<div class="total-panel">' +
    "<span>Subtotal</span><strong id=\"quote-subtotal\">$0</strong>" +
    "<span>Tax</span><strong id=\"quote-tax\">$0</strong>" +
    "<span>Discount</span><strong id=\"quote-discount\">$0</strong>" +
    '<span class="total-label">Total</span><strong class="grand-total" id="quote-total">$0</strong>' +
    "</div>" +

    '<div class="quote-actions">' +
    '<button class="button secondary" id="preview-quote" type="button">Preview</button>' +
    '<button class="button" id="save-quote" type="button" disabled>Save Quote</button>' +
    "</div>" +

    '<div class="post-save-actions hidden" id="post-save-actions">' +
    '<button class="button ghost" id="download-pdf" type="button">Download PDF</button>' +
    '<button class="button ghost" id="send-quote" type="button">Send Quote</button>' +
    '<button class="button ghost" id="create-lead" type="button">Create Lead</button>' +
    '<button class="button ghost" id="create-customer" type="button">Create Customer</button>' +
    "</div>" +

    "</div>" +

    "</section>" +

    "</section>"
  );
}

function viewContent() {
  const data = state.data;

  if (state.view === "dashboard") {
    return (
      '<section class="stats">' +
      metricCard(
        "REVENUE",
        money(data.stats.revenue),
        "confirmed payments",
        "teal"
      ) +
      metricCard(
        "ACTIVE LEADS",
        data.stats.active_leads,
        "in your pipeline",
        "blue"
      ) +
      metricCard(
        "ACCEPTED QUOTES",
        data.stats.accepted_quotes,
        data.stats.pending_quotes + " still pending",
        "amber"
      ) +
      metricCard(
        "CONVERSION RATE",
        data.stats.conversion_rate + "%",
        "accepted / total quotes",
        "violet"
      ) +
      "</section>" +

      quickActions() +

      '<section class="panel">' +
      '<div class="panel-head">' +
      '<div>' +
      "<h2>Marketplace requests</h2>" +
      '<small class="muted">Review customer work before quoting.</small>' +
      "</div>" +
      "</div>" +
      marketplaceRequestRows(data.requests) +
      "</section>" +

      '<section class="content-grid">' +

      '<section class="panel">' +
      '<div class="panel-head">' +
      "<h2>Recent leads</h2>" +
      '<button class="button ghost" data-view="leads">View all</button>' +
      "</div>" +
      table(
        leadRows(data.leads),
        ["Customer", "Scope", "Value", "Status"]
      ) +
      "</section>" +

      '<section class="panel">' +
      '<div class="panel-head">' +
      "<h2>Quote activity</h2>" +
      '<button class="button ghost" data-view="quotes">View all</button>' +
      "</div>" +
      table(
        quoteRows(data.quotes),
        ["Quote", "Scope", "Total", "Status"]
      ) +
      "</section>" +

      "</section>"
    );
  }

  if (state.view === "leads") {
    return (
      '<section class="panel">' +
      '<div class="toolbar">' +
      '<input class="input search" id="lead-search" placeholder="Search customers">' +
      '<button class="button secondary" id="search-leads">Search</button>' +
      '<button class="button" data-action="lead">+ New lead</button>' +
      "</div>" +
      table(
        leadRows(data.leads, true),
        ["Customer", "Scope", "Value", "Status"]
      ) +
      "</section>"
    );
  }

  if (state.view === "customers") {
    return (
      '<section class="panel">' +
      '<div class="toolbar">' +
      '<div>' +
      "<h2>Customers</h2>" +
      '<small class="muted">Your customer directory</small>' +
      "</div>" +
      '<button class="button" data-action="customer">+ New customer</button>' +
      "</div>" +
      table(
        customerRows(state.lists.customers || []),
        ["Customer", "Phone", "Address", "Contact"]
      ) +
      "</section>"
    );
  }

  if (state.view === "quotes") {
    return (
      '<section class="panel">' +
      '<div class="toolbar">' +
      '<div>' +
      "<h2>Quotes</h2>" +
      '<small class="muted">Draft, sent, and accepted work</small>' +
      "</div>" +
      '<button class="button" data-action="quote">+ Create quote</button>' +
      "</div>" +
      table(
        quoteRows(data.quotes, true),
        ["Quote", "Scope", "Total", "Status"]
      ) +
      "</section>"
    );
  }

  if (state.view === "invoices") {
    return (
      '<section class="panel">' +
      '<div class="toolbar">' +
      '<div>' +
      "<h2>Invoices</h2>" +
      '<small class="muted">' +
      data.stats.pending_invoices +
      " unpaid invoices</small>" +
      "</div>" +
      "</div>" +
      table(
        invoiceRows(data.invoices || []),
        ["Invoice", "Balance", "Total", "Status"]
      ) +
      "</section>"
    );
  }

  if (state.view === "payments") {
    return (
      '<section class="panel">' +
      '<div class="toolbar">' +
      '<div>' +
      "<h2>Payments</h2>" +
      '<small class="muted">Confirmed revenue history</small>' +
      "</div>" +
      "</div>" +
      table(
        paymentRows(state.lists.payments || []),
        ["Payment", "Date", "Reference", "Status"]
      ) +
      "</section>"
    );
  }

  if (state.view === "followups") {
    return (
      '<section class="panel">' +
      '<div class="toolbar">' +
      '<div>' +
      "<h2>Follow-ups</h2>" +
      '<small class="muted">Never lose the next touch</small>' +
      "</div>" +
      '<button class="button" data-action="followup">+ Schedule follow-up</button>' +
      "</div>" +
      table(
        followupRows(state.lists.followups || []),
        ["Reminder", "Due", "", "Action"]
      ) +
      "</section>"
    );
  }

  if (state.view === "inbox") {
    return (
      '<section class="panel">' +
      empty(
        "Inbox is ready",
        "Connect a messaging channel to bring customer conversations into QuoteFlow."
      ) +
      "</section>"
    );
  }

  if (state.view === "ai") {
    return quoteGeneratorView();
  }

  if (state.view === "analytics") {
    return (
      '<section class="content-grid">' +

      '<section class="panel">' +
      '<div class="panel-head">' +
      "<h2>Pipeline health</h2>" +
      '<span class="panel-kicker">real data</span>' +
      "</div>" +

      '<div class="metric-line">' +
      "<span>Accepted quotes</span>" +
      "<strong>" +
      data.stats.accepted_quotes +
      "</strong>" +
      "</div>" +

      '<div class="metric-bar"><span style="width:' +
      data.stats.conversion_rate +
      '%"></span></div>' +

      '<div class="metric-line">' +
      "<span>Pending quotes</span>" +
      "<strong>" +
      data.stats.pending_quotes +
      "</strong>" +
      "</div>" +

      '<div class="metric-bar"><span style="width:' +
      Math.min(100, data.stats.pending_quotes * 10) +
      '%"></span></div>' +

      "</section>" +

      '<section class="panel">' +
      '<div class="panel-head">' +
      "<h2>Cash position</h2>" +
      '<span class="panel-kicker">real data</span>' +
      "</div>" +

      metricCard(
        "PAID INVOICES",
        data.stats.paid_invoices,
        "fully settled",
        "teal"
      ) +

      metricCard(
        "UNPAID INVOICES",
        data.stats.pending_invoices,
        "needs attention",
        "amber"
      ) +

      "</section>" +

      "</section>"
    );
  }

  if (
    state.view === "settings" ||
    state.view === "profile" ||
    state.view === "billing"
  ) {
    return (
      '<section class="content-grid">' +

      '<section class="panel">' +

      '<div class="panel-head">' +
      "<h2>" +
      title() +
      "</h2>" +
      '<span class="panel-kicker">workspace</span>' +
      "</div>" +

      '<div class="profile-card">' +
      '<span class="profile-avatar">' +
      initials(state.user.name) +
      "</span>" +

      "<div>" +
      "<strong>" +
      escapeHtml(state.user.name) +
      "</strong>" +
      "<small>" +
      escapeHtml(state.user.email) +
      "</small>" +
      "<small>" +
      escapeHtml(state.user.business_name) +
      " · " +
      escapeHtml(state.user.trade) +
      "</small>" +
      "</div>" +

      "</div>" +

      '<div class="notice">' +
      (
        state.view === "billing"
          ? "You are on the Starter plan. Billing provider connection is ready for the next phase."
          : "Your workspace is private and connected to the local database."
      ) +
      "</div>" +

      "</section>" +

      "</section>"
    );
  }

  return (
    '<section class="panel">' +
    empty(
      "Nothing here yet",
      "This workspace will fill up as you work."
    ) +
    "</section>"
  );
}

function title() {
  return (
    {
      dashboard: "Good morning, " + escapeHtml(state.user.name.split(" ")[0]) + ".",
      inbox: "Inbox",
      leads: "Leads",
      customers: "Customers",
      quotes: "Quotes",
      invoices: "Invoices",
      payments: "Payments",
      followups: "Follow-ups",
      ai: "AI Assistant",
      analytics: "Analytics",
      settings: "Settings",
      billing: "Billing",
      profile: "Profile"
    }[state.view] || "Dashboard"
  );
}

function subtitle() {
  return (
    {
      dashboard: "Here is what needs your attention today.",
      inbox: "Keep every customer conversation close to the work.",
      leads: "Every opportunity, organized and ready for its next action.",
      customers: "A clean directory of the people behind the work.",
      quotes: "Build, send, and convert professional quotes.",
      invoices: "Keep cash moving from accepted work to paid.",
      payments: "A clear record of money received.",
      followups: "The next touchpoint is where good work becomes repeat work.",
      ai: "Turn an unstructured message into a clear next step.",
      analytics: "A live view of your pipeline and cash position."
    }[state.view] || "Your QuoteFlow workspace."
  );
}

function render() {
  const data = state.data;

  app.innerHTML =
    '<div class="app-shell">' +

    '<aside class="sidebar" id="sidebar">' +

    '<div class="brand">' +
    '<span class="brand-mark">Q</span>QuoteFlow' +
    "</div>" +

    '<div class="nav-label">Workspace</div>' +

    '<nav class="nav">' +
    navItem("dashboard", "Dashboard") +
    navItem("inbox", "Inbox") +
    navItem("leads", "Leads", data.stats.total_leads) +
    navItem("customers", "Customers") +
    navItem("quotes", "Quotes", data.stats.pending_quotes) +
    navItem("invoices", "Invoices", data.stats.pending_invoices) +
    navItem("payments", "Payments") +
    navItem("followups", "Follow-ups") +
    navItem("ai", "AI Assistant") +
    navItem("analytics", "Analytics") +
    "</nav>" +

    '<div class="sidebar-bottom">' +

    '<div class="nav-label">Account</div>' +

    navItem("settings", "Settings") +
    navItem("billing", "Billing") +
    navItem("profile", "Profile") +

    '<button class="nav-item" id="logout">' +
    '<span class="nav-icon">X</span>Logout' +
    "</button>" +

    "</div>" +

    '<div class="sidebar-foot">' +
    "<strong>" +
    escapeHtml(state.user.business_name) +
    "</strong><br>" +
    escapeHtml(state.user.trade) +
    " · Private workspace" +
    "</div>" +

    "</aside>" +

    '<main class="main">' +

    '<header class="topbar">' +

    '<div class="topbar-left">' +

    '<button class="mobile-menu" id="mobile-menu">=</button>' +

    "<div>" +
    '<div class="eyebrow">' +
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    }) +
    "</div>" +

    "<h1>" +
    title() +
    "</h1>" +

    "<p>" +
    subtitle() +
    "</p>" +

    "</div>" +

    "</div>" +

    '<div class="topbar-actions">' +

    '<button class="icon-btn" title="Notifications">!</button>' +

    '<button class="avatar" data-view="profile">' +
    initials(state.user.name) +
    "</button>" +

    '<button class="button main-action" data-action="quote">+ Create quote</button>' +

    "</div>" +

    "</header>" +

    '<div class="view">' +
    viewContent() +
    "</div>" +

    "</main>" +

    "</div>" +

    '<div class="modal" id="modal"></div>';

  wire();
}

function modal(html) {
  const node = document.getElementById("modal");

  node.innerHTML = html;
  node.classList.add("open");

  document
    .getElementById("close")
    ?.addEventListener("click", () => node.classList.remove("open"));
}

/* =========================================================
   NEW LEAD
   ========================================================= */

function openLead() {
  modal(
    '<form class="dialog" id="lead-form">' +

    '<div class="dialog-head">' +
    "<h2>New lead</h2>" +
    '<button type="button" class="close" id="close">x</button>' +
    "</div>" +

    '<div class="form">' +

    '<label class="full">' +
    "Customer name" +
    '<input name="customer_name" required>' +
    "</label>" +

    '<label class="full">' +
    "Job title" +
    '<input name="job_title" required placeholder="e.g. Kitchen sink repair">' +
    "</label>" +

    '<label class="full">' +
    "Description" +
    '<textarea name="description" placeholder="Describe the customer\'s job"></textarea>' +
    "</label>" +

    '<label>' +
    "Estimated value" +
    '<input name="estimated_value" type="number" min="0" step=".01" value="0">' +
    "</label>" +

    "<label>" +
    "Source" +
    "<select name=\"source\">" +
    '<option value="Website">Website</option>' +
    '<option value="Referral">Referral</option>' +
    '<option value="Phone">Phone</option>' +
    '<option value="WhatsApp">WhatsApp</option>' +
    '<option value="Marketplace">Marketplace</option>' +
    '<option value="Other">Other</option>' +
    "</select>" +
    "</label>" +

    '<label class="full">' +
    "Notes" +
    '<textarea name="notes" placeholder="Additional notes"></textarea>' +
    "</label>" +

    '<button class="button full" type="submit">Save lead</button>' +

    "</div>" +

    "</form>"
  );

  document.getElementById("lead-form").onsubmit = async (event) => {
    event.preventDefault();

    const submit = event.target.querySelector(
      'button[type="submit"]'
    );

    submit.disabled = true;
    submit.textContent = "Saving...";

    try {
      await api("/api/leads", {
        method: "POST",
        body: JSON.stringify(payload(event.target))
      });

      toast("Lead created successfully");

      await refresh();

      document
        .getElementById("modal")
        .classList.remove("open");

      state.view = "leads";

      render();
    } catch (error) {
      toast(error.message, "error");

      submit.disabled = false;
      submit.textContent = "Save lead";
    }
  };
}

function openCustomer() {
  modal(
    '<form class="dialog" id="customer-form">' +

    '<div class="dialog-head">' +
    "<h2>New customer</h2>" +
    '<button type="button" class="close" id="close">x</button>' +
    "</div>" +

    '<div class="form">' +

    '<label class="full">Name<input name="name" required></label>' +

    '<label>Email<input name="email" type="email"></label>' +

    '<label>Phone<input name="phone"></label>' +

    '<label class="full">Address<input name="address"></label>' +

    '<button class="button full">Save customer</button>' +

    "</div>" +

    "</form>"
  );

  document.getElementById("customer-form").onsubmit = async (event) => {
    event.preventDefault();

    try {
      await api("/api/customers", {
        method: "POST",
        body: JSON.stringify(payload(event.target))
      });

      toast("Customer added");

      await loadList("/api/customers", "customers");

      document
        .getElementById("modal")
        .classList.remove("open");

      render();
    } catch (error) {
      toast(error.message, "error");
    }
  };
}

function openFollowup() {
  modal(
    '<form class="dialog" id="followup-form">' +

    '<div class="dialog-head">' +
    "<h2>Schedule follow-up</h2>" +
    '<button type="button" class="close" id="close">x</button>' +
    "</div>" +

    '<div class="form">' +

    '<label class="full">' +
    "Reminder" +
    '<input name="message" placeholder="Call customer about quote" required>' +
    "</label>" +

    '<label>' +
    "Due date" +
    '<input name="due_at" type="datetime-local" required>' +
    "</label>" +

    '<button class="button full">Schedule reminder</button>' +

    "</div>" +

    "</form>"
  );

  document.getElementById("followup-form").onsubmit = async (event) => {
    event.preventDefault();

    try {
      await api("/api/followups", {
        method: "POST",
        body: JSON.stringify(payload(event.target))
      });

      toast("Follow-up scheduled");

      await loadList("/api/followups", "followups");

      document
        .getElementById("modal")
        .classList.remove("open");

      render();
    } catch (error) {
      toast(error.message, "error");
    }
  };
}

function openQuote(leadId) {
  const lead = state.data.leads.find(
    (item) => String(item.id) === String(leadId)
  );

  if (!lead) {
    toast("Lead not found", "error");
    return;
  }

  modal(
    '<form class="dialog" id="quote-form">' +

    '<div class="dialog-head">' +
    "<h2>Create quote</h2>" +
    '<button type="button" class="close" id="close">x</button>' +
    "</div>" +

    '<div class="form">' +

    '<input type="hidden" name="lead_id" value="' +
    lead.id +
    '">' +

    '<label class="full">' +
    "Scope" +
    '<textarea name="description" required>' +
    escapeHtml(lead.description || lead.job_title) +
    "</textarea>" +
    "</label>" +

    '<label>' +
    "Subtotal" +
    '<input name="subtotal" type="number" min="0" step=".01" value="' +
    (lead.estimated_value || 0) +
    '">' +
    "</label>" +

    '<label>' +
    "Tax" +
    '<input name="tax" type="number" min="0" step=".01" value="0">' +
    "</label>" +

    '<button class="button full">Create draft quote</button>' +

    "</div>" +

    "</form>"
  );

  document.getElementById("quote-form").onsubmit = async (event) => {
    event.preventDefault();

    try {
      await api("/api/quotes", {
        method: "POST",
        body: JSON.stringify(payload(event.target))
      });

      toast("Draft quote created");

      await refresh();

      document
        .getElementById("modal")
        .classList.remove("open");

      state.view = "quotes";

      render();
    } catch (error) {
      toast(error.message, "error");
    }
  };
}

function wireQuoteGenerator() {
  const form = document.getElementById("quote-generator-form");

  if (!form) return;

  const priceInputs = [
    ...document.querySelectorAll("[data-price]")
  ];

  const values = () =>
    Object.fromEntries(
      priceInputs.map((input) => [
        input.dataset.price,
        Number(input.value) || 0
      ])
    );

  const calculate = () => {
    const pricing = values();

    const subtotal =
      pricing.labour +
      pricing.materials +
      pricing.call_out +
      pricing.additional;

    document.getElementById("quote-subtotal").textContent =
      money(subtotal);

    document.getElementById("quote-tax").textContent =
      money(pricing.tax);

    document.getElementById("quote-discount").textContent =
      money(pricing.discount);

    document.getElementById("quote-total").textContent =
      money(Math.max(0, subtotal + pricing.tax - pricing.discount));

    return {
      pricing,
      subtotal,
      total: Math.max(
        0,
        subtotal + pricing.tax - pricing.discount
      )
    };
  };

  priceInputs.forEach((input) =>
    input.addEventListener("input", calculate)
  );

  form.onsubmit = async (event) => {
    event.preventDefault();

    const button = document.getElementById("generate-quote");

    button.disabled = true;
    button.textContent = "Generating...";

    const data = payload(form);

    try {
      const brief = await api(
        "/api/ai/generate-quote",
        {
          method: "POST",
          body: JSON.stringify(data)
        }
      );

      state.quoteBrief = brief;

      const notice = document.getElementById("ai-notice");

      notice.classList.toggle(
        "hidden",
        !brief.notice
      );

      notice.textContent = brief.notice || "";

      document.querySelector(".brief-panel").innerHTML =
        '<div class="panel-head">' +

        '<div>' +
        '<span class="eyebrow">Step 2</span>' +
        "<h2>Structured job brief</h2>" +
        "</div>" +

        badge(brief.urgency || "Unknown") +

        "</div>" +

        '<div class="brief-grid">' +

        "<div>" +
        "<small>Job type</small>" +
        "<strong>" +
        escapeHtml(brief.job_type || "Not identified") +
        "</strong>" +
        "</div>" +

        "<div>" +
        "<small>Trade</small>" +
        "<strong>" +
        escapeHtml(brief.trade || data.trade) +
        "</strong>" +
        "</div>" +

        '<div class="full">' +
        "<small>Description</small>" +
        "<p>" +
        escapeHtml(
          brief.job_description ||
          "Review the original message and define the scope."
        ) +
        "</p>" +
        "</div>" +

        "<div>" +
        "<small>Requirements</small>" +
        "<p>" +
        escapeHtml(
          (brief.customer_requirements || []).join("; ") ||
          "None identified"
        ) +
        "</p>" +
        "</div>" +

        "<div>" +
        "<small>Possible materials</small>" +
        "<p>" +
        escapeHtml(
          (brief.possible_materials || []).join("; ") ||
          "To be confirmed"
        ) +
        "</p>" +
        "</div>" +

        '<div class="full">' +
        "<small>Missing information</small>" +
        "<p>" +
        escapeHtml(
          (brief.missing_information || []).join("; ") ||
          "None identified"
        ) +
        "</p>" +
        "</div>" +

        "</div>";

      document.getElementById("save-quote").disabled = false;

      toast("Quote brief generated");
    } catch (error) {
      document.getElementById("ai-notice").textContent =
        error.message;

      document
        .getElementById("ai-notice")
        .classList.remove("hidden");

      toast(error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Generate Quote";
    }
  };

  document.getElementById("save-quote").onclick = async () => {
    const totals = calculate();
    const brief = state.quoteBrief || {};

    try {
      const quote = await api("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          customer_name:
            prompt("Customer name", "Customer") ||
            "Customer",

          description:
            brief.job_description ||
            brief.message ||
            "Service quote",

          subtotal: totals.subtotal,
          tax: totals.pricing.tax,
          discount: totals.pricing.discount,
          pricing: totals.pricing,
          ai_brief: brief
        })
      });

      state.savedQuote = quote;

      document.getElementById("save-quote").disabled = true;

      document
        .getElementById("post-save-actions")
        .classList.remove("hidden");

      toast("Quote saved");
    } catch (error) {
      toast(error.message, "error");
    }
  };

  document.getElementById("preview-quote").onclick = () => {
    const totals = calculate();
    const brief = state.quoteBrief || {};

    modal(
      '<section class="dialog">' +

      '<div class="dialog-head">' +
      "<h2>Quote preview</h2>" +
      '<button type="button" class="close" id="close">x</button>' +
      "</div>" +

      "<p>" +
      escapeHtml(
        brief.job_description ||
        "Professional service quote"
      ) +
      "</p>" +

      '<div class="total-panel">' +

      "<span>Subtotal</span>" +
      "<strong>" +
      money(totals.subtotal) +
      "</strong>" +

      "<span>Tax</span>" +
      "<strong>" +
      money(totals.pricing.tax) +
      "</strong>" +

      "<span>Discount</span>" +
      "<strong>" +
      money(totals.pricing.discount) +
      "</strong>" +

      '<span class="total-label">Total</span>' +
      '<strong class="grand-total">' +
      money(totals.total) +
      "</strong>" +

      "</div>" +

      "</section>"
    );
  };

  document.getElementById("download-pdf").onclick = () =>
    state.savedQuote &&
    (location.href =
      "/api/documents/quote/" +
      state.savedQuote.id +
      "/pdf");

  document.getElementById("send-quote").onclick = async () => {
    if (!state.savedQuote) return;

    try {
      await api(
        "/api/quotes/" + state.savedQuote.id,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "Sent"
          })
        }
      );

      toast("Quote marked as sent");
    } catch (error) {
      toast(error.message, "error");
    }
  };

  document.getElementById("create-lead").onclick = async () => {
    const brief = state.quoteBrief || {};

    try {
      await api("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          customer_name:
            prompt("Customer name", "Customer") ||
            "Customer",

          job_title:
            brief.job_type ||
            "New service request",

          description:
            brief.job_description ||
            brief.message,

          source: "AI intake"
        })
      });

      toast("Lead created");

      await refresh();
    } catch (error) {
      toast(error.message, "error");
    }
  };

  document.getElementById("create-customer").onclick = async () => {
    const name = prompt("Customer name", "Customer");

    if (!name) return;

    try {
      await api("/api/customers", {
        method: "POST",
        body: JSON.stringify({ name })
      });

      toast("Customer created");
    } catch (error) {
      toast(error.message, "error");
    }
  };

  calculate();
}

function wire() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.onclick = async () => {
      state.view = button.dataset.view;

      if (state.view === "customers") {
        await loadList("/api/customers", "customers");
      }

      if (state.view === "payments") {
        await loadList("/api/payments", "payments");
      }

      if (state.view === "followups") {
        await loadList("/api/followups", "followups");
      }

      document
        .getElementById("sidebar")
        ?.classList.remove("open");

      render();
    };
  });

  document
    .getElementById("mobile-menu")
    ?.addEventListener("click", () =>
      document.getElementById("sidebar").classList.toggle("open")
    );

  document
    .getElementById("logout")
    ?.addEventListener("click", async () => {
      await api("/api/auth/logout", {
        method: "POST"
      });

      location.reload();
    });

  /* =========================================================
     FIXED ACTION HANDLERS
     ========================================================= */

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.onclick = () => {

      /* NEW LEAD */
      if (button.dataset.action === "lead") {
        openLead();
        return;
      }

      /* NEW CUSTOMER */
      if (button.dataset.action === "customer") {
        openCustomer();
        return;
      }

      /* FOLLOW-UP */
      if (button.dataset.action === "followup") {
        openFollowup();
        return;
      }

      /* CREATE QUOTE */
      if (button.dataset.action === "quote") {
        const leads = state.data.leads || [];

        if (leads.length > 0) {
          openQuote(leads[0].id);
        } else {
          toast(
            "Add a lead before creating a quote",
            "error"
          );
        }

        return;
      }

      /* INVOICE */
      if (button.dataset.action === "invoice") {
        state.view = "quotes";
        render();

        toast(
          "Choose Invoice on a sent quote"
        );

        return;
      }
    };
  });

  document
    .querySelectorAll("[data-quote-lead]")
    .forEach((button) => {
      button.onclick = () =>
        openQuote(button.dataset.quoteLead);
    });

  document
    .querySelectorAll("[data-quote-action]")
    .forEach((button) => {
      button.onclick = async () => {
        const id = button.dataset.quoteAction;

        const quote = state.data.quotes.find(
          (item) => String(item.id) === String(id)
        );

        if (!quote) {
          toast("Quote not found", "error");
          return;
        }

        try {
          if (quote.status === "Draft") {
            await api(
              "/api/quotes/" + id,
              {
                method: "PATCH",
                body: JSON.stringify({
                  status: "Sent"
                })
              }
            );

            toast("Quote marked as sent");
          } else {
            await api(
              "/api/quotes/" + id + "/invoice",
              {
                method: "POST"
              }
            );

            toast("Invoice created");
          }

          await refresh();
          render();
        } catch (error) {
          toast(error.message, "error");
        }
      };
    });

  document
    .querySelectorAll("[data-pay]")
    .forEach((button) => {
      button.onclick = async () => {
        try {
          await api(
            "/api/invoices/" +
            button.dataset.pay +
            "/pay",
            {
              method: "POST"
            }
          );

          toast("Payment recorded");

          await refresh();
          render();
        } catch (error) {
          toast(error.message, "error");
        }
      };
    });

  document
    .querySelectorAll("[data-complete]")
    .forEach((button) => {
      button.onclick = async () => {
        try {
          await api(
            "/api/followups/" +
            button.dataset.complete,
            {
              method: "PATCH"
            }
          );

          toast("Follow-up completed");

          await loadList(
            "/api/followups",
            "followups"
          );

          render();
        } catch (error) {
          toast(error.message, "error");
        }
      };
    });

  document
    .getElementById("search-leads")
    ?.addEventListener("click", async () => {
      try {
        const leads = await api(
          "/api/leads?search=" +
          encodeURIComponent(
            document.getElementById("lead-search").value
          )
        );

        document.querySelector(".table").outerHTML =
          table(
            leadRows(leads, true),
            ["Customer", "Scope", "Value", "Status"]
          );

        wire();
      } catch (error) {
        toast(error.message, "error");
      }
    });

  document
    .getElementById("ai-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const result =
        document.getElementById("ai-result");

      result.innerHTML =
        '<div class="loading"><span class="spinner"></span>Analyzing message...</div>';

      try {
        const data = await api(
          "/api/ai/analyze",
          {
            method: "POST",
            body: JSON.stringify(
              payload(event.target)
            )
          }
        );

        result.innerHTML =
          "<strong>" +
          escapeHtml(data.job_type) +
          "</strong><br>" +
          escapeHtml(data.description) +
          "<br><br>Urgency: " +
          escapeHtml(data.urgency) +
          "<br>Questions: " +
          escapeHtml(
            data.questions.join("; ")
          );

        toast("Message analyzed");
      } catch (error) {
        result.innerHTML =
          '<div class="error-state">' +
          escapeHtml(error.message) +
          "</div>";
      }
    });
}

function customerRender() {
  const data =
    state.data || {
      requests: [],
      quotes: [],
      appointments: []
    };

  app.innerHTML =
    '<div class="app-shell">' +

    '<aside class="sidebar">' +

    '<div class="brand">' +
    '<span class="brand-mark">Q</span>QuoteFlow' +
    "</div>" +

    '<div class="nav-label">Marketplace</div>' +

    '<nav class="nav">' +

    '<button class="nav-item active">' +
    '<span class="nav-icon">D</span>Dashboard' +
    "</button>" +

    '<button class="nav-item" id="customer-logout">' +
    '<span class="nav-icon">X</span>Logout' +
    "</button>" +

    "</nav>" +

    '<div class="sidebar-foot">' +
    "<strong>Customer account</strong><br>" +
    "Private marketplace" +
    "</div>" +

    "</aside>" +

    '<main class="main">' +

    '<header class="topbar">' +

    "<div>" +
    '<div class="eyebrow">Customer marketplace</div>' +
    "<h1>Find help for your next job.</h1>" +
    "<p>Search providers, send a request, and manage your work.</p>" +
    "</div>" +

    '<button class="avatar">' +
    initials(state.user.name) +
    "</button>" +

    "</header>" +

    '<div class="view">' +

    '<section class="content-grid">' +

    '<section class="panel">' +

    '<div class="panel-head">' +
    "<div>" +
    "<h2>Service providers</h2>" +
    '<small class="muted">Search by service, category, location, availability, or rating.</small>' +
    "</div>" +
    "</div>" +

    '<form id="provider-search" class="toolbar">' +

    '<input class="input" name="search" placeholder="Search service">' +
    '<input class="input" name="location" placeholder="Location">' +
    '<input class="input" name="category" placeholder="Category">' +
    '<input class="input" name="availability" placeholder="Availability">' +
    '<input class="input" name="rating" type="number" min="1" max="5" step=".1" placeholder="Min rating">' +

    '<button class="button">Search</button>' +

    "</form>" +

    '<div id="provider-results" class="stack"></div>' +

    "</section>" +

    '<section class="panel">' +

    '<div class="panel-head">' +
    "<h2>Your requests</h2>" +
    '<span class="badge blue">' +
    data.requests.length +
    "</span>" +
    "</div>" +

    (
      data.requests.length
        ? data.requests
            .map(
              (item) =>
                '<div class="table-row">' +
                "<div>" +
                "<strong>" +
                escapeHtml(item.title) +
                "</strong>" +
                "<small>" +
                escapeHtml(item.category) +
                "</small>" +
                "</div>" +
                "<div>" +
                badge(item.status) +
                "</div>" +
                "</div>"
            )
            .join("")
        : empty(
            "No requests yet",
            "Search for a provider to get started."
          )
    ) +

    "</section>" +

    "</section>" +

    '<section class="panel">' +

    '<div class="panel-head">' +
    "<h2>Quotes and bookings</h2>" +
    "</div>" +

    (
      data.quotes.length
        ? data.quotes
            .map(
              (item) =>
                '<div class="table-row">' +

                "<div>" +
                "<strong>" +
                escapeHtml(item.number) +
                "</strong>" +
                "<small>" +
                escapeHtml(
                  item.description ||
                  "Service quote"
                ) +
                "</small>" +
                "</div>" +

                "<div>" +
                "<strong>" +
                money(item.total) +
                "</strong>" +
                "</div>" +

                '<div class="right">' +
                badge(item.status) +

                (
                  item.status === "Draft" ||
                  item.status === "Sent" ||
                  item.status === "Viewed"
                    ? '<button class="button ghost" data-accept-quote="' +
                      item.id +
                      '">Accept</button>' +
                      '<button class="button ghost" data-decline-quote="' +
                      item.id +
                      '">Reject</button>'
                    : ""
                ) +

                "</div>" +

                "</div>"
            )
            .join("")
        : empty(
            "No quotes yet",
            "Accepted provider requests will appear here."
          )
    ) +

    "</section>" +

    "</div>" +

    "</main>" +

    "</div>";

  document.getElementById("customer-logout").onclick =
    async () => {
      await api("/api/auth/logout", {
        method: "POST"
      });

      location.reload();
    };

  const searchProviders = async (event) => {
    event.preventDefault();

    const form = new FormData(event.target);
    const params = new URLSearchParams();

    [
      "search",
      "location",
      "category",
      "availability",
      "rating"
    ].forEach((key) => {
      if (form.get(key)) {
        params.set(key, form.get(key));
      }
    });

    try {
      const results = await api(
        "/api/providers?" + params
      );

      document.getElementById(
        "provider-results"
      ).innerHTML = results.length
        ? results
            .map(
              (provider) =>
                '<div class="table-row">' +

                "<div>" +
                "<strong>" +
                escapeHtml(
                  provider.business_name ||
                  provider.name
                ) +
                "</strong>" +

                "<small>" +
                escapeHtml(
                  provider.trade ||
                  "Service provider"
                ) +
                " · " +
                escapeHtml(
                  provider.location ||
                  "Location not listed"
                ) +

                (
                  provider.rating
                    ? " · " +
                      provider.rating +
                      "/5"
                    : ""
                ) +

                "</small>" +
                "</div>" +

                '<div class="right">' +

                '<button class="button ghost" data-profile-provider="' +
                provider.id +
                '">View profile</button>' +

                '<button class="button ghost" data-request-provider="' +
                provider.id +
                '">Request service</button>' +

                "</div>" +

                "</div>"
            )
            .join("")
        : empty(
            "No providers found",
            "Try a broader search."
          );

      document
        .querySelectorAll("[data-profile-provider]")
        .forEach((button) => {
          button.onclick = async () => {
            try {
              const profile = await api(
                "/api/providers/" +
                button.dataset.profileProvider
              );

              window.alert(
                (profile.business_name ||
                  profile.name) +
                "\n" +
                (profile.description ||
                  "No description yet") +
                "\nServices: " +
                (
                  profile.services || []
                )
                  .map((item) => item.name)
                  .join(", ")
              );
            } catch (error) {
              toast(error.message, "error");
            }
          };
        });

      document
        .querySelectorAll("[data-request-provider]")
        .forEach((button) => {
          button.onclick = () => {
            const provider = results.find(
              (item) =>
                String(item.id) ===
                button.dataset.requestProvider
            );

            const title = window.prompt(
              "What do you need help with?"
            );

            if (!title) return;

            const description = window.prompt(
              "Describe the work you need done:"
            );

            if (!description) return;

            api("/api/job-requests", {
              method: "POST",
              body: JSON.stringify({
                provider_id: provider.id,
                category:
                  provider.trade || "Other",
                title,
                description,
                location:
                  form.get("location") ||
                  undefined
              })
            })
              .then(() => {
                toast("Job request sent");

                refresh().then(
                  customerRender
                );
              })
              .catch((error) =>
                toast(error.message, "error")
              );
          };
        });
    } catch (error) {
      toast(error.message, "error");
    }
  };

  document.getElementById(
    "provider-search"
  ).onsubmit = searchProviders;

  document
    .querySelectorAll(
      "[data-accept-quote], [data-decline-quote]"
    )
    .forEach((button) => {
      button.onclick = async () => {
        const accepted = Boolean(
          button.dataset.acceptQuote
        );

        const scheduledFor = accepted
          ? window.prompt(
              "Choose date and time (YYYY-MM-DDTHH:MM)"
            )
          : null;

        if (accepted && !scheduledFor) return;

        try {
          await api(
            "/api/customer/quotes/" +
            (
              button.dataset.acceptQuote ||
              button.dataset.declineQuote
            ),
            {
              method: "PATCH",
              body: JSON.stringify({
                status: accepted
                  ? "Accepted"
                  : "Declined",
                scheduled_for: scheduledFor
              })
            }
          );

          toast("Quote updated");

          await refresh();

          customerRender();
        } catch (error) {
          toast(error.message, "error");
        }
      };
    });
}

function renderDashboardPanels() {
  const view = document.querySelector(".view");

  if (!view || !state.data) return;

  const data = state.data;
  const customer =
    state.user.role === "customer";

  const stats = data.stats || {};

  const list = (items, emptyText) =>
    items && items.length
      ? items
          .slice(0, 5)
          .map(
            (item) =>
              '<div class="table-row">' +
              "<div>" +
              "<strong>" +
              escapeHtml(
                item.title ||
                item.number ||
                item.message ||
                item.body ||
                item.name ||
                "Activity"
              ) +
              "</strong>" +

              "<small>" +
              escapeHtml(
                item.status ||
                item.category ||
                item.email ||
                ""
              ) +
              "</small>" +

              "</div>" +
              "</div>"
          )
          .join("")
      : empty(
          "No records",
          emptyText
        );

  const panels = customer
    ? '<section class="content-grid dashboard-data">' +

      '<section class="panel">' +

      "<h2>Account activity</h2>" +

      '<div class="stats">' +

      metricCard(
        "ACTIVE REQUESTS",
        stats.requests || 0,
        "current requests",
        "blue"
      ) +

      metricCard(
        "UPCOMING BOOKINGS",
        (data.bookings || []).filter(
          (item) =>
            item.status !== "Completed" &&
            item.status !== "Cancelled"
        ).length,
        "scheduled work",
        "teal"
      ) +

      metricCard(
        "PENDING QUOTES",
        stats.pending_quotes || 0,
        "awaiting your decision",
        "amber"
      ) +

      metricCard(
        "COMPLETED JOBS",
        stats.completed_jobs || 0,
        "completed services",
        "violet"
      ) +

      "</div>" +

      list(
        data.invoices,
        "Invoices will appear here."
      ) +

      "</section>" +

      '<section class="panel">' +

      "<h2>Conversations and payments</h2>" +

      list(
        data.conversations,
        "No conversations yet."
      ) +

      list(
        data.payments,
        "No payments recorded."
      ) +

      "</section>" +

      "</section>"

    : '<section class="content-grid dashboard-data">' +

      '<section class="panel">' +

      "<h2>Operations</h2>" +

      '<div class="stats">' +

      metricCard(
        "NEW REQUESTS",
        stats.new_requests || 0,
        "awaiting response",
        "blue"
      ) +

      metricCard(
        "ACTIVE JOBS",
        stats.active_jobs || 0,
        "in progress",
        "teal"
      ) +

      metricCard(
        "UPCOMING BOOKINGS",
        stats.upcoming_bookings || 0,
        "scheduled work",
        "amber"
      ) +

      metricCard(
        "EARNINGS",
        money(stats.revenue),
        "confirmed payments",
        "violet"
      ) +

      "</div>" +

      list(
        data.bookings,
        "No bookings yet."
      ) +

      list(
        data.customers,
        "No customers yet."
      ) +

      "</section>" +

      '<section class="panel">' +

      "<h2>Follow-ups, reviews, and notifications</h2>" +

      list(
        data.followups,
        "No follow-ups due."
      ) +

      list(
        data.reviews,
        "No reviews received."
      ) +

      list(
        data.notifications,
        "No notifications."
      ) +

      "</section>" +

      "</section>";

  view.insertAdjacentHTML(
    "afterbegin",
    panels
  );
}

function billingView() {
  const billing = state.billing;

  if (!billing) {
    return '<section class="panel">Loading billing...</section>';
  }

  const subscription =
    billing.subscription;

  const usage = Object.entries(
    billing.usage
  )
    .map(
      ([key, item]) =>
        '<div class="table-row">' +

        "<div>" +

        "<strong>" +
        escapeHtml(
          key.replaceAll("_", " ")
        ) +
        "</strong>" +

        "<small>" +
        item.used +
        " used" +

        (
          item.limit === null
            ? " - unlimited"
            : " - " +
              item.remaining +
              " remaining"
        ) +

        "</small>" +

        "</div>" +

        '<div class="right"><small>' +
        (
          item.limit === null
            ? "Unlimited"
            : item.limit
        ) +
        "</small></div>" +

        "</div>"
    )
    .join("");

  const plans = Object.entries(
    billing.plans
  )
    .map(
      ([key, plan]) =>
        '<div class="table-row">' +

        "<div>" +

        "<strong>" +
        escapeHtml(plan.name) +
        "</strong>" +

        "<small>" +
        (
          plan.price
            ? "$" +
              plan.price +
              "/month"
            : "No monthly charge"
        ) +
        "</small>" +

        "</div>" +

        '<div class="right">' +

        '<button class="button ' +
        (
          key === billing.current_plan
            ? "ghost"
            : ""
        ) +
        '" data-plan="' +
        key +
        '" ' +
        (
          key === billing.current_plan
            ? "disabled"
            : ""
        ) +
        ">" +

        (
          key === billing.current_plan
            ? "Current plan"
            : "Choose plan"
        ) +

        "</button>" +

        "</div>" +

        "</div>"
    )
    .join("");

  const history =
    billing.billing_history.length
      ? billing.billing_history
          .map(
            (item) =>
              '<div class="table-row">' +

              "<div>" +

              "<strong>" +
              escapeHtml(item.event) +
              "</strong>" +

              "<small>" +
              new Date(
                item.created_at
              ).toLocaleString() +
              "</small>" +

              "</div>" +

              '<div class="right">' +
              badge(
                item.status || "recorded"
              ) +
              "</div>" +

              "</div>"
          )
          .join("")
      : empty(
          "No billing events",
          "Provider-confirmed subscription events will appear here."
        );

  return (
    '<section class="content-grid">' +

    '<section class="panel">' +

    '<div class="panel-head">' +

    '<div>' +
    '<span class="eyebrow">Subscription</span>' +
    "<h2>" +
    escapeHtml(subscription.plan) +
    " plan</h2>" +
    "</div>" +

    badge(subscription.status) +

    "</div>" +

    '<div class="profile-card">' +

    "<div>" +

    "<strong>Subscription status</strong>" +

    "<small>" +

    (
      subscription.provider
        ? "Managed by " +
          escapeHtml(
            subscription.provider
          )
        : "Payment provider not connected"
    ) +

    "</small>" +

    "<small>" +

    (
      subscription.cancel_at_period_end
        ? "Ends at the current period"
        : "No renewal has been confirmed"
    ) +

    "</small>" +

    "</div>" +

    "</div>" +

    '<div class="notice">No payment has been taken. Paid plans require a real provider checkout.</div>' +

    '<div class="stack">' +
    plans +
    "</div>" +

    "</section>" +

    '<section class="panel">' +

    '<div class="panel-head">' +

    '<div>' +
    '<span class="eyebrow">Current period</span>' +
    "<h2>Usage</h2>" +
    "</div>" +

    "</div>" +

    usage +

    "</section>" +

    "</section>" +

    '<section class="panel">' +

    '<div class="panel-head">' +
    "<h2>Billing history</h2>" +
    '<span class="panel-kicker">provider events</span>' +
    "</div>" +

    history +

    "</section>"
  );
}

function wireBilling() {
  document
    .querySelectorAll("[data-plan]")
    .forEach((button) => {
      button.onclick = async () => {
        try {
          await api(
            "/api/billing/checkout",
            {
              method: "POST",
              body: JSON.stringify({
                plan: button.dataset.plan
              })
            }
          );
        } catch (error) {
          toast(error.message, "error");
        }
      };
    });
}

function wireAccountSecurity() {
  if (
    !state.user ||
    !["settings", "profile"].includes(
      state.view
    ) ||
    document.getElementById(
      "password-change-form"
    )
  ) {
    return;
  }

  const view =
    document.querySelector(".view");

  if (!view) return;

  const panel =
    document.createElement("section");

  panel.className =
    "panel security-panel";

  panel.innerHTML =
    '<div class="panel-head">' +

    "<div>" +

    "<h2>Account security</h2>" +

    '<small class="muted">Email status: ' +
    (
      state.user.email_verified
        ? "Verified"
        : "Verification required"
    ) +
    "</small>" +

    "</div>" +

    "</div>" +

    '<form id="password-change-form" class="form">' +

    '<label>Current password<input name="current_password" type="password" required></label>' +

    '<label>New password<input name="new_password" type="password" minlength="8" required></label>' +

    '<small>New passwords need 8+ characters, uppercase, lowercase, a number, and a special symbol.</small>' +

    '<button class="button" type="submit">Change password</button>' +

    "</form>";

  view.append(panel);

  panel.querySelector("form").onsubmit =
    async (event) => {
      event.preventDefault();

      try {
        await api(
          "/api/auth/password",
          {
            method: "PATCH",
            body: JSON.stringify(
              payload(event.target)
            )
          }
        );

        toast(
          "Password changed successfully"
        );

        event.target.reset();
      } catch (error) {
        toast(error.message, "error");
      }
    };
}

async function boot() {
  try {
    const me = await api("/api/me");

    if (!me.authenticated) {
      return renderAuth();
    }

    state.user = me.user;

    await refresh();

    if (
      state.user.role ===
      "service_provider"
    ) {
      state.billing =
        await api("/api/billing");
    }

    render();
  } catch (error) {
    app.innerHTML =
      '<main class="auth-page">' +

      '<section class="auth-card">' +

      '<div class="error-state">' +
      escapeHtml(error.message) +
      "</div>" +

      "</section>" +

      "</main>";
  }
}

function wireMarketplaceRequests() {
  document
    .querySelectorAll(
      "[data-request-status]"
    )
    .forEach((button) => {
      button.onclick = async () => {
        try {
          await api(
            "/api/job-requests/" +
            button.dataset.requestStatus,
            {
              method: "PATCH",
              body: JSON.stringify({
                status:
                  button.dataset.status
              })
            }
          );

          toast("Request updated");

          await refresh();

          render();
        } catch (error) {
          toast(error.message, "error");
        }
      };
    });

  document
    .querySelectorAll(
      "[data-analyze-request]"
    )
    .forEach((button) => {
      button.onclick = async () => {
        try {
          const brief = await api(
            "/api/job-requests/" +
            button.dataset.analyzeRequest +
            "/ai-analysis",
            {
              method: "POST"
            }
          );

          state.quoteBrief = brief;
          state.view = "ai";

          render();

          toast(
            brief.notice ||
            "AI brief ready"
          );
        } catch (error) {
          toast(error.message, "error");
        }
      };
    });
}

const renderApp = render;

render = () => {
  if (
    state.user &&
    state.user.role === "customer"
  ) {
    customerRender();
    renderDashboardPanels();
    return;
  }

  renderApp();

  if (state.view === "billing") {
    document.querySelector(".view").innerHTML =
      billingView();
  }

  wireBilling();
  wireQuoteGenerator();
  wireMarketplaceRequests();
  wireAccountSecurity();

  if (state.view === "dashboard") {
    renderDashboardPanels();
  }
};

boot();
