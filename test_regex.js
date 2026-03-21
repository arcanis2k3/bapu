const BRANDS=['Bapu'];
const bRS='\\b(?:'+BRANDS.join('|')+')\\b';
const pRS='\\{\\{t\\(\'.*?\'\\)\\}\\}';
const re=new RegExp('('+pRS+'|'+bRS+')', 'gi');
console.log('What is Bapu?'.split(re));
