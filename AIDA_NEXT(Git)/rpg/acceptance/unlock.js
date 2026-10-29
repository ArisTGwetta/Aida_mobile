/* Existing Mobile PIN interpretation/selection/assembly bodies only; no Airlock lifecycle. */
(function(){'use strict';
window.createRPGFragmentUnlock=function(deps){
let fragments=null,active=null;
  function meaningfulDigits(rawPin) {
    return (rawPin || "").replace(/0/g, "");
  }


  function assembleRouteKey(route, cleanPin) {
    if (route.auth === "none" || route.requiresKey === false || route.provider === "ollama") {
      return null;
    }
    const prefix = route.prefix || "";
    const segments = route.segments || {};
    const parts = cleanPin.split("").map((digit) => {
      const segment = segments[digit];
      if (!segment) throw new Error(`Missing key fragment for digit ${digit}.`);
      return segment;
    });

    return `${prefix}${parts.join("")}`;
  }


  function resolveRoute(provider, cleanPin) {
    if (provider.routes && provider.routes[cleanPin]) {
      return provider.routes[cleanPin];
    }

    if (provider.openai?.segments) {
      return {
        label: "OpenAI default",
        provider: "openai",
        profile: "default",
        prefix: provider.openai.prefix || "",
        segments: provider.openai.segments
      };
    }

    return null;
  }


return Object.freeze({
 async load(){fragments=null;active=null;const value=await deps.readFragments();if(!value||!value.routes||typeof value.routes!=='object'||Array.isArray(value.routes)||!Object.keys(value.routes).length)throw Error('Designated credential descriptor has no supported routes. No values logged.');fragments=value;return {loaded:true};},
 unlock(rawPin){active=null;try{if(!fragments)throw Error();const clean=meaningfulDigits(rawPin);if(!/^[1-9]{3}$/.test(clean)||!Object.hasOwn(fragments.routes,clean))throw Error();const route=resolveRoute(fragments,clean);if(!route||(route.provider||'openai')!=='openai'||route.auth&&route.auth!=='bearer')throw Error();const key=assembleRouteKey(route,clean);if(typeof key!=='string'||!key.startsWith('sk-'))throw Error();active={provider:'openai',auth:'bearer',key};fragments=null;return {unlocked:true,provider:'openai'};}catch{throw Error('PIN/route could not unlock an OpenAI credential. No values logged or persisted.');}},
 useRoute(consume){if(!active)throw Error('Use Google authorization, load the designated credential file and enter the access-pad PIN first.');consume(active);},
 clear(){fragments=null;active=null;}
});};})();
