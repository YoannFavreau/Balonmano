module.exports = {
  content: ['../src/*.js','../src/index.html'],
  safelist: ['bg-good/15','text-good','bg-warn/15','text-warn','bg-bad/15','text-bad','bg-txt-3/15','text-txt-3','!text-good','!text-bad'],
  theme: { extend: {
    fontFamily: { display:['"Barlow Condensed"','sans-serif'], sans:['Inter','system-ui','sans-serif'], mono:['"JetBrains Mono"','monospace'] },
    colors: { ink:{0:'#121417',1:'#1b1e23',2:'#23272d',3:'#2f343b'}, txt:{1:'#eef0f2',2:'#b9bfc7',3:'#858c96'}, blue:'#3d8bfd', good:'#34c77b', warn:'#f2b84b', bad:'#ef5a5a' }
  } }
};
