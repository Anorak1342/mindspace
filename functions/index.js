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
