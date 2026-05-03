'use strict';
const React = require('react');
const motion = new Proxy({}, {
  get: (_, tag) => ({ children, ...props }) => React.createElement(tag, props, children),
});
module.exports = { motion, AnimatePresence: ({ children }) => children, useScroll: () => ({scrollYProgress:{on:()=>{},get:()=>0}}), useTransform: () => 0, useMotionValue: () => ({set:()=>{},get:()=>0}), useSpring: () => 0 };
