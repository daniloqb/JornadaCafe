import React from 'react';
import ReactDOM from 'react-dom/client';
import './theme/theme.css';
import { App } from './app/App';
import { BrewProvider } from './features/preparations/BrewContext';
import { CollectionProvider } from './data/CollectionContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><CollectionProvider><BrewProvider><App /></BrewProvider></CollectionProvider></React.StrictMode>,
);
