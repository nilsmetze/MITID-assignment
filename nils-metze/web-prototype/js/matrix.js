// =============================================================================
// LED matrix: builds the short text message the Matrix Portal understands
// and sends it to Adafruit IO with the course's AdafruitIO class.
//
// Message format (must match arduinoCode.ino):
//   HEADER;LINE,DEST,MIN;LINE,DEST,MIN;LINE,DEST,MIN
//   e.g. S.BLANDINE;T2,Montr,0;T1,Debou,1;T2,Montr,11
// =============================================================================

const MATRIX_ROWS = 3;          // the 64x32 matrix has room for 3 departures
const MATRIX_DEST_LENGTH = 5;   // 5 characters fit between tile and minutes

const adafruit = new AdafruitIO(CONFIG.adafruitUsername, CONFIG.adafruitKey);

// The matrix font has no accents: "Hôtel Région" -> "Hotel Region"
function removeAccents(text) {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// "Hôtel Région Montrochet" -> "Montr" (the last word is the most telling)
function shortenDestination(direction) {
    const words = removeAccents(direction).split(" ");
    return words[words.length - 1].slice(0, MATRIX_DEST_LENGTH);
}

// Takes the first departures and turns them into the matrix format.
// Returns both the rows (for the mirror on the website) and the message.
function buildMatrixData(stop, departures) {
    const rows = departures.slice(0, MATRIX_ROWS).map((departure) => ({
        line: departure.line,
        dest: shortenDestination(departure.direction),
        minutes: departure.minutes,
    }));

    // Commas and semicolons are separators, so they must not appear in values
    const parts = rows.map((row) => `${row.line},${row.dest},${row.minutes}`);
    const message = [stop.matrixName, ...parts].join(";");

    return { header: stop.matrixName, rows, message };
}

// Text shown for the minutes, same rule as in the Arduino code
function formatMatrixMinutes(minutes) {
    return minutes <= 0 ? "now" : `${minutes}'`;
}

// Sends the message to the feed. Wraps the course's callback-based
// postData() in a Promise, so main.js can use await.
function sendToMatrix(message) {
    return new Promise((resolve, reject) => {
        adafruit.postData(CONFIG.matrixFeed, message, (json) => {
            // Adafruit IO answers with an "error" field if something went wrong
            if (json.error) {
                reject(new Error(json.error));
            } else {
                resolve(json);
            }
        });
    });
}
