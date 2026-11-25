import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, getUploadedFile } from "./api";
import AdminReportMap from "./AdminReportMap";
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
const EVIDENCE_FILE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime";
const EVIDENCE_FILE_HINT = "Required; maximum 25 MB; JPEG, PNG, GIF, WebP, MP4, WebM, or MOV";
const GPS_PROXIMITY_LIMIT_METERS = 50;

const hasDetailedDescription = (description) => {
  const trimmed = description.trim();
  const words = trimmed.split(/\s+/).filter((word) => /\p{L}/u.test(word));
  return trimmed.length >= 20 && words.length >= 3;
};

const hasReportFormData = (form) => Array.from(new FormData(form).values()).some((value) => (
  typeof value === "string" ? value.trim().length > 0 : value.size > 0
));

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

const getAuthScreen = () => {
  const requestedScreen = new URLSearchParams(window.location.search).get("auth");
  return ["welcome", "login", "register"].includes(requestedScreen)
    ? requestedScreen
    : "landing";
};

function App() {
  const [session, setSession] = useState(readSession);
  const [authScreen, setAuthScreen] = useState(getAuthScreen);

  useEffect(() => {
    const syncAuthScreen = () => setAuthScreen(getAuthScreen());
    window.addEventListener("popstate", syncAuthScreen);
    return () => window.removeEventListener("popstate", syncAuthScreen);
  }, []);

  const navigateAuth = useCallback((screen, replace = false) => {
    const url = new URL(window.location.href);
    if (screen === "landing") {
      url.searchParams.delete("auth");
    } else {
      url.searchParams.set("auth", screen);
    }
    const updateHistory = replace ? "replaceState" : "pushState";
    window.history[updateHistory]({}, "", `${url.pathname}${url.search}${url.hash}`);
    setAuthScreen(screen);
  }, []);

  const handleAuthenticated = (value) => {
    localStorage.setItem("wastewise-session", JSON.stringify(value));
    setSession(value);
  };

  const handleLogout = (hasUnsavedReport = false) => {
    const message = hasUnsavedReport
      ? "You have an unsubmitted report. Sign out and discard it?"
      : "Are you sure you want to sign out?";
    if (!window.confirm(message)) return;
    localStorage.removeItem("wastewise-session");
    navigateAuth("landing");
    setSession(null);
  };

  if (!session) {
    if (authScreen === "landing") {
      return <LandingPage onNavigate={navigateAuth} />;
    }
    const backScreen = authScreen === "welcome" ? "landing" : "welcome";
    const backLabel = authScreen === "welcome" ? "Back to home" : "Back";
    return (
      <AuthScreen
        key={authScreen}
        screen={authScreen}
        onAuthenticated={handleAuthenticated}
        onBack={() => navigateAuth(backScreen)}
        backLabel={backLabel}
        onNavigate={navigateAuth}
      />
    );
  }
  return <Dashboard key={session.user.id} session={session} onLogout={handleLogout} />;
}

function LandingPage({ onNavigate }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onNavigate("welcome", true), 1000);
    return () => window.clearTimeout(timeout);
  }, [onNavigate]);

  return (
    <main className="landing-page">
      <div className="landing-logo" aria-label="WasteWise">
        <span className="landing-logo-mark" aria-hidden="true">W</span>
        <span>WasteWise</span>
      </div>
    </main>
  );
}

