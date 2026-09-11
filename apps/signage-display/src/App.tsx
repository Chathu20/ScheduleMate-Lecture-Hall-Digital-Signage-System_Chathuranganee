import { useEffect, useMemo, useState } from "react";
import "./index.css";

const API_URL = "http://localhost:4000/api/signage/1";

const SLIDE_DURATION = 8000;
const POLL_INTERVAL = 30000;

type Session = {
  session_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;

  room?: {
    room_code: string;
  };

  module?: {
    module_code?: string;
    module_name: string;
  };

  lecturer?: {
    full_name: string;
  };

  reason?: string;
  change_reason?: string;
};

type RoomStatus = {
  room_code: string;
  status: string;
};

type SignageData = {
  side?: {
    side_code?: string;

    floor?: {
      floor_number?: number;

      building?: {
        building_name?: string;
      };
    };
  };

  building?: {
    building_name?: string;
  };

  floor?: {
    floor_number?: number;
  };

  side_code?: string;

  ongoing?: Session[];
  upcoming?: Session[];
  cancelled?: Session[];
  rescheduled?: Session[];

  liveRoomStatus?: RoomStatus[];

  lastUpdated?: string;
};

type SlideType =
  | "ongoing"
  | "upcoming"
  | "cancelled"
  | "rescheduled";

type Slide = {
  type: SlideType;
  title: string;
  sessions: Session[];
};

/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleDateString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   SESSION REASON
========================================================= */

function getSessionReason(session: Session) {
  return session.reason || session.change_reason || "";
}

/* =========================================================
   ROOM STATUS CLASS
========================================================= */

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("ongoing") ||
    normalized.includes("now")
  ) {
    return "room-status ongoing";
  }

  if (normalized.includes("upcoming")) {
    return "room-status upcoming";
  }

  if (normalized.includes("finished")) {
    return "room-status finished";
  }

  return "room-status available";
}

/* =========================================================
   ROOM STATUS LABEL
========================================================= */

function getStatusLabel(status: string) {
  if (status === "Ongoing Now") {
    return "ONGOING NOW";
  }

  if (status === "Upcoming Soon") {
    return "UPCOMING SOON";
  }

  if (status === "Session Finished") {
    return "SESSION FINISHED";
  }

  return "AVAILABLE";
}

/* =========================================================
   SESSION CARD
========================================================= */

function SessionCard({
  session,
  type,
}: {
  session: Session;
  type: SlideType;
}) {
  const reason = getSessionReason(session);

  return (
    <div className={`session-card ${type}`}>

      {/* TOP SECTION */}
      <div className="session-card-top">

        <div>
          <span className="room-label">
            ROOM
          </span>

          <div className="room-code">
            {session.room?.room_code || "N/A"}
          </div>
        </div>

        <div className={`session-badge ${type}`}>
          {type === "ongoing" && "ONGOING"}
          {type === "upcoming" && "UPCOMING"}
          {type === "cancelled" && "CANCELLED"}
          {type === "rescheduled" && "RESCHEDULED"}
        </div>

      </div>

      {/* MODULE */}
      <div className="module-section">

        <div className="module-name">
          {session.module?.module_name || "Module"}
        </div>

        {session.module?.module_code && (
          <div className="module-code">
            {session.module.module_code}
          </div>
        )}

      </div>

      {/* SESSION DETAILS */}
      <div className="session-details">

        <div className="detail-item">
          <span className="detail-label">
            LECTURER
          </span>

          <span className="detail-value">
            {session.lecturer?.full_name || "N/A"}
          </span>
        </div>

        <div className="detail-item">
          <span className="detail-label">
            DATE
          </span>

          <span className="detail-value">
            {formatDate(session.session_date)}
          </span>
        </div>

        <div className="detail-item">
          <span className="detail-label">
            TIME
          </span>

          <span className="detail-value time">
            {formatTime(session.start_time)}
            {" - "}
            {formatTime(session.end_time)}
          </span>
        </div>

      </div>

      {/* REASON / CHANGE */}
      {reason && (
        <div className="reason-box">

          <span className="reason-label">
            {type === "cancelled"
              ? "CANCELLATION REASON"
              : "CHANGE DETAILS"}
          </span>

          <span className="reason-text">
            {reason}
          </span>

        </div>
      )}

    </div>
  );
}

