
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getApplications,
  getApplicationActivities,
  addApplicationActivity,
  getRecentActivities,
  createApplication,
  deleteApplication,
  loginUser,
  logoutUser,
  registerUser,
  updateApplication,
  getResumes,
  uploadResume,
  deleteResume,
  getJobDescriptions,
  createJobDescription,
  deleteJobDescription,
  matchResumeJob,
} from "./api";
import "./App.css";

const STATUSES = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "assessment", label: "Assessment" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

const EMPTY_FORM = {
  company: "",
  job_title: "",
  job_url: "",
  location: "",
  employment_type: "",
  status: "saved",
  applied_date: "",
  follow_up_date: "",
  salary: "",
  notes: "",
};

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("authToken")
  );

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("authUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("authUser");
      return null;
    }
  });
  const [authMode, setAuthMode] = useState("login");
  const [credentials, setCredentials] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [timelineApplication, setTimelineApplication] = useState(null);
  const [activities, setActivities] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loadingRecentActivities, setLoadingRecentActivities] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [applications, setApplications] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [activityNote, setActivityNote] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, employmentTypeFilter, sortBy]);
  // Existing pagination effect
useEffect(() => {
  setCurrentPage(1);
}, [search, statusFilter, employmentTypeFilter, sortBy]);

// NEW: Fetch recent activities
useEffect(() => {
  if (!token) {
    setRecentActivities([]);
    return;
  }

  let cancelled = false;

  async function loadRecentActivities() {
    setLoadingRecentActivities(true);

    try {
      const data = await getRecentActivities(token);
      if (!cancelled) {
        const items = Array.isArray(data) ? data : data.results || [];
        setRecentActivities(items);
      }
    } catch (error) {
      if (!cancelled) {
        console.error("Failed to load recent activities:", error);
      }
    } finally {
      if (!cancelled) {
        setLoadingRecentActivities(false);
      }
    }
  }

  loadRecentActivities();

  return () => {
    cancelled = true;
  };
}, [token]);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importMessage, setImportMessage] = useState("");

  // Resumes State
  const [resumes, setResumes] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [savingResume, setSavingResume] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);

  // Job Descriptions State
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [jobDescForm, setJobDescForm] = useState({ title: "", content: "" });
  const [savingJobDesc, setSavingJobDesc] = useState(false);
  const [selectedJobDesc, setSelectedJobDesc] = useState(null);

  // Resume Matching State
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedJobDescId, setSelectedJobDescId] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  // Hash route state for clean tab navigation
  const [currentHash, setCurrentHash] = useState(window.location.hash || "#dashboard");

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || "#dashboard");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadApplications = useCallback(async (authToken) => {
    setLoading(true);
    setError("");

    try {
      const data = await getApplications(authToken);
      setApplications(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadApplications(token);
      getResumes(token).then(setResumes).catch(() => {});
      getJobDescriptions(token).then(setJobDescriptions).catch(() => {});
    }
  }, [token, loadApplications]);

  // Matching handler
  async function handleMatchResume() {
    if (!selectedResumeId || !selectedJobDescId) {
      setError("Please select both a resume and a job description");
      return;
    }

    setLoadingMatch(true);
    setError("");

    try {
      const result = await matchResumeJob(selectedResumeId, selectedJobDescId, token);
      setMatchResult(result);
      setNotice("Resume matched successfully!");
    } catch (err) {
      setError(err.message);
      setMatchResult(null);
    } finally {
      setLoadingMatch(false);
    }
  }

  async function handleUploadResume(e) {
    e.preventDefault();
    if (!resumeFile) return;
    setSavingResume(true);
    setError("");
    const formData = new FormData();
    formData.append("title", resumeFile.name);
    formData.append("file", resumeFile);

    try {
      await uploadResume(formData, token);
      const updated = await getResumes(token);
      setResumes(updated);
      setResumeFile(null);
      setNotice("Resume uploaded successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingResume(false);
    }
  }

  async function handleDeleteResume(id) {
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    try {
      await deleteResume(id, token);
      setResumes(resumes.filter((r) => r.id !== id));
      if (selectedResume?.id === id) setSelectedResume(null);
      setNotice("Resume deleted.");
    } catch (err) {
      setError(err.message);
    }
  }

  function viewResumeContent(resume) {
    setSelectedResume(resume);
  }

  async function handleAddJobDescription(e) {
    e.preventDefault();
    setSavingJobDesc(true);
    setError("");
    try {
      await createJobDescription(jobDescForm, token);
      const updated = await getJobDescriptions(token);
      setJobDescriptions(updated);
      setJobDescForm({ title: "", content: "" });
      setNotice("Job description analyzed successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingJobDesc(false);
    }
  }

  function viewJobDescription(jd) {
    setSelectedJobDesc(jd);
  }

  function closeJobDescModal() {
    setSelectedJobDesc(null);
  }

  
  
  const stats = useMemo(() => {
    const count = (status) =>
      applications.filter((item) => item.status === status).length;

    const total = applications.length;
    const applied = count("applied");
    const assessments = count("assessment");
    const interviews = count("interview");
    const offers = count("offer");
    const rejected = count("rejected");

    // Applications that have received a meaningful response.
    const responded = assessments + interviews + offers + rejected;

    // Calculate percentages safely when there are no applications.
    const percentage = (value, denominator = total) =>
      denominator === 0 ? 0 : Math.round((value / denominator) * 100);

    return {
      total,
      saved: count("saved"),
      applied,
      assessments,
      interviews,
      inProgress: interviews + assessments,
      offers,
      rejected,
      withdrawn: count("withdrawn"),

      // New dashboard analytics
      responseRate: percentage(responded),
      interviewRate: percentage(interviews + offers, applied + assessments + interviews + offers + rejected),
      offerRate: percentage(offers),
    };
  }, [applications]);


    
  const followUpSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingApplications = applications.filter(
      (item) =>
        item.follow_up_date &&
        !["offer", "rejected", "withdrawn"].includes(item.status)
    );

    const overdue = pendingApplications.filter((item) => {
      const date = new Date(`${item.follow_up_date}T00:00:00`);
      return date < today;
    });

    const upcoming = pendingApplications.filter((item) => {
      const date = new Date(`${item.follow_up_date}T00:00:00`);
      return date >= today;
    });

    return { overdue, upcoming };
  }, [applications]);



  
  const filteredApplications = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = applications.filter((item) => {
      const matchesSearch =
        !term ||
        item.company.toLowerCase().includes(term) ||
        item.job_title.toLowerCase().includes(term) ||
        (item.location || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesEmploymentType =
        employmentTypeFilter === "all" ||
        (item.employment_type || "").toLowerCase() ===
          employmentTypeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesEmploymentType;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "company-asc") {
        return a.company.localeCompare(b.company);
      }

      if (sortBy === "company-desc") {
        return b.company.localeCompare(a.company);
      }

      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      if (sortBy === "oldest") {
        return dateA - dateB;
      }

      return dateB - dateA;
    });
  }, [
    applications,
    search,
    statusFilter,
    employmentTypeFilter,
    sortBy,
  ]);


  const ITEMS_PER_PAGE = 10;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredApplications.length / ITEMS_PER_PAGE)
  );

  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );


  function handleExportCSV() {
    const columns = [
      ["Company", "company"],
      ["Job Title", "job_title"],
      ["Status", "status"],
      ["Employment Type", "employment_type"],
      ["Location", "location"],
      ["Job URL", "job_url"],
      ["Applied Date", "applied_date"],
      ["Follow-up Date", "follow_up_date"],
      ["Salary", "salary"],
      ["Notes", "notes"],
      ["Created At", "created_at"],
    ];

    const escapeCSV = (value) => {
      let text = String(value ?? "");

      // Prevent spreadsheet formula injection.
      if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text;
      }

      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = [
      columns.map(([heading]) => escapeCSV(heading)).join(","),
      ...filteredApplications.map((application) =>
        columns
          .map(([, key]) => escapeCSV(application[key]))
          .join(",")
      ),
    ];

    const csvContent = "\uFEFF" + rows.join("\r\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "job-applications.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }


function parseCSVLine(line) {
  const values = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

  async function handleCSVSelection(event) {
    const file = event.target.files?.[0];
    setImportFile(file || null);
    setImportPreview([]);
    setImportMessage("");

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportMessage("Please select a CSV file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImportMessage("The CSV file must be 5 MB or smaller.");
      return;
    }

    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      if (lines.length < 2) {
        setImportMessage("The CSV must contain a header and at least one row.");
        return;
      }

      const headers = parseCSVLine(lines[0]).map((header) =>
        header.trim().toLowerCase()
      );

      const requiredHeaders = ["company", "job_title", "status"];
      const missingHeaders = requiredHeaders.filter(
        (header) => !headers.includes(header)
      );

      if (missingHeaders.length > 0) {
        setImportMessage(
          `Missing required columns: ${missingHeaders.join(", ")}.`
        );
        return;
      }

      const rows = lines.slice(1).map((line, index) => {
        const values = parseCSVLine(line);
        const row = {};

        headers.forEach((header, columnIndex) => {
          row[header] = values[columnIndex]?.trim() || "";
        });

        return {
          rowNumber: index + 2,
          company: row.company,
          job_title: row.job_title,
          status: row.status.toLowerCase(),
          job_url: row.job_url || "",
          location: row.location || "",
          employment_type: row.employment_type || "",
          applied_date: row.applied_date || "",
          follow_up_date: row.follow_up_date || "",
          salary: row.salary || "",
          notes: row.notes || "",
        };
      });

      const validStatuses = STATUSES.map((status) => status.value);
      const preview = rows.map((row) => {
        const errors = [];

        if (!row.company) errors.push("Company is required.");
        if (!row.job_title) errors.push("Job title is required.");
        if (!validStatuses.includes(row.status)) {
          errors.push("Invalid status.");
        }

        return { ...row, errors };
      });

      setImportPreview(preview);
      setImportMessage(
        `Read ${preview.length} rows. ${
          preview.filter((row) => row.errors.length === 0).length
        } are valid.`
      );
    } catch {
      setImportMessage("Could not read this file. Please check the CSV format.");
    }
  }

  async function handleImportCSV() {
    const validRows = importPreview.filter(
      (row) => row.errors.length === 0
    );

    if (validRows.length === 0) {
      setImportMessage("There are no valid rows to import.");
      return;
    }

    setImportMessage("Importing applications...");

    let imported = 0;
    const failedRows = [];

    for (const row of validRows) {
      const payload = {
        company: row.company,
        job_title: row.job_title,
        status: row.status,
        job_url: row.job_url,
        location: row.location,
        employment_type: row.employment_type,
        applied_date: row.applied_date || null,
        follow_up_date: row.follow_up_date || null,
        salary: row.salary,
        notes: row.notes,
      };

      try {
        await createApplication(payload, token);
        imported += 1;
      } catch (error) {
        failedRows.push(`Row ${row.rowNumber}: ${error.message}`);
      }
    }

    try {
      const updatedApplications = await getApplications(token);
      setApplications(updatedApplications);
    } catch {
      // The imported records may still have been saved successfully.
    }

    setImportMessage(
      `Imported ${imported} of ${validRows.length} valid rows.` +
        (failedRows.length
          ? ` ${failedRows.length} rows failed: ${failedRows.slice(0, 3).join(" ")}`
          : "")
    );

    setImportPreview([]);
    setImportFile(null);

    const fileInput = document.getElementById("csv-import-file");
    if (fileInput) fileInput.value = "";
  }

  async function handleAuth(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    try {
      const data =
        authMode === "login"
          ? await loginUser({
              username: credentials.username,
              password: credentials.password,
            })
          : await registerUser(credentials);

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(data.user));
      setNotice(
        authMode === "login"
          ? "Welcome back."
          : "Your account has been created."
      );
      setCredentials({ username: "", email: "", password: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const currentToken = token;

    setToken("");
    setUser(null);
    setApplications([]);
    setError("");
    setNotice("");
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");

    try {
      await logoutUser(currentToken);
    } catch {
      setNotice("You have been signed out of this session.");
    }
  }

  
  async function handleCreateApplication(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    const payload = {
      ...form,
      applied_date: form.applied_date || null,
      follow_up_date: form.follow_up_date || null,
    };

    try {
      if (editingId !== null) {
        const updated = await updateApplication(editingId, payload, token);

        setApplications((current) =>
          current.map((app) => (app.id === editingId ? updated : app))
        );

        setNotice("Application updated successfully.");
        setEditingId(null);
      } else {
        const created = await createApplication(payload, token);

        setApplications((current) => [created, ...current]);
        setNotice("Application added successfully.");
      }

      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleViewTimeline(application) {
    setTimelineApplication(application);
    setActivities([]);
    setError("");
    setLoadingActivities(true);

    try {
      const data = await getApplicationActivities(application.id, token);
      setActivities(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingActivities(false);
    }
  }

  async function handleAddActivity(event) {
    event.preventDefault();

    const description = activityNote.trim();

    if (!description || !timelineApplication) {
      return;
    }

    setError("");
    setNotice("");
    setSavingActivity(true);

    try {
      await addApplicationActivity(
        timelineApplication.id,
        description,
        token
      );

      const updatedActivities = await getApplicationActivities(
        timelineApplication.id,
        token
      );

      setActivities(updatedActivities);
      setActivityNote("");
      setNotice("Activity note added successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingActivity(false);
    }
  }
  
  function handleEditApplication(application) {
    setEditingId(application.id);

    setForm({
      company: application.company || "",
      job_title: application.job_title || "",
      job_url: application.job_url || "",
      location: application.location || "",
      employment_type: application.employment_type || "",
      status: application.status || "saved",
      applied_date: application.applied_date || "",
      follow_up_date: application.follow_up_date || "",
      salary: application.salary || "",
      notes: application.notes || "",
    });

    setError("");
    setNotice("");
    setShowForm(true);
  }



  async function handleDeleteApplication(id) {
    const confirmed = window.confirm(
      "Delete this application? This action cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await deleteApplication(id, token);
      setApplications((current) =>
        current.filter((item) => item.id !== id)
      );
      setNotice("Application deleted.");
    } catch (err) {
      setError(err.message);
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="brand-mark">JT</div>
          <p className="eyebrow">CAREER WORKSPACE</p>
          <h1>{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="muted">
            Keep your job search organized, from application to offer.
          </p>

          {error && <div className="alert error">{error}</div>}
          {notice && <div className="alert success">{notice}</div>}

          <form onSubmit={handleAuth} className="form-stack">
            <label>
              Username
              <input
                required
                autoComplete="username"
                value={credentials.username}
                onChange={(event) =>
                  setCredentials({
                    ...credentials,
                    username: event.target.value,
                  })
                }
              />
            </label>

            {authMode === "register" && (
              <label>
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={credentials.email}
                  onChange={(event) =>
                    setCredentials({
                      ...credentials,
                      email: event.target.value,
                    })
                  }
                />
              </label>
            )}

            <label>
              Password
              <input
                required
                type="password"
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                value={credentials.password}
                onChange={(event) =>
                  setCredentials({
                    ...credentials,
                    password: event.target.value,
                  })
                }
              />
            </label>

            <button className="primary-button full-width" disabled={saving}>
              {saving
                ? "Please wait..."
                : authMode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === "login"
              ? "New here?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setError("");
                setNotice("");
              }}
            >
              {authMode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">JT</div>
          <div>
            <strong>Job Tracker</strong>
            <span>CAREER WORKSPACE</span>
          </div>
        </div>

        <p className="nav-heading">WORKSPACE</p>
        <nav className="main-nav">
          <a className={`nav-link ${currentHash === "#dashboard" ? "active" : ""}`} href="#dashboard">
            <span className="nav-symbol">▦</span> Dashboard
          </a>
          <a className={`nav-link ${currentHash === "#applications" ? "active" : ""}`} href="#applications">
            <span className="nav-symbol">≡</span> Applications
          </a>
          <a className={`nav-link ${currentHash === "#resume" ? "active" : ""}`} href="#resume">
            <span className="nav-symbol">▧</span> Resumes
          </a>
          <a className={`nav-link ${currentHash === "#job-desc" ? "active" : ""}`} href="#job-desc">
            <span className="nav-symbol">◈</span> Job Descriptions
          </a>
          <a className={`nav-link ${currentHash === "#matching" ? "active" : ""}`} href="#matching">
            <span className="nav-symbol">◇</span> Resume Matching
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-chip">
            <div className="avatar">
              {(user?.username || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="profile-details">
              <strong>{user?.username || "User"}</strong>
              <span>Personal workspace</span>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR CAREER, ORGANIZED</p>
            <h1>{currentHash === "#dashboard" ? "Dashboard" : currentHash === "#applications" ? "Applications" : currentHash === "#resume" ? "Resumes" : currentHash === "#job-desc" ? "Job Descriptions" : currentHash === "#matching" ? "Resume Matching" : "Dashboard"}</h1>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              if (currentHash === "#resume" || currentHash === "#job-desc" || currentHash === "#matching") {
                window.location.hash = "#dashboard";
              }
              setShowForm(!showForm);
              setError("");
            }}
          >
            {showForm ? "Cancel" : "+ Add application"}
          </button>
        </header>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        <section className="stats-grid" aria-label="Application summary">
          <StatCard label="Total applications" value={stats.total} />
          <StatCard label="Applied" value={stats.applied} />
          <StatCard label="Assessments & interviews" value={stats.interviews} />
          <StatCard label="Offers" value={stats.offers} />
        </section>
        
        <section className="content-panel analytics-panel">
          <div className="section-heading">
            <div>
              <h2>Application analytics</h2>
              <p>Understand how your applications are progressing.</p>
            </div>
          </div>
          <div className="analytics-grid">
            <StatCard
              label="Response rate"
              value={`${stats.responseRate}%`}
            />
            <StatCard
              label="Interview conversion"
              value={`${stats.interviewRate}%`}
            />
            <StatCard
              label="Offer rate"
              value={`${stats.offerRate}%`}
            />
          </div>
        </section>
        <section className="content-panel pipeline-panel">
          <div className="section-heading">
            <div>
              <h2>Application pipeline</h2>
              <p>Track where each opportunity stands.</p>
            </div>
          </div>
          

          <div className="pipeline-grid">
            <StatCard label="Saved" value={stats.saved} />
            <StatCard label="Applied" value={stats.applied} />
            <StatCard label="Assessments" value={stats.assessments} />
            <StatCard label="Interviews" value={stats.interviews} />
            <StatCard label="Offers" value={stats.offers} />
            <StatCard label="Rejected" value={stats.rejected} />
            <StatCard label="Withdrawn" value={stats.withdrawn} />
          </div>
        </section>
        <section className="content-panel follow-up-panel">
          <div className="section-heading">
            <div>
              <h2>Follow-up reminders</h2>
              <p>Keep track of recruiter follow-ups and next steps.</p>
            </div>
          </div>

          <div className="follow-up-columns">
            <div>
              <h3>Overdue ({followUpSummary.overdue.length})</h3>

              {followUpSummary.overdue.length === 0 ? (
                <p className="muted">No overdue follow-ups.</p>
              ) : (
                followUpSummary.overdue.map((item) => (
                  <article className="follow-up-item" key={item.id}>
                    <div>
                      <strong>{item.job_title}</strong>
                      <p>{item.company}</p>
                      <small>Due: {item.follow_up_date}</small>
                    </div>
                    <button
                      className="edit-button"
                      onClick={() => handleEditApplication(item)}
                    >
                      Edit
                    </button>
                  </article>
                ))
              )}
            </div>

            <div>
              <h3>Upcoming ({followUpSummary.upcoming.length})</h3>

              {followUpSummary.upcoming.length === 0 ? (
                <p className="muted">No upcoming follow-ups.</p>
              ) : (
                followUpSummary.upcoming.map((item) => (
                  <article className="follow-up-item" key={item.id}>
                    <div>
                      <strong>{item.job_title}</strong>
                      <p>{item.company}</p>
                      <small>Due: {item.follow_up_date}</small>
                    </div>
                    <button
                      className="edit-button"
                      onClick={() => handleEditApplication(item)}
                    >
                      Edit
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="content-panel recent-activity-panel">
          <div className="section-heading">
            <div>
              <h2>Recent Activity</h2>
              <p>Application updates and status changes</p>
            </div>
          </div>

          {recentActivities.length === 0 ? (
            <p className="muted">No recent activity yet.</p>
          ) : (
            <div className="activity-recent-list">
              {recentActivities.map((activity) => (
                <article className="activity-recent-item" key={activity.id}>
                  <div>
                    <strong>{activity.application}</strong>
                    <p>{activity.description}</p>
                  </div>
                  <small>
                    <time dateTime={activity.created_at}>
                      {new Date(activity.created_at).toLocaleString()}
                    </time>
                  </small>
                </article>
              ))}
            </div>
          )}
        </section>
        {showForm && (
          <section className="content-panel form-panel">
            <div className="section-heading">
              <div> 
                <h2>
                  {editingId !== null ? "Edit application" : "Add an application"}
                </h2>
                <p>
                  {editingId !== null
                    ? "Update the details for this role."
                    : "Record a role you want to track."}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateApplication} className="application-form">
              <label>
                Company *
                <input
                  required
                  maxLength={200}
                  value={form.company}
                  onChange={(event) =>
                    setForm({ ...form, company: event.target.value })
                  }
                  placeholder="e.g. TCS"
                />
              </label>

              <label>
                Job title *
                <input
                  required
                  maxLength={200}
                  value={form.job_title}
                  onChange={(event) =>
                    setForm({ ...form, job_title: event.target.value })
                  }
                  placeholder="e.g. Python Developer"
                />
              </label>

              <label>
                Location
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, location: event.target.value })
                  }
                  placeholder="e.g. Chennai"
                />
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                >
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Job URL
                <input
                  type="url"
                  value={form.job_url}
                  onChange={(event) =>
                    setForm({ ...form, job_url: event.target.value })
                  }
                  placeholder="https://..."
                />
              </label>

              <label>
                Employment type
                <select
                  value={form.employment_type}
                  onChange={(event) =>
                    setForm({ ...form, employment_type: event.target.value })
                  }
                >
                  <option value="">Select type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                  <option value="Remote">Remote</option>
                </select>
              </label>

              <label>
                Applied date
                <input
                  type="date"
                  value={form.applied_date}
                  onChange={(event) =>
                    setForm({ ...form, applied_date: event.target.value })
                  }
                />
              </label>             
              <label>
                Follow-up date
                <input
                  type="date"
                  value={form.follow_up_date || ""}
                  onChange={(event) =>
                    setForm({ ...form, follow_up_date: event.target.value })
                  }
                />
              </label>
              <label>
                Salary
                <input
                  value={form.salary}
                  onChange={(event) =>
                    setForm({ ...form, salary: event.target.value })
                  }
                  placeholder="e.g. ₹5–7 LPA"
                />
              </label>

              <label className="wide-field">
                Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  placeholder="Referral, deadline, next steps..."
                />
              </label>

              <div className="form-actions wide-field">         
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                    setError("");
                  }}
                >
                  Cancel
                </button>              
                <button className="primary-button" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save changes"
                      : "Save application"}
                </button>
              </div>
            </form>
          </section>
        )}

        
{timelineApplication && (
  <section className="content-panel timeline-panel">
    <div className="section-heading">
      <div>
        <h2>Activity timeline</h2>
        <p>
          {timelineApplication.job_title} at {timelineApplication.company}
        </p>
      </div>
      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          setTimelineApplication(null);
          setActivities([]);
        }}
      >
        Close timeline
      </button>
    </div>


    <form className="activity-note-form" onSubmit={handleAddActivity}>
      <label htmlFor="activity-description">
        Add an activity note
      </label>

      <textarea
        id="activity-description"
        value={activityNote}
        onChange={(event) => setActivityNote(event.target.value)}
        placeholder="Example: Recruiter called to discuss the next interview round."
        rows={3}
        maxLength={2000}
        required
      />

      <div className="activity-note-actions">
        <span>{activityNote.length}/2000 characters</span>
        <button
          type="submit"
          className="primary-button"
          disabled={savingActivity || !activityNote.trim()}
        >
          {savingActivity ? "Saving..." : "Add note"}
        </button>
      </div>
    </form>


    {loadingActivities ? (
      <p className="muted">Loading activity history...</p>
    ) : activities.length === 0 ? (
      <p className="muted">No recorded activity yet.</p>
    ) : (
      <div className="activity-timeline">
        {activities.map((activity) => (
          <article className="activity-item" key={activity.id}>
            <div className="activity-marker" />
            <div className="activity-content">
              <strong>
                {activity.activity_type_display || activity.activity_type}
              </strong>
              <p>{activity.description}</p>
              <time dateTime={activity.created_at}>
                {new Date(activity.created_at).toLocaleString()}
              </time>
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
)}
        <section className="content-panel" id="applications">
          <div className="section-heading">
            <div>
              <h2>Applications</h2>
              <p>Track every opportunity in one place.</p>
            </div>
            <span className="result-count">
              {filteredApplications.length} records
            </span>
          </div>

          <div className="table-toolbar">
            <input
              className="search-input"
              aria-label="Search applications"
              placeholder="Search company, role, or location..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>        
            <select
              aria-label="Filter by employment type"
              value={employmentTypeFilter}
              onChange={(event) => setEmploymentTypeFilter(event.target.value)}
            >
              <option value="all">All employment types</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract</option>
              <option value="freelance">Freelance</option>
            </select>     
            <select
              aria-label="Sort applications"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="company-asc">Company A–Z</option>
              <option value="company-desc">Company Z–A</option>
            </select>
          </div>
          {loading ? (
            <div className="empty-state">Loading applications...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="empty-state">
              <h3>
                {applications.length === 0
                  ? "Your tracker starts here"
                  : "No matching applications"}
              </h3>
              <p>
                {applications.length === 0
                  ? "Add your first application to start tracking your search."
                  : "Try changing your search or status filter."}
              </p>
              {applications.length === 0 && (
                <button
                  className="primary-button"
                  onClick={() => setShowForm(true)}
                >
                  + Add your first application
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="applications-table">
                <thead>
                  <tr>
                    <th>Company / Role</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Applied date</th>
                    <th aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedApplications.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="company-name">{item.company}</div>
                        <div className="job-title">{item.job_title}</div>
                        {item.job_url && (
                          <a
                            className="job-url"
                            href={item.job_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View job
                          </a>
                        )}
                      </td>
                      <td>{item.location || "—"}</td>
                      <td>
                        <span className={`status-badge status-${item.status}`}>
                          {STATUSES.find(
                            (status) => status.value === item.status
                          )?.label || item.status}
                        </span>
                      </td>
                      <td>{item.applied_date || "—"}</td>
                      <td>
                        
                        <button
                          className="edit-button"
                          onClick={() => handleEditApplication(item)}
                          aria-label={`Edit ${item.job_title} at ${item.company}`}
                        >
                          Edit
                        </button> 
                        <button
                          className="edit-button"
                          onClick={() => handleViewTimeline(item)}
                          aria-label={`View timeline for ${item.job_title} at ${item.company}`}
                        >
                          View timeline
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteApplication(item.id)}
                          aria-label={`Delete ${item.job_title} at ${item.company}`}
                        >
                          Delete
                        </button>

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
                    <button
            type="button"
            className="secondary-button"
            onClick={handleExportCSV}
            disabled={filteredApplications.length === 0}
          >
            Export CSV
          </button> 
<section className="content-panel csv-import-panel">
  <div className="section-heading">
    <div>
      <h2>Import applications</h2>
      <p>Upload a CSV file to preview applications before importing.</p>
    </div>
  </div>

  <div className="csv-import-controls">
    <label htmlFor="csv-import-file">Choose CSV file</label>
    <input
      id="csv-import-file"
      type="file"
      accept=".csv,text/csv"
      onChange={handleCSVSelection}
    />
  </div>

  {importMessage && (
    <p className="muted" role="status">
      {importMessage}
    </p>
  )}

  {importPreview.length > 0 && (
    <div className="csv-preview-wrapper">
      <h3>Import preview</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Row</th>
              <th>Company</th>
              <th>Job title</th>
              <th>Status</th>
              <th>Validation</th>
            </tr>
          </thead>
          <tbody>
            {importPreview.slice(0, 10).map((row) => (
              <tr key={row.rowNumber}>
                <td>{row.rowNumber}</td>
                <td>{row.company || "—"}</td>
                <td>{row.job_title || "—"}</td>
                <td>{row.status || "—"}</td>
                <td>
                  {row.errors.length === 0
                    ? "Valid"
                    : row.errors.join(" ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {importPreview.length > 10 && (
        <p className="muted">
          Showing the first 10 of {importPreview.length} rows.
        </p>
      )}
      
<div className="csv-import-actions">
  <button
    type="button"
    className="primary-button"
    onClick={handleImportCSV}
    disabled={
      importPreview.every((row) => row.errors.length > 0)
    }
  >
    Import {importPreview.filter((row) => row.errors.length === 0).length} valid applications
  </button>
</div>

    </div>
  )}
</section>

          <div className="pagination-controls">
            <p className="pagination-summary">
              Showing{" "}
              {filteredApplications.length === 0
                ? 0
                : (currentPage - 1) * ITEMS_PER_PAGE + 1}
              {"–"}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredApplications.length)}
              {" of "}
              {filteredApplications.length} applications
            </p>

            <div className="pagination-buttons">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>

              <span className="pagination-page">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>

        </section>

        {/* Resume Section */}
        {window.location.hash === '#resume' && (
          <section className="content-panel resume-panel" id="resume">
            <div className="section-heading">
              <div>
                <h2>Resumes</h2>
                <p>Upload and manage your PDF/DOCX resumes</p>
              </div>
            </div>
            <div className="table-toolbar">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
              />
              <button
                className="primary-button"
                onClick={handleUploadResume}
                disabled={!resumeFile || savingResume}
              >
                {savingResume ? "Uploading..." : "Upload Resume"}
              </button>
            </div>
            {resumes.length === 0 ? (
              <p className="muted">No resumes uploaded yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="applications-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>File</th>
                      <th aria-label="Actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumes.map((resume) => (
                      <tr key={resume.id}>
                        <td>{resume.title}</td>
                        <td>{resume.file?.split('/').pop() || '—'}</td>
                        <td>
                          <button
                            className="edit-button"
                            onClick={() => viewResumeContent(resume)}
                          >
                            View
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => handleDeleteResume(resume.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedResume && (
              <section className="content-panel resume-preview-panel">
                <div className="section-heading">
                  <h3>{selectedResume.title}</h3>
                  <button
                    className="secondary-button"
                    onClick={() => setSelectedResume(null)}
                  >
                    Close
                  </button>
                </div>
                <pre className="resume-text">{selectedResume.extracted_text}</pre>
              </section>
            )}
          </section>
        )}

        {/* Job Description Section */}
        {window.location.hash === '#job-desc' && (
          <section className="content-panel job-desc-panel" id="job-desc">
            <div className="section-heading">
              <div>
                <h2>Job Descriptions</h2>
                <p>Paste job descriptions to extract requirements</p>
              </div>
            </div>
            <form onSubmit={handleAddJobDescription} className="application-form">
              <div className="wide-field">
                <label>Job Title
                  <input
                    required
                    maxLength={200}
                    value={jobDescForm.title}
                    onChange={(e) => setJobDescForm({ ...jobDescForm, title: e.target.value })}
                  />
                </label>
              </div>
              <div className="wide-field">
                <label>Job Description (paste full description)
                  <textarea
                    required
                    rows={10}
                    value={jobDescForm.content}
                    onChange={(e) => setJobDescForm({ ...jobDescForm, content: e.target.value })}
                  />
                </label>
              </div>
              <div className="form-actions wide-field">
                <button type="submit" className="primary-button" disabled={savingJobDesc}>
                  {savingJobDesc ? "Analyzing..." : "Analyze Job Description"}
                </button>
              </div>
            </form>
            {jobDescriptions.length > 0 && (
              <div className="table-wrap">
                <table className="applications-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Mandatory Skills</th>
                      <th>Preferred Skills</th>
                      <th aria-label="Actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobDescriptions.map((jd) => (
                      <tr key={jd.id}>
                        <td>{jd.title}</td>
                        <td className="skills-cell">{jd.mandatory_skills || '—'}</td>
                        <td className="skills-cell">{jd.preferred_skills || '—'}</td>
                        <td>
                          <button
                            className="edit-button"
                            onClick={() => viewJobDescription(jd)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Resume Matching Section */}
        {currentHash === '#matching' && (
          <section className="content-panel matching-panel" id="matching">
            <div className="section-heading">
              <div>
                <h2>Resume Matching</h2>
                <p>Compare your resume against job descriptions</p>
              </div>
            </div>
            <div className="table-toolbar">
              <label>
                Resume
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                >
                  <option value="">Select a resume</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Job Description
                <select
                  value={selectedJobDescId}
                  onChange={(e) => setSelectedJobDescId(e.target.value)}
                >
                  <option value="">Select a job description</option>
                  {jobDescriptions.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="table-toolbar" style={{ borderTop: 'none', background: 'transparent' }}>
              <button
                className="primary-button"
                onClick={handleMatchResume}
                disabled={!selectedResumeId || !selectedJobDescId || loadingMatch}
              >
                {loadingMatch ? "Matching..." : "Match Resume"}
              </button>
            </div>
            {matchResult && (
              <section className="content-panel match-result-panel">
                <div className="section-heading">
                  <div>
                    <h3>Match Result: {matchResult.job_title}</h3>
                    <p>Resume: {matchResult.resume_title}</p>
                  </div>
                </div>
                <section className="content-panel analytics-panel">
                  <div className="analytics-grid">
                    <div className="stat-card">
                      <p>Match Percentage</p>
                      <strong style={{ fontSize: '36px', color: 'var(--primary)' }}>{matchResult.match_percentage}%</strong>
                    </div>
                  </div>
                </section>
                <div className="skills-grid">
                  <div>
                    <h4>Matched Skills ({matchResult.matched_skills.length})</h4>
                    {matchResult.matched_skills.length === 0 ? (
                      <p className="muted">No skills matched</p>
                    ) : (
                      <ul>
                        {matchResult.matched_skills.map((skill) => (
                          <li key={skill}>{skill}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4>Mandatory Matched ({matchResult.mandatory_matched.length})</h4>
                    {matchResult.mandatory_matched.length === 0 ? (
                      <p className="muted">No mandatory skills matched</p>
                    ) : (
                      <ul>
                        {matchResult.mandatory_matched.map((skill) => (
                          <li key={skill}>{skill}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4>Missing Skills ({matchResult.missing_skills.length})</h4>
                    {matchResult.missing_skills.length === 0 ? (
                      <p className="muted">All skills matched!</p>
                    ) : (
                      <ul>
                        {matchResult.missing_skills.map((skill) => (
                          <li key={skill}>{skill} <span className="muted">(missing)</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4>Partially Matched ({matchResult.partially_matched_skills.length})</h4>
                    {matchResult.partially_matched_skills.length === 0 ? (
                      <p className="muted">No partial matches</p>
                    ) : (
                      <ul>
                        {matchResult.partially_matched_skills.map((skill) => (
                          <li key={skill}>{skill} <span className="muted">(partial)</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {matchResult.suggestions.length > 0 && (
                  <section className="content-panel suggestions-panel">
                    <h4>Recommendations to Improve Your Match</h4>
                    <ul>
                      {matchResult.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </section>
            )}
          </section>
        )}

        {/* Job Description Modal */}
        {selectedJobDesc && (
          <div className="modal-overlay" onClick={closeJobDescModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedJobDesc.title}</h2>
                <button className="modal-close" onClick={closeJobDescModal} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="job-description-content">
                  <div className="job-section">
                    <h3>Full Description</h3>
                    <p>{selectedJobDesc.content}</p>
                  </div>
                  {selectedJobDesc.mandatory_skills && (
                    <div className="job-section">
                      <h3>Mandatory Skills</h3>
                      <div className="skills-list">
                        {selectedJobDesc.mandatory_skills.split(',').map((skill) => (
                          <span key={skill.trim()} className="skill-tag">{skill.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedJobDesc.preferred_skills && (
                    <div className="job-section">
                      <h3>Preferred Skills</h3>
                      <div className="skills-list">
                        {selectedJobDesc.preferred_skills.split(',').map((skill) => (
                          <span key={skill.trim()} className="skill-tag">{skill.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedJobDesc.experience_requirements && (
                    <div className="job-section">
                      <h3>Experience Requirements</h3>
                      <p>{selectedJobDesc.experience_requirements}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="page-footer">
          AI-Powered Job Application Tracker
        </footer>
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

export default App;
