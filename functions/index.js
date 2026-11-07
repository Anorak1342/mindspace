const {onCall,HttpsError}=require("firebase-functions/v2/https");
const {initializeApp}=require("firebase-admin/app");
const {getAuth}=require("firebase-admin/auth");
const {getFirestore,FieldValue}=require("firebase-admin/firestore");
initializeApp();
const auth=getAuth(),db=getFirestore();
const ADMIN_EMAIL="leo337657@gmail.com";
function requireAdmin(request){if(!request.auth||request.auth.token.admin!==true||request.auth.token.email!==ADMIN_EMAIL)throw new HttpsError("permission-denied","Administrator access required.");}
exports.initializeMindspaceAdmin=onCall(async request=>{
 if(!request.auth)throw new HttpsError("unauthenticated","Sign in first.");
 if((request.auth.token.email||"").toLowerCase()!==ADMIN_EMAIL)throw new HttpsError("permission-denied","This account is not the configured administrator.");
 if(request.auth.token.email_verified!==true)throw new HttpsError("failed-precondition","Verify the administrator email address in Firebase Authentication first.");
 const user=await auth.getUser(request.auth.uid);
 await auth.setCustomUserClaims(user.uid,{...(user.customClaims||{}),admin:true});
 return {ok:true};
});
exports.adminListUsers=onCall(async request=>{
 requireAdmin(request);
 const result=await auth.listUsers(1000);
 const users=await Promise.all(result.users.map(async u=>{
  const status=await db.doc("users/"+u.uid).get();
  return {uid:u.uid,email:u.email||"",displayName:u.displayName||"",disabled:u.disabled,banned:status.exists&&status.data().banned===true,createdAt:u.metadata.creationTime,lastSignInAt:u.metadata.lastSignInTime||""};
 }));
 return {users};
});
async function removeFromAllRooms(uid){
 const rooms=await db.collection("rooms").get();
 const batchLimit=400;let batch=db.batch(),count=0;
 for(const room of rooms.docs){
  const member=room.ref.collection("members").doc(uid);
  const snap=await member.get();
  if(snap.exists){batch.delete(member);count++;if(count%batchLimit===0){await batch.commit();batch=db.batch();}}
 }
 const saved=await db.collection("users").doc(uid).collection("rooms").get();
 for(const item of saved.docs){batch.delete(item.ref);count++;if(count%batchLimit===0){await batch.commit();batch=db.batch();}}
 if(count%batchLimit!==0)await batch.commit();
}
exports.adminModerateUser=onCall(async request=>{
 requireAdmin(request);
 const {uid,action}=request.data||{};
 if(typeof uid!=="string"||!uid||!["kick","ban","unban"].includes(action))throw new HttpsError("invalid-argument","Invalid moderation request.");
 if(uid===request.auth.uid)throw new HttpsError("failed-precondition","You cannot moderate your own administrator account.");
 let target;try{target=await auth.getUser(uid);}catch(e){throw new HttpsError("not-found","That account could not be found.");}
 if((target.email||"").toLowerCase()===ADMIN_EMAIL)throw new HttpsError("failed-precondition","The administrator account is protected.");
 if(action==="kick"){
  await removeFromAllRooms(uid);
  await auth.revokeRefreshTokens(uid);
  return {ok:true,message:"Removed from all chat rooms. The user can sign in and rejoin later."};
 }
 if(action==="ban"){
  await db.doc("users/"+uid).set({banned:true,bannedAt:FieldValue.serverTimestamp(),bannedBy:request.auth.uid},{merge:true});
  await removeFromAllRooms(uid);
  await auth.updateUser(uid,{disabled:true});
  await auth.revokeRefreshTokens(uid);
  return {ok:true,message:"Account banned from Mindspace Chat."};
 }
 await db.doc("users/"+uid).set({banned:false,unbannedAt:FieldValue.serverTimestamp(),unbannedBy:request.auth.uid},{merge:true});
 await auth.updateUser(uid,{disabled:false});
 return {ok:true,message:"Account unbanned."};
});


