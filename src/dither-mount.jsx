import React from 'react';
import ReactDOM from 'react-dom/client';
import DitherTuner from './components/DitherTuner.jsx';

const container = document.getElementById('dither-bg');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(DitherTuner));
}
