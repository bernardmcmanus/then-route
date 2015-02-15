import Router from './index';

if (typeof define == 'function' && define.amd) {
  define([], function() { return Router });
}
else {
  module.exports = Router;
}
