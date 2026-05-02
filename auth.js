// ============================================================
//  RAYS CREAT3R — AUTH MODULE (v2.0)
//  - Persistent login: stays logged in until explicit logout
//  - Unique usernames enforced across all accounts
//  - Wiped all existing accounts for fresh start
// ============================================================
(function(window){
  "use strict";

  var USER_KEY      = "rc_user";
  var SESSION_KEY   = "rc_session";
  var ACH_KEY       = "rc_achievements";
  var REGISTRY_KEY  = "rc_username_registry"; // Tracks ALL taken usernames
  var LEGACY_KEY    = "candyclick_user";
  var AUTH_VERSION  = "rc_auth_v2";

  // ── MIGRATION: Wipe legacy data on version change ─────────────
  (function migrate(){
    var currentVer = localStorage.getItem(AUTH_VERSION);
    if (!currentVer) {
      // Fresh install or needs wipe - clear all auth-related data
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ACH_KEY);
      localStorage.removeItem(LEGACY_KEY);
      localStorage.removeItem(REGISTRY_KEY);
      // Keep other game data but require re-login
      localStorage.setItem(AUTH_VERSION, "2.0");
    }
  })();

  // ── PASSWORD HASH (FNV-1a) ───────────────────────────────────
  function hashPwd(pw){
    if(!pw)return "";
    var h=2166136261;
    for(var i=0;i<pw.length;i++){h^=pw.charCodeAt(i);h=Math.imul(h,16777619);}
    return "h"+(h>>>0).toString(16);
  }

  // ── USERNAME REGISTRY (ensures unique usernames) ─────────────
  function getUsernameRegistry(){
    try {
      var raw = localStorage.getItem(REGISTRY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function saveUsernameRegistry(registry){
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  }

  function isUsernameTaken(name){
    if (!name) return true;
    var registry = getUsernameRegistry();
    return registry.indexOf(name.toLowerCase().trim()) >= 0;
  }

  function registerUsername(name){
    var registry = getUsernameRegistry();
    var cleanName = name.toLowerCase().trim();
    if (registry.indexOf(cleanName) < 0) {
      registry.push(cleanName);
      saveUsernameRegistry(registry);
    }
  }

  // ── GET / SET USER ──────────────────────────────────────────
  function getUser(){
    var raw=localStorage.getItem(USER_KEY);
    if(raw){try{var u=JSON.parse(raw);if(u&&u.name)return u;}catch(e){}}
    var legacy=localStorage.getItem(LEGACY_KEY);
    if(legacy){try{
      var lu=JSON.parse(legacy);
      if(lu&&lu.name){lu.loggedIn=true;localStorage.setItem(USER_KEY,JSON.stringify(lu));localStorage.removeItem(LEGACY_KEY);return lu;}
    }catch(e){}}
    return null;
  }

  // Persistent: missing loggedIn defaults to TRUE (backward compat)
  function isLoggedIn(){
    var u=getUser();
    if(!u)return false;
    return u.loggedIn!==false;
  }

  function setUser(name,password){
    var cleanName = (name || "").trim();
    if (!cleanName) return {ok:false,msg:"Username is required."};
    if (cleanName.length < 2) return {ok:false,msg:"Username must be at least 2 characters."};

    var existing = getUser();

    // Check if username is taken by someone else (not current user changing their name)
    if (isUsernameTaken(cleanName)) {
      // Allow if it's the same user updating their account
      if (!existing || existing.name.toLowerCase() !== cleanName.toLowerCase()) {
        return {ok:false,msg:"That username is already taken. Try a different one."};
      }
    }

    var u={
      name:cleanName,
      passwordHash:password?hashPwd(password):(existing&&existing.passwordHash||""),
      created:existing?existing.created:Date.now(),
      lastSeen:Date.now(),
      loggedIn:true
    };

    // Register username in global registry
    registerUsername(cleanName);
    localStorage.setItem(USER_KEY,JSON.stringify(u));
    return {ok:true,user:u};
  }

  function loginWithPassword(name,password){
    var u=getUser();
    if(!u)return{ok:false,msg:"No account on this device. Use your account key to log in instead."};
    if(u.name.toLowerCase()!==(name||"").toLowerCase())return{ok:false,msg:"That username doesn't match the account on this device."};
    if(u.passwordHash){
      if(u.passwordHash!==hashPwd(password))return{ok:false,msg:"Wrong password."};
    } else {
      u.passwordHash=hashPwd(password);
    }
    u.loggedIn=true;
    u.lastSeen=Date.now();
    localStorage.setItem(USER_KEY,JSON.stringify(u));
    return{ok:true,user:u};
  }

  function touchUser(){
    var u=getUser();
    if(u){u.lastSeen=Date.now();localStorage.setItem(USER_KEY,JSON.stringify(u));}
    return u;
  }

  function logout(){
    var u=getUser();
    if(u){u.loggedIn=false;localStorage.setItem(USER_KEY,JSON.stringify(u));}
    endSession();
  }

  function hasLocalAccount(){return !!getUser();}

  // ── SESSION TRACKING ────────────────────────────────────────
  function startSession(){
    var s=getSession()||{visitCount:0,firstVisit:Date.now(),lastVisit:0,totalPlayTime:0};
    s.visitCount=(s.visitCount||0)+1;
    s.lastVisit=Date.now();
    s.currentSessionStart=Date.now();
    localStorage.setItem(SESSION_KEY,JSON.stringify(s));
    if(window._rcPlayTimer)clearInterval(window._rcPlayTimer);
    window._rcPlayTimer=setInterval(function(){
      var c=getSession();
      if(c){c.totalPlayTime=(c.totalPlayTime||0)+30;localStorage.setItem(SESSION_KEY,JSON.stringify(c));}
    },30000);
    window.addEventListener("beforeunload",endSession);
    return s;
  }
  function endSession(){
    if(window._rcPlayTimer){clearInterval(window._rcPlayTimer);window._rcPlayTimer=null;}
    var s=getSession();
    if(s&&s.currentSessionStart){
      s.totalPlayTime=(s.totalPlayTime||0)+Math.floor((Date.now()-s.currentSessionStart)/1000);
      delete s.currentSessionStart;
      localStorage.setItem(SESSION_KEY,JSON.stringify(s));
    }
  }
  function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY));}catch(e){return null;}}

  // ── ACHIEVEMENTS ─────────────────────────────────────────────
  function getAchievements(){try{return JSON.parse(localStorage.getItem(ACH_KEY)||"[]");}catch(e){return[];}}
  function unlockAchievement(id){
    var l=getAchievements();
    if(l.indexOf(id)>=0)return false;
    l.push(id);localStorage.setItem(ACH_KEY,JSON.stringify(l));return true;
  }
  function hasAchievement(id){return getAchievements().indexOf(id)>=0;}

  // ── ACCOUNT KEY ──────────────────────────────────────────────
  function exportKey(){
    var u=getUser();if(!u)return null;
    var p={ver:4,user:u,session:getSession(),achievements:getAchievements(),
      candySave:localStorage.getItem("candyClickerSave")||"",
      projects:localStorage.getItem("rc_projects")||"[]",
      published:localStorage.getItem("rc_published")||"[]"};
    return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
  }

  function importKey(name,key){
    try{
      var p=JSON.parse(decodeURIComponent(escape(atob(key.trim()))));
      if(!p.user)return{ok:false,msg:"Invalid key — no user data."};
      var u=p.user;
      var targetName = name || u.name;

      // Check if username is available (unless importing to same device with same name)
      var existing = getUser();
      if (isUsernameTaken(targetName)) {
        if (!existing || existing.name.toLowerCase() !== targetName.toLowerCase()) {
          return {ok:false,msg:"Username '"+targetName+"' is already taken on this device. Try a different name."};
        }
      }

      if(name)u.name=name;
      u.lastSeen=Date.now();
      u.loggedIn=true;

      // Register the username
      registerUsername(u.name);

      localStorage.setItem(USER_KEY,JSON.stringify(u));
      if(p.session)localStorage.setItem(SESSION_KEY,JSON.stringify(p.session));
      if(p.achievements)localStorage.setItem(ACH_KEY,JSON.stringify(p.achievements));
      if(p.candySave)localStorage.setItem("candyClickerSave",p.candySave);
      if(p.projects&&p.projects!=="[]")localStorage.setItem("rc_projects",p.projects);
      if(p.published&&p.published!=="[]")localStorage.setItem("rc_published",p.published);
      return{ok:true,user:u};
    }catch(e){return{ok:false,msg:"Could not read that key. Make sure you copied the whole thing."};}
  }

  // ── ADMIN / DEBUG ───────────────────────────────────────────
  function clearAllAccounts(){
    // Wipes all auth data - use with caution!
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACH_KEY);
    localStorage.removeItem(REGISTRY_KEY);
    localStorage.removeItem(AUTH_VERSION);
    return {ok:true,msg:"All accounts wiped. Refresh to start fresh."};
  }

  function avatarColor(name){
    var c=["#7c3aed","#a855f7","#ec4899","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#f97316"];
    var l=(name||"?").charAt(0).toUpperCase();
    return c[l.charCodeAt(0)%c.length];
  }

  window.RC={
    getUser:getUser, setUser:setUser, touchUser:touchUser, logout:logout,
    isLoggedIn:isLoggedIn, hasLocalAccount:hasLocalAccount,
    loginWithPassword:loginWithPassword, hashPwd:hashPwd,
    startSession:startSession, endSession:endSession, getSession:getSession,
    getAchievements:getAchievements, unlockAchievement:unlockAchievement, hasAchievement:hasAchievement,
    exportKey:exportKey, importKey:importKey, avatarColor:avatarColor,
    isUsernameTaken:isUsernameTaken, clearAllAccounts:clearAllAccounts
  };
})(window);
