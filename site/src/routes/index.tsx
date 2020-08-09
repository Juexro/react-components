import React from 'react';
import { Router, Switch, RouteProps, Route, RouteComponentProps } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import Home from '../views/home';
import components from './components';
import Components from '../views/components';
import App from '../App';

export interface RouteMetaData {
  [name: string]: any;
}

export interface CustomRouteProps extends RouteProps {
  meta?: RouteMetaData;
  component?: React.ComponentType<{ meta?: RouteMetaData; } & RouteComponentProps<any>> | React.ComponentType<any>;
}

const routes: CustomRouteProps[] = [
  {
    component: App,
    path: '/',
    children: [
      {
        component: Home,
        path: '/',
        exact: true
      },
      {
        component: Components,
        path: '/components',
        children: components
      }
    ]
  }
];

export const browserHistory = createBrowserHistory();

export function renderRoutes(routes: Array<CustomRouteProps>) {
  return routes.map((route, index) => {
    const { component: Component, children, ...rest } = route;
    return (
      <Route {...rest} key={index} render={(props) => {
          return Component && (
            <Component {...props} meta={route.meta || {}}>
              {
                children && renderRoutes(children as Array<CustomRouteProps>)
              }
            </Component>
          )
      }}></Route>
    )
  })
}

export default class CustomRouter extends React.Component {
  render() {
    return (
      <Router history={browserHistory}>
        <Switch>
          {
            renderRoutes(routes)
          }
        </Switch>
      </Router>
    )
  }
}