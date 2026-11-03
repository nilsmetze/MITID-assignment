/************************ Configuration *************************************/
// Credentials for Wi-Fi and Adafruit IO.


// Adafruit IO: io.adafruit.com -> key icon ("My Key")
#define IO_USERNAME "XXX"
#define IO_KEY      "XXX"

// wifi credentials
#define WIFI_SSID "XXX"
#define WIFI_PASS "XXX"

// The Matrix Portal M4 connects to Wi-Fi through its built-in ESP32 (AirLift).
// The board already defines the ESP32 pins, so no pin setup is needed here.
#define USE_AIRLIFT


#include "AdafruitIO_WiFi.h"
 
// Pins between the main chip (SAMD51) and the ESP32 Wi-Fi chip.
// The Matrix Portal M4 board package already defines them;
// the values below are only a fallback for other AirLift boards.
#if !defined(SPIWIFI_SS)
  #define SPIWIFI      SPI
  #define SPIWIFI_SS   10
  #define SPIWIFI_ACK  9
  #define ESP32_RESETN 6
  #define ESP32_GPIO0  -1
#endif
 
AdafruitIO_WiFi io(IO_USERNAME, IO_KEY, WIFI_SSID, WIFI_PASS,
                   SPIWIFI_SS, SPIWIFI_ACK, ESP32_RESETN, ESP32_GPIO0, &SPIWIFI);
