import React from 'react';
import { Router, Switch, RouteProps, Route } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import Home from '../views/home';
import components from './components';

export interface CustomRouteProps extends RouteProps {
}

const routes: CustomRouteProps[] = [
  {
    component: Home,
    path: '/',
    exact: true
  },
  ...components
];

export const browserHistory = createBrowserHistory();

export function renderRoutes(routes: Array<CustomRouteProps>) {
  return routes.map((route, index) => {
    const { component: Component, children, ...rest } = route;
    return (
      <Route {...rest} key={index} render={(props) => {
          return Component && (
            <Component {...props}>
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