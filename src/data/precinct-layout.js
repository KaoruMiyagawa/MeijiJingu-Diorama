// Model coordinates are NOT surveyed coordinates. North = -Z, east = +X.
// Official maps establish topology; every numeric placement is an artistic approximation.
export const SOURCES = Object.freeze({
  precinct: 'https://www.meijijingu.or.jp/en/map/',
  access: 'https://www.meijijingu.or.jp/en/access/images/access_map02.jpg',
  garden: 'https://www.meijijingu.or.jp/en/whattosee/garden/',
});
export const PRECINCT = Object.freeze({
  size: 280,
  north: [0,0,-1], east: [1,0,0],
  coreOrigin: [-18,0.9,-8],
  boundary: [[-60,-122],[-25,-132],[15,-125],[45,-111],[63,-94],[80,-57],[91,-13],[91,33],[80,72],[66,110],[57,130],[37,130],[14,113],[-20,102],[-43,81],[-66,47],[-81,6],[-91,-43],[-88,-72],[-78,-103]],
  source: [SOURCES.access,SOURCES.precinct],
  confidence: { topology: 'official-map-confirmed', coordinates: 'artistic-approximation', elevation: 'artistic-approximation' },
  notes: 'Inner precinct only. Boundary is a schematic interpretation, not a georeferenced property survey. Yoyogi Park and the Outer Garden are excluded.',
});

const mark=(id,name,x,z,region,extra={})=>({
  id,name,position:[x,0,z],region,source:[SOURCES.precinct],
  confidence:{identity:'official-map-confirmed',relativePosition:'schematic-map-confirmed',worldCoordinates:'artistic-approximation'},
  ...extra,
});
export const LANDMARKS = [
  mark('harajuku-entry','原宿口 · 南入口',55,124,'south',{source:[SOURCES.access,SOURCES.precinct],kind:'entrance'}),
  mark('yoyogi-entry','代々木口 · 北入口',55,-95,'north',{source:[SOURCES.access,SOURCES.precinct],kind:'entrance'}),
  mark('sangubashi-entry','参宮橋口 · 西北入口',-84,-65,'west',{source:[SOURCES.access,SOURCES.precinct],kind:'entrance'}),
  mark('main-sanctuary','御社殿',-18,-26.4,'sanctuary',{kind:'preserved',localAnchor:[0,0,-18.4]}),
  mark('south-shinmon','南神門',-18,-4.8,'sanctuary',{kind:'preserved',localAnchor:[0,0,3.2]}),
  mark('west-interface','西側参拝入口',-38,-16,'sanctuary',{kind:'interface',notes:'Derived park model includes an open passage and steps in the retained west corridor; doorway dimensions are an artistic approximation. V1 source is unchanged.'}),
  mark('ootorii','大鳥居',25,8,'central',{kind:'torii',rotation:Math.PI/2}),
  mark('inner-torii','第三鳥居',-18,3.5,'central',{kind:'torii',scale:0.66}),
  mark('sake-barrels','奉納酒樽',51,46,'south',{kind:'facility',size:[3,3,14]}),
  mark('wine-barrels','奉納葡萄酒樽',39,46,'south',{kind:'facility',size:[3,2.4,14]}),
  mark('museum','明治神宮ミュージアム',66,86,'south',{kind:'building',size:[18,4,10]}),
  mark('forest-terrace','FOREST TERRACE',67,16,'east',{kind:'building',size:[18,4,11]}),
  mark('garden-entry','御苑入口',28,35,'garden',{kind:'garden',source:[SOURCES.precinct,SOURCES.garden]}),
  mark('south-pond','南池',-1,89,'garden',{kind:'water',source:[SOURCES.precinct,SOURCES.garden]}),
  mark('iris-field','菖蒲田',-21,51,'garden',{kind:'garden',source:[SOURCES.precinct,SOURCES.garden]}),
  mark('kiyomasa-well','清正井',-31,32,'garden',{kind:'garden',source:[SOURCES.precinct,SOURCES.garden]}),
  mark('kakuuntei','隔雲亭',-9,67,'garden',{kind:'building',size:[10,3.5,6],source:[SOURCES.precinct,SOURCES.garden]}),
  mark('treasure-museum','宝物殿',-30,-109,'north',{kind:'building',size:[30,6,12]}),
  mark('north-pond','北池',-12,-87,'north',{kind:'water'}),
  mark('north-lawn','北池前の芝地',-29,-73,'north',{kind:'garden'}),
  mark('shiseikan','至誠館',-59,-105,'north',{kind:'building',size:[15,4,11]}),
];
export const landmark = id => LANDMARKS.find(item=>item.id===id);

