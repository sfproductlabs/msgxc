import React from 'reactn';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import GlobalContextProvider from "./utils/context"
import * as R from "ramda";

import 'core-js';

import 'element-theme-default';

import './styles/base.scss';
import './styles/prism.css';

import App from './page';

import Cookies from 'js-cookie'

let claims = R.path(['tags'],Cookies.getJSON(process.env.CLIENT_USER_COOKIE)) 
                  || R.path(['rights'],Cookies.getJSON(process.env.CLIENT_USER_COOKIE)) 
                  || R.path(['pub','roles'],Cookies.getJSON(process.env.CLIENT_AUTH_COOKIE))
                  || R.path(['pub','rights'],Cookies.getJSON(process.env.CLIENT_AUTH_COOKIE))
                  || R.path(['pub','tags'],Cookies.getJSON(process.env.CLIENT_AUTH_COOKIE))
                  || [];

if (claims.indexOf('admin') < 0 && claims.indexOf('msgxc_admin') < 0) {  
  window.location.replace(process.env.LOGIN_URL);
} else {
  render(<GlobalContextProvider><AppContainer><App /></AppContainer></GlobalContextProvider>, document.getElementById('app'));

  if (module.hot) {
    module.hot.accept('./page', () => {
      const App = require('./page').default;
  
      render(<GlobalContextProvider><AppContainer><App /></AppContainer></GlobalContextProvider>, document.getElementById('app'));
    });
  }  
}

