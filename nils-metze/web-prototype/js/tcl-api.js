// =============================================================================
// TCL API: fetches the next departures of one stop from Data Grand Lyon
// and turns the raw API entries into simple departure objects.
// =============================================================================

const TCL_API_URL = "https://download.data.grandlyon.com/ws/rdata/tcl_sytral.tclpassagearret/all.json";
const MOCK_DATA_URL = "data/mock-data.json";

// Departures that left more than this many minutes ago are dropped
const MAX_MINUTES_IN_PAST = 1;

// Loads the raw entries, either from the live API or from the saved mock file.
async function loadRawDepartures(stopId) {
    if (CONFIG.useMockData) {
        const response = await fetch(MOCK_DATA_URL);
        const data = await response.json();
        // The mock file contains one stop only, but filter anyway
        return data.values.filter((entry) => entry.id === stopId);
    }

    // The API uses Basic Auth with the Data Grand Lyon account
    const credentials = btoa(`${CONFIG.grandLyonUser}:${CONFIG.grandLyonPassword}`);
    const response = await fetch(`${TCL_API_URL}?field=id&value=${stopId}`, {
        headers: { Authorization: `Basic ${credentials}` },
    });

    if (!response.ok) {
        throw new Error(`TCL API answered with status ${response.status}`);
    }

    const data = await response.json();
    return data.values;
}

// "2026-11-02 10:59:05" (Lyon local time) -> Date
function parseApiDate(text) {
    return new Date(text.replace(" ", "T"));
}

// Turns one raw API entry into the object the rest of the app uses.
// `now` is passed in so the mock data can use its own "now".
function toDeparture(entry, now) {
    const time = parseApiDate(entry.heurepassage);
    const minutes = Math.round((time - now) / 60000);

    let state;
    if (entry.delaipassage === "Proche" || minutes <= 0) {
        state = "now";
    } else if (entry.type === "E") {
        state = "live";        // "E" = real-time estimate
    } else {
        state = "scheduled";   // "T" = timetable value
    }

    return {
        line: entry.ligne,
        direction: entry.direction,
        time,
        minutes: Math.max(minutes, 0),
        state,
        // The API already gives clock times like "11h18" for later departures
        clockText: /^\d{1,2}h\d{2}$/.test(entry.delaipassage) ? entry.delaipassage : null,
    };
}

// Main function used by main.js: returns the departures sorted by time.
async function fetchDepartures(stopId) {
    const entries = await loadRawDepartures(stopId);

    // Mock data is old, so "now" is the moment it was saved
    const now = CONFIG.useMockData && entries.length > 0
        ? parseApiDate(entries[0].last_update_fme)
        : new Date();

    return entries
        .map((entry) => toDeparture(entry, now))
        .filter((departure) => (departure.time - now) / 60000 >= -MAX_MINUTES_IN_PAST)
        .sort((a, b) => a.time - b.time);
}
