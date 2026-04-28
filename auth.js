// ============================================================
//  RAYS CREAT3R — SHARED AUTH & SESSION MODULE
//  Include this on every page for consistent login state
// ============================================================
(function(window){
  "use strict";

  var USER_KEY    = "rc_user";
  var SESSION_KEY = "rc_session";
  var ACH_KEY     = "rc_achievements";
  var LEGACY_KEY  = "candyclick_user";  // migrate from old version

  // ── GET / SET USER ──────────────────────────────────────────
  function getUser(){
    var raw=localStorage.getItem(USER_KEY);
    if(raw){try{return JSON.parse(raw);}catch(e){}}
    // Migrate from old key
    var old=localStorage.getItem(LEGACY_KEY);
    if(old){
      try{
        var u=JSON.parse(old);
        localStorage.setItem(USER_KEY,JSON.stringify(u));
        localStorage.removeItem(LEGACY_KEY);
        return u;
      }catch(e){}
    }
    return null;
  }

  function setUser(name){
    var existing=getUser();
    var u={
      name:name,
      created:existing?existing.created:Date.now(),
      lastSeen:Date.now()
    };
    localStorage.setItem(USER_KEY,JSON.stringify(u));
    return u;
  }

  function touchUser(){
    var u=getUser();
    if(u){u.lastSeen=Date.now();localStorage.setItem(USER_KEY,JSON.stringify(u));}
    return u;
  }

  function logout(){
    localStorage.removeItem(USER_KEY);
    endSession();
  }

  // ── SESSION TRACKING ────────────────────────────────────────
  function startSession(){
    var sess=getSession()||{visitCount:0,firstVisit:Date.now(),lastVisit:0,totalPlayTime:0};
    sess.visitCount=(sess.visitCount||0)+1;
    sess.lastVisit=Date.now();
    sess.currentSessionStart=Date.now();
    localStorage.setItem(SESSION_KEY,JSON.stringify(sess));
    // Update play time every 30s
    window._rcPlayTimer=setInterval(function(){
      var s=getSession();
      if(s){s.totalPlayTime=(s.totalPlayTime||0)+30;localStorage.setItem(SESSION_KEY,JSON.stringify(s));}
    },30000);
    // Save on leave
    window.addEventListener("beforeunload",endSession);
    return sess;
  }

  function endSession(){
    if(window._rcPlayTimer)clearInterval(window._rcPlayTimer);
    var s=getSession();
    if(s&&s.currentSessionStart){
      var elapsed=Math.floor((Date.now()-s.currentSessionStart)/1000);
      s.totalPlayTime=(s.totalPlayTime||0)+elapsed;
      delete s.currentSessionStart;
      localStorage.setItem(SESSION_KEY,JSON.stringify(s));
    }
  }

  function getSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY));}catch(e){return null;}
  }

  // ── ACHIEVEMENTS ─────────────────────────────────────────────
  function getAchievements(){
    try{return JSON.parse(localStorage.getItem(ACH_KEY)||"[]");}catch(e){return[];}
  }
  function unlockAchievement(id,onUnlock){
    var list=getAchievements();
    if(list.indexOf(id)>=0)return false;
    list.push(id);
    localStorage.setItem(ACH_KEY,JSON.stringify(list));
    if(typeof onUnlock==="function")onUnlock(id);
    return true;
  }
  function hasAchievement(id){return getAchievements().indexOf(id)>=0;}

  // ── ACCOUNT KEY (import / export) ───────────────────────────
  function exportKey(){
    var u=getUser();if(!u)return null;
    var payload={
      ver:3,
      user:u,
      session:getSession(),
      achievements:getAchievements(),
      candySave:localStorage.getItem("candyClickerSave")||"",
      projects:localStorage.getItem("rc_projects")||"[]",
      published:localStorage.getItem("rc_published")||"[]"
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }

  function importKey(name,key){
    try{
      var dec=decodeURIComponent(escape(atob(key.trim())));
      var p=JSON.parse(dec);
      if(!p.user&&!p.name)return{ok:false,msg:"Invalid key — no user data found."};
      // Set user with the name they typed (override)
      var u=p.user||{};u.name=name;u.lastSeen=Date.now();
      localStorage.setItem(USER_KEY,JSON.stringify(u));
      if(p.session)localStorage.setItem(SESSION_KEY,JSON.stringify(p.session));
      if(p.achievements)localStorage.setItem(ACH_KEY,JSON.stringify(p.achievements));
      if(p.candySave)localStorage.setItem("candyClickerSave",p.candySave);
      if(p.projects&&p.projects!=="[]")localStorage.setItem("rc_projects",p.projects);
      if(p.published&&p.published!=="[]")localStorage.setItem("rc_published",p.published);
      return{ok:true,user:getUser()};
    }catch(e){
      return{ok:false,msg:"Could not read that key. Make sure you copied the whole thing."};
    }
  }

  // ── AVATAR COLOR ─────────────────────────────────────────────
  function avatarColor(name){
    var c=["#7c3aed","#a855f7","#ec4899","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#f97316"];
    var l=(name||"?").charAt(0).toUpperCase();
    return c[l.charCodeAt(0)%c.length];
  }

  // ── EXPOSE ───────────────────────────────────────────────────
  window.RC={
    getUser:getUser, setUser:setUser, touchUser:touchUser, logout:logout,
    startSession:startSession, endSession:endSession, getSession:getSession,
    getAchievements:getAchievements, unlockAchievement:unlockAchievement, hasAchievement:hasAchievement,
    exportKey:exportKey, importKey:importKey, avatarColor:avatarColor
  };

})(window);