function AuthScreen({ screen, onAuthenticated, onBack, backLabel, onNavigate }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isWelcome = screen === "welcome";
  const isRegister = screen === "register";
  const isAuthForm = screen === "login" || isRegister;

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const switchScreen = (nextScreen) => {
    setError("");
    onNavigate(nextScreen);
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
      <header className="auth-header">
        <div className="brand">
          <span className="brand-mark">W</span>
          <span>WasteWise</span>
        </div>
        {screen !== "welcome" && (
          <button type="button" className="text-button" onClick={onBack}>{backLabel}</button>
        )}
      </header>

      <section className="auth-panel">
        {isWelcome && (
          <div className="auth-content auth-content-welcome">
            <div className="auth-intro-copy">
              <h1>
                Small Actions,<br />
                <span className="auth-intro-heading-offset">Visible Change</span>
              </h1>
              <p>A cleaner community starts here.</p>
              <button
                type="button"
                className="button button-primary auth-get-started"
                onClick={() => switchScreen("register")}
              >
                Get Started
              </button>
            </div>
          </div>
        )}

        {isAuthForm && (
          <div className="auth-content auth-content-form">
            <div className="auth-card">
              <p className="eyebrow">{isRegister ? "Join WasteWise" : "Welcome Back"}</p>
              <h2>{isRegister ? "Create your account" : "Sign in to WasteWise"}</h2>
              <p className="muted">{isRegister ? "Start reporting and tracking local environmental issues." : "Continue making a difference in your community."}</p>

              {error && <Alert kind="error">{error}</Alert>}
              <form className="form-stack" onSubmit={submit}>
                {isRegister && (
                  <>
                    <Field label="Full name">
                      <input name="name" value={form.name} onChange={updateForm} required minLength={2} maxLength={100} autoComplete="name" />
                    </Field>
                    <Field label="Phone number" hint="Optional">
                      <input name="phone" value={form.phone} onChange={updateForm} maxLength={25} autoComplete="tel" />
                    </Field>
                  </>
                )}
                <Field label="Email">
                  <input type="email" name="email" value={form.email} onChange={updateForm} required maxLength={254} autoComplete="email" />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={updateForm}
                    required
                    minLength={isRegister ? 8 : undefined}
                    maxLength={128}
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
                  onClick={() => switchScreen(isRegister ? "login" : "register")}
                >
                  {isRegister ? "Sign in" : "Create an account"}
                </button>
              </p>
            </div>
          </div>
        )}
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
  const requestedPage = new URLSearchParams(window.location.search).get("page");
  const [page, setPage] = useState(
    navItems.some((item) => item.id === requestedPage) ? requestedPage : navItems[0].id,
  );
  const [hasUnsavedReport, setHasUnsavedReport] = useState(false);
  const isStaff = role !== "COMMUNITY_USER";

  const navigateToPage = (nextPage, reportSubmitted = false) => {
    if (nextPage === page) return;
    if (!reportSubmitted && hasUnsavedReport && !window.confirm("Your report has not been submitted. Leave and discard it?"))
      return;
    setHasUnsavedReport(false);
    setPage(nextPage);
  };

  return (
    <div className={`dashboard-shell ${isStaff ? "dashboard-shell-staff" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">W</span>
          <span>WasteWise</span>
        </div>
        <div className="workspace-label">{isStaff ? `${ROLE_NAMES[role].toUpperCase()} WORKSPACE` : "WORKSPACE"}</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${page === item.id ? "nav-item-active" : ""}`}
              onClick={() => navigateToPage(item.id)}
              aria-current={page === item.id ? "page" : undefined}
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
          <button type="button" className="logout-button" onClick={() => onLogout(hasUnsavedReport)}>Sign out</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">WASTEWISE / {ROLE_NAMES[role]?.toUpperCase()}</p>
            <h1>{navItems.find((item) => item.id === page)?.label}</h1>
          </div>
          <div className="topbar-user">
            {role === "COMMUNITY_USER" && (
              <NotificationCenter token={session.token} onNavigate={navigateToPage} />
            )}
            <span className="online-dot" />
            <span>{session.user.name}</span>
          </div>
        </header>

        {role === "COMMUNITY_USER" && (
          <CommunityDashboard
            page={page}
            token={session.token}
            user={session.user}
            onNavigate={navigateToPage}
            onReportDraftChange={setHasUnsavedReport}
          />
        )}
        {role === "ADMINISTRATOR" && <AdminDashboard token={session.token} />}
        {role === "RESPONSIBLE_STAKEHOLDER" && <StakeholderDashboard token={session.token} />}
      </main>
    </div>
  );
}

function NotificationCenter({ token, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushConfig, setPushConfig] = useState(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [permission, setPermission] = useState(
    "Notification" in window ? window.Notification.permission : "unsupported",
  );
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const knownIds = useRef(null);
  const toastTimer = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await apiRequest("/api/notifications", token);
      if (knownIds.current) {
        const freshNotification = result.notifications.find((notification) => (
          !knownIds.current.has(notification.id) && !notification.readAt
        ));
        if (freshNotification) {
          setToast(freshNotification);
          window.clearTimeout(toastTimer.current);
          toastTimer.current = window.setTimeout(() => setToast(null), 7000);
        }
      }
      knownIds.current = new Set(result.notifications.map((notification) => notification.id));
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [config] = await Promise.all([
          apiRequest("/api/notifications/push-config", token),
          loadNotifications(),
        ]);
        if (active) setPushConfig(config);
        if (
          active
          && "serviceWorker" in navigator
          && "PushManager" in window
          && "Notification" in window
        ) {
          const registration = await navigator.serviceWorker.getRegistration();
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription && active) {
            await apiRequest("/api/notifications/subscriptions", token, {
              method: "POST",
              body: subscription.toJSON(),
            });
            setPushSubscribed(true);
            setPermission(window.Notification.permission);
          }
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    };
    load();
    const interval = window.setInterval(loadNotifications, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearTimeout(toastTimer.current);
    };
  }, [loadNotifications, token]);

  const changePushSubscription = async () => {
    setBusy(true);
    setError("");
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      const currentSubscription = await registration.pushManager.getSubscription();
      if (currentSubscription) {
        await apiRequest("/api/notifications/subscriptions", token, {
          method: "DELETE",
          body: { endpoint: currentSubscription.endpoint },
        });
        await currentSubscription.unsubscribe();
        setPushSubscribed(false);
        return;
      }

      if (!pushConfig?.enabled || !pushConfig.publicKey)
        throw new Error("Browser notifications are not configured on the server yet.");
      const nextPermission = await window.Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted")
        throw new Error("Browser notification permission was not granted.");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(pushConfig.publicKey),
      });
      await apiRequest("/api/notifications/subscriptions", token, {
        method: "POST",
        body: subscription.toJSON(),
      });
      setPushSubscribed(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const markRead = async (notification) => {
    if (!notification.readAt) {
      try {
        await apiRequest(`/api/notifications/${notification.id}/read`, token, { method: "PATCH" });
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
        )));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (requestError) {
        setError(requestError.message);
        return;
      }
    }
    setToast(null);
    setOpen(false);
    if (notification.reportId) onNavigate("reports");
  };

  const markAllRead = async () => {
    try {
      await apiRequest("/api/notifications/read-all", token, { method: "PATCH" });
      setNotifications((current) => current.map((notification) => ({
        ...notification,
        readAt: notification.readAt || new Date().toISOString(),
      })));
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  return (
    <div className="notification-center">
      <button
        type="button"
        className="notification-trigger"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <section className="notification-popover" aria-label="Notifications">
          <div className="notification-heading">
            <div><strong>Notifications</strong><small>{unreadCount} unread</small></div>
            {unreadCount > 0 && <button type="button" className="text-button" onClick={markAllRead}>Mark all read</button>}
          </div>
          {error && <p className="notification-error" role="alert">{error}</p>}
          {supported ? (
            <div className="push-setting">
              <div>
                <strong>Browser alerts</strong>
                <small>{pushConfig?.enabled ? "Get assignment alerts outside the app" : "In-app alerts are available; browser push is not configured"}</small>
              </div>
              <button
                type="button"
                className="button button-small button-secondary"
                disabled={busy || (pushSubscribed ? false : !pushConfig?.enabled || permission === "denied")}
                onClick={changePushSubscription}
              >
                {busy ? "Saving..." : pushSubscribed ? "Turn off" : "Turn on"}
              </button>
            </div>
          ) : (
            <p className="notification-hint">
              Push isn’t available in this browser session. On iPhone or iPad, use iOS 16.4 or newer and open WasteWise from the Home Screen. In-app notifications are still available.
            </p>
          )}
          <div className="notification-list">
            {notifications.length ? notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                className={`notification-item ${notification.readAt ? "" : "notification-item-unread"}`}
                onClick={() => markRead(notification)}
              >
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
                <small>{formatDate(notification.createdAt)}</small>
              </button>
            )) : <p className="notification-hint">You’re all caught up.</p>}
          </div>
        </section>
      )}
      {toast && (
        <button type="button" className="notification-toast" onClick={() => markRead(toast)}>
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </button>
      )}
    </div>
  );
}