const region=(id,name,kind,polygon,height=0)=>({id,name,kind,polygon,proxyHeight:height,source:[SOURCES.precinct,SOURCES.access],confidence:'artistic-boundary-approximation'});
export const REGIONS = [
  region('sanctuary','御社殿区域','sanctuary',[[-40,-44],[17,-44],[17,-3],[-40,-3]]),
  region('garden','御苑','garden',[[-35,21],[-8,20],[19,25],[30,40],[26,65],[22,89],[4,103],[-22,94],[-38,73],[-44,49]]),
  region('north-lawn','北部芝地','lawn',[[-65,-97],[-42,-97],[-24,-91],[7,-97],[28,-84],[25,-69],[-8,-60],[-46,-65],[-64,-77]]),
  region('forest-nw','西北の杜','forest',[[-74,-107],[-68,-100],[-69,-80],[-65,-74],[-68,-68],[-75,-62],[-81,-68],[-81,-88]],5.3),
  region('forest-north','北の杜','forest',[[-16,-122],[10,-119],[31,-108],[44,-101],[29,-94],[7,-98],[-10,-102]],4.8),
  region('forest-middle','中央北の杜','forest',[[-43,-57],[-11,-52],[16,-63],[37,-67],[35,-49],[29,-37],[11,-45],[-38,-45]],5.4),
  region('forest-west','西の杜','forest',[[-77,-44],[-73,-42],[-68,-22],[-48,-8],[-44,9],[-37,16],[-48,41],[-58,45],[-73,15],[-82,-13]],6.2),
  region('forest-east','東の杜','forest',[[62,-76],[73,-53],[84,-16],[84,5],[54,5],[51,-14],[51,-45]],5.4),
  region('forest-garden-edge','御苑東の杜','forest',[[29,44],[35,44],[35,62],[29,83],[22,97],[24,76],[28,57]],3.8),
  region('forest-se','南東の杜','forest',[[57,39],[74,37],[79,60],[72,74],[56,75]],4.5),
  region('forest-south-tip','南口の杜','forest',[[60,97],[69,94],[63,116],[59,120],[59,110]],3.6),
  region('forest-sw','南西の杜','forest',[[-55,52],[-45,57],[-35,81],[-21,99],[13,107],[39,119],[38,124],[13,112],[-19,102],[-40,84]],4.5),
  region('forest-south','南参道西の杜','forest',[[28,99],[37,80],[42,80],[49,102],[49,120],[41,115]],4.2),
];

// Nodes represent confirmed route topology, not a newly invented comprehensive trail network.
export const PATH_NODES = {
  south:[55,124],southBend:[53,101],barrels:[45,46],southJunction:[42,16],junction:[34,8],
  shrineFront:[-18,7],southGate:[-18,-4.8],north:[55,-95],northBend:[49,-70],northMid:[43,-39],
  west:[-84,-65],westBend:[-70,-52],westMid:[-61,-29],westGate:[-38,-16],
  lawnEast:[36,-82],lawnWest:[-56,-68],treasure:[-30,-101],
  gardenEntry:[28,35],iris:[-21,51],well:[-31,32],pondView:[10,77],
};
const route=(id,from,to,via=[],width=4.8,type='approach',source=SOURCES.precinct)=>({
  id,from,to,via,width,type,source:[source],confidence:{connection:'official-map-derived',curve:'artistic-approximation'},
});
export const PATH_EDGES = [
  route('south-entry','south','southBend'),
  route('south-main','southBend','barrels',[[51,82],[47,64]]),
  route('south-to-junction','barrels','southJunction',[[43,31]]),
  route('north-south-join','southJunction','junction'),
  route('inner-approach','junction','shrineFront',[[18,8],[-4,8]],5.4),
  route('shrine-entry','shrineFront','southGate',[],5.4),
  route('north-entry','north','northBend'),
  route('north-main','northBend','northMid',[[46,-54]]),
  route('north-to-junction','northMid','junction',[[42,-15],[39,0]]),
  route('west-entry','west','westBend'),
  route('west-main','westBend','westMid',[[-67,-40]]),
  route('west-to-shrine','westMid','westGate',[[-54,-21]]),
  route('north-lawn-link','northBend','lawnEast',[],2.5),
  route('lawn-front-link','lawnEast','lawnWest',[[14,-67],[-19,-64]],2.5),
  route('west-lawn-link','lawnWest','westBend',[[-63,-62]],2.5),
  route('treasure-link','lawnWest','treasure',[[-58,-86],[-50,-99],[-38,-101]],2.5),
  route('garden-entrance','southJunction','gardenEntry',[[34,25]],2.1,'garden'),
  route('garden-iris','gardenEntry','iris',[[12,37],[-3,45]],1.6,'garden'),
  route('garden-well','iris','well',[[-27,43]],1.5,'garden'),
  route('garden-south-pond','gardenEntry','pondView',[[22,52],[18,66]],1.6,'garden'),
];

export const PONDS = [
  {id:'south-pond',polygon:[[-20,87],[-15,81],[-7,83],[0,82],[10,86],[15,92],[5,97],[-6,96],[-12,92]],level:0.32},
  {id:'north-pond',polygon:[[-46,-89],[-36,-92],[-26,-88],[-18,-87],[-7,-94],[3,-93],[6,-88],[-7,-82],[-24,-83],[-38,-85]],level:0.8},
];
export const WHOLE_VIEWS = {
  1:{position:[175,245,280],target:[0,1,0],span:335},
  2:{position:[0,400,0.1],target:[0,0,0],span:301},
  3:{position:[102,105,205],target:[43,2,84],span:118},
  4:{position:[135,110,-165],target:[42,2,-79],span:115},
  5:{position:[-163,110,-128],target:[-59,2,-61],span:112},
  6:{position:[0,40,42],target:[-18,5,-24],span:67},
};