// Replays a complete 2048 run on the server. The client cannot choose a score:
// every move, merge and newly spawned tile must form a legal game.
function replay2048Run(initialSpawns, moves) {
 if(!Array.isArray(initialSpawns)||initialSpawns.length!==2||!Array.isArray(moves)||moves.length<1||moves.length>12000) return null;
 const board=Array.from({length:4},()=>Array(4).fill(0));
 const validSpawn=(s)=>s&&Number.isInteger(s.x)&&Number.isInteger(s.y)&&s.x>=0&&s.x<4&&s.y>=0&&s.y<4&&(s.value===2||s.value===4);
 for(const spawn of initialSpawns){
  if(!validSpawn(spawn)||board[spawn.x][spawn.y]!==0)return null;
  board[spawn.x][spawn.y]=spawn.value;
 }
 let score=0;
 const vectors=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
 for(const move of moves){
  if(!move||!Number.isInteger(move.direction)||move.direction<0||move.direction>3||!validSpawn(move.spawn))return null;
  const vector=vectors[move.direction],xs=[0,1,2,3],ys=[0,1,2,3];
  if(vector.x===1)xs.reverse();
  if(vector.y===1)ys.reverse();
  const merged=Array.from({length:4},()=>Array(4).fill(false));
  let moved=false;
  for(const x of xs)for(const y of ys){
   const value=board[x][y];if(!value)continue;
   let fx=x,fy=y,nx=x+vector.x,ny=y+vector.y;
   while(nx>=0&&nx<4&&ny>=0&&ny<4&&board[nx][ny]===0){fx=nx;fy=ny;nx+=vector.x;ny+=vector.y;}
   if(nx>=0&&nx<4&&ny>=0&&ny<4&&board[nx][ny]===value&&!merged[nx][ny]){
    board[nx][ny]=value*2;board[x][y]=0;merged[nx][ny]=true;score+=value*2;moved=true;
   }else if(fx!==x||fy!==y){
    board[fx][fy]=value;board[x][y]=0;moved=true;
   }
  }
  if(!moved)return null;
  const spawn=move.spawn;
  if(board[spawn.x][spawn.y]!==0)return null;
  board[spawn.x][spawn.y]=spawn.value;
 }
 let available=false;
 for(let x=0;x<4;x++)for(let y=0;y<4;y++){
  if(board[x][y]===0)available=true;
  if(x<3&&board[x][y]===board[x+1][y])available=true;
  if(y<3&&board[x][y]===board[x][y+1])available=true;
 }
 if(available)return null;
 return score;
}

exports.submit2048Score=onCall({region:"us-central1"},async request=>{
 if(!request.auth)throw new HttpsError("unauthenticated","Sign in to submit a score.");
 const {score,initialSpawns,moves}=request.data||{};
 if(!Number.isSafeInteger(score)||score<0||score>100000000)throw new HttpsError("invalid-argument","Invalid score.");
 const verifiedScore=replay2048Run(initialSpawns,moves);
 if(verifiedScore===null||verifiedScore!==score)throw new HttpsError("failed-precondition","This 2048 run could not be verified.");
 const uid=request.auth.uid;
 const profileSnap=await db.doc("profiles/"+uid).get();
 const profile=profileSnap.exists?profileSnap.data():{};
 const scoreRef=db.doc("leaderboards/2048/scores/"+uid);
 let personalBest=false;
 await db.runTransaction(async tx=>{
  const old=await tx.get(scoreRef);
  if(!old.exists||verifiedScore>old.data().score){
   personalBest=true;
   tx.set(scoreRef,{
    uid,
    score:verifiedScore,
    displayName:String(profile.displayName||request.auth.token.name||"Mindspace member").slice(0,24),
    avatar:profile.avatar||"🙂",
    updatedAt:FieldValue.serverTimestamp()
   });
  }
 });
 return {ok:true,score:verifiedScore,personalBest};
});
