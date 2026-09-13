import { useEffect, useMemo, useState } from "react";
import "./index.css";

const API_BASE = "http://localhost:4000/api/signage";

const DEFAULT_SLIDE_DURATION_MS = 8000;
const DEFAULT_POLL_INTERVAL_MS = 30000;

type Session = {
  session_id: number;
  room_code?: string;
  module: string;
  lecturer: string;
  start_time: string;
  end_time: string;
  session_type: string;
  reason?: string;
  original_start?: string;
  original_end?: string;
  original_room?: string;
};

type RoomStatus = {
  room_code: string;
  status: string;
};

type SignageData = {
  side_id: number;
  server_time: string;
  location: {
    building_name: string;
    floor_number: number;
    side_code: string;
  };
  settings: {
    side_duration_seconds: number;
    poll_interval_seconds: number;
    institution_name: string;
  };
  ongoing: Session[];
  upcoming: Session[];
  cancelled: Session[];
  rescheduled: Session[];
  liveRoomStatus: RoomStatus[];
};

type SlideType = "ongoing" | "upcoming" | "cancelled" | "rescheduled";

const SLIDE_ORDER: SlideType[] = ["ongoing", "upcoming", "cancelled", "rescheduled"];

const SLIDE_LABELS: Record<SlideType, string> = {
  ongoing: "Ongoing Lectures & Labs",
  upcoming: "Upcoming Lectures & Labs",
  cancelled: "Cancelled Lectures & Labs",
  rescheduled: "Rescheduled Lectures & Labs",
};

// This is a wall-mounted, unattended screen — nobody can scroll it — so a
// category with more sessions than fit on one screen doesn't scroll or get
// silently cut off. Instead it's split into fixed-size pages (2 cards each)
// that rotate through in sequence, same as the categories themselves, and
// every page of the current category is shown before advancing to the next.
const CARDS_PER_PAGE = 2;

type Page = {
  type: SlideType;
  sessions: Session[];
  pageNumber: number; // 1-based, for display
  pageCount: number;
};

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function buildPages(sessionsByType: Record<SlideType, Session[]>): Page[] {
  const pages: Page[] = [];
  for (const type of SLIDE_ORDER) {
    const chunks = chunk(sessionsByType[type], CARDS_PER_PAGE);
    chunks.forEach((sessions, i) => {
      pages.push({ type, sessions, pageNumber: i + 1, pageCount: chunks.length });
    });
  }
  return pages;
}

function getSideId() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("side") || params.get("side_id");
  const parsed = fromQuery ? Number(fromQuery) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

// This kiosk runs unattended, so there's no on-screen toggle — the theme is
// set once via ?theme=light|dark on the display's URL when it's configured
// (same pattern as ?side=), and remembered after that. Defaults to dark,
// matching the display's original look.
type SignageTheme = "light" | "dark";

function getTheme(): SignageTheme {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("theme");
  if (fromQuery === "light" || fromQuery === "dark") {
    localStorage.setItem("signage-theme", fromQuery);
    return fromQuery;
  }
  const stored = localStorage.getItem("signage-theme");
  return stored === "light" ? "light" : "dark";
}

// Session times are stored as UTC-stamped wall-clock values (see the
// backend's Date.UTC-based day boundaries), so display must stay pinned to
// UTC rather than the display's local timezone, or times would drift.
function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
}

function formatShortDate(dateString: string) {
  return new Date(dateString).toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });
}

function formatStartsIn(startTime: string, now: Date) {
  const diffMs = new Date(startTime).getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (totalMinutes < 60) return `STARTS IN ${totalMinutes} MIN`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `STARTS IN ${hours}H ${minutes}M`;
}

function roomStatusClass(status: string) {
  if (status === "Ongoing Now") return "dot dot--ongoing";
  if (status === "Upcoming Soon") return "dot dot--upcoming";
  if (status === "Session Finished") return "dot dot--finished";
  return "dot dot--available";
}

function SessionCard({ session, type, now }: { session: Session; type: SlideType; now: Date }) {
  if (type === "rescheduled") {
    return (
      <div className="session-card session-card--rescheduled">
        <div className="session-card-room">{session.module}</div>
        {session.original_room && session.original_start && session.original_end && (
          <div className="session-line session-line--original">
            Original: Room {session.original_room}, {formatShortDate(session.original_start)}, {formatTime(session.original_start)} - {formatTime(session.original_end)}
          </div>
        )}
        <div className="session-line session-line--new">
          New: Room {session.room_code}, {formatShortDate(session.start_time)}, {formatTime(session.start_time)} - {formatTime(session.end_time)}
        </div>
        <div className="session-line session-line--lecturer">Lecturer: {session.lecturer}</div>
        <span className="session-badge session-badge--rescheduled">CANCELLED</span>
      </div>
    );
  }

  return (
    <div className={`session-card session-card--${type}`}>
      <div className="session-card-top">
        <div>
          <span className="session-card-kicker">Room</span>
          <div className="session-card-room">{session.room_code || "N/A"}</div>
        </div>
      </div>

      <div className="session-card-module">{session.module}</div>
      <div className="session-line session-line--lecturer">{session.lecturer}</div>
      <div className="session-card-time">
        {formatTime(session.start_time)} - {formatTime(session.end_time)}
      </div>

      <div className="session-card-footer">
        <span className={`session-badge session-badge--${type}`}>
          {type === "ongoing" && "ONGOING NOW"}
          {type === "upcoming" && formatStartsIn(session.start_time, now)}
          {type === "cancelled" && "CANCELLED"}
        </span>
        {type === "cancelled" && session.reason && (
          <span className="session-card-reason">Reason: {session.reason}</span>
        )}
      </div>
    </div>
  );
}

