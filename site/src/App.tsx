import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { FunctionRouteComponentProps } from './interfaces';

const FullScreen = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Navigator = styled.div`
  display: flex;
  height: 3rem;
  align-items: center;
`;

const Content = styled.div`
  flex: 1;
`;

const navigator = [
  {
    name: '首页',
    route: '/'
  },
  {
    name: '组件',
    route: '/components'
  }
];

export default function App(props: FunctionRouteComponentProps) {
  return (
    <FullScreen>
      <Navigator>
        {
          navigator.map((item, index) => {
            return (
              <Link key={index} to={item.route}>{item.name}</Link>
            )
          })
        }
      </Navigator>
      <Content>
        {
          props.children
        }
      </Content>
    </FullScreen>
  )
}