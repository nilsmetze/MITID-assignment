// =============================================================================
// Stops the user can choose from.
// IDs come from the "Points d'arrêt du réseau TCL" dataset on data.grandlyon.com
// (one ID per platform/direction).
// =============================================================================

const STOPS = [
    {
        id: 34837,
        name: "Sainte-Blandine",
        matrixName: "S.BLANDINE", // max. 10 characters, shown on the LED matrix
        lines: ["T1", "T2"],
    },
    // To add a stop: look up its id, then copy the block above.
];
