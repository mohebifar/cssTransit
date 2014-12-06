Transit.js
==========

Control CSS Transition via transit.js

example:

``var trans = transit('div', {transform: ['translatey(10px)', '1s'], left: ['30px']}).createFrame({
    transform: ['translatey(200px)', '1s'], left: '40px 1s'
});
trans.loop().setSpeed(4);``


