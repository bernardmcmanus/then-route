import router from './index';

if (typeof define == 'function' && define.amd) {
  define([], function() { return router });
}
else {
  module.exports = router;
}