/* =========================================================
   ROOM STATUS PANEL
========================================================= */

function RoomStatusPanel({
  rooms,
}: {
  rooms: RoomStatus[];
}) {
  return (
    <section className="room-status-panel">

      <div className="section-title-row">

        <div>
          <h2>
            Room Status
          </h2>

          <p>
            Current room availability
          </p>
        </div>

      </div>

      <div className="room-grid">

        {rooms.length === 0 ? (

          <div className="empty-room">
            No room status information available
          </div>

        ) : (

          rooms.map((room) => (

            <div
              className="room-status-card"
              key={room.room_code}
            >

              <div className="room-status-code">
                {room.room_code}
              </div>

              <div
                className={getStatusClass(room.status)}
              >

                <span className="status-dot"></span>

                {getStatusLabel(room.status)}

              </div>

            </div>

          ))

        )}

      </div>

    </section>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

function App() {

  const [data, setData] =
    useState<SignageData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [apiError, setApiError] =
    useState(false);

  const [currentSlide, setCurrentSlide] =
    useState<SlideType>("ongoing");

  const [currentTime, setCurrentTime] =
    useState(new Date());

  /* =======================================================
     FETCH SIGNAGE DATA
  ======================================================= */

  async function fetchSignageData() {

    try {

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(
          "Failed to fetch signage data"
        );
      }

      const result: SignageData =
        await response.json();

      /*
       * Save the latest successful data.
       */
      setData(result);

      /*
       * API is working again.
       */
      setApiError(false);

      setLoading(false);

    } catch (error) {

      console.error(
        "Signage API error:",
        error
      );

      /*
       * IMPORTANT:
       *
       * We DO NOT clear old data.
       *
       * Therefore, if the API goes offline,
       * the last successful schedule remains
       * visible on the display.
       */

      setApiError(true);

      setLoading(false);
    }
  }

  /* =======================================================
     INITIAL FETCH + 30 SECOND POLLING
  ======================================================= */

  useEffect(() => {

    fetchSignageData();

    const interval = setInterval(() => {

      fetchSignageData();

    }, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
    };

  }, []);

  /* =======================================================
     LIVE CLOCK
  ======================================================= */

  useEffect(() => {

    const interval = setInterval(() => {

      setCurrentTime(new Date());

    }, 1000);

    return () => {
      clearInterval(interval);
    };

  }, []);

  /* =======================================================
     CREATE SLIDES
  ======================================================= */

  const slides = useMemo<Slide[]>(() => {

    if (!data) {
      return [];
    }

    const result: Slide[] = [];

    /* ONGOING */

    if (
      data.ongoing &&
      data.ongoing.length > 0
    ) {

      result.push({
        type: "ongoing",
        title: "Ongoing Now",
        sessions: data.ongoing,
      });

    }

    /* UPCOMING */

    if (
      data.upcoming &&
      data.upcoming.length > 0
    ) {

      result.push({
        type: "upcoming",
        title: "Upcoming Sessions",
        sessions: data.upcoming,
      });

    }

    /* CANCELLED */

    if (
      data.cancelled &&
      data.cancelled.length > 0
    ) {

      result.push({
        type: "cancelled",
        title: "Cancelled Sessions",
        sessions: data.cancelled,
      });

    }

    /* RESCHEDULED */

    if (
      data.rescheduled &&
      data.rescheduled.length > 0
    ) {

      result.push({
        type: "rescheduled",
        title: "Rescheduled Sessions",
        sessions: data.rescheduled,
      });

    }

    return result;

  }, [data]);

  /* =======================================================
     8 SECOND SLIDE ROTATION
  ======================================================= */

  useEffect(() => {

    /*
     * If there is only one slide,
     * no rotation is necessary.
     */

    if (slides.length <= 1) {

      if (slides.length === 1) {

        setCurrentSlide(
          slides[0].type
        );

      }

      return;
    }

    /*
     * Rotate every 8 seconds.
     */

    const interval = setInterval(() => {

      setCurrentSlide((previous) => {

        const currentIndex =
          slides.findIndex(
            (slide) =>
              slide.type === previous
          );

        const nextIndex =
          currentIndex === -1
            ? 0
            : (currentIndex + 1) %
              slides.length;

        return slides[nextIndex].type;

      });

    }, SLIDE_DURATION);

    return () => {
      clearInterval(interval);
    };

  }, [slides]);

  /* =======================================================
     ACTIVE SLIDE
  ======================================================= */

  const activeSlide =
    slides.find(
      (slide) =>
        slide.type === currentSlide
    ) || slides[0];

  /* =======================================================
     LOCATION
  ======================================================= */

  const buildingName =
    data?.side?.floor?.building
      ?.building_name ||
    data?.building?.building_name ||
    "Sparkline Academy";

  const floorNumber =
    data?.side?.floor?.floor_number ??
    data?.floor?.floor_number ??
    "";

  const sideCode =
    data?.side?.side_code ||
    data?.side_code ||
    "";

  const locationText =
    floorNumber !== ""
      ? `${buildingName} • Floor ${floorNumber}${
          sideCode
            ? ` • ${sideCode} Side`
            : ""
        }`
      : buildingName;

  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (loading) {

    return (

      <div className="signage-page loading-page">

        <div className="loading-content">

          <div className="loading-logo">
            S
          </div>

          <h1>
            ScheduleMate
          </h1>

          <p>
            Loading lecture hall schedule...
          </p>

        </div>

      </div>

    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (

    <div className="signage-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="signage-header">

        {/* BRAND */}

        <div className="brand-section">

          <div className="brand-logo">
            S
          </div>

          <div>

            <div className="brand-name">
              ScheduleMate
            </div>

            <div className="brand-subtitle">
              Lecture Hall Digital Signage
            </div>

          </div>

        </div>

        {/* LOCATION */}

        <div className="location-section">

          <div className="location-label">
            LOCATION
          </div>

          <div className="location-value">
            {locationText}
          </div>

        </div>

        {/* CLOCK */}

        <div className="clock-section">

          <div className="clock">

            {currentTime.toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }
            )}

          </div>

          <div className="date">

            {currentTime.toLocaleDateString(
              [],
              {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              }
            )}

          </div>

        </div>

      </header>

      {/* =================================================
          CONNECTION WARNING
      ================================================= */}

      {apiError && (

        <div className="connection-warning">

          <span className="warning-dot"></span>

          Connection temporarily unavailable.
          Showing the last available schedule.

        </div>

      )}

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="signage-main">

        {activeSlide ? (

          <section
            className={`schedule-section ${activeSlide.type}`}
          >

            {/* SECTION HEADER */}

            <div className="section-header">

              <div>

                <div className="section-kicker">
                  TODAY'S SCHEDULE
                </div>

                <h1>
                  {activeSlide.title}
                </h1>

              </div>

              <div
                className={`large-status ${activeSlide.type}`}
              >

                {activeSlide.type ===
                  "ongoing" &&
                  "LIVE NOW"}

                {activeSlide.type ===
                  "upcoming" &&
                  "NEXT SESSIONS"}

                {activeSlide.type ===
                  "cancelled" &&
                  "NOTICE"}

                {activeSlide.type ===
                  "rescheduled" &&
                  "UPDATED"}

              </div>

            </div>

            {/* SESSION CARDS */}

            <div className="session-grid">

              {activeSlide.sessions.map(
                (session) => (

                  <SessionCard
                    key={session.session_id}
                    session={session}
                    type={activeSlide.type}
                  />

                )
              )}

            </div>

          </section>

        ) : (

          /* =================================================
             NO SESSION
          ================================================= */

          <section className="no-schedule">

            <div className="no-schedule-icon">
              ✓
            </div>

            <h1>
              No Sessions Available
            </h1>

            <p>
              There are no ongoing or upcoming
              sessions for this floor and side.
            </p>

          </section>

        )}

        {/* =================================================
            ROOM STATUS
        ================================================= */}

        <RoomStatusPanel
          rooms={
            data?.liveRoomStatus || []
          }
        />

      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="signage-footer">

        <div>
          ScheduleMate • Sparkline Academy
        </div>

        <div className="footer-center">

          {slides.length > 1 && (

            <div className="slide-indicators">

              {slides.map((slide) => (

                <span
                  key={slide.type}
                  className={
                    slide.type ===
                    activeSlide?.type
                      ? "slide-dot active"
                      : "slide-dot"
                  }
                ></span>

              ))}

            </div>

          )}

        </div>

        <div>
          Auto-updating display
        </div>

      </footer>

    </div>
  );
}

export default App;