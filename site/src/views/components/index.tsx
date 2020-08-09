import React from 'react';
import { FullScreen, Menu, MenuItem, Content } from './style';
import components from '../../routes/components';
import { ClassRouteComponentProps } from '../../interfaces';

export default class Components extends React.Component<ClassRouteComponentProps> {
  render() {
    const { history } = this.props;
    return (
      <FullScreen>
        <Menu>
          {
            components.map((component, index) => {
              const { meta } = component;
              return (
                <MenuItem key={index} onClick={() => { history.push(component.path) }}>{meta.name}</MenuItem>
              )
            })
          }
        </Menu>
        <Content>
          {
            this.props.children
          }
        </Content>
      </FullScreen>
    )
  }
}