function decodeBase64Url(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function CommunityDashboard({ page, token, user, onNavigate, onReportDraftChange }) {
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
    onNavigate("reports", true);
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
              <ReportForm token={token} onCreated={handleReportCreated} onDraftChange={onReportDraftChange} />
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

      {page === "wallet" && <WalletPage token={token} user={user} />}
    </div>
  );
}

function ReportForm({ token, onCreated, onDraftChange }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [gpsState, setGpsState] = useState("idle");
  const [gpsMessage, setGpsMessage] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    const form = formRef.current;
    if (form) onDraftChange(hasReportFormData(form) || Boolean(coordinates));
  }, [location, coordinates, onDraftChange]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      const form = formRef.current;
      if (!form || (!hasReportFormData(form) && !coordinates)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [coordinates]);

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
        const accuracyMeters = Math.ceil(coords.accuracy);
        setCoordinates({ latitude, longitude, accuracyMeters });
        setLocation(`GPS coordinates: ${formatCoordinates(latitude, longitude)}`);
        setGpsState("success");
        setGpsMessage(`GPS location is ready. Your device estimates it is accurate within about ${accuracyMeters} metres.`);
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
    const form = event.currentTarget;
    const formData = new FormData(form);
    const description = formData.get("description");
    if (typeof description !== "string" || !hasDetailedDescription(description)) {
      const descriptionField = form.elements.namedItem("description");
      descriptionField.setCustomValidity("Please enter a valid text");
      descriptionField.reportValidity();
      return;
    }
    setLoading(true);
    if (coordinates) {
      formData.set("latitude", String(coordinates.latitude));
      formData.set("longitude", String(coordinates.longitude));
      formData.set("locationAccuracyMeters", String(coordinates.accuracyMeters));
    }
    try {
      const result = await apiRequest("/api/reports", token, { method: "POST", body: formData });
      form.reset();
      setLocation("");
      setCoordinates(null);
      setGpsState("idle");
      setGpsMessage("");
      onDraftChange(false);
      await onCreated(result.report);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      ref={formRef}
      className="form-stack"
      onSubmit={submit}
      onChange={(event) => onDraftChange(
        hasReportFormData(event.currentTarget) || Boolean(coordinates),
      )}
    >
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
            maxLength={200}
            placeholder="Street, area, or nearby landmark"
          />
          <button className="button button-secondary gps-button" type="button" onClick={useCurrentLocation} disabled={gpsState === "loading"}>
            {gpsState === "loading" ? "Locating..." : "Not Sure - Use my GPS"}
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
      <p className="field-help">GPS may be slightly off. Check the location, or enter a nearby street or landmark.</p>
      <Field label="What is happening?">
        <textarea
          name="description"
          rows="3"
          required
          maxLength={2000}
          placeholder="Describe the issue and its impact."
          onInvalid={(event) => {
            if (!hasDetailedDescription(event.currentTarget.value))
              event.currentTarget.setCustomValidity("Please enter a valid text");
          }}
          onChange={(event) => event.currentTarget.setCustomValidity("")}
        />
      </Field>
      <p className="field-help">Please describe the issue in detail.</p>
      <Field label="Photo or video evidence">
        <input name="photo" type="file" accept={EVIDENCE_FILE_ACCEPT} required />
      </Field>
      <p className="field-help">{EVIDENCE_FILE_HINT}</p>
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
        {report.resolutionLatitude != null && report.resolutionLongitude != null && (
          <>
            <div><dt>Stakeholder GPS</dt><dd>{formatCoordinates(report.resolutionLatitude, report.resolutionLongitude)}</dd></div>
            {report.resolutionLocationAccuracyMeters != null && (
              <div><dt>Stakeholder GPS accuracy</dt><dd>Within about {Math.ceil(report.resolutionLocationAccuracyMeters)} metres</dd></div>
            )}
            {report.resolutionDistanceMeters != null
              ? <div><dt>Distance from reported GPS</dt><dd>{Math.ceil(report.resolutionDistanceMeters)} metres (within 50 metres)</dd></div>
              : <div><dt>On-site GPS check</dt><dd>Unverified because the original report had no GPS coordinates</dd></div>}
          </>
        )}
        {report.latitude != null && report.longitude != null && (
          <>
            <div><dt>GPS coordinates</dt><dd>{formatCoordinates(report.latitude, report.longitude)}</dd></div>
            {report.locationAccuracyMeters != null && (
              <div><dt>Estimated GPS accuracy</dt><dd>Within about {Math.ceil(report.locationAccuracyMeters)} metres</dd></div>
            )}
          </>
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

function WalletPage({ token, user }) {
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
  const [certificate, setCertificate] = useState(null);

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
    <div className="page-content wallet-page">
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
                <div className="redemption-actions">
                  <span className="amount-negative">-{redemption.coinsSpent.toLocaleString()}</span>
                  {redemption.rewardType === "DIGITAL_CERTIFICATE" && (
                    <button className="text-button" type="button" onClick={() => setCertificate(redemption)}>
                      View certificate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="muted">Your redemptions will appear here.</p>}
      </section>
      {certificate && (
        <CertificateModal
          userName={user.name}
          redeemedAt={certificate.redeemedAt}
          onClose={() => setCertificate(null)}
        />
      )}
    </div>
  );
}

function CertificateModal({ userName, redeemedAt, onClose }) {
  const printCertificate = () => window.requestAnimationFrame(() => window.print());

  return (
    <div className="certificate-backdrop">
      <section className="certificate-dialog" role="dialog" aria-modal="true" aria-labelledby="certificate-title">
        <div className="certificate-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Close</button>
          <button type="button" className="button button-primary" onClick={printCertificate}>Print / Save as PDF</button>
        </div>
        <article className="certificate">
          <div className="certificate-frame">
            <div className="certificate-brand"><span className="brand-mark">W</span><span>WasteWise</span></div>
            <p className="eyebrow">ENVIRONMENT &amp; COMMUNITY</p>
            <h2 id="certificate-title">Certificate of Recognition</h2>
            <p className="certificate-intro">This certificate is proudly presented to</p>
            <p className="certificate-recipient">{userName}</p>
            <p className="certificate-message">
              In recognition of your contribution to protecting the environment and building a cleaner, healthier community.
            </p>
            <div className="certificate-footer">
              <span className="certificate-issued"><strong>WasteWise Community</strong><small>Issued {formatDateOnly(redeemedAt)}</small></span>
              <span className="certificate-signature">
                <span className="certificate-signature-script" aria-hidden="true">WasteWise</span>
                <span className="certificate-signature-line" aria-hidden="true" />
                <strong>WasteWise Team</strong>
                <small>Community Recognition</small>
              </span>
              <span className="certificate-seal" role="img" aria-label="WasteWise recognition badge">
                <span className="certificate-seal-mark" aria-hidden="true">W</span>
                <span className="certificate-seal-label" aria-hidden="true">WASTEWISE</span>
                <span className="certificate-seal-detail" aria-hidden="true">RECOGNITION</span>
              </span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function AdminReportReviewDetails({ report, token }) {
  return (
    <section className="admin-report-details" id={`admin-report-details-${report.id}`}>
      <div>
        <h4>Full description</h4>
        <p className="admin-report-full-description">{report.description}</p>
      </div>
      <div>
        <h4>Evidence</h4>
        {report.photoUrl
          ? <ProtectedMedia path={report.photoUrl} token={token} label="Report evidence" />
          : <p className="muted">No evidence is attached to this report.</p>}
        {report.resolutionEvidenceUrl && (
          <ProtectedMedia path={report.resolutionEvidenceUrl} token={token} label="Resolution evidence" />
        )}
      </div>
      {(report.resolutionLocation || report.resolutionLatitude != null) && (
        <div>
          <h4>Resolution check</h4>
          {report.resolutionLocation && <p>{report.resolutionLocation}</p>}
          {report.resolutionLatitude != null && report.resolutionLongitude != null && (
            <>
              <p>Stakeholder GPS: {formatCoordinates(report.resolutionLatitude, report.resolutionLongitude)}</p>
              {report.resolutionLocationAccuracyMeters != null && (
                <p>Estimated accuracy: ±{Math.ceil(report.resolutionLocationAccuracyMeters)} metres</p>
              )}
              {report.resolutionDistanceMeters != null
                ? <p>Distance from reported GPS: {Math.ceil(report.resolutionDistanceMeters)} metres</p>
                : <p>Distance unverified because the report had no GPS coordinates.</p>}
            </>
          )}
        </div>
      )}
      {report.statusHistory?.length > 0 && (
        <div>
          <h4>Status history</h4>
          <ol className="admin-report-history">
            {[...report.statusHistory].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt)).map((item) => (
              <li key={item.id}>
                <strong>{statusLabel(item.status)}</strong>
                <time>{formatDate(item.changedAt)}</time>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function AccordionSection({ id, title, count, open, onToggle, children }) {
  return (
    <section className={`accordion-section ${open ? "accordion-section-open" : ""}`}>
      <h3 className="accordion-heading">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`accordion-content-${id}`}
          onClick={onToggle}
        >
          <span>{title}</span>
          <span className="accordion-count">{count}</span>
          <span className="accordion-indicator" aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
      </h3>
      <div className="accordion-content" id={`accordion-content-${id}`} hidden={!open}>
        {open && children}
      </div>
    </section>
  );
}

function AdminReportCard({
  report,
  token,
  stakeholders,
  assignee,
  priority,
  busy,
  onReview,
  onAssign,
  onAssigneeChange,
  onPriorityChange,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="admin-report-card">
      <div className="admin-report-heading">
        <div>
          <p className="eyebrow">{report.submittedBy?.name || "Community member"} · {formatDate(report.createdAt)} · Reporter rank {report.reporterRank}</p>
          <h3>{categoryLabel(report.category)}</h3>
        </div>
        <StatusBadge status={report.status} />
      </div>
      <p className="report-location">{report.location}</p>
      {report.latitude != null && report.longitude != null && (
        <p className="coordinate-readout">
          <span>GPS coordinates</span>{formatCoordinates(report.latitude, report.longitude)}
          {report.locationAccuracyMeters != null && <span>Estimated accuracy ±{Math.ceil(report.locationAccuracyMeters)} m</span>}
        </p>
      )}
      <p className="report-description admin-report-preview">{report.description}</p>
      <button
        type="button"
        className="button button-secondary button-small"
        aria-expanded={expanded}
        aria-controls={`admin-report-details-${report.id}`}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? "Hide report details" : "Review full report"}
      </button>
      {expanded && <AdminReportReviewDetails report={report} token={token} />}
      {["SUBMITTED", "UNDER_REVIEW"].includes(report.status) && (
        <div className="button-row admin-actions">
          <button className="button button-primary button-small" type="button" disabled={busy} onClick={() => onReview(report, "VERIFIED")}>Verify</button>
          <button className="button button-info button-small" type="button" disabled={busy} onClick={() => onReview(report, "UNDER_REVIEW")}>Under review</button>
          <button className="button button-danger button-small" type="button" disabled={busy} onClick={() => onReview(report, "REJECTED")}>Reject</button>
        </div>
      )}
      {report.status === "VERIFIED" && (
        <div className="assignment-controls">
          <Field label="Responsible stakeholder">
            <select value={assignee} onChange={(event) => onAssigneeChange(event.target.value)} disabled={!stakeholders.length}>
              {!stakeholders.length && <option value="">No active stakeholders</option>}
              {stakeholders.map((stakeholder) => (
                <option key={stakeholder.id} value={stakeholder.id}>{stakeholder.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select value={priority} onChange={(event) => onPriorityChange(event.target.value)}>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <button className="button button-primary" type="button" disabled={busy || !stakeholders.length} onClick={() => onAssign(report)}>
            {busy ? "Assigning..." : "Assign report"}
          </button>
        </div>
      )}
    </article>
  );
}

function AdminDashboard({ token }) {
  const [reports, setReports] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [priorities, setPriorities] = useState({});
  const [assignees, setAssignees] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [openSection, setOpenSection] = useState("awaiting-review");
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
      if (status === "VERIFIED") setOpenSection("ready-for-assignment");
      if (status === "REJECTED") setOpenSection("rejected");
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
      setOpenSection("follow-up");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  };

  const rejectedReports = reports.filter((report) => report.status === "REJECTED");
  const gpsReportCount = reports.filter((report) => Number.isFinite(report.latitude) && Number.isFinite(report.longitude)).length;
  const queueReports = reports.filter((report) => report.status !== "REJECTED");
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchesSearch = (report) => {
    if (!normalizedSearch) return true;
    const searchableText = [
      report.id,
      report.category,
      report.location,
      report.description,
      report.submittedBy?.name,
      report.status,
      String(report.reporterRank),
    ].join(" ").toLowerCase();
    return searchableText.includes(normalizedSearch);
  };
  const visibleReports = queueReports.filter(matchesSearch);
  const visibleRejectedReports = rejectedReports.filter(matchesSearch);
  const awaitingReviewReports = visibleReports.filter((report) => ["SUBMITTED", "UNDER_REVIEW"].includes(report.status));
  const readyReports = visibleReports.filter((report) => report.status === "VERIFIED");
  const followUpReports = visibleReports.filter((report) => !["SUBMITTED", "UNDER_REVIEW", "VERIFIED"].includes(report.status));

  const reportCards = (items) => items.map((report) => (
    <AdminReportCard
      key={report.id}
      report={report}
      token={token}
      stakeholders={stakeholders}
      assignee={assignees[report.id] || stakeholders[0]?.id || ""}
      priority={priorities[report.id] || "MEDIUM"}
      busy={busyId === report.id}
      onReview={review}
      onAssign={assign}
      onAssigneeChange={(assignee) => setAssignees((current) => ({ ...current, [report.id]: assignee }))}
      onPriorityChange={(priority) => setPriorities((current) => ({ ...current, [report.id]: priority }))}
    />
  ));

  return (
    <div className="page-content">
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success" onDismiss={() => setNotice("")}>{notice}</Alert>}
      <section className="panel">
        <PanelHeading kicker="ADMINISTRATION" title="Report queue" />
        {loading ? <Loading /> : (
          <>
            <div className="admin-search-panel">
              <div className="admin-search-heading">
                <div>
                  <h3>Find a report</h3>
                  <p>Search by reporter, location, category, rank, or report text. Reports are listed oldest first.</p>
                </div>
                <span className="admin-search-count">
                  Showing {visibleReports.length + visibleRejectedReports.length} of {reports.length}
                </span>
              </div>
              <div className="admin-search-control">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.8" cy="10.8" r="6.3" />
                  <path d="m15.4 15.4 4.2 4.2" />
                </svg>
                <input
                  type="search"
                  aria-label="Search reports"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Try a name, category, location, or rank"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="admin-search-clear"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear report search"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="accordion-list">
              <AccordionSection
                id="awaiting-review"
                title="Awaiting review"
                count={awaitingReviewReports.length}
                open={openSection === "awaiting-review"}
                onToggle={() => setOpenSection((current) => current === "awaiting-review" ? null : "awaiting-review")}
              >
                {awaitingReviewReports.length
                  ? <div className="admin-report-list">{reportCards(awaitingReviewReports)}</div>
                  : <EmptyState title="No reports awaiting review" text="New submissions will appear here." />}
              </AccordionSection>
              <AccordionSection
                id="ready-for-assignment"
                title="Ready for assignment"
                count={readyReports.length}
                open={openSection === "ready-for-assignment"}
                onToggle={() => setOpenSection((current) => current === "ready-for-assignment" ? null : "ready-for-assignment")}
              >
                {readyReports.length
                  ? <div className="admin-report-list">{reportCards(readyReports)}</div>
                  : <EmptyState title="No reports ready for assignment" text="Verified reports will appear here." />}
              </AccordionSection>
              <AccordionSection
                id="follow-up"
                title="Assigned and follow-up"
                count={followUpReports.length}
                open={openSection === "follow-up"}
                onToggle={() => setOpenSection((current) => current === "follow-up" ? null : "follow-up")}
              >
                {followUpReports.length
                  ? <div className="admin-report-list">{reportCards(followUpReports)}</div>
                  : <EmptyState title="No assigned reports yet" text="Assigned reports and their progress will appear here." />}
              </AccordionSection>
              <AccordionSection
                id="rejected"
                title="Rejected reports"
                count={`${rejectedReports.length} stored`}
                open={openSection === "rejected"}
                onToggle={() => setOpenSection((current) => current === "rejected" ? null : "rejected")}
              >
                <p className="muted">Rejected reports are retained here with their evidence and decision history.</p>
                {visibleRejectedReports.length
                  ? <div className="admin-report-list">{reportCards(visibleRejectedReports)}</div>
                  : <EmptyState
                    title={rejectedReports.length ? "No rejected reports match" : "No rejected reports yet"}
                    text={rejectedReports.length ? "Try changing the search text." : "Reports rejected during review will be retained here."}
                  />}
              </AccordionSection>
              <AccordionSection
                id="stakeholders"
                title="Active stakeholders"
                count={stakeholders.length}
                open={openSection === "stakeholders"}
                onToggle={() => setOpenSection((current) => current === "stakeholders" ? null : "stakeholders")}
              >
                {stakeholders.length ? (
                  <div className="admin-stakeholder-list">
                    {stakeholders.map((stakeholder) => (
                      <div className="admin-stakeholder-row" key={stakeholder.id}>
                        <span className="avatar">{stakeholder.name.slice(0, 1).toUpperCase()}</span>
                        <strong>{stakeholder.name}</strong>
                        <span>Active</span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState title="No active stakeholders" text="Create an active stakeholder account to assign verified reports." />}
              </AccordionSection>
              <AccordionSection
                id="reported-locations"
                title="Reported locations map"
                count={`${gpsReportCount} mapped`}
                open={openSection === "map"}
                onToggle={() => setOpenSection((current) => current === "map" ? null : "map")}
              >
                <p className="muted">Map markers show reporter names and ranks. OpenStreetMap receives map-tile requests for this area.</p>
                <AdminReportMap reports={reports} />
              </AccordionSection>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function StakeholderDashboard({ token }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openSection, setOpenSection] = useState("to-start");

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

  const sectionDefinitions = [
    { id: "to-start", title: "Assigned / not started", statuses: ["ASSIGNED", "REOPENED"] },
    { id: "in-progress", title: "In progress", statuses: ["IN_PROGRESS"] },
    { id: "awaiting-confirmation", title: "Awaiting confirmation", statuses: ["RESOLVED"] },
    { id: "completed", title: "Completed", statuses: ["CONFIRMED"] },
  ];
  const categorizedStatuses = sectionDefinitions.flatMap((section) => section.statuses);
  const workSections = [
    ...sectionDefinitions.map((section) => ({
      ...section,
      items: assignments.filter(({ report }) => section.statuses.includes(report.status)),
    })),
    {
      id: "other",
      title: "Other statuses",
      items: assignments.filter(({ report }) => !categorizedStatuses.includes(report.status)),
    },
  ].filter((section) => section.items.length || section.id !== "other");

  return (
    <div className="page-content">
      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success" onDismiss={() => setNotice("")}>{notice}</Alert>}
      <section className="panel">
        <PanelHeading kicker="YOUR WORK" title="Assigned reports" />
        {loading ? <Loading /> : (
          assignments.length ? (
            <div className="accordion-list">
              {workSections.map((section) => (
                <AccordionSection
                  key={section.id}
                  id={`stakeholder-${section.id}`}
                  title={section.title}
                  count={section.items.length}
                  open={openSection === section.id}
                  onToggle={() => setOpenSection((current) => current === section.id ? null : section.id)}
                >
                  {section.items.length ? (
                    <div className="stakeholder-list">
                      {section.items.map((assignment) => (
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
                  ) : <EmptyState title="No reports in this section" text="New reports will appear here when their status changes." />}
                </AccordionSection>
              ))}
            </div>
          ) : <EmptyState title="No assigned reports" text="New assignments will appear here." />
        )}
      </section>
    </div>
  );
}

function StakeholderReportCard({ assignment, token, onChanged, onNotice, onError }) {
  const { report } = assignment;
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [resolutionCoordinates, setResolutionCoordinates] = useState(null);
  const [gpsState, setGpsState] = useState("idle");
  const [gpsMessage, setGpsMessage] = useState("");
  const [evidence, setEvidence] = useState(null);
  const [busy, setBusy] = useState("");
  const resolutionDistanceMeters = resolutionCoordinates && report.latitude != null && report.longitude != null
    ? calculateCoordinateDistanceMeters(
      { latitude: report.latitude, longitude: report.longitude },
      resolutionCoordinates,
    )
    : null;
  const outsideProximityLimit = resolutionDistanceMeters != null
    && resolutionDistanceMeters > GPS_PROXIMITY_LIMIT_METERS;

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
    if (!resolutionCoordinates) {
      onError("Capture your current GPS location before submitting resolution evidence.");
      return;
    }
    if (outsideProximityLimit) {
      onError("Move within 50 metres of the reported GPS location before resolving this report.");
      return;
    }
    setBusy("resolve");
    onError("");
    onNotice("");
    const body = new FormData();
    body.append("resolutionLocation", location);
    body.append("resolutionLatitude", String(resolutionCoordinates.latitude));
    body.append("resolutionLongitude", String(resolutionCoordinates.longitude));
    body.append("resolutionLocationAccuracyMeters", String(resolutionCoordinates.accuracyMeters));
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

  const captureCurrentLocation = () => {
    setGpsMessage("");
    setResolutionCoordinates(null);
    if (!navigator.geolocation) {
      setGpsState("error");
      setGpsMessage("GPS is not available in this browser.");
      return;
    }

    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const accuracyMeters = Math.ceil(coords.accuracy);
        setResolutionCoordinates({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
          accuracyMeters,
        });
        setGpsState("success");
        setGpsMessage(`GPS captured. Your device estimates its accuracy within about ${accuracyMeters} metres.`);
      },
      (locationError) => {
        setGpsState("error");
        if (locationError.code === 1) {
          setGpsMessage("Location permission was denied. Allow location access to continue.");
        } else if (locationError.code === 3) {
          setGpsMessage("Getting your location took too long. Try again.");
        } else {
          setGpsMessage("Your current location could not be read. Try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
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
        <p className="coordinate-readout">
          <span>GPS coordinates</span>{formatCoordinates(report.latitude, report.longitude)}
          {report.locationAccuracyMeters != null && <span>Estimated accuracy ±{Math.ceil(report.locationAccuracyMeters)} m</span>}
        </p>
      )}
      <p className="submitter-line">Reported by {report.submittedBy?.name || "Community member"}</p>
      {report.status === "RESOLVED" || report.status === "CONFIRMED" ? (
        <>
          <p className="status-note">
            {report.status === "CONFIRMED"
              ? "The community member confirmed the resolution."
              : "Resolution evidence submitted. Waiting for the community member to confirm."}
          </p>
          {report.resolutionLatitude != null && report.resolutionLongitude != null && (
            <p className="coordinate-readout">
              <span>Stakeholder GPS</span>{formatCoordinates(report.resolutionLatitude, report.resolutionLongitude)}
              {report.resolutionDistanceMeters != null
                ? <span>Within {Math.ceil(report.resolutionDistanceMeters)} m of the reported GPS</span>
                : <span>Distance unverified; the report had no GPS coordinates</span>}
            </p>
          )}
        </>
      ) : (
        <div className="stakeholder-actions">
          {["ASSIGNED", "IN_PROGRESS", "REOPENED"].includes(report.status) && (
            <form className="form-stack compact-form" onSubmit={addProgress}>
              <Field label="Progress update">
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows="2" required minLength={5} maxLength={1000} placeholder="Describe the work completed or next steps." />
              </Field>
              <button className="button button-secondary" type="submit" disabled={Boolean(busy)}>
                {busy === "progress" ? "Saving..." : "Add update"}
              </button>
            </form>
          )}
          {report.status === "IN_PROGRESS" && (
            <form className="form-stack compact-form resolve-form" onSubmit={markResolved}>
              <Field label="Work completed at" hint="Describe the specific area; GPS is captured separately">
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="Describe the site or area worked on"
                />
              </Field>
              <div className="field stakeholder-gps-field">
                <span className="field-label">On-site GPS check</span>
                <p className="gps-message">
                  {report.latitude != null && report.longitude != null
                    ? "Capture your current GPS. You must be within 50 metres of the reported GPS location."
                    : "This report has no GPS coordinates. Your location will be recorded, but the 50-metre check cannot be verified."}
                </p>
                <button
                  className="button button-secondary gps-button"
                  type="button"
                  onClick={captureCurrentLocation}
                  disabled={gpsState === "loading" || Boolean(busy)}
                >
                  {gpsState === "loading" ? "Locating..." : resolutionCoordinates ? "Refresh current GPS" : "Use my current GPS"}
                </button>
                {gpsMessage && (
                  <small className={`gps-message ${gpsState === "error" ? "gps-error" : "gps-success"}`} role={gpsState === "error" ? "alert" : "status"}>
                    {gpsMessage}
                  </small>
                )}
                {resolutionCoordinates && (
                  <div className="coordinate-readout">
                    <span>Current GPS</span>
                    {formatCoordinates(resolutionCoordinates.latitude, resolutionCoordinates.longitude)}
                    <span>Accuracy ±{resolutionCoordinates.accuracyMeters} m</span>
                  </div>
                )}
                {resolutionDistanceMeters != null && (
                  <small className={`gps-message ${outsideProximityLimit ? "gps-error" : "gps-success"}`} role="status">
                    {outsideProximityLimit
                      ? `About ${Math.ceil(resolutionDistanceMeters)} metres from the report. Move within 50 metres to continue.`
                      : `About ${Math.ceil(resolutionDistanceMeters)} metres from the reported GPS location.`}
                  </small>
                )}
              </div>
              <Field label="Resolution photo or video">
                <input type="file" accept={EVIDENCE_FILE_ACCEPT} required onChange={(event) => setEvidence(event.target.files?.[0] || null)} />
              </Field>
              <p className="field-help">{EVIDENCE_FILE_HINT}</p>
              <button
                className="button button-primary"
                type="submit"
                disabled={Boolean(busy) || !resolutionCoordinates || outsideProximityLimit}
              >
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
  return <div className="loading-state" role="status" aria-live="polite" aria-busy="true"><span className="spinner" /> Loading...</div>;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDateOnly(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
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

function calculateCoordinateDistanceMeters(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(second.latitude - first.latitude);
  const longitudeDifference = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDifference / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return 6371000 * 2 * Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine));
}

export default App;
