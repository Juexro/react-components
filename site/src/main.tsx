import React from 'react';
import ReactDOM from 'react-dom';
import './index.less';
import CustomRouter from './routes';
ReactDOM.render(
  <React.StrictMode>
    <CustomRouter></CustomRouter>
  </React.StrictMode>,
  document.getElementById('app')
);
