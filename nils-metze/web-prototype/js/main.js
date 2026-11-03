// =============================================================================
// Main: connects everything.
//   1. user picks a stop
//   2. every 30 s: fetch departures -> show them -> send them to the matrix
// =============================================================================

let currentStop = null;
let refreshTimer = null;

// "10:12"
function formatClock(date) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// One update cycle. Data and matrix are handled separately:
// if only Adafruit IO fails, the website still shows the departures.
async function refresh() {
    let departures;

    try {
        departures = await fetchDepartures(currentStop.id);
        renderDepartures(departures);
    } catch (error) {
        console.error("Loading departures failed:", error);
        renderError();
        renderStatus("warning", "Reconnecting…");
        return;
    }

    const matrixData = buildMatrixData(currentStop, departures);
    renderMatrix(matrixData);

    try {
        await sendToMatrix(matrixData.message);
        renderStatus("live", `Connected via Adafruit IO · updated ${formatClock(new Date())}`);
    } catch (error) {
        console.error("Sending to Adafruit IO failed:", error);
        renderStatus("warning", "Display not updated · Adafruit IO error");
    }
}

function selectStop(stop) {
    currentStop = stop;
    showDeparturesView(stop);
    renderStatus("warning", "Connecting…");

    clearInterval(refreshTimer);
    refresh();
    refreshTimer = setInterval(refresh, CONFIG.refreshInterval);
}

function leaveStop() {
    clearInterval(refreshTimer);
    currentStop = null;
    showSearchView();
}

// Filters the stop list while typing (accents and case don't matter)
function searchStops(query) {
    const normalized = removeAccents(query).toLowerCase().trim();
    return STOPS.filter((stop) => removeAccents(stop.name).toLowerCase().includes(normalized));
}

// Start --------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
    renderSearchResults(STOPS, selectStop);

    elements.searchInput.addEventListener("input", (event) => {
        renderSearchResults(searchStops(event.target.value), selectStop);
    });

    elements.changeStopButton.addEventListener("click", leaveStop);
});
