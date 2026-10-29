(function motionMathModule(global) {
  function facingScale(direction, airborne) {
    return airborne ? -direction : direction;
  }

  function characterScale(direction, state) {
    if (state === 'sit') return 1;
    return facingScale(direction, state === 'jump');
  }

  global.MotionMath = Object.freeze({ facingScale, characterScale });
})(window);
