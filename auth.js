// RAYS CREAT3R shared localStorage profile helpers
(function(){
  "use strict";
  var USER_KEY="rc_user";
  var ACH_KEY="rc_achievements";
  var SESSION_KEY="rc_session";

  function readJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e){ return fallback; }
  }
  function writeJSON(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){}
  }
  function hashColor(name){
    var colors=["#7c3aed","#a855f7","#58a6ff","#3fb950","#ffa657","#f85149","#ffd700"];
    var h=0;
    name=String(name||"Player");
    for(var i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0;
    return colors[h%colors.length];
  }
  function getUser(){
    var u=readJSON(USER_KEY,null);
    if(u && typeof u==="object" && u.name) return u;
    return null;
  }
  function touchUser(){
    var u=getUser();
    if(!u) return null;
    u.lastSeen=Date.now();
    writeJSON(USER_KEY,u);
    var s=readJSON(SESSION_KEY,{visitCount:0,firstVisit:Date.now(),lastVisit:0,totalPlayTime:0});
    if(!s.firstVisit) s.firstVisit=Date.now();
    s.visitCount=(s.visitCount||0)+1;
    s.lastVisit=Date.now();
    writeJSON(SESSION_KEY,s);
    return u;
  }
  function unlockAchievement(id){
    if(!id) return;
    var list=readJSON(ACH_KEY,[]);
    if(!Array.isArray(list)) list=[];
    if(list.indexOf(id)===-1){
      list.push(id);
      writeJSON(ACH_KEY,list);
    }
  }
  window.RC={
    getUser:getUser,
    touchUser:touchUser,
    avatarColor:hashColor,
    unlockAchievement:unlockAchievement,
    createUser:function(name){
      name=(name||"Player").trim()||"Player";
      var u={name:name,created:Date.now(),lastSeen:Date.now()};
      writeJSON(USER_KEY,u);
      return u;
    }
  };
})();
