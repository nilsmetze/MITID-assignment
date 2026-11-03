/*
  Metro Monitor – live tram departures on a 64x32 RGB LED matrix

  Hardware: Adafruit Matrix Portal M4 (SAMD51 + ESP32 AirLift)
            64x32 RGB LED matrix (Adafruit #2278)
  Board:    "Adafruit Matrix Portal M4 (SAMD51)"
  Libraries: Adafruit Protomatter, Adafruit GFX Library,
             Adafruit IO Arduino (+ its dependencies),
             WiFiNINA (Adafruit fork)

  How it works:
  The website fetches the departures from the TCL API, formats them
  and publishes one short text message to the Adafruit IO feed "departures".
  This sketch subscribes to that feed and redraws the matrix on every update.

  Message format (one feed value):
    HEADER;LINE,DEST,MIN;LINE,DEST,MIN;LINE,DEST,MIN
  Example:
    S.BLANDINE;T2,Montr,0;T1,Debou,1;T2,Montr,11
  - HEADER: stop name, max. 10 characters
  - LINE:   line name, max. 3 characters (e.g. T1)
  - DEST:   direction, max. 5 characters (that's what fits in a row)
  - MIN:    minutes until departure, 0 = "now"
*/

#include <Adafruit_Protomatter.h>
#include "config.h"  // Wi-Fi + Adafruit IO credentials, creates `io`

/*************************** Matrix setup ***********************************/
// Fixed pins of the Matrix Portal M4 (from Adafruit's examples)
uint8_t rgbPins[]  = {7, 8, 9, 10, 11, 12};
uint8_t addrPins[] = {17, 18, 19, 20, 21};
uint8_t clockPin   = 14;
uint8_t latchPin   = 15;
uint8_t oePin      = 16;

Adafruit_Protomatter matrix(
  64,           // width in pixels
  6,            // color depth (6 = finest steps, needed for dimmed colors)
  1, rgbPins,
  4, addrPins,  // 4 address pins = 32 pixels high
  clockPin, latchPin, oePin,
  false);

// Protomatter has no brightness setting, so every color is scaled by this
// factor. Keep it low when powered over USB only! (0-255)
#define BRIGHTNESS 60

uint16_t color(uint8_t r, uint8_t g, uint8_t b) {
  return matrix.color565(r * BRIGHTNESS / 255, g * BRIGHTNESS / 255, b * BRIGHTNESS / 255);
}

/*************************** Adafruit IO ************************************/
AdafruitIO_Feed *departuresFeed = io.feed("departures");

// If no new message arrives within this time, the data counts as stale
#define STALE_AFTER_MS 120000UL  // 2 minutes

/*************************** Departure data *********************************/
#define MAX_ROWS 3

struct Departure {
  char line[4];   // max. 3 characters + end of string
  char dest[6];   // max. 5 characters + end of string
  int minutes;
};

Departure departures[MAX_ROWS];
int departureCount = 0;
char header[11] = "METRO MON.";  // shown until the first message arrives

unsigned long lastMessageTime = 0;
unsigned long lastBlinkTime = 0;
bool dotOn = false;

// Line tile colors
uint16_t lineColor(const char *line) {
  if (strcmp(line, "T1") == 0) return color(60, 90, 230);     // blue
  if (strcmp(line, "T2") == 0) return color(170, 140, 230);    // violet
  return color(120, 120, 120);                                // any other line
}

// Text colors: slightly dimmed white so it doesn't outshine the tiles,
// brand red for the stop name and for "now"
uint16_t textColor()  { return color(200, 200, 200); }
uint16_t brandColor() { return color(255, 0, 0); }

/*************************** Parsing ****************************************/
// Splits the feed message into the header and up to 3 departures.
void parseMessage(const char *message) {
  char buffer[128];
  strncpy(buffer, message, sizeof(buffer) - 1);
  buffer[sizeof(buffer) - 1] = '\0';

  char *rowRest;
  char *token = strtok_r(buffer, ";", &rowRest);
  if (token == NULL) return;  // empty message: keep the old data

  strncpy(header, token, sizeof(header) - 1);
  header[sizeof(header) - 1] = '\0';

  departureCount = 0;
  while ((token = strtok_r(NULL, ";", &rowRest)) != NULL && departureCount < MAX_ROWS) {
    char *fieldRest;
    char *line    = strtok_r(token, ",", &fieldRest);
    char *dest    = strtok_r(NULL, ",", &fieldRest);
    char *minutes = strtok_r(NULL, ",", &fieldRest);
    if (line == NULL || dest == NULL || minutes == NULL) continue;  // skip broken rows

    Departure &d = departures[departureCount++];
    strncpy(d.line, line, sizeof(d.line) - 1);
    d.line[sizeof(d.line) - 1] = '\0';
    strncpy(d.dest, dest, sizeof(d.dest) - 1);
    d.dest[sizeof(d.dest) - 1] = '\0';
    d.minutes = atoi(minutes);
  }
}

