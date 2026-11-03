import test from 'node:test';
import assert from 'node:assert/strict';
import {asNumber,normalizePositions,compareSales,calculate30DayChange} from '../lib/engine.mjs';
test('null is not zero and bad values are rejected',()=>{assert.equal(asNumber(null),null);assert.equal(asNumber('foo'),null)});
test('normalize account positions and ignore cash equivalents',()=>{const data={results:[{instrument:{id:'a',symbol:'ABC',kind:'stock'},units:'10',price:'100',cost_basis:'70',currency:'USD'},{instrument:{kind:'etf'},units:'2',price:'10',cash_equivalent:true,currency:'USD'}],data_freshness:{as_of:'2026-11-01T00:00:00Z'}};const p=normalizePositions('account',data);assert.equal(p.length,1);assert.equal(p[0].value,1000);assert.equal(p[0].costBasis,70);});
test('correct proportional realized gain on partial sale',()=>{const p=[{id:'1',symbol:'A',currency:'USD',units:10,price:100,costBasis:70}];const r=compareSales(p,500,'USD');assert.equal(r[0].quantity,5);assert.equal(r[0].gain,150);assert.equal(r[0].fullyCovers,true);});
test('loss exclusion and no invented cost basis',()=>{const p=[{id:'1',symbol:'A',currency:'USD',units:3,price:100,costBasis:120},{id:'2',symbol:'B',currency:'USD',units:3,price:100,costBasis:null}];assert.equal(compareSales(p,200,'USD',true).length,1);assert.equal(compareSales(p,200,'USD',true)[0].gain,null);});
test('no FX mixing and no impossible promise',()=>{const p=[{id:'1',symbol:'A',currency:'CAD',units:1,price:100,costBasis:70}];assert.equal(compareSales(p,200,'USD').length,0);assert.equal(compareSales(p,200,'CAD')[0].fullyCovers,false);});
test('score ranks lower gain/loss impact and the loss filter excludes reported losses',()=>{
 const p=[
  {id:'partial',symbol:'PART',currency:'USD',units:2,price:100,costBasis:50},
  {id:'higher-gain',symbol:'HIGH',currency:'USD',units:10,price:100,costBasis:80},
  {id:'lower-gain',symbol:'LOW',currency:'USD',units:10,price:100,costBasis:95},
  {id:'unknown',symbol:'UNK',currency:'USD',units:10,price:100,costBasis:null},
  {id:'loss',symbol:'LOSS',currency:'USD',units:10,price:100,costBasis:120},
 ];
 const result=compareSales(p,500,'USD');
 assert.deepEqual(result.map(option=>option.symbol),['LOW','HIGH','LOSS']);
 assert.deepEqual(result.map(option=>option.rank),[1,2,3]);
 assert.equal(result.some(option=>option.symbol==='UNK'),false);
 assert.equal(compareSales(p,500,'USD',true).some(option=>option.symbol==='LOSS'),false);
});
test('30-day momentum and gain/loss impact both affect ranking',()=>{
 const p=[
  {id:'strong',symbol:'STRONG',currency:'USD',units:10,price:100,costBasis:90},
  {id:'weak',symbol:'WEAK',currency:'USD',units:10,price:100,costBasis:90},
 ];
 const result=compareSales(p,500,'USD',false,{STRONG:5,WEAK:-5});
 assert.deepEqual(result.map(option=>option.symbol),['WEAK','STRONG']);
 assert.equal(result[0].trend30dPct,-5);
 assert.equal(result[0].rankingFactors.profitLoss,90);
});
test('coverage is one part of the score, not an automatic winner',()=>{
 const p=[
  {id:'full',symbol:'FULL',currency:'USD',units:10,price:100,costBasis:80},
  {id:'partial',symbol:'PART',currency:'USD',units:2.5,price:100,costBasis:100},
 ];
 const result=compareSales(p,500,'USD',false,{FULL:20,PART:-40});
 assert.deepEqual(result.map(option=>option.symbol),['PART','FULL']);
 assert.equal(result[0].fullyCovers,false);
 assert.equal(result[1].fullyCovers,true);
});
test('unknown gain/loss and trend data are neutral in the comparison score',()=>{
 const p=[{id:'unknown',symbol:'UNK',currency:'USD',units:10,price:100,costBasis:null}];
 const [result]=compareSales(p,500,'USD');
 assert.equal(result.rankingFactors.profitLoss,null);
 assert.equal(result.rankingFactors.trend,null);
 assert.equal(result.comparisonScore,70);
});
test('30-day change uses the first and last valid prices in the selected window',()=>{
 const result=calculate30DayChange([
  {datetime:'2026-11-03',close:'110'},
  {datetime:'2026-10-10',close:'90'},
  {datetime:'2026-10-04',close:'50'},
  {datetime:'2026-10-20',close:'100'},
 ],'2026-10-05','2026-11-03');
 assert.deepEqual(result,{changePct:100*(110-90)/90,asOf:'2026-11-03'});
 assert.equal(calculate30DayChange([{datetime:'2026-11-03',close:'110'}],'2026-10-05','2026-11-03'),null);
});
