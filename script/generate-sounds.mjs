import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../client/public/sounds");
const SR = 22050;

function makeWav(notes, vol = 0.5) {
  const totalDur = Math.max(...notes.map(n => n.delay + n.dur)) + 0.05;
  const num = Math.ceil(SR * totalDur);
  const pcm = new Float32Array(num);

  for (const { freq, dur, delay, type = "sine" } of notes) {
    const s0 = Math.floor(delay * SR);
    const ds = Math.floor(dur * SR);
    for (let i = 0; i < ds; i++) {
      const t = i / SR;
      const env = Math.pow(1 - i / ds, 0.5);
      let v = 0;
      if (type === "sine")     v = Math.sin(2 * Math.PI * freq * t);
      else if (type === "triangle") v = (2/Math.PI)*Math.asin(Math.sin(2*Math.PI*freq*t));
      else if (type === "sawtooth") v = 2*((freq*t)%1)-1;
      else if (type === "square")   v = Math.sin(2*Math.PI*freq*t)>=0?1:-1;
      const idx = s0 + i;
      if (idx < num) pcm[idx] = Math.max(-1, Math.min(1, pcm[idx] + v * vol * env));
    }
  }

  const bytes = num * 2;
  const buf = Buffer.alloc(44 + bytes);
  buf.write("RIFF",0); buf.writeUInt32LE(36+bytes,4);
  buf.write("WAVE",8); buf.write("fmt ",12);
  buf.writeUInt32LE(16,16); buf.writeUInt16LE(1,20);
  buf.writeUInt16LE(1,22); buf.writeUInt32LE(SR,24);
  buf.writeUInt32LE(SR*2,28); buf.writeUInt16LE(2,32);
  buf.writeUInt16LE(16,34); buf.write("data",36);
  buf.writeUInt32LE(bytes,40);
  for (let i=0;i<num;i++) buf.writeInt16LE(Math.round(pcm[i]*32767),44+i*2);
  return buf;
}

const sounds = [
  { name:"correct-1", vol:0.5, notes:[
    {freq:523,dur:0.18,delay:0},{freq:659,dur:0.18,delay:0.16},
    {freq:784,dur:0.18,delay:0.32},{freq:1047,dur:0.35,delay:0.48}]},
  { name:"correct-2", vol:0.5, notes:[
    {freq:880,dur:0.12,delay:0},{freq:1108,dur:0.12,delay:0.11},
    {freq:1318,dur:0.32,delay:0.22}]},
  { name:"correct-3", vol:0.5, notes:[
    {freq:392,dur:0.1,delay:0},{freq:523,dur:0.1,delay:0.09},
    {freq:659,dur:0.1,delay:0.18},{freq:784,dur:0.1,delay:0.27},
    {freq:1047,dur:0.3,delay:0.36}]},
  { name:"correct-4", vol:0.5, notes:[
    {freq:659,dur:0.22,delay:0,type:"triangle"},{freq:784,dur:0.22,delay:0.2,type:"triangle"},
    {freq:1047,dur:0.4,delay:0.4,type:"triangle"}]},
  { name:"correct-5", vol:0.5, notes:[
    {freq:523,dur:0.07,delay:0},{freq:587,dur:0.07,delay:0.07},
    {freq:659,dur:0.07,delay:0.14},{freq:698,dur:0.07,delay:0.21},
    {freq:784,dur:0.07,delay:0.28},{freq:880,dur:0.07,delay:0.35},
    {freq:988,dur:0.07,delay:0.42},{freq:1047,dur:0.3,delay:0.49}]},
  { name:"wrong-1", vol:0.4, notes:[
    {freq:330,dur:0.18,delay:0,type:"sawtooth"},{freq:220,dur:0.33,delay:0.17,type:"sawtooth"}]},
  { name:"wrong-2", vol:0.35, notes:[
    {freq:280,dur:0.12,delay:0,type:"square"},{freq:250,dur:0.12,delay:0.13,type:"square"},
    {freq:210,dur:0.28,delay:0.26,type:"square"}]},
  { name:"wrong-3", vol:0.4, notes:[{freq:196,dur:0.45,delay:0,type:"sawtooth"}]},
  { name:"wrong-4", vol:0.35, notes:[
    {freq:350,dur:0.09,delay:0,type:"square"},{freq:300,dur:0.09,delay:0.1,type:"square"},
    {freq:250,dur:0.09,delay:0.2,type:"square"},{freq:180,dur:0.28,delay:0.3,type:"square"}]},
  { name:"wrong-5", vol:0.4, notes:[
    {freq:440,dur:0.06,delay:0,type:"sawtooth"},{freq:220,dur:0.38,delay:0.06,type:"sawtooth"}]},
  { name:"streak", vol:0.55, notes:[
    {freq:523,dur:0.1,delay:0},{freq:659,dur:0.1,delay:0.09},
    {freq:784,dur:0.1,delay:0.18},{freq:1047,dur:0.1,delay:0.27},
    {freq:1318,dur:0.15,delay:0.36},{freq:1047,dur:0.08,delay:0.5},
    {freq:1318,dur:0.08,delay:0.57},{freq:1568,dur:0.4,delay:0.64}]},
];

for (const { name, notes, vol } of sounds) {
  const path = join(OUT, `${name}.wav`);
  writeFileSync(path, makeWav(notes, vol));
  const size = Math.round(makeWav(notes, vol).length / 1024);
  console.log(`✓ ${name}.wav  (${size} KB)`);
}
console.log(`\nتم إنشاء ${sounds.length} ملف صوتي في /public/sounds/`);
