const elements = {
    searchView: document.querySelector("#search-view"),
    searchInput: document.querySelector("#stop-search"),
    searchResults: document.querySelector("#search-results"),
    departuresView: document.querySelector("#departures-view"),
    changeStopButton: document.querySelector("#change-stop"),
    stopName: document.querySelector("#stop-name"),
    departureList: document.querySelector("#departure-list"),
    errorMessage: document.querySelector("#error-message"),
    matrixHeader: document.querySelector("#matrix-header"),
    matrixRows: document.querySelector("#matrix-rows"),
    status: document.querySelector("#status"),
    statusText: document.querySelector("#status-text"),
};

const templates = {
    searchResult: document.querySelector("#search-result-template"),
    departureRow: document.querySelector("#departure-row-template"),
    matrixRow: document.querySelector("#matrix-row-template"),
};

// Creates a line badge like the "line-badge" component in Figma
function createLineBadge(line) {
    const badge = document.createElement("span");
    badge.className = `line-badge line-badge--${line.toLowerCase()}`;
    badge.textContent = line;
    return badge;
}

// Screen 1 ---------------------------------------------------------------------
function showSearchView() {
    elements.departuresView.hidden = true;
    elements.searchView.hidden = false;
    elements.searchInput.focus();
}

function renderSearchResults(stops, onSelect) {
    elements.searchResults.replaceChildren();

    if (stops.length === 0) {
        const empty = document.createElement("li");
        empty.className = "search-empty";
        empty.textContent = "No stop found.";
        elements.searchResults.append(empty);
        return;
    }

    for (const stop of stops) {
        const item = templates.searchResult.content.cloneNode(true);
        item.querySelector(".search-result-name").textContent = stop.name;
        item.querySelector(".search-result-lines").append(...stop.lines.map(createLineBadge));
        item.querySelector(".search-result").addEventListener("click", () => onSelect(stop));
        elements.searchResults.append(item);
    }
}

// Screen 2 ---------------------------------------------------------------------
function showDeparturesView(stop) {
    elements.stopName.textContent = stop.name;
    elements.searchView.hidden = true;
    elements.departuresView.hidden = false;
}

// Text in the time column: "Now", "7 min" or "11h18"
function formatDepartureTime(departure) {
    if (departure.state === "now") return "Now";
    if (departure.state === "scheduled" && departure.clockText) return departure.clockText;
    return `${departure.minutes} min`;
}

function renderDepartures(departures) {
    elements.errorMessage.hidden = true;
    elements.departureList.hidden = false;
    elements.departureList.replaceChildren();

    if (departures.length === 0) {
        const empty = document.createElement("li");
        empty.className = "departure-empty";
        empty.textContent = "No departures in the next hour.";
        elements.departureList.append(empty);
        return;
    }

    // Show at most 6 departures, like a station board
    for (const departure of departures.slice(0, 6)) {
        const row = templates.departureRow.content.cloneNode(true);
        row.querySelector(".departure-row").classList.add(`departure-row--${departure.state}`);
        row.querySelector(".line-badge").replaceWith(createLineBadge(departure.line));
        row.querySelector(".departure-direction").textContent = departure.direction;
        row.querySelector(".departure-time-text").textContent = formatDepartureTime(departure);
        elements.departureList.append(row);
    }
}

function renderError() {
    elements.departureList.hidden = true;
    elements.errorMessage.hidden = false;
}

// Mirror of the LED matrix
function renderMatrix(matrixData) {
    elements.matrixHeader.textContent = matrixData.header;
    elements.matrixRows.replaceChildren();

    for (const row of matrixData.rows) {
        const item = templates.matrixRow.content.cloneNode(true);
        const tile = item.querySelector(".matrix-tile");
        tile.textContent = row.line;
        tile.classList.add(`matrix-tile--${row.line.toLowerCase()}`);
        item.querySelector(".matrix-dest").textContent = row.dest;
        item.querySelector(".matrix-time").textContent = formatMatrixMinutes(row.minutes);
        elements.matrixRows.append(item);
    }
}

// Status line: "live" (green dot) or "warning" (yellow dot)
function renderStatus(state, text) {
    elements.status.dataset.state = state;
    elements.statusText.textContent = text;
}
