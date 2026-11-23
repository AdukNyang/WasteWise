import { useCallback, useEffect, useState } from "react";
import { apiRequest, getUploadedFile } from "./api";
import "./App.css";

const ROLE_NAMES = {
  COMMUNITY_USER: "Community member",
  ADMINISTRATOR: "Administrator",
  RESPONSIBLE_STAKEHOLDER: "Responsible stakeholder",
};

const CATEGORY_LABELS = {
  "Blocked Drain": "A drain is blocked or overflowing",
  "Illegal Dumping": "Piled-up rubbish",
  "Open Burning": "Rubbish burning and causing smoke",
  "Sewage Leakage": "Dirty water or sewage leaking",
  Other: "Another environmental problem",
};

const readSession = () => {
  const saved = localStorage.getItem("wastewise-session");
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem("wastewise-session");
    return null;
  }
};

function App() {
  const [session, setSession] = useState(readSession);

  const handleAuthenticated = (value) => {
    localStorage.setItem("wastewise-session", JSON.stringify(value));
    setSession(value);
  };

  const handleLogout = () => {
    localStorage.removeItem("wastewise-session");
    setSession(null);
  };

  if (!session) return <AuthScreen onAuthenticated={handleAuthenticated} />;
  return <Dashboard key={session.user.id} session={session} onLogout={handleLogout} />;
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body = isRegister
        ? { name: form.name, email: form.email, phone: form.phone, password: form.password }
        : { email: form.email, password: form.password };
      const result = await apiRequest(`/api/auth/${isRegister ? "register" : "login"}`, null, {
        method: "POST",
        body,
      });
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand brand-light">
          <span className="brand-mark">W</span>
          <span>WasteWise</span>
        </div>
        <div className="auth-intro-copy">
          <p className="eyebrow">A cleaner community starts here.</p>
          <h1>Small actions,<br />Visible change.</h1>
          <p>Report local environmental issues, follow their progress, and help make sure they are resolved.</p>
        </div>
        <div className="auth-footnote">Community reporting platform for Kampala</div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{isRegister ? "Join the community" : "Welcome to WasteWise"}</p>
          <h2>{isRegister ? "Create your account" : "Sign in to WasteWise"}</h2>
          <p className="muted">{isRegister ? "Start reporting and tracking local environmental issues." : "Continue making a difference in your community."}</p>

          {error && <Alert kind="error">{error}</Alert>}
          <form className="form-stack" onSubmit={submit}>
            {isRegister && (
              <>
                <Field label="Full name">
                  <input name="name" value={form.name} onChange={updateForm} required autoComplete="name" />
                </Field>
                <Field label="Phone number" hint="Optional">
                  <input name="phone" value={form.phone} onChange={updateForm} autoComplete="tel" />
                </Field>
              </>
            )}
            <Field label="Email">
              <input type="email" name="email" value={form.email} onChange={updateForm} required autoComplete="email" />
            </Field>
            <Field label="Password">
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={updateForm}
                required
                minLength={6}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </Field>
            <button className="button button-primary button-wide" type="submit" disabled={loading}>
              {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New to WasteWise?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setError("");
                setMode(isRegister ? "login" : "register");
              }}
            >
              {isRegister ? "Sign in" : "Create an account"}
            </button>
          </p>
          {isRegister && <p className="fine-print">Community accounts are created here. Staff accounts are managed by an administrator.</p>}
        </div>
      </section>
    </main>
  );
}

function Dashboard({ session, onLogout }) {
  const role = session.user.role;
  const navItems = role === "COMMUNITY_USER"
    ? [{ id: "overview", label: "Overview" }, { id: "reports", label: "My reports" }, { id: "wallet", label: "EcoCoins" }]
    : role === "ADMINISTRATOR"
      ? [{ id: "reports", label: "Report review" }]
      : [{ id: "assigned", label: "Assigned work" }];
  const [page, setPage] = useState(navItems[0].id);

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">W</span>
          <span>WasteWise</span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${page === item.id ? "nav-item-active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-number">0{index + 1}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-summary">
            <span className="avatar">{session.user.name.slice(0, 1).toUpperCase()}</span>
            <span className="profile-copy">
              <strong>{session.user.name}</strong>
              <small>{ROLE_NAMES[role] || role}</small>
            </span>
          </div>
          <button type="button" className="logout-button" onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">WASTEWISE / {ROLE_NAMES[role]?.toUpperCase()}</p>
            <h1>{navItems.find((item) => item.id === page)?.label}</h1>
          </div>
          <div className="topbar-user">
            <span className="online-dot" />
            <span>{session.user.name}</span>
          </div>
        </header>

        {role === "COMMUNITY_USER" && (
          <CommunityDashboard
            page={page}
            token={session.token}
            user={session.user}
            onNavigate={setPage}
          />
        )}
        {role === "ADMINISTRATOR" && <AdminDashboard token={session.token} />}
        {role === "RESPONSIBLE_STAKEHOLDER" && <StakeholderDashboard token={session.token} />}
      </main>
    </div>
  );
}

