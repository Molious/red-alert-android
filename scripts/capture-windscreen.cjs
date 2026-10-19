// Deterministic visual check: simulated GPS, road tiles and route; no real journeys or network calls.
const {chromium}=require('playwright-core');
const fs=require('fs');const path=require('path');const esbuild=require('esbuild');
const geojsonvt=require('geojson-vt').default;const vtpbf=require('vt-pbf');
const root=path.resolve(__dirname,'..');
const assert=require('node:assert/strict');
function ts(file){const result=esbuild.transformSync(fs.readFileSync(root+'/'+file,'utf8'),{loader:'ts',format:'cjs'}).code;const m={exports:{}};new Function('module','exports',result)(m,m.exports);return m.exports;}
const {navLayoutScript}=ts('src/navLayoutPatch.ts'),{BRIDGE_ART,NAV_PLATE_ART,CAPTAIN_ART}=ts('src/navArt.ts');
let html=JSON.parse(fs.readFileSync(root+'/src/hybridHtml.ts','utf8').replace(/^export default /,'').trim().replace(/;$/,''));
html=html.replace(/new ([\w$]+)\.Map\(\{container:/,'window.__fixtureMap=new $1.Map({container:');
const points=[[-26.8,153.1],[-26.7995,153.101],[-26.799,153.102],[-26.798,153.102],[-26.797,153.102],[-26.796,153.103]];
const route={code:'Ok',routes:[{geometry:{type:'LineString',coordinates:points.map(([a,b])=>[b,a])},distance:1400,duration:220,legs:[{steps:[{maneuver:{type:'depart',location:[153.1,-26.8]},name:'Starlight Drive',distance:240},{maneuver:{type:'turn',modifier:'left',location:[153.102,-26.799]},name:'Nebula Avenue',distance:1160},{maneuver:{type:'arrive',location:[153.103,-26.796]},distance:0}]}]}]};
const features=[];for(let i=-18;i<=18;i++){for(const vertical of [true,false]){let c=[];for(let j=-18;j<=18;j++){const x=vertical?i:j,y=vertical?j:i;c.push([153.1+x*.001,-26.8+y*.001]);}features.push({type:'Feature',properties:{class:i%4===0?'primary':'minor',name:vertical?['Orion Way','Nebula Avenue','Starlight Drive'][Math.abs(i)%3]:['Aurora Street','Celestial Road','Horizon Lane'][Math.abs(i)%3]},geometry:{type:'LineString',coordinates:c}});}}
const index=new geojsonvt({type:'FeatureCollection',features},{maxZoom:19,indexMaxZoom:6,indexMaxPoints:100000});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:412,height:780},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error'||msg.type()==='warning')console.log('CONSOLE',msg.text().slice(0,250));});
 await page.addInitScript(({route})=>{window.__fixtureFix=null;window.__clock=Date.now();Date.now=()=>window.__clock;const realFetch=window.fetch.bind(window);window.fetch=async(url,...args)=>(typeof url==='string'?url:url.url).includes('tiles.openfreemap.org')?realFetch(url,...args):({ok:true,json:async()=>route});window.RedAlertNative={prepareSession(cb){cb({speechReady:true,locationGranted:true,microphoneGranted:true});return 1;},cancelPreparation(){},speakRequest(t,done){setTimeout(()=>done('played'),0);return 1;},cancelSpeech(){},watchPosition(cb){window.__fixtureFix=cb;return 1;},clearWatch(){},searchAddress(t,cb){cb([{label:'Nebula Avenue · simulated route',lat:-26.796,lng:153.103}],null);return 1;},cancelSearch(){},listenOnce(){return 1;},cancelListen(){}};},{route});
 await page.route('https://tiles.openfreemap.org/**',async r=>{
  const url=new URL(r.request().url());
  if(url.pathname==='/planet'){await r.fulfill({json:{tilejson:'3.0.0',tiles:['https://tiles.openfreemap.org/fixture/{z}/{x}/{y}.pbf'],minzoom:0,maxzoom:19,vector_layers:[{id:'transportation',fields:{}},{id:'transportation_name',fields:{}},{id:'place',fields:{}}]}});return;}
  if(url.pathname.includes('/fonts/')){const b=fs.readFileSync(root+'/tests/fixtures/windscreen/noto-0-255.pbf');await r.fulfill({body:b,contentType:'application/x-protobuf'});return;}
  const m=url.pathname.match(/fixture\/(\d+)\/(\d+)\/(\d+)\.pbf/);if(m){const tile=index.getTile(+m[1],+m[2],+m[3])||{features:[]};await r.fulfill({body:Buffer.from(vtpbf.fromGeojsonVt({transportation:tile,transportation_name:tile,place:{features:[]}},{version:2})),contentType:'application/x-protobuf'});return;}
  await r.abort();
 });
 await page.route('https://tile.openstreetmap.org/**',r=>r.fulfill({body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64'),contentType:'image/png'}));
 await page.route('https://windscreen.test/',r=>r.fulfill({body:html.replace('</head>',()=>'<script>window.__moleArt='+JSON.stringify({bridge:BRIDGE_ART,plate:NAV_PLATE_ART,captains:CAPTAIN_ART})+'</script><script>'+navLayoutScript+'</script></head>'),contentType:'text/html'}));
 await page.goto('https://windscreen.test/');await page.locator('#create-player').click();await page.locator('#player-name').fill('Captain Nova');await page.locator('#player-species').selectOption('light-being');await page.locator('#board-ship').click();await page.waitForTimeout(500);
 await page.evaluate(()=>{for(let i=0;i<5;i++){window.__clock+=1600;window.__fixtureFix?.({lat:-26.8,lng:153.1,speed:0,accuracy:5,heading:60,ts:Date.now()});}});
 await page.locator('.road-search input').fill('Nebula Avenue');await page.locator('.road-search').evaluate(e=>e.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await page.locator('.road-results button').first().click();await page.locator('[data-action=confirm]').click();await page.locator('[data-action=launch]').click();
 await page.waitForTimeout(300);if(await page.locator('.launch-scene button').count())await page.locator('.launch-scene button').click();
 await page.evaluate(()=>{window.__clock+=1600;window.__fixtureFix?.({lat:-26.8,lng:153.1,speed:12,accuracy:5,heading:60,ts:Date.now()});});
 await page.waitForSelector('.live-navigation[data-vector-ready=true]');
 await page.waitForFunction(()=>window.__fixtureMap.areTilesLoaded()&&window.__fixtureMap.queryRenderedFeatures({layers:['street-names']}).length>0);
 const out=root+'/previews/windscreen-map';fs.mkdirSync(out,{recursive:true});
 assert.equal(await page.evaluate(()=>window.__fixtureMap.getBearing()),60);
 assert.equal(await page.evaluate(()=>window.__fixtureMap.getPitch()),57);
 await page.screenshot({path:out+'/heading-up.png'});
 await page.locator('.mole-orient').click();await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>window.__fixtureMap.getBearing()),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('mole-beyond:map-orient')),'north');
 await page.screenshot({path:out+'/north-up.png'});
 // Check the taller S23 Ultra portrait layout and the tray's controls as well.
 await page.setViewportSize({width:412,height:915});await page.waitForTimeout(250);
 await page.screenshot({path:out+'/s23-north-up.png'});
 for(const selector of ['.mole-orient','.mole-map-credit','[data-action=recenter]','.tray-toggle','button[aria-label="Zoom in"]']){
  assert.ok(await page.locator(selector).isVisible(),selector);
  const box=await page.locator(selector).boundingBox();assert.ok(box.y>=0&&box.y+box.height<=915,selector+' fits vertically');
 }
 await page.locator('.tray-toggle').click();assert.equal(await page.locator('.tray-toggle').getAttribute('aria-expanded'),'true');
 await page.locator('.tray-toggle').click();
 // Gestures stop following; orientation still rotates in place, and Recenter resumes following.
 await page.evaluate(()=>window.__fixtureMap.fire('dragstart'));
 await page.locator('.mole-orient').click();assert.equal(await page.evaluate(()=>window.__fixtureMap.getBearing()),60);
 await page.locator('[data-action=recenter]').click();
 await page.locator('button[aria-label="Zoom in"]').click();await page.waitForFunction(()=>window.__fixtureMap.getZoom()>16.2);
 await page.locator('button[aria-label="Zoom out"]').click();
 assert.deepEqual(errors,[]);console.log('PASS: WebGL style and labels rendered; heading 60°, north 0°, controls and attribution visible; 412×780 and 412×915 screenshots saved.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