/*************************** Drawing ****************************************/
void drawHeader() {
  matrix.setTextColor(brandColor());
  matrix.setCursor(1, 0);
  matrix.print(header);
}

void drawRow(int i) {
  int y = 8 + i * 8;  // rows at y = 8, 16, 24
  Departure &d = departures[i];

  // Line tile: 13 x 7 px, so a 1 px dark gap separates the tiles
  // of neighbouring rows. The line name is "cut out" of the tile
  // (text color 0 = LEDs off), which reads much sharper than
  // light text on a light tile.
  matrix.fillRect(0, y, 13, 7, lineColor(d.line));
  int lineWidth = strlen(d.line) * 6 - 1;
  matrix.setTextColor(0);
  matrix.setCursor((13 - lineWidth) / 2 + 1, y);
  matrix.print(d.line);

  // Direction
  matrix.setTextColor(textColor());
  matrix.setCursor(15, y);
  matrix.print(d.dest);

  // Minutes, right-aligned; 0 becomes "now"
  char time[6];
  if (d.minutes <= 0) {
    strcpy(time, "now");
  } else {
    snprintf(time, sizeof(time), "%d'", d.minutes);
  }
  int timeWidth = strlen(time) * 6 - 1;
  matrix.setTextColor(d.minutes <= 0 ? brandColor() : textColor());
  matrix.setCursor(64 - timeWidth, y);
  matrix.print(time);
}

void drawMessage(const char *line1, const char *line2) {
  matrix.fillScreen(0);
  drawHeader();
  matrix.setTextColor(textColor());
  matrix.setCursor(1, 12);
  matrix.print(line1);
  matrix.setCursor(1, 22);
  matrix.print(line2);
  matrix.show();
}

void drawDepartures() {
  if (departureCount == 0) {
    drawMessage("No", "departures");
    return;
  }
  matrix.fillScreen(0);
  drawHeader();
  for (int i = 0; i < departureCount; i++) drawRow(i);
  matrix.show();  // needed after every drawing!
}

/*************************** Adafruit IO handler ****************************/
// Called by the Adafruit IO library every time the feed gets a new value.
void handleMessage(AdafruitIO_Data *data) {
  Serial.print("Received: ");
  Serial.println(data->value());

  parseMessage(data->value());
  lastMessageTime = millis();
  drawDepartures();
}

/*************************** Setup + loop ***********************************/
void setup() {
  Serial.begin(115200);  // no while(!Serial): the board must also start without a computer

  ProtomatterStatus status = matrix.begin();
  if (status != PROTOMATTER_OK) {
    Serial.println("Error: matrix could not be started");
    while (true) delay(1000);
  }
  matrix.setTextSize(1);   // default font: 5x7 pixels
  matrix.setTextWrap(false);

  drawMessage("Connecting", "to WiFi...");

  // Connect to Wi-Fi and Adafruit IO, then listen to the feed
  Serial.print("Connecting to Adafruit IO");
  io.connect();
  departuresFeed->onMessage(handleMessage);

  // Print the connection state every second while waiting
  while (io.status() < AIO_CONNECTED) {
    Serial.println(io.statusText());
    delay(1000);
  }
  Serial.println();
  Serial.println(io.statusText());

  drawMessage("Waiting", "for data...");
  departuresFeed->get();  // ask for the last value, so we don't wait for the next update
}

void loop() {
  // Keeps the connection alive and processes incoming messages.
  // Must run as often as possible, so no delay() in the loop.
  io.run();

  // Status dot top right: blinking white = live,
  // blinking yellow = no fresh data for 2 minutes or connection lost
  if (millis() - lastBlinkTime > 500) {
    lastBlinkTime = millis();
    dotOn = !dotOn;

    bool isStale = lastMessageTime == 0 || millis() - lastMessageTime > STALE_AFTER_MS;
    bool isConnected = io.status() >= AIO_CONNECTED;
    uint16_t dotColor = (isStale || !isConnected) ? color(255, 180, 0) : color(255, 255, 255);

    matrix.drawPixel(63, 0, dotOn ? dotColor : 0);
    matrix.show();
  }
}
