const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../dist/model.js');

test('all 24 terms explain meaning, natural observations and life context',()=>{
  assert.equal(typeof model.getTermInfo,'function');
  for(let i=0;i<24;i++){
    const info=model.getTermInfo(i);
    assert.ok(info.meaning.length>15);
    assert.ok(info.nature.length>15);
    assert.ok(info.life.length>15);
  }
});

test('solar geometry correctly distinguishes equinoxes and solstices at 35 degrees north',()=>{
  assert.equal(typeof model.getSolarState,'function');
  assert.ok(Math.abs(model.getSolarState(3).declination)<.001);
  assert.ok(Math.abs(model.getSolarState(3).daylight-12)<.001);
  assert.equal(model.getSolarState(9).longitude,90);
  assert.ok(Math.abs(model.getSolarState(9).declination-23.44)<.001);
  assert.ok(model.getSolarState(9).noonAltitude>model.getSolarState(21).noonAltitude);
  assert.ok(model.getSolarState(9).shadowRatio<model.getSolarState(21).shadowRatio);
  assert.ok(model.getSolarState(9).daylight>14);
  assert.ok(model.getSolarState(21).daylight<10);
  assert.equal(model.getSolarState(0).earthLongitude,135);
});

test('weather follows chosen demonstration mode, and can be switched off',()=>{
  assert.equal(typeof model.getWeatherProfile,'function');
  assert.ok(model.getWeatherProfile(1).rain>0);
  assert.ok(model.getWeatherProfile(20).snow>0);
  assert.equal(model.getWeatherProfile(20,'clear').snow,0);
  assert.equal(model.getWeatherProfile(1,'snow').rain,0);
  assert.ok(model.getWeatherProfile(1,'snow').snow>0);
  assert.ok(model.getWeatherProfile(20,'rain').rain>0);
  assert.equal(model.getWeatherProfile(20,'rain').snow,0);
});
