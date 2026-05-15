/* ===================================================== */
/* 011-BUTLER_KEYS.JS: PIN & AUTH HANDSHAKE            */
/* ===================================================== */

const VAULT_FRAGMENTS = {
    "1": "iv8Og2duxxyD5r1Jg4xGy4wO3",
    "2": "iv8Og2duxxyD5r1Jg4xHy4wO3",
    "3": "NwnjXT_HST3BlbkFJG6RAOmYnUw-e0x8NuD8Ca7lattZkaJXCKGCFb72JiSew4Uciir9h_KrEj2DrdAgTDbRf6dnLIA",
    "4": "NwnjXT_HST3BlbkFJG6RAOmYnUw-e0x8Nu8DCa7lattZkaJXCKGCFb72JiSew4Uciir9h_KrEj2DrdAgTDbRf6dnLIA",
    "5": "NwnjXT_HST3BlbkFJG6RAOmYnUw-e0x8NuD8Ca7lattkZaJXCKGCFb72JiSew4Uciir9h_KrEj2DrdAgTDbRf6dnLIA",
    "6": "NwnjXT_HST3BlbkFJG6RAOmYnUw-e0x9NuD8Ca7lattZkaJXCKGCFb72JiSew4Uciir9h_KrEj2DrdAgTDbRf6dnLIA",
    "7": "CFTIx2gyqqX4E27BcyGtEC5tc2qmoEUIgPtj9GaO",
    "8": "CFTIx2gyqqX4E72BcyGtEC5tc2qmoEUIgPtj9GaO",
    "9": "CFTIx2gyqqX4E72BcyGtEC5tc2qnoEUIgPtj9GaO"
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
