import * as THREE from 'three';
import { randomGenerator } from './random.js';

function canvasTexture(draw, size = 256) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

export function makeMaterials() {
  const r = randomGenerator(1900);
  const woodTexture = canvasTexture((c, s) => {
    c.fillStyle = '#b59a73'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 370; i++) {
      const x = r() * s;
      c.strokeStyle = `rgba(${r() > 0.5 ? '57,36,21' : '236,214,163'},${0.05 + r() * 0.13})`;
      c.lineWidth = 0.2 + r() * 1.4; c.beginPath(); c.moveTo(x, 0);
      c.bezierCurveTo(x + 5 * r(), s * 0.3, x - 8 * r(), s * 0.7, x, s); c.stroke();
    }
  });
  const gravelTexture = canvasTexture((c, s) => {
    c.fillStyle = '#c2bca6'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 14500; i++) {
      const v = 135 + r() * 100;
      c.fillStyle = `rgba(${v},${v * 0.98},${v * 0.89},0.55)`;
      c.fillRect(r() * s, r() * s, r() * 1.8 + 0.4, r() * 1.5 + 0.4);
    }
  });
  gravelTexture.repeat.set(3, 3);
  const groundTexture = canvasTexture((c,s) => {
    c.fillStyle = '#6a7950'; c.fillRect(0,0,s,s);
    for (let i=0;i<5500;i++) {
      c.fillStyle = ['#4c6045','#8a8a57','#667448','#a09a6b'][i%4];
      c.globalAlpha = 0.15 + r()*0.3;
      c.beginPath(); c.ellipse(r()*s,r()*s,r()*5+0.2,r()*4+0.2,0,0,Math.PI*2); c.fill();
    }
  }); groundTexture.repeat.set(10,10);
  const roofTexture = canvasTexture((c,s) => {
    c.fillStyle='#718b7e'; c.fillRect(0,0,s,s);
    for(let i=0;i<6000;i++) {
      c.fillStyle = r()>0.5 ? 'rgba(187,190,143,0.07)' : 'rgba(16,48,42,0.09)';
      c.fillRect(r()*s,r()*s,r()*15+1,r()*4+1);
    }
  });
  const gradient = new THREE.DataTexture(new Uint8Array([100, 152, 193, 225, 255]), 5, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  const standard = (name, color, options = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, ...options }); m.name = name; return m;
  };
  const m = {
    wood: standard('hinoki', '#92704d', { map: woodTexture }),
    lightWood: standard('sun-worn hinoki', '#c6ad83', { map: woodTexture }),
    darkWood: standard('aged beams', '#514437', { map: woodTexture }),
    edgeWood: standard('endgrain', '#bba477'),
    roof: standard('aged copper', '#627c6d', { map: roofTexture, metalness: 0.13, roughness: 0.72, side: THREE.DoubleSide }),
    roofEdge: standard('copper seams', '#344e43', { metalness: 0.12 }),
    gold: standard('quiet brass', '#b89c52', { metalness: 0.45, roughness: 0.5 }),
    plaster: standard('warm lime plaster', '#e4ddc6'),
    stone: standard('granite', '#a1a296'),
    paleStone: standard('step edges', '#c2bfae'),
    darkStone: standard('basalt', '#727a6e'),
    gravel: standard('washed gravel', '#eee8d7', { map: gravelTexture }),
    earth: standard('forest floor', '#a5ad7d', { map: groundTexture }),
    soil: standard('cut earth', '#70614c'),
    base: standard('display plinth', '#4c5b52'),
    bark: standard('bark', '#6b6044', { map: woodTexture }),
    moss: standard('moss', '#7f8e4a'),
    curtain: standard('sacred curtains', '#c3c191', { side: THREE.DoubleSide }),
    white: standard('linen', '#eee9d8'),
    rope: standard('rice straw', '#c8b88b'),
    black: standard('lantern frame', '#3b4136'),
    water: standard('still water', '#629b98', { metalness: 0.38, roughness: 0.25, transparent: true, opacity: 0.83 }),
  };
  m.foliage = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: gradient }); m.foliage.name='foliage';
  m.understory = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  return m;
}

export function sakeLabel(index) {
  const titles = ['奉納','清酒','山川','瑞穂','神宮','松風','千代','白雲','金鶴','朝日','福寿','清泉'];
  const inks = ['#252c2a','#354e64','#772e27','#3f5131'];
  const map = canvasTexture((c,s) => {
    c.fillStyle = '#e9e0c8'; c.fillRect(0,0,s,s);
    c.strokeStyle = '#c0b69a'; c.lineWidth=2;
    for(let y=2;y<s;y+=7) { c.beginPath(); c.moveTo(0,y); c.lineTo(s,y); c.stroke(); }
    c.fillStyle='#f4efdd'; c.fillRect(18,30,s-36,s-60);
    c.strokeStyle = inks[index%4]; c.lineWidth=5; c.strokeRect(28,39,s-56,s-78);
    c.fillStyle=inks[index%4]; c.font='bold 76px "Yu Mincho", "Noto Serif CJK JP", serif'; c.textAlign='center';
    const title=titles[index%titles.length]; c.fillText(title[0],s/2,114); c.fillText(title[1],s/2,192);
    c.fillStyle='#a64a36'; c.fillRect(174,166,28,29); c.fillStyle='#f5ead3'; c.font='18px serif'; c.fillText('印',188,187);
  });
  const mat = new THREE.MeshStandardMaterial({map, roughness:0.97}); mat.name=`original-sake-label-${index}`; return mat;
}
