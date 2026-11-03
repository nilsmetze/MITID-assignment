const CONFIG = {
    // Adafruit IO credentials
    adafruitUsername: "XXX",
    adafruitKey: "XXX",
    matrixFeed: "departures", // feed the LED matrix listens to

    // Data Grand Lyon login
    grandLyonUser: "XXX",
    grandLyonPassword: "XXX",

    // true = use data/mock-data.json instead of the live API
    // (useful for styling the page without calling the API every time)
    useMockData: true,

    // How often the departures are refreshed and sent to the matrix (ms).
    // Free Adafruit IO accounts allow max. 30 values per minute.
    refreshInterval: 30000,
};
