import React from 'react';
import ReactDOM from 'react-dom/client';
import Dither from './components/Dither.jsx';

const container = document.getElementById('dither-bg');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    React.createElement(
      'div',
      { style: { width: '100%', height: '100%', position: 'relative' } },
      React.createElement(Dither, {
        waveColor: '#339989',
        backgroundColor: '#131515',
        ditherMode: 'bayer',
        colorNum: 4,
        pixelSize: 2,
        waveSpeed: 0.05,
        waveFrequency: 3,
        waveAmplitude: 0.3,
        mouseEffect: 'erase',
        mouseRadius: 0.3,
        palette: ['#131515', '#1a332e', '#339989', '#7de2d1', '#fffafb']
      })
    )
  );
}