function App() {
  const sideId = useMemo(getSideId, []);
  const theme = useMemo(getTheme, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const [data, setData] = useState<SignageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [inactive, setInactive] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [now, setNow] = useState(new Date());

  const pages = useMemo(() => buildPages({
    ongoing: data?.ongoing || [],
    upcoming: data?.upcoming || [],
    cancelled: data?.cancelled || [],
    rescheduled: data?.rescheduled || [],
  }), [data]);

  const pollIntervalMs = (data?.settings.poll_interval_seconds ?? DEFAULT_POLL_INTERVAL_MS / 1000) * 1000;
  const slideDurationMs = (data?.settings.side_duration_seconds ?? DEFAULT_SLIDE_DURATION_MS / 1000) * 1000;

  async function fetchSignageData() {
    try {
      const response = await fetch(`${API_BASE}/${sideId}`);
      if (response.status === 404) {
        setNotFound(true);
        setInactive(false);
        setLoading(false);
        return;
      }
      if (response.status === 403) {
        // The display was deactivated from the admin console — stop showing
        // any previously-cached schedule until it's reactivated.
        setInactive(true);
        setNotFound(false);
        setData(null);
        setLoading(false);
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch signage data");

      const result: SignageData = await response.json();
      setData(result);
      setApiError(false);
      setNotFound(false);
      setInactive(false);
      setLoading(false);
    } catch (error) {
      console.error("Signage API error:", error);
      // Keep any previously-loaded data on screen; only surface a banner.
      setApiError(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSignageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideId]);

  useEffect(() => {
    const interval = setInterval(fetchSignageData, pollIntervalMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIntervalMs, sideId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentPageIndex((i) => (pages.length > 0 ? i % pages.length : 0));
  }, [pages.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPageIndex((i) => (i + 1) % Math.max(1, pages.length));
    }, slideDurationMs);
    return () => clearInterval(interval);
    // pages.length is intentionally included: if the schedule changes (poll
    // refresh) and shrinks the page count, restart the timer so the index
    // stays in range instead of drifting past the new end.
  }, [slideDurationMs, pages.length]);

  if (loading) {
    return (
      <div className="signage-root signage-root--loading">
        <div className="loading-badge">S</div>
        <h1>ScheduleMate</h1>
        <p>Loading lecture hall schedule...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="signage-root signage-root--loading">
        <div className="loading-badge loading-badge--error">!</div>
        <h1>Display Not Configured</h1>
        <p>No location found for side #{sideId}. Check the display's configuration.</p>
      </div>
    );
  }

  if (inactive) {
    return (
      <div className="signage-root signage-root--loading">
        <div className="loading-badge loading-badge--inactive">&#9209;</div>
        <h1>Display Inactive</h1>
        <p>This display has been deactivated from the admin console.</p>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex] ?? pages[0];
  const currentType = currentPage.type;
  const currentSessions = currentPage.sessions;

  const buildingName = data?.location.building_name || data?.settings.institution_name || "";
  const floorNumber = data?.location.floor_number;
  const sideCode = data?.location.side_code;
  const locationTitle = floorNumber !== undefined
    ? `${buildingName} - Floor ${floorNumber} - ${sideCode} Side`
    : buildingName;

  return (
    <div className="signage-root">
      <header className="signage-header">
        <div>
          <h1 className="location-title">{locationTitle}</h1>
          <div className="location-date">
            {now.toLocaleDateString([], { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>
        <div className="signage-clock">
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
        </div>
      </header>

      <div className={`status-bar status-bar--${currentType}`}>
        {SLIDE_LABELS[currentType].toUpperCase()}
        {currentPage.pageCount > 1 && (
          <span className="status-bar-page"> &middot; {currentPage.pageNumber}/{currentPage.pageCount}</span>
        )}
      </div>

      {apiError && (
        <div className="connection-warning">
          Connection temporarily unavailable — showing the last available schedule.
        </div>
      )}

      <main className="signage-main">
        {currentSessions.length === 0 ? (
          <div className="session-empty">No {currentType} lectures or labs right now.</div>
        ) : (
          <div className="session-grid">
            {currentSessions.map((session) => (
              <SessionCard key={session.session_id} session={session} type={currentType} now={now} />
            ))}
          </div>
        )}

        <section className="room-status-bar">
          <div className="room-status-title">
            Live Room Status{floorNumber !== undefined ? ` - Floor ${floorNumber}${sideCode}` : ""}
          </div>
          <div className="room-status-list">
            {(data?.liveRoomStatus || []).length === 0 ? (
              <span className="room-status-empty">No rooms configured</span>
            ) : (
              data!.liveRoomStatus.map((room) => (
                <span className="room-status-item" key={room.room_code}>
                  <span className={roomStatusClass(room.status)} />
                  {room.room_code} {room.status}
                </span>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="signage-footer">
        <div className="slide-dots">
          {SLIDE_ORDER.map((type) => (
            <span
              key={type}
              className={`slide-dot slide-dot--${type} ${type === currentType ? "slide-dot--active" : ""}`}
            />
          ))}
        </div>
        <div className="slide-legend">Ongoing &rarr; Upcoming &rarr; Cancelled &rarr; Rescheduled</div>
      </footer>
    </div>
  );
}

export default App;