function CommunityDashboard({ page, token, user, onNavigate }) {
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReports = useCallback(async () => {
    try {
      setReports(await apiRequest("/api/reports/my", token));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    apiRequest("/api/reports/my", token).then((result) => {
      if (active) setReports(result);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [token]);

  const handleReportCreated = async (report) => {
    setNotice(`Report submitted. Reference: ${report.id}`);
    setLoading(true);
    await loadReports();
    setSelectedId(report.id);
    onNavigate("reports");
  };

  const selectedReport = reports.find((report) => report.id === selectedId);
  const counts = reports.reduce((result, report) => {
    result.total += 1;
    result.active += ["SUBMITTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"].includes(report.status) ? 1 : 0;
    return result;
  }, { total: 0, active: 0 });

  return (
    <div className="page-content">
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success" onDismiss={() => setNotice("")}>{notice}</Alert>}

      {page === "overview" && (
        <>
          <section className="welcome-panel">
            <div>
              <p className="eyebrow">YOUR COMMUNITY, YOUR IMPACT</p>
              <h2>Good to see you, {user.name.split(" ")[0]}.</h2>
              <p>Report a local issue and follow each step until it is resolved (and earn EcoCoins).</p>
            </div>
            <div className="welcome-stat">
              <strong>{counts.total}</strong>
              <span>reports submitted</span>
            </div>
          </section>
          <div className="overview-grid">
            <section className="panel">
              <PanelHeading kicker="NEW REPORT" title="What needs attention?" />
              <ReportForm token={token} onCreated={handleReportCreated} />
            </section>
            <section className="panel">
              <PanelHeading kicker="YOUR ACTIVITY" title="Recent reports" action={
                <button className="text-button" type="button" onClick={() => onNavigate("reports")}>View all</button>
              } />
              {loading ? <Loading /> : reports.length ? (
                <ReportList reports={reports.slice(0, 4)} onSelect={(id) => { setSelectedId(id); onNavigate("reports"); }} />
              ) : <EmptyState title="No reports yet" text="Your submitted reports will appear here." />}
            </section>
          </div>
        </>
      )}

      {page === "reports" && (
        <div className="reports-layout">
          <section className="panel reports-list-panel">
            <PanelHeading kicker={`${counts.active} ACTIVE · ${counts.total} TOTAL`} title="My reports" />
            {loading ? <Loading /> : reports.length ? (
              <ReportList reports={reports} selectedId={selectedId} onSelect={setSelectedId} />
            ) : <EmptyState title="Nothing reported yet" text="Submit your first report from the overview." />}
          </section>
          <section className="panel report-detail-panel">
            {selectedId && selectedReport
              ? (
                <CommunityReportDetails
                  key={selectedId}
                  reportId={selectedId}
                  reporterRank={selectedReport.reporterRank}
                  appreciationEligible={selectedReport.appreciationEligible}
                  token={token}
                  onChanged={loadReports}
                />
              )
              : <EmptyState title="Select a report" text="Choose a report to view its progress, follow-up status, and resolution evidence." />}
          </section>
        </div>
      )}

      {page === "wallet" && <WalletPage token={token} />}
    </div>
  );
}

function ReportForm({ token, onCreated }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [gpsState, setGpsState] = useState("idle");
  const [gpsMessage, setGpsMessage] = useState("");

  const useCurrentLocation = () => {
    setGpsMessage("");
    if (!navigator.geolocation) {
      setGpsState("error");
      setGpsMessage("GPS is not available in this browser. Enter a nearby street or landmark instead.");
      return;
    }

    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = Number(coords.latitude.toFixed(5));
        const longitude = Number(coords.longitude.toFixed(5));
        setCoordinates({ latitude, longitude });
        setLocation(`GPS coordinates: ${formatCoordinates(latitude, longitude)}`);
        setGpsState("success");
        setGpsMessage("GPS coordinates are ready and will be saved with this report.");
      },
      (locationError) => {
        setGpsState("error");
        if (locationError.code === 1) {
          setGpsMessage("Location permission was denied. Allow location access or enter a nearby street or landmark.");
        } else if (locationError.code === 3) {
          setGpsMessage("Getting your location took too long. Try again or enter a nearby street or landmark.");
        } else {
          setGpsMessage("Your location could not be read. Try again or enter a nearby street or landmark.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (coordinates) {
      formData.set("latitude", String(coordinates.latitude));
      formData.set("longitude", String(coordinates.longitude));
    }
    try {
      const result = await apiRequest("/api/reports", token, { method: "POST", body: formData });
      form.reset();
      setLocation("");
      setCoordinates(null);
      setGpsState("idle");
      setGpsMessage("");
      await onCreated(result.report);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={submit}>
      {error && <Alert kind="error">{error}</Alert>}
      <Field label="Issue category">
        <select name="category" required defaultValue="">
          <option value="" disabled>Select a category</option>
          <option value="Blocked Drain">{CATEGORY_LABELS["Blocked Drain"]}</option>
          <option value="Illegal Dumping">{CATEGORY_LABELS["Illegal Dumping"]}</option>
          <option value="Open Burning">{CATEGORY_LABELS["Open Burning"]}</option>
          <option value="Sewage Leakage">{CATEGORY_LABELS["Sewage Leakage"]}</option>
          <option value="Other">{CATEGORY_LABELS.Other}</option>
        </select>
      </Field>
      <div className="field">
        <span className="field-label">Location <small>Enter a place or use GPS</small></span>
        <div className="location-entry">
          <input
            name="location"
            value={location}
            onChange={(event) => {
              setLocation(event.target.value);
              if (coordinates) setGpsMessage("GPS coordinates are still attached. Clear them if this is not the correct location.");
            }}
            required
            placeholder="Street, area, or nearby landmark"
          />
          <button className="button button-secondary gps-button" type="button" onClick={useCurrentLocation} disabled={gpsState === "loading"}>
            {gpsState === "loading" ? "Locating..." : "Use my GPS"}
          </button>
        </div>
        {gpsMessage && <small className={`gps-message gps-${gpsState}`} role={gpsState === "error" ? "alert" : "status"}>{gpsMessage}</small>}
        {coordinates && (
          <button
            className="text-button clear-gps-button"
            type="button"
            onClick={() => {
              setCoordinates(null);
              setGpsState("idle");
              setGpsMessage("");
              setLocation((current) => current.startsWith("GPS coordinates: ") ? "" : current);
            }}
          >
            Remove GPS location
          </button>
        )}
      </div>
      <p className="field-help">GPS is optional. Coordinates are saved with the report for the admin and assigned stakeholder; no outside map service receives them.</p>
      <Field label="What is happening?">
        <textarea name="description" rows="3" required placeholder="Describe the issue and its impact." />
      </Field>
      <Field label="Photo or video evidence" hint="Optional">
        <input name="photo" type="file" accept="image/*,video/*" />
      </Field>
      <button className="button button-primary" type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit report"}
      </button>
    </form>
  );
}

function ReportList({ reports, selectedId, onSelect }) {
  return (
    <div className="report-list">
      {reports.map((report) => (
        <button
          key={report.id}
          className={`report-list-item ${selectedId === report.id ? "report-list-item-selected" : ""}`}
          type="button"
          onClick={() => onSelect(report.id)}
        >
          <span className="report-list-copy">
            <strong>{categoryLabel(report.category)}</strong>
            <small>{report.location}</small>
            <small>Reporter rank {report.reporterRank}</small>
            {report.appreciationEligible && ["VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CONFIRMED", "REOPENED"].includes(report.status) && (
              <small className="appreciation-note">
                <FlowerMark />
                {report.reporterRank <= 10 ? "10 EcoCoins awarded" : "Your report matters"}
              </small>
            )}
            <small>{formatDate(report.createdAt)}</small>
          </span>
          <StatusBadge status={report.status} />
        </button>
      ))}
    </div>
  );
}

function CommunityReportDetails({ reportId, reporterRank, appreciationEligible, token, onChanged }) {
  const [report, setReport] = useState(null);
  const [followUp, setFollowUp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const reportResult = await apiRequest(`/api/reports/${reportId}`, token);
      setReport(reportResult);
      if (["VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CONFIRMED", "REOPENED"].includes(reportResult.status)) {
        setFollowUp(await apiRequest(`/api/reports/${reportId}/follow-up`, token));
      } else {
        setFollowUp(null);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [reportId, token]);

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      try {
        const reportResult = await apiRequest(`/api/reports/${reportId}`, token);
        const followUpResult = ["VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CONFIRMED", "REOPENED"].includes(reportResult.status)
          ? await apiRequest(`/api/reports/${reportId}/follow-up`, token)
          : null;
        if (active) {
          setReport(reportResult);
          setFollowUp(followUpResult);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchDetails();
    return () => { active = false; };
  }, [reportId, token]);

  const acceptFollowUp = async () => {
    setAction("accept");
    setError("");
    try {
      const result = await apiRequest(`/api/reports/${reportId}/follow-up/accept`, token, { method: "POST" });
      setNotice(`Follow-up accepted as reporter ${result.rank}.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAction("");
    }
  };

  const confirmResolution = async (confirmed) => {
    setAction(confirmed ? "confirm" : "dispute");
    setError("");
    try {
      const result = await apiRequest(`/api/stakeholder/reports/${reportId}/confirm`, token, {
        method: "POST",
        body: { confirmed },
      });
      setNotice(`${result.message}. ${result.coinsAwarded} EcoCoins awarded.`);
      await load();
      onChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAction("");
    }
  };

  if (loading) return <Loading />;
  if (!report) return <Alert kind="error">{error || "Could not load report."}</Alert>;

  return (
    <div className="detail-content">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">REPORT DETAILS</p>
          <h2>{categoryLabel(report.category)}</h2>
        </div>
        <StatusBadge status={report.status} />
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success" onDismiss={() => setNotice("")}>{notice}</Alert>}
      <p className="report-rank-note">Reporter rank {reporterRank} for this category and location.</p>
      {appreciationEligible && ["VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CONFIRMED", "REOPENED"].includes(report.status) && (
        <AppreciationMessage reporterRank={reporterRank} />
      )}
      <p className="detail-description">{report.description}</p>
      <dl className="detail-facts">
        <div><dt>Reported location</dt><dd>{report.location}</dd></div>
        <div><dt>Submitted</dt><dd>{formatDate(report.createdAt)}</dd></div>
        {report.resolutionLocation && <div><dt>Resolution location</dt><dd>{report.resolutionLocation}</dd></div>}
        {report.latitude != null && report.longitude != null && (
          <div><dt>GPS coordinates</dt><dd>{formatCoordinates(report.latitude, report.longitude)}</dd></div>
        )}
      </dl>
      {report.photoUrl && <ProtectedMedia key={report.photoUrl} path={report.photoUrl} token={token} label="Report photo" />}
      {report.resolutionEvidenceUrl && (
        <ProtectedMedia key={report.resolutionEvidenceUrl} path={report.resolutionEvidenceUrl} token={token} label="Resolution evidence" />
      )}

      {followUp?.started && (
        <section className="followup-box">
          <PanelHeading kicker="FOLLOW-UP" title="Help keep this issue on track" />
          {followUp.ownerReportId === report.id ? (
            <p className="status-note">You accepted the follow-up role. You can earn milestone coins as the issue progresses.</p>
          ) : followUp.ownerReportId ? (
            <p className="status-note">Another reporter has accepted the follow-up role.</p>
          ) : followUp.eligibleForCurrentUser ? (
            <>
              <p className="status-note">You are reporter {followUp.eligibleReporterRank} and your acceptance window is open.</p>
              <button className="button button-primary" type="button" onClick={acceptFollowUp} disabled={Boolean(action)}>
                {action === "accept" ? "Accepting..." : "Accept follow-up"}
              </button>
            </>
          ) : (
            <p className="status-note">
              {followUp.eligibleReporterRank
                ? `Reporter ${followUp.eligibleReporterRank} currently has the acceptance window.`
                : "This follow-up role is not currently available to you."}
            </p>
          )}
        </section>
      )}

      {report.status === "RESOLVED" && (
        <section className="confirmation-box">
          <p className="eyebrow">YOUR CONFIRMATION</p>
          <h3>Does the evidence show the issue is resolved?</h3>
          <p>Review the stakeholder’s photo or video and resolution location. You can confirm remotely or reopen the issue if it is still unresolved.</p>
          <div className="button-row">
            <button className="button button-primary" type="button" onClick={() => confirmResolution(true)} disabled={Boolean(action)}>
              {action === "confirm" ? "Confirming..." : "Confirm resolution"}
            </button>
            <button className="button button-secondary" type="button" onClick={() => confirmResolution(false)} disabled={Boolean(action)}>
              {action === "dispute" ? "Reopening..." : "Still unresolved"}
            </button>
          </div>
        </section>
      )}

      <section className="timeline-section">
        <PanelHeading kicker="ACTIVITY" title="Status history" />
        <div className="timeline">
          {[...(report.statusHistory || [])].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt)).map((item) => (
            <div className="timeline-item" key={item.id}>
              <span className="timeline-marker" />
              <div><strong>{statusLabel(item.status)}</strong><small>{formatDate(item.changedAt)}</small></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProtectedMedia({ path, token, label }) {
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl;
    getUploadedFile(path, token).then((result) => {
      objectUrl = result.url;
      if (!active) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setAsset(result);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, token]);

  if (error) return <Alert kind="error">{error}</Alert>;
  if (!asset) return <p className="muted">Loading {label.toLowerCase()}...</p>;

  return (
    <div className="evidence-block">
      <p className="eyebrow">{label.toUpperCase()}</p>
      {asset.type.startsWith("image/") ? (
        <img className="evidence-image" src={asset.url} alt={label} />
      ) : asset.type.startsWith("video/") ? (
        <video className="evidence-video" src={asset.url} controls />
      ) : (
        <a className="evidence-link" href={asset.url} target="_blank" rel="noreferrer">Open {label.toLowerCase()}</a>
      )}
    </div>
  );
}

function FlowerMark() {
  return (
    <svg className="flower-mark" viewBox="0 0 28 34" aria-hidden="true">
      <path d="M14 18c0 4 0 8-2 13m2-8c4-3 7-2 9 1-4 2-7 2-9-1m-1 4c-3-3-6-3-9-1 2 3 6 4 9 1" />
      <g className="flower-petals">
        <ellipse cx="14" cy="6" rx="3.1" ry="4.3" />
        <ellipse cx="20" cy="10" rx="3.1" ry="4.3" transform="rotate(58 20 10)" />
        <ellipse cx="18" cy="17" rx="3.1" ry="4.3" transform="rotate(128 18 17)" />
        <ellipse cx="10" cy="17" rx="3.1" ry="4.3" transform="rotate(52 10 17)" />
        <ellipse cx="8" cy="10" rx="3.1" ry="4.3" transform="rotate(122 8 10)" />
        <circle cx="14" cy="12" r="2.3" />
      </g>
    </svg>
  );
}

function AppreciationMessage({ reporterRank }) {
  return (
    <div className="appreciation-panel">
      <div className="flower-row" aria-hidden="true">
        <FlowerMark />
        <FlowerMark />
        <FlowerMark />
      </div>
      <p>
        {reporterRank <= 10
          ? "Thank you for taking responsibility for your community. You earned 10 EcoCoins for this verified report."
          : "Thank you for taking responsibility for your community. Your report matters and helps keep this issue visible."}
      </p>
    </div>
  );
}

function WalletPage({ token }) {
  const rewards = [
    { type: "DIGITAL_CERTIFICATE", label: "Digital certificate", cost: 1000 },
    { type: "PARTNER_DISCOUNT", label: "Partner discount", cost: 1500 },
    { type: "LETTER_OF_RECOGNITION", label: "Letter of recognition", cost: 2000 },
    { type: "DATA_BUNDLE", label: "Data bundle", cost: 2000 },
    { type: "AIRTIME", label: "Airtime", cost: 3000 },
    { type: "FELLOWSHIP_ACCESS", label: "Fellowship access", cost: 5000 },
    { type: "COMMUNITY_CHAMPION", label: "Community champion", cost: 10000 },
  ];
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyReward, setBusyReward] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadWallet = useCallback(async () => {
    try {
      setWallet(await apiRequest("/api/ecocoins/wallet", token));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    apiRequest("/api/ecocoins/wallet", token).then((result) => {
      if (active) setWallet(result);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [token]);

  const redeem = async (reward) => {
    setBusyReward(reward.type);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest("/api/ecocoins/redeem", token, {
        method: "POST",
        body: { rewardType: reward.type },
      });
      setNotice(result.message);
      setLoading(true);
      await loadWallet();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyReward("");
    }
  };

  if (loading) return <div className="page-content"><Loading /></div>;
  if (!wallet) return <div className="page-content">{error && <Alert kind="error">{error}</Alert>}</div>;

  return (
    <div className="page-content">
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success" onDismiss={() => setNotice("")}>{notice}</Alert>}
      <section className="wallet-hero">
        <div>
          <p className="eyebrow">YOUR ECOCOINS WALLET</p>
          <h2>{wallet.balance.toLocaleString()} <span>coins</span></h2>
          <p>{wallet.totalEarned.toLocaleString()} coins earned in total</p>
        </div>
        <div className="wallet-mark">WW</div>
      </section>
      <div className="wallet-grid">
        <section className="panel">
          <PanelHeading kicker="REWARDS" title="Redeem your coins" />
          <div className="reward-list">
            {rewards.map((reward) => (
              <div className="reward-row" key={reward.type}>
                <div><strong>{reward.label}</strong><small>{reward.cost.toLocaleString()} coins</small></div>
                <button
                  className="button button-small button-secondary"
                  type="button"
                  disabled={wallet.balance < reward.cost || Boolean(busyReward)}
                  onClick={() => redeem(reward)}
                >
                  {busyReward === reward.type ? "Processing..." : "Redeem"}
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <PanelHeading kicker="RECENT ACTIVITY" title="Transactions" />
          {wallet.transactions.length ? (
            <div className="transaction-list">
              {wallet.transactions.map((transaction) => (
                <div className="transaction-row" key={transaction.id}>
                  <div><strong>{transaction.reason}</strong><small>{formatDate(transaction.createdAt)}</small></div>
                  <span className={transaction.amount < 0 ? "amount-negative" : "amount-positive"}>
                    {transaction.amount > 0 ? "+" : ""}{transaction.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No transactions yet" text="Coins earned or redeemed will appear here." />}
        </section>
      </div>
      <section className="panel redemption-panel">
        <PanelHeading kicker="REDEMPTIONS" title="Redemption history" />
        {wallet.redemptions.length ? (
          <div className="transaction-list">
            {wallet.redemptions.map((redemption) => (
              <div className="transaction-row" key={redemption.id}>
                <div><strong>{rewardLabel(redemption.rewardType)}</strong><small>{formatDate(redemption.redeemedAt)}</small></div>
                <span className="amount-negative">-{redemption.coinsSpent.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : <p className="muted">Your redemptions will appear here.</p>}
      </section>
    </div>
  );
}

function AdminDashboard({ token }) {
  const [reports, setReports] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [priorities, setPriorities] = useState({});
  const [assignees, setAssignees] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [reportResult, stakeholderResult] = await Promise.all([
        apiRequest("/api/admin/reports", token),
        apiRequest("/api/admin/stakeholders", token),
      ]);
      setReports(reportResult);
      setStakeholders(stakeholderResult);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest("/api/admin/reports", token),
      apiRequest("/api/admin/stakeholders", token),
    ]).then(([reportResult, stakeholderResult]) => {
      if (active) {
        setReports(reportResult);
        setStakeholders(stakeholderResult);
      }
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [token]);

  const review = async (report, status) => {
    setBusyId(report.id);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`/api/admin/reports/${report.id}/verify`, token, {
        method: "PATCH",
        body: { status },
      });
      const rewardNotice = result.rewards
        ? ` Rank ${result.rewards.rank}: ${result.rewards.coinsAwarded} coins awarded.`
        : "";
      const appreciation = result.rewards?.appreciationEligible
        ? " Thank you for contributing to your community."
        : "";
      setNotice(`${result.message}.${rewardNotice}${appreciation}`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  };

  const assign = async (report) => {
    const assignedTo = assignees[report.id] || stakeholders[0]?.id;
    if (!assignedTo) {
      setError("Create an active responsible stakeholder account before assigning reports.");
      return;
    }
    setBusyId(report.id);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`/api/admin/reports/${report.id}/assign`, token, {
        method: "POST",
        body: { assignedTo, priority: priorities[report.id] || "MEDIUM" },
      });
      setNotice(`${result.message}. ${result.coinsAwarded} EcoCoins awarded for the assignment milestone.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  };

  const pendingCount = reports.filter((report) => ["SUBMITTED", "UNDER_REVIEW"].includes(report.status)).length;
  const verifiedCount = reports.filter((report) => report.status === "VERIFIED").length;

  return (
    <div className="page-content">
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success" onDismiss={() => setNotice("")}>{notice}</Alert>}
      <div className="metrics-row">
        <MetricCard label="Awaiting review" value={pendingCount} />
        <MetricCard label="Ready for assignment" value={verifiedCount} />
        <MetricCard label="Active stakeholders" value={stakeholders.length} />
      </div>
      <section className="panel">
        <PanelHeading kicker="ADMINISTRATION" title="Report queue" />
        {loading ? <Loading /> : reports.length ? (
          <div className="admin-report-list">
            {reports.map((report) => (
              <article className="admin-report-card" key={report.id}>
                <div className="admin-report-heading">
                  <div>
                    <p className="eyebrow">{report.submittedBy?.name || "Community member"} · {formatDate(report.createdAt)}</p>
                    <h3>{categoryLabel(report.category)}</h3>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
                <p className="report-location">{report.location}</p>
                {report.latitude != null && report.longitude != null && (
                  <p className="coordinate-readout"><span>GPS coordinates</span>{formatCoordinates(report.latitude, report.longitude)}</p>
                )}
                <p className="report-description">{report.description}</p>
                {["SUBMITTED", "UNDER_REVIEW"].includes(report.status) && (
                  <div className="button-row admin-actions">
                    <button className="button button-primary button-small" type="button" disabled={busyId === report.id} onClick={() => review(report, "VERIFIED")}>Verify</button>
                    <button className="button button-secondary button-small" type="button" disabled={busyId === report.id} onClick={() => review(report, "UNDER_REVIEW")}>Under review</button>
                    <button className="button button-danger button-small" type="button" disabled={busyId === report.id} onClick={() => review(report, "REJECTED")}>Reject</button>
                  </div>
                )}
                {report.status === "VERIFIED" && (
                  <div className="assignment-controls">
                    <Field label="Responsible stakeholder">
                      <select
                        value={assignees[report.id] || stakeholders[0]?.id || ""}
                        onChange={(event) => setAssignees((current) => ({ ...current, [report.id]: event.target.value }))}
                        disabled={!stakeholders.length}
                      >
                        {!stakeholders.length && <option value="">No active stakeholders</option>}
                        {stakeholders.map((stakeholder) => (
                          <option key={stakeholder.id} value={stakeholder.id}>{stakeholder.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Priority">
                      <select
                        value={priorities[report.id] || "MEDIUM"}
                        onChange={(event) => setPriorities((current) => ({ ...current, [report.id]: event.target.value }))}
                      >
                        {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priority) => <option key={priority}>{priority}</option>)}
                      </select>
                    </Field>
                    <button className="button button-primary" type="button" disabled={busyId === report.id || !stakeholders.length} onClick={() => assign(report)}>
                      {busyId === report.id ? "Assigning..." : "Assign report"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : <EmptyState title="No reports yet" text="Submitted community reports will appear here." />}
      </section>
    </div>
  );
}

function StakeholderDashboard({ token }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setAssignments(await apiRequest("/api/stakeholder/assigned", token));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    apiRequest("/api/stakeholder/assigned", token).then((result) => {
      if (active) setAssignments(result);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [token]);

  return (
    <div className="page-content">
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success" onDismiss={() => setNotice("")}>{notice}</Alert>}
      <section className="panel">
        <PanelHeading kicker="YOUR WORK" title="Assigned reports" />
        {loading ? <Loading /> : assignments.length ? (
          <div className="stakeholder-list">
            {assignments.map((assignment) => (
              <StakeholderReportCard
                key={assignment.id}
                assignment={assignment}
                token={token}
                onChanged={load}
                onNotice={setNotice}
                onError={setError}
              />
            ))}
          </div>
        ) : <EmptyState title="No assigned reports" text="New assignments will appear here." />}
      </section>
    </div>
  );
}

function StakeholderReportCard({ assignment, token, onChanged, onNotice, onError }) {
  const { report } = assignment;
  const [note, setNote] = useState("");
  const [location, setLocation] = useState(report.location);
  const [evidence, setEvidence] = useState(null);
  const [busy, setBusy] = useState("");

  const addProgress = async (event) => {
    event.preventDefault();
    setBusy("progress");
    onError("");
    onNotice("");
    try {
      const result = await apiRequest(`/api/stakeholder/reports/${report.id}/progress`, token, {
        method: "POST",
        body: { note },
      });
      setNote("");
      onNotice(`Progress update saved. ${result.coinsAwarded} EcoCoins awarded.`);
      await onChanged();
    } catch (requestError) {
      onError(requestError.message);
    } finally {
      setBusy("");
    }
  };

  const markResolved = async (event) => {
    event.preventDefault();
    if (!evidence) {
      onError("Choose a resolution photo or video before submitting.");
      return;
    }
    setBusy("resolve");
    onError("");
    onNotice("");
    const body = new FormData();
    body.append("resolutionLocation", location);
    body.append("evidence", evidence);
    try {
      const result = await apiRequest(`/api/stakeholder/reports/${report.id}/resolve`, token, {
        method: "PATCH",
        body,
      });
      onNotice(`Report marked resolved. ${result.coinsAwarded} EcoCoins awarded.`);
      await onChanged();
    } catch (requestError) {
      onError(requestError.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <article className="stakeholder-card">
      <div className="admin-report-heading">
        <div>
          <p className="eyebrow">{categoryLabel(report.category)} · {formatDate(report.createdAt)}</p>
          <h3>{report.location}</h3>
        </div>
        <StatusBadge status={report.status} />
      </div>
      <p className="report-description">{report.description}</p>
      {report.latitude != null && report.longitude != null && (
        <p className="coordinate-readout"><span>GPS coordinates</span>{formatCoordinates(report.latitude, report.longitude)}</p>
      )}
      <p className="submitter-line">Reported by {report.submittedBy?.name || "Community member"}</p>
      {report.status === "RESOLVED" || report.status === "CONFIRMED" ? (
        <p className="status-note">
          {report.status === "CONFIRMED"
            ? "The community member confirmed the resolution."
            : "Resolution evidence submitted. Waiting for the community member to confirm."}
        </p>
      ) : (
        <div className="stakeholder-actions">
          {["ASSIGNED", "IN_PROGRESS", "REOPENED"].includes(report.status) && (
            <form className="form-stack compact-form" onSubmit={addProgress}>
              <Field label="Progress update">
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows="2" required placeholder="Describe the work completed or next steps." />
              </Field>
              <button className="button button-secondary" type="submit" disabled={Boolean(busy)}>
                {busy === "progress" ? "Saving..." : "Add update"}
              </button>
            </form>
          )}
          {report.status === "IN_PROGRESS" && (
            <form className="form-stack compact-form resolve-form" onSubmit={markResolved}>
              <Field label="Resolution location" hint="Identify the site where the work was completed">
                <input value={location} onChange={(event) => setLocation(event.target.value)} required />
              </Field>
              <Field label="Resolution photo or video">
                <input type="file" accept="image/*,video/*" required onChange={(event) => setEvidence(event.target.files?.[0] || null)} />
              </Field>
              <button className="button button-primary" type="submit" disabled={Boolean(busy)}>
                {busy === "resolve" ? "Submitting..." : "Mark resolved"}
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

function PanelHeading({ kicker, title, action }) {
  return (
    <div className="panel-heading">
      <div><p className="eyebrow">{kicker}</p><h2>{title}</h2></div>
      {action}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}{hint && <small>{hint}</small>}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status?.toLowerCase()}`}>{statusLabel(status)}</span>;
}

function Alert({ kind, children, onDismiss }) {
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {onDismiss && <button type="button" aria-label="Dismiss message" onClick={onDismiss}>×</button>}
    </div>
  );
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><strong>{title}</strong><p>{text}</p></div>;
}

function Loading() {
  return <div className="loading-state"><span className="spinner" /> Loading...</div>;
}

function MetricCard({ label, value }) {
  return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div>;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status = "UNKNOWN") {
  return status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function rewardLabel(value) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

function formatCoordinates(latitude, longitude) {
  return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
}

export default App;
