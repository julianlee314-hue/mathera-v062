const A=require('./acorn.js'),assert=require('assert');let x=3;const R=()=>(x=(x*16807)%2147483647)/2147483647, ri=n=>Math.floor(R()*n);
for(let t=0;t<500;t++){const day=200+ri(400),a={day,skills:{}};const S='abcd';
 for(let n=1;n<=900;n++){if(R()<0.5)continue;const k=A.KINDS[ri(6)],r={kind:k};
  if(k==='growing'){r.cur=S[ri(4)];r.ck=ri(3);} if(k==='planted'){r.top=S[ri(3)];r.sg=ri(7);r.due=day-30+ri(300);r.cur=S[ri(4)];r.ck=ri(3);}
  if(k==='proven'){r.top='d';r.sg=ri(7);r.due=day-30+ri(300);if(R()<.3)r.bv={e:true,f:R()<.5};}
  if(k==='withered'){r.wstep=S[ri(4)];r.wday=day-ri(100);r.cur=S[ri(4)];r.ck=ri(3);} a.skills[n]=r;}
 if(t%2){a.settings={pace:'gentle',dial:1+ri(10),brave:R()<.5,hero:'sol',nemesis:'rumpel',coins:'US',units:'imperial',clock:'12h',stories:'off',drill:'on',specials:'off',palette:'ember'};a.era='V';a.eras={IV:{placed:true,start:3}};}
 const b=A.decode(A.encode(a)); assert.deepStrictEqual(JSON.parse(JSON.stringify(b.skills)),JSON.parse(JSON.stringify(a.skills))); if(a.settings){assert.deepStrictEqual(b.settings,a.settings);assert.deepStrictEqual(b.eras.IV,{placed:true,start:3});}}
console.log('fuzz ok');
