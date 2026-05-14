/* ===================================================== */
/* 011-BUTLER_KEYS.JS: PIN & AUTH HANDSHAKE            */
/* ===================================================== */

const VAULT_FRAGMENTS = {
    "1": "iv8Og2duxxyD5r1Jg4xGy4wO3",
    "2": "iv8Og2duxxyD5r1Jg4xHy4wO3",
    "3": "NwnjXT_HST3BlbkFJG6RAOmYnUw-e0x8NuD8Ca7lattZkaJXCKGCFb72JiSew4Uciir9h_KrEj2DrdAgTDbRf6dnLIA",
    // ... add the rest of your segments here
};

function pressKey(val) {
    const box = document.getElementById("scramble-pin");
    if (val === 'C') box.value = "";
    else if (val === '0') return;
    else if (box.value.length < 3) box.value += val;
}

function requestToken() {
    const pin = document.getElementById("scramble-pin").value;
    if (pin.length === 3) {
        // Assemble the soul-key
        const secret = "sk-proj-" + 
            VAULT_FRAGMENTS[pin[0]] + 
            VAULT_FRAGMENTS[pin[1]] + 
            VAULT_FRAGMENTS[pin[2]];
        
        sessionStorage.setItem("aida_active_key", secret);
        
        // Hide airlock and trigger Google
        document.getElementById("airlock").style.display = "none";
        tokenClient.requestAccessToken(); 
    } else {
        console.error("INVALID CLEARANCE");
    }
}
